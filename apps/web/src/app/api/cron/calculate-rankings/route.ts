import type { NextRequest } from 'next/server';
import { db, users, dailyAggregates, rankings, tokenUsage } from '@/db';
import { eq, sql, gte, and } from 'drizzle-orm';
import { successResponse, Errors } from '@/lib/api-response';
import { calculateCompositeScore, calculateEfficiencyScore } from '@/lib/score';

/**
 * Period types for ranking calculation
 */
type PeriodType = 'daily' | 'weekly' | 'monthly' | 'all_time';

interface RankingCalculationResult {
  period: PeriodType;
  usersProcessed: number;
  rankingsUpdated: number;
}

/**
 * GET /api/cron/calculate-rankings
 *
 * Calculates and updates rankings for all periods.
 * This endpoint is designed to be called by Vercel Cron.
 *
 * Security: Verifies CRON_SECRET header to prevent unauthorized access.
 * V012: CRON_SECRET is REQUIRED - endpoint returns 500 if not configured.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // V012: CRON_SECRET is REQUIRED in all environments
    // If not configured, return 500 to prevent silent bypass
    if (!cronSecret) {
      console.error('[CRON] CRITICAL: CRON_SECRET environment variable is not configured');
      return Errors.internalError('Server configuration error');
    }

    // Validate authorization header matches the secret
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[CRON] Unauthorized access attempt to calculate-rankings');
      return Errors.unauthorized('Invalid cron secret');
    }

    const results: RankingCalculationResult[] = [];

    // Calculate rankings for each period
    const periods: PeriodType[] = ['daily', 'weekly', 'monthly', 'all_time'];

    for (const period of periods) {
      const result = await calculateRankingsForPeriod(period);
      results.push(result);
    }

    // Update daily aggregates
    await updateDailyAggregates();

    return successResponse({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('[CRON] Calculate rankings error:', error);
    return Errors.internalError();
  }
}

/**
 * Calculate rankings for a specific period
 */
async function calculateRankingsForPeriod(period: PeriodType): Promise<RankingCalculationResult> {
  const now = new Date();
  const periodStart = getPeriodStart(period, now);

  // Get all users with their token usage for this period
  const userStats = await db
    .select({
      userId: users.id,
      totalInputTokens: sql<number>`COALESCE(SUM(${tokenUsage.inputTokens}), 0)`,
      totalOutputTokens: sql<number>`COALESCE(SUM(${tokenUsage.outputTokens}), 0)`,
      sessionCount: sql<number>`COUNT(DISTINCT ${tokenUsage.sessionId})`,
    })
    .from(users)
    .leftJoin(
      tokenUsage,
      and(
        eq(tokenUsage.userId, users.id),
        period === 'all_time' ? sql`1=1` : gte(tokenUsage.recordedAt, periodStart)
      )
    )
    .groupBy(users.id)
    .having(sql`COALESCE(SUM(${tokenUsage.inputTokens}), 0) > 0`);

  if (userStats.length === 0) {
    return { period, usersProcessed: 0, rankingsUpdated: 0 };
  }

  // Calculate streak for each user (simplified - count distinct days in last 30 days)
  const streakData = await calculateStreaks();

  // Calculate composite scores and sort
  const scoredUsers = userStats.map((user) => {
    const streak = streakData.get(user.userId) ?? 0;
    const score = calculateCompositeScore({
      totalInputTokens: Number(user.totalInputTokens),
      totalOutputTokens: Number(user.totalOutputTokens),
      totalSessions: Number(user.sessionCount),
      currentStreak: streak,
    });
    const efficiency = calculateEfficiencyScore(
      Number(user.totalInputTokens),
      Number(user.totalOutputTokens)
    );

    return {
      userId: user.userId,
      totalTokens: Number(user.totalInputTokens) + Number(user.totalOutputTokens),
      sessionCount: Number(user.sessionCount),
      compositeScore: score,
      efficiencyScore: efficiency,
    };
  });

  // Sort by composite score descending
  scoredUsers.sort((a, b) => b.compositeScore - a.compositeScore);

  // Upsert rankings
  let rankingsUpdated = 0;
  const periodStartStr = periodStart.toISOString().split('T')[0];

  for (let i = 0; i < scoredUsers.length; i++) {
    const user = scoredUsers[i];
    const rankPosition = i + 1;

    await db
      .insert(rankings)
      .values({
        userId: user.userId,
        periodType: period,
        periodStart: periodStartStr,
        rankPosition,
        totalTokens: user.totalTokens,
        compositeScore: user.compositeScore.toString(),
        sessionCount: user.sessionCount,
        efficiencyScore: user.efficiencyScore.toString(),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [rankings.userId, rankings.periodType, rankings.periodStart],
        set: {
          rankPosition,
          totalTokens: user.totalTokens,
          compositeScore: user.compositeScore.toString(),
          sessionCount: user.sessionCount,
          efficiencyScore: user.efficiencyScore.toString(),
          updatedAt: now,
        },
      });

    rankingsUpdated++;
  }

  return {
    period,
    usersProcessed: userStats.length,
    rankingsUpdated,
  };
}

/**
 * Get the start date for a period
 */
function getPeriodStart(period: PeriodType, now: Date): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case 'daily':
      // Start of today
      return start;
    case 'weekly':
      // Start of this week (Monday)
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      return start;
    case 'monthly':
      // Start of this month
      start.setDate(1);
      return start;
    case 'all_time':
      // Beginning of time (2024-01-01)
      return new Date('2024-01-01');
    default:
      return start;
  }
}

/**
 * Calculate activity streaks for all users
 * Returns a map of userId -> streak days
 */
async function calculateStreaks(): Promise<Map<string, number>> {
  const streakMap = new Map<string, number>();

  // Get distinct active days per user in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const activeDays = await db
    .select({
      userId: tokenUsage.userId,
      activeDays: sql<number>`COUNT(DISTINCT DATE(${tokenUsage.recordedAt}))`,
    })
    .from(tokenUsage)
    .where(gte(tokenUsage.recordedAt, thirtyDaysAgo))
    .groupBy(tokenUsage.userId);

  for (const row of activeDays) {
    if (row.userId) {
      streakMap.set(row.userId, Number(row.activeDays));
    }
  }

  return streakMap;
}

/**
 * Update daily aggregates for all users
 */
async function updateDailyAggregates(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Calculate today's aggregates per user
  const todayStats = await db
    .select({
      userId: tokenUsage.userId,
      totalInputTokens: sql<number>`COALESCE(SUM(${tokenUsage.inputTokens}), 0)`,
      totalOutputTokens: sql<number>`COALESCE(SUM(${tokenUsage.outputTokens}), 0)`,
      totalCacheTokens: sql<number>`COALESCE(SUM(${tokenUsage.cacheCreationTokens}) + SUM(${tokenUsage.cacheReadTokens}), 0)`,
      sessionCount: sql<number>`COUNT(DISTINCT ${tokenUsage.sessionId})`,
    })
    .from(tokenUsage)
    .where(sql`DATE(${tokenUsage.recordedAt}) = ${today}`)
    .groupBy(tokenUsage.userId);

  for (const stats of todayStats) {
    if (!stats.userId) continue;

    const efficiency = calculateEfficiencyScore(
      Number(stats.totalInputTokens),
      Number(stats.totalOutputTokens)
    );
    const compositeScore = calculateCompositeScore({
      totalInputTokens: Number(stats.totalInputTokens),
      totalOutputTokens: Number(stats.totalOutputTokens),
      totalSessions: Number(stats.sessionCount),
      currentStreak: 1,
    });

    await db
      .insert(dailyAggregates)
      .values({
        userId: stats.userId,
        date: today,
        totalInputTokens: Number(stats.totalInputTokens),
        totalOutputTokens: Number(stats.totalOutputTokens),
        totalCacheTokens: Number(stats.totalCacheTokens),
        sessionCount: Number(stats.sessionCount),
        avgEfficiency: efficiency.toString(),
        compositeScore: compositeScore.toString(),
      })
      .onConflictDoUpdate({
        target: [dailyAggregates.userId, dailyAggregates.date],
        set: {
          totalInputTokens: Number(stats.totalInputTokens),
          totalOutputTokens: Number(stats.totalOutputTokens),
          totalCacheTokens: Number(stats.totalCacheTokens),
          sessionCount: Number(stats.sessionCount),
          avgEfficiency: efficiency.toString(),
          compositeScore: compositeScore.toString(),
        },
      });
  }
}

/**
 * OPTIONS /api/cron/calculate-rankings
 * Handle CORS preflight (not typically needed for cron)
 */
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
