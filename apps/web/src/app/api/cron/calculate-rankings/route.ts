import type { NextRequest } from 'next/server';
import { db, getPooledDb, users, dailyAggregates, rankings, tokenUsage } from '@/db';
import { eq, sql, gte, and } from 'drizzle-orm';
import { successResponse, Errors } from '@/lib/api-response';
import { calculateCompositeScore, calculateEfficiencyScore } from '@/lib/score';
import { getPeriodStart } from '@/lib/date-utils';

/**
 * V009: Cron Job Configuration
 *
 * Optimizations applied:
 * - Uses Connection Pooler for batch operations
 * - Batch upserts instead of N+1 pattern (BATCH_SIZE = 100)
 * - Execution time monitoring for observability
 */

// Maximum execution time for the cron job (requires Pro plan for > 10s)
export const maxDuration = 60;

// Batch size for upsert operations
const BATCH_SIZE = 100;

// Ensure the route is not cached
export const dynamic = 'force-dynamic';

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
 * V012: CRON_SECRET is REQUIRED in production - bypassed in development.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const authorization = authHeader?.replace('Bearer ', '');

    // In development, allow cron without secret for testing
    const isDev = process.env.NODE_ENV === 'development';
    if (!cronSecret && !isDev) {
      console.error('[CRON] CRITICAL: CRON_SECRET environment variable is not configured');
      return Errors.internalError('Server configuration error');
    }

    // Verify cron secret (skip in development)
    if (!isDev && cronSecret !== authorization) {
      console.warn('[CRON] Unauthorized cron request');
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
  const periodStart = getPeriodStart(period);

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
        period === 'all_time' ? sql`1=1` : gte(tokenUsage.recordedAt, new Date(periodStart))
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

  // V009: Batch upsert rankings instead of N+1 pattern
  const pooledDb = getPooledDb();

  // Process in batches for better performance
  let rankingsUpdated = 0;

  for (let batchStart = 0; batchStart < scoredUsers.length; batchStart += BATCH_SIZE) {
    const batch = scoredUsers.slice(batchStart, batchStart + BATCH_SIZE);

    // Prepare batch values with rank positions
    const batchValues = batch.map((user, index) => ({
      userId: user.userId,
      periodType: period,
      periodStart: periodStart, // date column expects ISO date string (YYYY-MM-DD)
      rankPosition: batchStart + index + 1,
      totalTokens: user.totalTokens,
      compositeScore: user.compositeScore.toString(),
      sessionCount: user.sessionCount,
      efficiencyScore: user.efficiencyScore.toString(),
      updatedAt: now,
    }));

    // Batch upsert using raw SQL for optimal performance
    // PostgreSQL's INSERT ... ON CONFLICT with multiple rows
    await pooledDb
      .insert(rankings)
      .values(batchValues)
      .onConflictDoUpdate({
        target: [rankings.userId, rankings.periodType, rankings.periodStart],
        set: {
          rankPosition: sql`EXCLUDED.rank_position`,
          totalTokens: sql`EXCLUDED.total_tokens`,
          compositeScore: sql`EXCLUDED.composite_score`,
          sessionCount: sql`EXCLUDED.session_count`,
          efficiencyScore: sql`EXCLUDED.efficiency_score`,
          updatedAt: sql`EXCLUDED.updated_at`,
        },
      });

    rankingsUpdated += batch.length;
  }

  console.log(
    `[CRON] ${period}: Processed ${scoredUsers.length} users in ${Math.ceil(scoredUsers.length / BATCH_SIZE)} batches`
  );

  return {
    period,
    usersProcessed: userStats.length,
    rankingsUpdated,
  };
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
 * V009: Uses batch processing for better performance
 */
async function updateDailyAggregates(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const pooledDb = getPooledDb();

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

  if (todayStats.length === 0) {
    console.log('[CRON] No daily aggregates to update');
    return;
  }

  // V009: Prepare all values with calculated scores
  const aggregateValues = todayStats
    .filter((stats) => stats.userId !== null)
    .map((stats) => {
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

      return {
        userId: stats.userId as string, // Filtered above, guaranteed non-null
        date: today,
        totalInputTokens: Number(stats.totalInputTokens),
        totalOutputTokens: Number(stats.totalOutputTokens),
        totalCacheTokens: Number(stats.totalCacheTokens),
        sessionCount: Number(stats.sessionCount),
        avgEfficiency: efficiency.toString(),
        compositeScore: compositeScore.toString(),
      };
    });

  // V009: Batch upsert daily aggregates
  for (let batchStart = 0; batchStart < aggregateValues.length; batchStart += BATCH_SIZE) {
    const batch = aggregateValues.slice(batchStart, batchStart + BATCH_SIZE);

    await pooledDb
      .insert(dailyAggregates)
      .values(batch)
      .onConflictDoUpdate({
        target: [dailyAggregates.userId, dailyAggregates.date],
        set: {
          totalInputTokens: sql`EXCLUDED.total_input_tokens`,
          totalOutputTokens: sql`EXCLUDED.total_output_tokens`,
          totalCacheTokens: sql`EXCLUDED.total_cache_tokens`,
          sessionCount: sql`EXCLUDED.session_count`,
          avgEfficiency: sql`EXCLUDED.avg_efficiency`,
          compositeScore: sql`EXCLUDED.composite_score`,
        },
      });
  }

  console.log(
    `[CRON] Daily aggregates: Updated ${aggregateValues.length} users in ${Math.ceil(aggregateValues.length / BATCH_SIZE)} batches`
  );
}

/**
 * OPTIONS /api/cron/calculate-rankings
 * Handle CORS preflight (not typically needed for cron)
 */
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
