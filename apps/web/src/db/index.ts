import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * V009: Database Connection Configuration
 *
 * Supports two connection modes:
 * 1. Direct connection (DATABASE_URL) - For RLS operations via transactions
 * 2. Connection Pooler (DATABASE_POOLER_URL) - For high-throughput operations like cron jobs
 *
 * Connection Pooler URL format: postgres://user:pass@endpoint-pooler.region.neon.tech/dbname
 * Direct URL format: postgres://user:pass@endpoint.region.neon.tech/dbname
 */

/**
 * Enable connection caching for better performance in serverless environments.
 * This reuses TCP connections across requests when possible.
 */
neonConfig.fetchConnectionCache = true;

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
 * V011: Lazy-initialized database instance.
 *
 * Uses getter pattern to defer database connection until first use.
 * This prevents build-time errors when DATABASE_URL is not available
 * (e.g., during CI/CD builds without database access).
 */
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Drizzle ORM instance configured with Neon HTTP driver and schema.
 * Use this for all database operations in the application.
 *
 * The database connection is lazily initialized on first access,
 * allowing builds to succeed without DATABASE_URL set.
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
 * ```
 */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    if (!_db) {
      const sql = neon(getDatabaseUrl());
      _db = drizzle(sql, { schema });
    }
    return Reflect.get(_db, prop);
  },
});

/**
 * V009: Get a database instance optimized for batch operations.
 *
 * Uses Connection Pooler URL if available (DATABASE_POOLER_URL) for better
 * connection management during high-throughput operations like cron jobs.
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
 * ```
 */
export function getPooledDb() {
  const pooledSql = neon(getDatabaseUrl(true));
  return drizzle(pooledSql, { schema });
}

// Re-export schema for convenience
export * from './schema';
