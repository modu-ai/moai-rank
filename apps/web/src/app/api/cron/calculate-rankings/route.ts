import type { NextRequest } from 'next/server';
import { db, getPooledDb, users, dailyAggregates, rankings, tokenUsage } from '@/db';
import { eq, sql, gte, and } from 'drizzle-orm';
import { successResponse, Errors } from '@/lib/api-response';
import { calculateCompositeScore, calculateEfficiencyScore } from '@/lib/score';
import { getPeriodStart, getPeriodEnd } from '@/lib/date-utils';
import { delPattern } from '@/lib/cache';

/**
 * V009: Cron Job Configuration
 *
 * Optimizations applied:
 * - Uses Connection Pooler for batch operations
 * - Batch upserts instead of N+1 pattern (BATCH_SIZE = 100)
 * - Execution time monitoring for observability
 * - V010: Per-period error isolation and independent streak calculation
 * - V011: Optimized aggregation query with direct token_usage scan
 * - V012: Per-period cache invalidation and independent daily aggregates
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
  status: 'success' | 'error';
  usersProcessed: number;
  rankingsUpdated: number;
  executionTimeMs: number;
  error?: string;
}

/**
 * GET /api/cron/calculate-rankings
 *
 * Calculates and updates rankings for all periods.
 * This endpoint is designed to be called by Vercel Cron.
 *
 * Security: Verifies CRON_SECRET header to prevent unauthorized access.
 * V012: CRON_SECRET is REQUIRED in production - bypassed in development.
 *
 * V010: Per-period error isolation ensures all periods are attempted
 * even if one fails. Cache invalidation is immediate per period.
 */
export async function GET(request: NextRequest): Promise<Response> {
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
    const periods: PeriodType[] = ['daily', 'weekly', 'monthly', 'all_time'];

    // V010: Calculate streaks ONCE before the period loop
    // Instead of recalculating for each period, share the same streak data
    console.log('[CRON] Calculating streaks (shared across all periods)...');
    const streakStartTime = Date.now();
    const streakData = await calculateStreaks();
    const streakTimeMs = Date.now() - streakStartTime;
    console.log(`[CRON] Streak calculation completed in ${streakTimeMs}ms for ${streakData.size} users`);

    // V010: Create pooledDb ONCE before the period loop
    const pooledDb = getPooledDb();

    // V010: Per-period error isolation - each period runs independently
    for (const period of periods) {
      const startTime = Date.now();
      try {
        console.log(`[CRON] Starting ${period} rankings calculation...`);
        const result = await calculateRankingsForPeriod(period, streakData, pooledDb);

        // V010: Immediate per-period cache invalidation
        // Don't wait until all periods complete - invalidate right after success
        try {
          const pattern = `moai-rank:leaderboard:${period}:*`;
          const cacheCount = await delPattern(pattern);
          console.log(`[CRON] Invalidated ${cacheCount} leaderboard caches for period: ${period}`);
        } catch (cacheError) {
          console.error(`[CRON] Cache invalidation failed for ${period}:`, cacheError);
          // Continue even if cache invalidation fails - it's not critical
        }

        const executionTimeMs = Date.now() - startTime;
        results.push({
          ...result,
          executionTimeMs,
        });
        console.log(`[CRON] ${period} completed successfully in ${executionTimeMs}ms`);
      } catch (periodError) {
        const executionTimeMs = Date.now() - startTime;
        const errorMessage = periodError instanceof Error ? periodError.message : String(periodError);
        console.error(`[CRON] ${period} calculation failed after ${executionTimeMs}ms:`, periodError);
        results.push({
          period,
          status: 'error',
          usersProcessed: 0,
          rankingsUpdated: 0,
          executionTimeMs,
          error: errorMessage,
        });
        // Continue to next period instead of failing entirely
      }
    }

    // V010: Daily aggregates independent - runs in its own try-catch
    try {
      console.log('[CRON] Updating daily aggregates...');
      const aggregateStartTime = Date.now();
      await updateDailyAggregates(pooledDb);
      const aggregateTimeMs = Date.now() - aggregateStartTime;
      console.log(`[CRON] Daily aggregates updated in ${aggregateTimeMs}ms`);
    } catch (aggregateError) {
      console.error('[CRON] Daily aggregates update failed:', aggregateError);
      // Continue even if daily aggregates fail - rankings are more important
    }

    // V010: Return summary with per-period status
    const successCount = results.filter((r) => r.status === 'success').length;
    const errorCount = results.filter((r) => r.status === 'error').length;
    const totalTimeMs = results.reduce((sum, r) => sum + r.executionTimeMs, 0);

    console.log(
      `[CRON] Complete: ${successCount}/${periods.length} periods succeeded, ${errorCount} failed, total time: ${totalTimeMs}ms`
    );

    return successResponse({
      success: errorCount === 0,
      timestamp: new Date().toISOString(),
      summary: {
        periods_succeeded: successCount,
        periods_failed: errorCount,
        total_execution_time_ms: totalTimeMs,
      },
      results,
    });
  } catch (error) {
    console.error('[CRON] Calculate rankings error:', error);
    return Errors.internalError();
  }
}

/**
 * Calculate rankings for a specific period
 *
 * V013: Uses yesterday's date as the base for ranking calculation.
 * This ensures that when cron runs daily, it generates rankings for
 * the previous day, allowing each day to have its own ranking record.
 *
 * V010: Accepts pre-calculated streak data and pooledDb instance
 * to avoid redundant calculations across periods.
 *
 * V011: Uses optimized query pattern - queries token_usage directly
 * instead of LEFT JOIN users, filtering by userId IS NOT NULL.
 */
async function calculateRankingsForPeriod(
  period: PeriodType,
  streakData: Map<string, number>,
  pooledDb: ReturnType<typeof getPooledDb>
): Promise<RankingCalculationResult> {
  // Use yesterday as the base date for ranking calculation
  // This ensures each day gets its own ranking record
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const periodStart = getPeriodStart(period, yesterday);
  const periodEnd = getPeriodEnd(period, yesterday);
  const now = yesterday; // Use yesterday for updatedAt timestamp

  // V011: Optimized query - scan token_usage directly instead of LEFT JOIN users
  // This avoids scanning all users even those with no activity.
  // Group by userId and filter where inputTokens > 0, which naturally excludes
  // users with no token usage in this period.
  const rawStats = await db
    .select({
      userId: tokenUsage.userId,
      totalInputTokens: sql<number>`COALESCE(SUM(${tokenUsage.inputTokens}), 0)`,
      totalOutputTokens: sql<number>`COALESCE(SUM(${tokenUsage.outputTokens}), 0)`,
      sessionCount: sql<number>`COUNT(DISTINCT ${tokenUsage.sessionId})`,
    })
    .from(tokenUsage)
    .where(
      and(
        period === 'all_time'
          ? sql`1=1`
          : and(
              gte(tokenUsage.recordedAt, new Date(periodStart)),
              sql`${tokenUsage.recordedAt} < ${new Date(periodEnd)}`
            ),
        sql`${tokenUsage.userId} IS NOT NULL`
      )
    )
    .groupBy(tokenUsage.userId)
    .having(sql`COALESCE(SUM(${tokenUsage.inputTokens}), 0) > 0`);

  // Filter null userIds for type safety (SQL WHERE already excludes them)
  const userStats = rawStats.filter(
    (r): r is typeof r & { userId: string } => r.userId !== null
  );

  if (userStats.length === 0) {
    return {
      period,
      status: 'success',
      usersProcessed: 0,
      rankingsUpdated: 0,
      executionTimeMs: 0,
    };
  }

  // V010: Use pre-calculated streak data instead of calculating for each period
  // This eliminates redundant queries - calculateStreaks() already has the data
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
  // Process in batches for better performance
  let rankingsUpdated = 0;

  for (const batchStart of Array.from({ length: Math.ceil(scoredUsers.length / BATCH_SIZE) }, (_, i) => i * BATCH_SIZE)) {
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
    status: 'success',
    usersProcessed: userStats.length,
    rankingsUpdated,
    executionTimeMs: 0, // Set by caller
  };
}

/**
 * Calculate activity streaks for all users
 * Returns a map of userId -> streak days
 *
 * V010: Called ONCE before the period loop to avoid redundant
 * stripe calculations. Result is shared across all periods.
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
    .where(and(gte(tokenUsage.recordedAt, thirtyDaysAgo), sql`${tokenUsage.userId} IS NOT NULL`))
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
 *
 * V010: Accepts pooledDb instance as parameter instead of creating new one
 * V010: Wrapped in try-catch at caller level for independent error handling
 */
async function updateDailyAggregates(pooledDb: ReturnType<typeof getPooledDb>): Promise<void> {
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
export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204 });
}
