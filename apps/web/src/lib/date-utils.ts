/**
 * Get the start date of a period for leaderboard/rankings queries.
 *
 * This function ensures consistent periodStart calculation across all APIs
 * (leaderboard, cron job, user stats) to avoid data mismatches.
 *
 * @param period - The time period: 'daily' | 'weekly' | 'monthly' | 'all_time'
 * @param baseDate - Optional base date for calculation (defaults to today)
 * @returns ISO date string (YYYY-MM-DD format)
 *
 * @example
 * // Get today's daily period start
 * getPeriodStart('daily') // '2026-01-12'
 *
 * @example
 * // Get yesterday's daily period start
 * getPeriodStart('daily', new Date('2026-01-11')) // '2026-01-11'
 */
export function getPeriodStart(period: string, baseDate?: Date): string {
  const now = baseDate ?? new Date();
  const start = new Date(now); // Create copy to avoid mutating original
  start.setHours(0, 0, 0, 0); // Reset time to midnight

  switch (period) {
    case 'daily':
      // Use local timezone instead of UTC to ensure consistent date calculation
      // en-CA locale returns YYYY-MM-DD format (ISO 8601 compatible)
      return start.toLocaleDateString('en-CA');

    case 'weekly': {
      // Find Monday of current week
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Sunday = 0, treat as -6
      start.setDate(diff);
      return start.toLocaleDateString('en-CA');
    }

    case 'monthly':
      start.setDate(1); // First day of month
      return start.toLocaleDateString('en-CA');

    case 'all_time':
      return '2024-01-01'; // Epoch start for rankings

    default:
      return start.toISOString().split('T')[0];
  }
}
