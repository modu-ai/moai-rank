/**
 * Cache TTL Configuration
 *
 * Defines Time-To-Live (TTL) values for different cache entries.
 * TTL values are specified in seconds.
 *
 * Leaderboard TTL Strategy:
 * - Daily: 23 hours (allows for daily recalculation buffer)
 * - Weekly: 6 days (allows for weekly recalculation buffer)
 * - Monthly: 29 days (allows for monthly recalculation buffer)
 * - All-time: 6 days (refreshes weekly to include new activity)
 *
 * User-specific TTL Strategy:
 * - User Rank: 1 hour (balances freshness with performance)
 * - User Stats: 30 minutes (frequent updates for user engagement)
 * - Global Stats: 15 minutes (highly dynamic, needs frequent refresh)
 */
export const CACHE_TTL = {
  /** Leaderboard cache TTL values by period */
  LEADERBOARD: {
    /** Daily leaderboard - 23 hours (seconds) */
    daily: 23 * 60 * 60,
    /** Weekly leaderboard - 6 days (seconds) */
    weekly: 6 * 24 * 60 * 60,
    /** Monthly leaderboard - 29 days (seconds) */
    monthly: 29 * 24 * 60 * 60,
    /** All-time leaderboard - 6 days (seconds) */
    all_time: 6 * 24 * 60 * 60,
  },
  /** User rank cache TTL - 1 hour (seconds) */
  USER_RANK: 1 * 60 * 60,
  /** User stats cache TTL - 30 minutes (seconds) */
  USER_STATS: 30 * 60,
  /** Global stats cache TTL - 15 minutes (seconds) */
  GLOBAL_STATS: 15 * 60,
} as const;

/**
 * Type definition for cache TTL keys
 */
export type CacheTTLKey = keyof typeof CACHE_TTL | keyof typeof CACHE_TTL.LEADERBOARD;

/**
 * Get TTL value for a specific cache key
 *
 * @param key - Cache TTL key
 * @returns TTL value in seconds
 */
export function getTTL(key: CacheTTLKey): number {
  if (key in CACHE_TTL.LEADERBOARD) {
    return CACHE_TTL.LEADERBOARD[key as keyof typeof CACHE_TTL.LEADERBOARD];
  }
  // Direct top-level keys (USER_RANK, USER_STATS, GLOBAL_STATS)
  return CACHE_TTL[key as keyof Omit<typeof CACHE_TTL, 'LEADERBOARD'>];
}
