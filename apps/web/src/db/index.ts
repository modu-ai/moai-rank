import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

/**
 * V012: Database Connection Configuration with WebSocket Driver
 *
 * Supports two connection modes with transaction support:
 * 1. Direct connection (DATABASE_URL) - For RLS operations via transactions
 * 2. Connection Pooler (DATABASE_POOLER_URL) - For high-throughput operations like cron jobs
 *
 * Connection Pooler URL format: postgres://user:pass@endpoint-pooler.region.neon.tech/dbname
 * Direct URL format: postgres://user:pass@endpoint.region.neon.tech/dbname
 *
 * Migration from HTTP to WebSocket driver:
 * - Enables transaction support via Pool instances
 * - Maintains backward compatibility with existing API
 * - Uses drizzle-orm/neon-serverless for full PostgreSQL feature support
 */

/**
 * Get the appropriate database URL based on the use case.
 * - For RLS operations: Use direct connection (DATABASE_URL)
 * - For batch operations: Prefer pooler connection if available
 *
 * @param preferPooler - Whether to prefer the pooler connection for batch operations
 * @returns The appropriate database URL
 */
function getDatabaseUrl(preferPooler = false): string {
  const poolerUrl = process.env.DATABASE_POOLER_URL;
  const directUrl = process.env.DATABASE_URL;

  if (!directUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Use pooler for batch operations if available
  if (preferPooler && poolerUrl) {
    return poolerUrl;
  }

  return directUrl;
}

/**
 * V012: Lazy-initialized database instance with WebSocket driver.
 *
 * Uses getter pattern to defer database connection until first use.
 * This prevents build-time errors when DATABASE_URL is not available
 * (e.g., during CI/CD builds without database access).
 *
 * Migration notes:
 * - Changed from HTTP driver (neon) to WebSocket driver (Pool)
 * - Now supports transactions via db.transaction()
 * - Maintains same API for backward compatibility
 */
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: Pool | null = null;

/**
 * Drizzle ORM instance configured with Neon WebSocket driver and schema.
 * Use this for all database operations in the application.
 *
 * The database connection is lazily initialized on first access,
 * allowing builds to succeed without DATABASE_URL set.
 *
 * Now supports transactions:
 * ```ts
 * await db.transaction(async (tx) => {
 *   await tx.insert(users).values({ ... });
 *   await tx.update(rankings).set({ ... });
 * });
 * ```
 *
 * @example
 * ```ts
 * import { db } from "@/db";
 * import { users } from "@/db/schema";
 *
 * // Query users
 * const allUsers = await db.select().from(users);
 *
 * // Insert a new user
 * const newUser = await db.insert(users).values({
 *   clerkId: "clerk_123",
 *   githubUsername: "octocat",
 *   apiKeyHash: "sha256hash",
 *   apiKeyPrefix: "moai_rank_ab12",
 * }).returning();
 *
 * // Use transactions (now supported!)
 * await db.transaction(async (tx) => {
 *   const user = await tx.insert(users).values({ ... }).returning();
 *   await tx.insert(rankings).values({ userId: user[0].id, ... });
 * });
 * ```
 */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    if (!_db) {
      _pool = new Pool({ connectionString: getDatabaseUrl() });
      _db = drizzle(_pool, { schema });
    }
    return Reflect.get(_db, prop);
  },
});

/**
 * V012: Get a database instance optimized for batch operations with transaction support.
 *
 * Uses Connection Pooler URL if available (DATABASE_POOLER_URL) for better
 * connection management during high-throughput operations like cron jobs.
 *
 * Now supports transactions via WebSocket driver.
 *
 * @returns Database instance configured for batch operations
 *
 * @example
 * ```ts
 * import { getPooledDb } from "@/db";
 *
 * // In cron jobs or batch processing
 * const pooledDb = getPooledDb();
 * await pooledDb.insert(rankings).values(batchData);
 *
 * // With transactions
 * await pooledDb.transaction(async (tx) => {
 *   await tx.delete(orphanedUsers).where(...);
 *   await tx.update(rankings).set(...);
 * });
 * ```
 */
export function getPooledDb(): ReturnType<typeof drizzle<typeof schema>> {
  const pool = new Pool({ connectionString: getDatabaseUrl(true) });
  return drizzle(pool, { schema });
}

// Re-export schema for convenience
export * from './schema';
