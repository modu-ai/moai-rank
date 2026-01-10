/**
 * V008: Row-Level Security (RLS) Integration for Drizzle ORM
 *
 * Provides utilities for setting the current user context for RLS policies.
 * This ensures users can only access their own data in the database.
 *
 * IMPORTANT: The RLS migration must be applied before using these utilities.
 * See: drizzle/migrations/0001_add_row_level_security.sql
 */

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { sql as drizzleSql } from "drizzle-orm";
import * as schema from "./schema";

/**
 * Type for the database instance with schema
 */
export type RLSDatabase = NeonHttpDatabase<typeof schema>;

/**
 * Sets the RLS context for the current user and executes a query.
 *
 * This function creates a new database connection, sets the user context,
 * and then executes the provided query function. The user context is set
 * using PostgreSQL's set_config function.
 *
 * @param userId - The UUID of the current user
 * @param queryFn - A function that receives the db instance and executes queries
 * @returns The result of the query function
 *
 * @example
 * ```ts
 * import { withRLS } from "@/db/rls";
 * import { sessions } from "@/db/schema";
 *
 * const userSessions = await withRLS(user.id, async (db) => {
 *   return await db.select().from(sessions);
 * });
 * ```
 */
export async function withRLS<T>(
  userId: string,
  queryFn: (db: RLSDatabase) => Promise<T>
): Promise<T> {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  // Set the user context for this connection
  // Using set_config with is_local=false to persist for the connection
  await db.execute(
    drizzleSql`SELECT set_config('app.current_user_id', ${userId}, false)`
  );

  // Execute the query with RLS context
  return queryFn(db);
}

/**
 * Executes a query without RLS context (for public endpoints).
 *
 * Use this for endpoints that need to access data across all users,
 * such as the public leaderboard. Rankings table has a public SELECT policy.
 *
 * @param queryFn - A function that receives the db instance and executes queries
 * @returns The result of the query function
 *
 * @example
 * ```ts
 * import { withoutRLS } from "@/db/rls";
 * import { rankings } from "@/db/schema";
 *
 * const leaderboard = await withoutRLS(async (db) => {
 *   return await db.select().from(rankings).orderBy(rankings.rankPosition);
 * });
 * ```
 */
export async function withoutRLS<T>(
  queryFn: (db: RLSDatabase) => Promise<T>
): Promise<T> {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  // Clear any existing user context for public access
  await db.execute(
    drizzleSql`SELECT set_config('app.current_user_id', '', false)`
  );

  return queryFn(db);
}

/**
 * Creates a database instance with RLS context pre-configured.
 *
 * Note: Due to the stateless nature of HTTP connections in Neon serverless,
 * each query creates a new connection. Use withRLS() for guaranteed context
 * isolation, or use this function when you need to run multiple queries
 * and can accept that context is set once per call.
 *
 * @param userId - The UUID of the current user
 * @returns Object with db instance and a method to set context
 *
 * @example
 * ```ts
 * import { createRLSContext } from "@/db/rls";
 * import { sessions } from "@/db/schema";
 *
 * const { db, setContext } = createRLSContext(user.id);
 * await setContext(); // Sets the user context
 * const userSessions = await db.select().from(sessions);
 * ```
 */
export function createRLSContext(userId: string) {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  return {
    db,
    setContext: async () => {
      await db.execute(
        drizzleSql`SELECT set_config('app.current_user_id', ${userId}, false)`
      );
    },
  };
}
