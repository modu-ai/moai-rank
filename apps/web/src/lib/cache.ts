/**
 * Redis Cache Layer
 *
 * Provides a unified caching interface using Upstash Redis.
 * Includes graceful error handling when Redis is unavailable.
 *
 * Features:
 * - Cache-aside pattern with automatic fallback
 * - Type-safe get/set operations
 * - Pattern-based cache invalidation
 * - Console logging for cache hits/misses
 * - Graceful degradation on Redis failures
 *
 * Error Handling:
 * - When Redis is unavailable, cache operations fail gracefully
 * - withCache() automatically falls back to the factory function
 * - Logs warnings for degraded operation mode
 */

import { Redis } from '@upstash/redis';

/**
 * Redis client instance
 * Lazily initialized when first accessed
 */
let redisClient: Redis | null = null;

/**
 * Redis availability flag
 * Used to avoid repeated connection attempts during outages
 */
let redisAvailable = false;

/**
 * Initialize Redis client
 *
 * Supports both Vercel Upstash Integration and standard Upstash credentials:
 * - Vercel: KV_REST_API_URL, KV_REST_API_TOKEN
 * - Standard: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 *
 * @returns Redis instance or null if credentials not configured
 */
function initializeRedis(): Redis | null {
  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    console.warn(
      '[Cache] Upstash Redis credentials not configured. ' +
        'Caching is disabled (not recommended for production).'
    );
    return null;
  }

  try {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    // Test connection
    // Note: Upstash Redis doesn't have a ping method, so we assume success
    // if initialization didn't throw
    redisAvailable = true;
    console.info('[Cache] Redis client initialized successfully');
    return redis;
  } catch (error) {
    console.error('[Cache] Failed to initialize Redis client:', error);
    redisAvailable = false;
    return null;
  }
}

/**
 * Get or create Redis client instance
 *
 * @returns Redis instance or null if unavailable
 */
function getRedis(): Redis | null {
  if (!redisClient) {
    redisClient = initializeRedis();
  }
  return redisClient;
}

/**
 * Get value from cache
 *
 * @param key - Cache key
 * @returns Cached value or null if not found
 *
 * @example
 * ```ts
 * const user = await get<User>('user:123')
 * if (user) {
 *   console.log('Cache hit:', user)
 * }
 * ```
 */
export async function get<T>(key: string): Promise<T | null> {
  const redis = getRedis();

  if (!redis || !redisAvailable) {
    console.debug(`[Cache] Miss (Redis unavailable): ${key}`);
    return null;
  }

  try {
    const value = await redis.get<T>(key);

    if (value === null || value === undefined) {
      console.debug(`[Cache] Miss: ${key}`);
      return null;
    }

    console.debug(`[Cache] Hit: ${key}`);
    return value;
  } catch (error) {
    console.error(`[Cache] Get failed for key "${key}":`, error);
    // Mark Redis as unavailable to avoid repeated errors
    redisAvailable = false;
    return null;
  }
}

/**
 * Set value in cache with TTL
 *
 * @param key - Cache key
 * @param value - Value to cache (must be JSON serializable)
 * @param ttlSeconds - Time-to-live in seconds
 *
 * @example
 * ```ts
 * await set('user:123', { name: 'John' }, 3600) // Cache for 1 hour
 * ```
 */
export async function set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const redis = getRedis();

  if (!redis || !redisAvailable) {
    console.debug(`[Cache] Set skipped (Redis unavailable): ${key}`);
    return;
  }

  try {
    await redis.set(key, value, { ex: ttlSeconds });
    console.debug(`[Cache] Set: ${key} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    console.error(`[Cache] Set failed for key "${key}":`, error);
    redisAvailable = false;
  }
}

/**
 * Delete value from cache
 *
 * @param key - Cache key to delete
 *
 * @example
 * ```ts
 * await del('user:123')
 * ```
 */
export async function del(key: string): Promise<void> {
  const redis = getRedis();

  if (!redis || !redisAvailable) {
    console.debug(`[Cache] Delete skipped (Redis unavailable): ${key}`);
    return;
  }

  try {
    await redis.del(key);
    console.debug(`[Cache] Deleted: ${key}`);
  } catch (error) {
    console.error(`[Cache] Delete failed for key "${key}":`, error);
    redisAvailable = false;
  }
}

/**
 * Delete multiple cache keys matching a pattern
 *
 * Warning: This uses SCAN which is slower than direct key deletion.
 * Use sparingly and prefer specific key deletion when possible.
 *
 * @param pattern - Cache key pattern (e.g., "user:*")
 * @returns Number of keys deleted
 *
 * @example
 * ```ts
 * const count = await delPattern('leaderboard:daily:*')
 * console.log(`Invalidated ${count} daily leaderboard caches`)
 * ```
 */
export async function delPattern(pattern: string): Promise<number> {
  const redis = getRedis();

  if (!redis || !redisAvailable) {
    console.debug(`[Cache] Delete pattern skipped (Redis unavailable): ${pattern}`);
    return 0;
  }

  try {
    // Use SCAN to find matching keys
    const keys: string[] = [];
    let cursor = 0;

    do {
      const result = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = Number(result[0]);
      keys.push(...result[1]);
    } while (cursor !== 0);

    // Delete all matching keys
    if (keys.length > 0) {
      await redis.del(...keys);
      console.debug(`[Cache] Deleted ${keys.length} keys matching pattern: ${pattern}`);
    }

    return keys.length;
  } catch (error) {
    console.error(`[Cache] Delete pattern failed for "${pattern}":`, error);
    redisAvailable = false;
    return 0;
  }
}

/**
 * Cache-aside wrapper with automatic fallback
 *
 * Implements the cache-aside pattern:
 * 1. Check cache for value
 * 2. If cache miss, call factory function
 * 3. Store factory result in cache
 * 4. Return value (from cache or factory)
 *
 * Gracefully handles Redis failures by falling back to factory function.
 *
 * @param key - Cache key
 * @param ttlSeconds - Time-to-live in seconds
 * @param factory - Function to generate value on cache miss
 * @returns Cached or freshly generated value
 *
 * @example
 * ```ts
 * const user = await withCache(
 *   'user:123',
 *   3600,
 *   async () => await db.query('SELECT * FROM users WHERE id = $1', [123])
 * )
 * ```
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  factory: () => Promise<T>
): Promise<T> {
  // Try cache first
  const cached = await get<T>(key);

  if (cached !== null) {
    return cached;
  }

  // Cache miss - call factory function
  console.debug(`[Cache] Cache miss, calling factory for: ${key}`);

  try {
    const value = await factory();

    // Store in cache for future requests
    await set(key, value, ttlSeconds);

    return value;
  } catch (error) {
    console.error(`[Cache] Factory function failed for key "${key}":`, error);
    throw error;
  }
}

/**
 * Invalidate multiple cache keys
 *
 * Batch delete operation for multiple specific keys.
 * More efficient than multiple individual delete calls.
 *
 * @param keys - Array of cache keys to delete
 *
 * @example
 * ```ts
 * await delMany([
 *   'user:123:rank',
 *   'user:123:stats',
 *   'user:123:profile'
 * ])
 * ```
 */
export async function delMany(keys: string[]): Promise<void> {
  const redis = getRedis();

  if (!redis || !redisAvailable || keys.length === 0) {
    return;
  }

  try {
    await redis.del(...keys);
    console.debug(`[Cache] Deleted ${keys.length} keys`);
  } catch (error) {
    console.error('[Cache] Batch delete failed:', error);
    redisAvailable = false;
  }
}

/**
 * Check if Redis is available
 *
 * @returns True if Redis client is initialized and available
 */
export function isCacheAvailable(): boolean {
  return redisAvailable && getRedis() !== null;
}

/**
 * Get cache statistics (for monitoring)
 *
 * @returns Cache availability status
 */
export function getCacheStatus() {
  return {
    available: redisAvailable,
    initialized: redisClient !== null,
    redisConfigured: !!(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL),
  };
}
