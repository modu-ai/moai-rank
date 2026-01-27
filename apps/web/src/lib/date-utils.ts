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

/**
 * Get the exclusive end date of a period for ranking queries.
 *
 * Returns the day AFTER the period ends, for use with `< periodEnd` conditions.
 * This ensures each period captures exactly its own data without overlap.
 *
 * @param period - The time period: 'daily' | 'weekly' | 'monthly' | 'all_time'
 * @param baseDate - Optional base date for calculation (defaults to today)
 * @returns ISO date string (YYYY-MM-DD format), exclusive upper bound
 *
 * @example
 * // Daily: next day
 * getPeriodEnd('daily', new Date('2026-01-26')) // '2026-01-27'
 *
 * @example
 * // Weekly: next Monday
 * getPeriodEnd('weekly', new Date('2026-01-26')) // '2026-02-02'
 */
export function getPeriodEnd(period: string, baseDate?: Date): string {
  const now = baseDate ?? new Date();
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);

  switch (period) {
    case 'daily':
      end.setDate(end.getDate() + 1);
      return end.toLocaleDateString('en-CA');

    case 'weekly': {
      // Find Monday of current week, then add 7 days
      const day = end.getDay();
      const diff = end.getDate() - day + (day === 0 ? -6 : 1);
      end.setDate(diff + 7);
      return end.toLocaleDateString('en-CA');
    }

    case 'monthly':
      end.setMonth(end.getMonth() + 1);
      end.setDate(1);
      return end.toLocaleDateString('en-CA');

    case 'all_time':
      return '2099-12-31'; // Far future for all-time

    default:
      end.setDate(end.getDate() + 1);
      return end.toISOString().split('T')[0];
  }
}
