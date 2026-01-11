/**
 * V009: Row-Level Security (RLS) Integration for Drizzle ORM
 *
 * Provides utilities for setting the current user context for RLS policies.
 * This ensures users can only access their own data in the database.
 *
 * IMPORTANT: The RLS migration must be applied before using these utilities.
 * See: drizzle/migrations/0001_add_row_level_security.sql
 *
 * V009 UPDATE - HTTP Driver Transaction Pattern:
 * The Neon HTTP driver is connectionless - each query creates a new connection.
 * To ensure RLS context persists, we use Drizzle's transaction API which
 * executes all statements within a single HTTP request, maintaining session state.
 *
 * Alternative approaches (for reference):
 * - CTE pattern: Combines set_config with query in single SQL statement
 * - WebSocket driver: Maintains persistent connections (for real-time apps)
 */

import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { sql as drizzleSql } from 'drizzle-orm';
import * as schema from './schema';

// Enable connection caching for better performance
neonConfig.fetchConnectionCache = true;

/**
 * V011: Get database URL with proper validation
 * Throws a clear error if DATABASE_URL is not configured
 */
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('[RLS] DATABASE_URL environment variable is not configured');
  }
  return url;
}

/**
 * Type for the database instance with schema
 */
export type RLSDatabase = NeonHttpDatabase<typeof schema>;

/**
 * Transaction-based database type for RLS operations
 * V009: Use transaction type for proper RLS context isolation
 */
export type RLSTransaction = Parameters<Parameters<RLSDatabase['transaction']>[0]>[0];

/**
 * Sets the RLS context for the current user and executes a query within a transaction.
 *
 * V009 UPDATE: Uses Drizzle's transaction API to ensure RLS context persists.
 * The transaction executes all statements in a single HTTP request, maintaining
 * PostgreSQL session state including set_config values.
 *
 * @param userId - The UUID of the current user
 * @param queryFn - A function that receives the transaction and executes queries
 * @returns The result of the query function
 *
 * @example
 * ```ts
 * import { withRLS } from "@/db/rls";
 * import { sessions } from "@/db/schema";
 *
 * const userSessions = await withRLS(user.id, async (tx) => {
 *   return await tx.select().from(sessions);
 * });
 * ```
 */
export async function withRLS<T>(
  userId: string,
  queryFn: (tx: RLSTransaction) => Promise<T>
): Promise<T> {
  const sql = neon(getDatabaseUrl());
  const db = drizzle(sql, { schema });

  // V009: Use transaction to ensure RLS context persists across all queries
  // Drizzle's transaction API executes all statements in a single HTTP request
  return await db.transaction(async (tx) => {
    // Set the user context within the transaction
    // This uses SET LOCAL which is automatically transaction-scoped
    await tx.execute(drizzleSql`SELECT set_config('app.current_user_id', ${userId}, true)`);

    // Execute the query with guaranteed RLS context
    return await queryFn(tx);
  });
}

/**
 * Executes a query without RLS context (for public endpoints).
 *
 * Use this for endpoints that need to access data across all users,
 * such as the public leaderboard. Rankings table has a public SELECT policy.
 *
 * V009 UPDATE: Uses transaction to ensure consistent empty context.
 *
 * @param queryFn - A function that receives the transaction and executes queries
 * @returns The result of the query function
 *
 * @example
 * ```ts
 * import { withoutRLS } from "@/db/rls";
 * import { rankings } from "@/db/schema";
 *
 * const leaderboard = await withoutRLS(async (tx) => {
 *   return await tx.select().from(rankings).orderBy(rankings.rankPosition);
 * });
 * ```
 */
export async function withoutRLS<T>(queryFn: (tx: RLSTransaction) => Promise<T>): Promise<T> {
  const sql = neon(getDatabaseUrl());
  const db = drizzle(sql, { schema });

  // V009: Use transaction for consistent context handling
  return await db.transaction(async (tx) => {
    // Clear any existing user context for public access
    await tx.execute(drizzleSql`SELECT set_config('app.current_user_id', '', true)`);
    return await queryFn(tx);
  });
}

/**
 * Creates a database instance with RLS context pre-configured.
 *
 * @deprecated V009: Use withRLS() instead. This function does not guarantee
 * RLS context persistence with the HTTP driver. The transaction-based withRLS()
 * function provides reliable RLS enforcement.
 *
 * @param userId - The UUID of the current user
 * @returns Object with db instance and a method to set context
 */
export function createRLSContext(userId: string) {
  console.warn('[RLS] createRLSContext is deprecated. Use withRLS() for guaranteed RLS context.');

  const sql = neon(getDatabaseUrl());
  const db = drizzle(sql, { schema });

  return {
    db,
    /**
     * @deprecated Context does not persist between queries with HTTP driver.
     */
    setContext: async () => {
      await db.execute(drizzleSql`SELECT set_config('app.current_user_id', ${userId}, true)`);
    },
  };
}

/**
 * Executes a raw SQL query with RLS context guaranteed in a single HTTP request.
 *
 * @deprecated V011: This function is DEPRECATED and should NOT be used.
 * Use withRLS() instead, which provides type-safe queries without SQL injection risk.
 *
 * SECURITY WARNING: This function uses drizzleSql.raw() which does NOT escape
 * the rawSql parameter. If any user input is included in rawSql, this creates
 * a SQL injection vulnerability.
 *
 * @param userId - The UUID of the current user
 * @param rawSql - The raw SQL query to execute (MUST NOT contain user input)
 * @returns The query result
 */
export async function withRLSRaw<T = unknown>(userId: string, rawSql: string): Promise<T[]> {
  // V011: Log deprecation warning in development
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[SECURITY] withRLSRaw is deprecated due to SQL injection risk. Use withRLS() instead.'
    );
  }

  const sql = neon(getDatabaseUrl());

  // Execute set_config and query in a single HTTP request using CTE pattern
  // WARNING: drizzleSql.raw() does NOT escape the SQL string
  const result = await sql`
    WITH set_context AS (
      SELECT set_config('app.current_user_id', ${userId}, true)
    )
    ${drizzleSql.raw(rawSql)}
  `;

  return result as T[];
}

/**
 * V009: Service role database access for administrative operations.
 *
 * Use this for background jobs, cron tasks, and admin operations that need
 * to bypass RLS and access all data. This function does NOT set any RLS context,
 * allowing queries to access all rows (subject to table policies for service role).
 *
 * SECURITY NOTE: Only use this for trusted server-side operations.
 * Never expose this to client-side code or user-controlled endpoints.
 *
 * @param queryFn - A function that receives the db instance and executes queries
 * @returns The result of the query function
 *
 * @example
 * ```ts
 * import { withServiceRole } from "@/db/rls";
 * import { users, rankings } from "@/db/schema";
 *
 * // Cron job: Calculate rankings for all users
 * const allUsers = await withServiceRole(async (db) => {
 *   return await db.select().from(users);
 * });
 * ```
 */
export async function withServiceRole<T>(queryFn: (db: RLSDatabase) => Promise<T>): Promise<T> {
  const sql = neon(getDatabaseUrl());
  const db = drizzle(sql, { schema });

  // No RLS context set - uses database role's default permissions
  // For Neon, this typically means the connection role has full access
  // RLS policies with USING (true) will still apply (e.g., public rankings SELECT)
  return await queryFn(db);
}

/**
 * Get a raw database instance without RLS wrappers.
 *
 * Use this when you need direct database access for performance-critical
 * operations or when managing transactions manually.
 *
 * SECURITY NOTE: Queries using this instance bypass RLS context helpers.
 * Ensure proper authorization checks are performed at the application level.
 *
 * @returns Database instance with schema
 */
export function getDb(): RLSDatabase {
  const sql = neon(getDatabaseUrl());
  return drizzle(sql, { schema });
}
