import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Create a Neon SQL client using the DATABASE_URL environment variable.
 * This uses HTTP-based queries which are ideal for serverless environments.
 */
const sql = neon(process.env.DATABASE_URL!);

/**
 * Drizzle ORM instance configured with Neon HTTP driver and schema.
 * Use this for all database operations in the application.
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
export const db = drizzle(sql, { schema });

// Re-export schema for convenience
export * from "./schema";
