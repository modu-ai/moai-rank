/**
 * Get the start date of a period for leaderboard/rankings queries.
 *
 * This function ensures consistent periodStart calculation across all APIs
 * (leaderboard, cron job, user stats) to avoid data mismatches.
 *
 * @param period - The time period: 'daily' | 'weekly' | 'monthly' | 'all_time'
 * @returns ISO date string (YYYY-MM-DD format)
 */
export function getPeriodStart(period: string): string {
  const now = new Date();
  const start = new Date(now);  // Create copy to avoid mutating original
  start.setHours(0, 0, 0, 0);   // Reset time to midnight

  switch (period) {
    case 'daily':
      return start.toISOString().split('T')[0];

    case 'weekly': {
      // Find Monday of current week
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);  // Sunday = 0, treat as -6
      start.setDate(diff);
      return start.toISOString().split('T')[0];
    }

    case 'monthly':
      start.setDate(1);  // First day of month
      return start.toISOString().split('T')[0];

    case 'all_time':
      return '2024-01-01';  // Epoch start for rankings

    default:
      return start.toISOString().split('T')[0];
  }
}
