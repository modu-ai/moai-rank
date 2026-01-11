/**
 * Cache Key Generators
 *
 * Provides consistent cache key generation patterns.
 * Uses a hierarchical naming scheme with colons as separators.
 *
 * Key Patterns:
 * - leaderboard:{period}:{limit}:{offset}
 * - user_rank:{userId}
 * - user_stats:{userId}
 * - global_stats
 *
 * Pattern Deletion:
 * - leaderboard:{period}:* (deletes all leaderboard caches for a period)
 */

/**
 * Global cache key prefix
 */
const CACHE_PREFIX = 'moai-rank';

/**
 * Generate leaderboard cache key
 *
 * Key format: leaderboard:{period}:{limit}:{offset}
 *
 * @param period - Time period (daily, weekly, monthly, all_time)
 * @param limit - Number of entries per page
 * @param offset - Pagination offset
 * @returns Cache key string
 *
 * @example
 * ```ts
 * leaderboardKey('daily', 100, 0) // 'moai-rank:leaderboard:daily:100:0'
 * ```
 */
export function leaderboardKey(period: string, limit: number, offset: number): string {
  return `${CACHE_PREFIX}:leaderboard:${period}:${limit}:${offset}`;
}

/**
 * Generate user rank cache key
 *
 * Key format: user_rank:{userId}
 *
 * @param userId - User identifier
 * @returns Cache key string
 *
 * @example
 * ```ts
 * userRankKey('user_123') // 'moai-rank:user_rank:user_123'
 * ```
 */
export function userRankKey(userId: string): string {
  return `${CACHE_PREFIX}:user_rank:${userId}`;
}

/**
 * Generate user stats cache key
 *
 * Key format: user_stats:{userId}
 *
 * @param userId - User identifier
 * @returns Cache key string
 *
 * @example
 * ```ts
 * userStatsKey('user_123') // 'moai-rank:user_stats:user_123'
 * ```
 */
export function userStatsKey(userId: string): string {
  return `${CACHE_PREFIX}:user_stats:${userId}`;
}

/**
 * Generate global stats cache key
 *
 * Key format: global_stats
 *
 * @returns Cache key string
 *
 * @example
 * ```ts
 * globalStatsKey() // 'moai-rank:global_stats'
 * ```
 */
export function globalStatsKey(): string {
  return `${CACHE_PREFIX}:global_stats`;
}

/**
 * Generate leaderboard cache pattern for deletion
 *
 * Pattern format: leaderboard:{period}:*
 * Use with delPattern() to invalidate all leaderboard caches for a period
 *
 * @param period - Time period (daily, weekly, monthly, all_time)
 * @returns Cache pattern string
 *
 * @example
 * ```ts
 * leaderboardPattern('daily') // 'moai-rank:leaderboard:daily:*'
 * // Invalidate all daily leaderboards
 * await delPattern(leaderboardPattern('daily'))
 * ```
 */
export function leaderboardPattern(period: string): string {
  return `${CACHE_PREFIX}:leaderboard:${period}:*`;
}

/**
 * Generate user-specific cache pattern for deletion
 *
 * Pattern format: user_{type}:{userId}
 *
 * @param userId - User identifier
 * @returns Cache pattern string for all user-specific keys
 *
 * @example
 * ```ts
 * userPattern('user_123') // ['moai-rank:user_rank:user_123', 'moai-rank:user_stats:user_123']
 * ```
 */
export function userKeys(userId: string): string[] {
  return [userRankKey(userId), userStatsKey(userId)];
}

/**
 * Cache key groups for bulk operations
 */
export const CacheKeyGroups = {
  /** All leaderboard-related keys */
  leaderboard: (period: string, limit: number, offset: number) =>
    leaderboardKey(period, limit, offset),

  /** All user-specific keys */
  user: (userId: string) => userKeys(userId),

  /** All stats keys */
  stats: () => [globalStatsKey()],
} as const;
