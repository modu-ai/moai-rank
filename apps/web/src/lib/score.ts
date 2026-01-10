/**
 * Composite Score Calculation
 *
 * The composite score is a weighted sum of four components:
 * - Token component (40%): Measures total token usage
 * - Efficiency component (25%): Measures output/input token ratio
 * - Session component (20%): Measures number of sessions
 * - Streak component (15%): Measures consecutive days of activity
 *
 * Each component is normalized to [0, 1] range, then weighted and summed.
 * Final score is multiplied by 1000 for readability.
 */

export interface UserStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalSessions: number;
  currentStreak: number;
}

/**
 * Calculate the composite score for a user
 *
 * @param stats - User statistics
 * @returns Composite score (0-1000 scale)
 */
export function calculateCompositeScore(stats: UserStats): number {
  const tokenComponent = calculateTokenComponent(
    stats.totalInputTokens + stats.totalOutputTokens
  );
  const efficiencyComponent = calculateEfficiencyComponent(
    stats.totalInputTokens,
    stats.totalOutputTokens
  );
  const sessionComponent = calculateSessionComponent(stats.totalSessions);
  const streakComponent = calculateStreakComponent(stats.currentStreak);

  const weightedSum =
    tokenComponent * 0.4 +
    efficiencyComponent * 0.25 +
    sessionComponent * 0.2 +
    streakComponent * 0.15;

  return Math.round(weightedSum * 1000 * 100) / 100; // Round to 2 decimal places
}

/**
 * Token Component (40% weight)
 *
 * Uses logarithmic scaling to prevent runaway leaders
 * Formula: log10(totalTokens + 1) / 10
 *
 * Examples:
 * - 0 tokens: 0
 * - 1,000 tokens: 0.3
 * - 100,000 tokens: 0.5
 * - 10,000,000 tokens: 0.7
 */
function calculateTokenComponent(totalTokens: number): number {
  if (totalTokens <= 0) return 0;
  return Math.min(1, Math.log10(totalTokens + 1) / 10);
}

/**
 * Efficiency Component (25% weight)
 *
 * Measures how much output is generated per input
 * Capped at 2:1 ratio to prevent gaming
 * Formula: min(outputTokens / inputTokens, 2) / 2
 *
 * Examples:
 * - 0 input: 0 (to avoid division by zero)
 * - 1:1 ratio: 0.5
 * - 2:1 ratio or higher: 1.0
 */
function calculateEfficiencyComponent(
  inputTokens: number,
  outputTokens: number
): number {
  if (inputTokens <= 0) return 0;
  const ratio = outputTokens / inputTokens;
  return Math.min(ratio, 2) / 2;
}

/**
 * Session Component (20% weight)
 *
 * Uses logarithmic scaling for session count
 * Formula: log10(sessions + 1) / 3
 *
 * Examples:
 * - 0 sessions: 0
 * - 10 sessions: 0.33
 * - 100 sessions: 0.67
 * - 1000 sessions: 1.0
 */
function calculateSessionComponent(sessions: number): number {
  if (sessions <= 0) return 0;
  return Math.min(1, Math.log10(sessions + 1) / 3);
}

/**
 * Streak Component (15% weight)
 *
 * Linear scaling capped at 30 days
 * Formula: min(streak, 30) / 30
 *
 * Examples:
 * - 0 days: 0
 * - 7 days: 0.23
 * - 15 days: 0.5
 * - 30+ days: 1.0
 */
function calculateStreakComponent(streak: number): number {
  if (streak <= 0) return 0;
  return Math.min(streak, 30) / 30;
}

/**
 * Calculate efficiency score (output/input ratio)
 * This is used for display and ranking purposes
 */
export function calculateEfficiencyScore(
  inputTokens: number,
  outputTokens: number
): number {
  if (inputTokens <= 0) return 0;
  return Math.round((outputTokens / inputTokens) * 10000) / 10000;
}

/**
 * Format a composite score for display
 */
export function formatScore(score: number): string {
  return score.toFixed(2);
}

/**
 * Get score tier based on composite score
 */
export function getScoreTier(
  score: number
): "bronze" | "silver" | "gold" | "platinum" | "diamond" {
  if (score >= 800) return "diamond";
  if (score >= 600) return "platinum";
  if (score >= 400) return "gold";
  if (score >= 200) return "silver";
  return "bronze";
}
