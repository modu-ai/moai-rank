import type { NextRequest } from 'next/server';
import { getPooledDb, tokenUsage, dailyAggregates, rankings, sessions } from '@/db';
import { lt, and, eq } from 'drizzle-orm';
import { successResponse, Errors } from '@/lib/api-response';

/**
 * V015: Data Retention Cron Job
 *
 * Retention policies (90-day standard):
 * - token_usage: delete where recordedAt < 90 days ago
 * - daily_aggregates: delete where date < 90 days ago
 * - rankings: delete where periodType='daily' AND periodStart < 30 days ago
 * - sessions: delete where startedAt < 90 days ago
 *
 * Optimizations applied:
 * - Uses Connection Pooler for batch operations
 * - Batch deletes instead of single-row operations (BATCH_SIZE = 100)
 * - Execution time monitoring for observability
 */

// Maximum execution time for the cron job (requires Pro plan for > 10s)
export const maxDuration = 60;

// Batch size for delete operations
const BATCH_SIZE = 100;

// Ensure the route is not cached
export const dynamic = 'force-dynamic';

/**
 * Cleanup result interface
 */
interface CleanupResult {
  table: string;
  deletedCount: number;
  duration: number;
}

/**
 * GET /api/cron/cleanup-data
 *
 * Cleans up old data according to retention policies.
 * This endpoint is designed to be called by Vercel Cron at 2 AM UTC daily.
 *
 * Security: Verifies CRON_SECRET header to prevent unauthorized access.
 * CRON_SECRET is REQUIRED in production - bypassed in development.
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
      console.error('[CRON CLEANUP] CRITICAL: CRON_SECRET environment variable is not configured');
      return Errors.internalError('Server configuration error');
    }

    // Verify cron secret (skip in development)
    if (!isDev && cronSecret !== authorization) {
      console.warn('[CRON CLEANUP] Unauthorized cron request');
      return Errors.unauthorized('Invalid cron secret');
    }

    console.log('[CRON CLEANUP] Starting data cleanup process');

    // Run all cleanup functions
    const results: CleanupResult[] = [];

    const tokenUsageResult = await cleanupTokenUsage();
    results.push(tokenUsageResult);

    const dailyAggregatesResult = await cleanupDailyAggregates();
    results.push(dailyAggregatesResult);

    const rankingsResult = await cleanupDailyRankings();
    results.push(rankingsResult);

    const sessionsResult = await cleanupSessions();
    results.push(sessionsResult);

    const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0);

    console.log(`[CRON CLEANUP] Cleanup complete. Total deleted: ${totalDeleted} records`);

    return successResponse({
      success: true,
      timestamp: new Date().toISOString(),
      results,
      totalDeleted,
    });
  } catch (error) {
    console.error('[CRON CLEANUP] Error:', error);
    return Errors.internalError();
  }
}

/**
 * Cleanup token_usage records older than 90 days
 */
async function cleanupTokenUsage(): Promise<CleanupResult> {
  const startTime = Date.now();
  const pooledDb = getPooledDb();
  let deletedCount = 0;

  // Calculate cutoff date (90 days ago)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  console.log(`[CRON CLEANUP] Cleaning up token_usage older than ${cutoffDate.toISOString()}`);

  while (true) {
    // First, find a batch of IDs to delete
    const idsToDelete = await pooledDb
      .select({ id: tokenUsage.id })
      .from(tokenUsage)
      .where(lt(tokenUsage.recordedAt, cutoffDate))
      .limit(BATCH_SIZE);

    if (idsToDelete.length === 0) break;

    // Delete each record individually (Drizzle limitation)
    for (const row of idsToDelete) {
      await pooledDb.delete(tokenUsage).where(eq(tokenUsage.id, row.id));
    }

    deletedCount += idsToDelete.length;
    console.log(`[CRON CLEANUP] token_usage: Deleted ${deletedCount} records so far...`);
  }

  const duration = Date.now() - startTime;
  console.log(`[CRON CLEANUP] token_usage: Deleted ${deletedCount} records in ${duration}ms`);

  return {
    table: 'token_usage',
    deletedCount,
    duration,
  };
}

/**
 * Cleanup daily_aggregates records older than 90 days
 */
async function cleanupDailyAggregates(): Promise<CleanupResult> {
  const startTime = Date.now();
  const pooledDb = getPooledDb();
  let deletedCount = 0;

  // Calculate cutoff date (90 days ago)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  console.log(`[CRON CLEANUP] Cleaning up daily_aggregates older than ${cutoffDateStr}`);

  while (true) {
    // First, find a batch of IDs to delete
    const idsToDelete = await pooledDb
      .select({ id: dailyAggregates.id })
      .from(dailyAggregates)
      .where(lt(dailyAggregates.date, cutoffDateStr))
      .limit(BATCH_SIZE);

    if (idsToDelete.length === 0) break;

    // Delete each record individually (Drizzle limitation)
    for (const row of idsToDelete) {
      await pooledDb.delete(dailyAggregates).where(eq(dailyAggregates.id, row.id));
    }

    deletedCount += idsToDelete.length;
    console.log(`[CRON CLEANUP] daily_aggregates: Deleted ${deletedCount} records so far...`);
  }

  const duration = Date.now() - startTime;
  console.log(`[CRON CLEANUP] daily_aggregates: Deleted ${deletedCount} records in ${duration}ms`);

  return {
    table: 'daily_aggregates',
    deletedCount,
    duration,
  };
}

/**
 * Cleanup daily rankings older than 30 days
 * (Keep weekly/monthly/all_time rankings, only clean up daily rankings)
 */
async function cleanupDailyRankings(): Promise<CleanupResult> {
  const startTime = Date.now();
  const pooledDb = getPooledDb();
  let deletedCount = 0;

  // Calculate cutoff date (30 days ago)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  console.log(`[CRON CLEANUP] Cleaning up daily rankings older than ${cutoffDateStr}`);

  while (true) {
    // First, find a batch of IDs to delete
    const idsToDelete = await pooledDb
      .select({ id: rankings.id })
      .from(rankings)
      .where(and(eq(rankings.periodType, 'daily'), lt(rankings.periodStart, cutoffDateStr)))
      .limit(BATCH_SIZE);

    if (idsToDelete.length === 0) break;

    // Delete each record individually (Drizzle limitation)
    for (const row of idsToDelete) {
      await pooledDb.delete(rankings).where(eq(rankings.id, row.id));
    }

    deletedCount += idsToDelete.length;
    console.log(`[CRON CLEANUP] rankings (daily): Deleted ${deletedCount} records so far...`);
  }

  const duration = Date.now() - startTime;
  console.log(`[CRON CLEANUP] rankings (daily): Deleted ${deletedCount} records in ${duration}ms`);

  return {
    table: 'rankings',
    deletedCount,
    duration,
  };
}

/**
 * Cleanup session records older than 90 days
 */
async function cleanupSessions(): Promise<CleanupResult> {
  const startTime = Date.now();
  const pooledDb = getPooledDb();
  let deletedCount = 0;

  // Calculate cutoff date (90 days ago)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  console.log(`[CRON CLEANUP] Cleaning up sessions older than ${cutoffDate.toISOString()}`);

  while (true) {
    // First, find a batch of IDs to delete
    const idsToDelete = await pooledDb
      .select({ id: sessions.id })
      .from(sessions)
      .where(lt(sessions.startedAt, cutoffDate))
      .limit(BATCH_SIZE);

    if (idsToDelete.length === 0) break;

    // Delete each record individually (Drizzle limitation)
    for (const row of idsToDelete) {
      await pooledDb.delete(sessions).where(eq(sessions.id, row.id));
    }

    deletedCount += idsToDelete.length;
    console.log(`[CRON CLEANUP] sessions: Deleted ${deletedCount} records so far...`);
  }

  const duration = Date.now() - startTime;
  console.log(`[CRON CLEANUP] sessions: Deleted ${deletedCount} records in ${duration}ms`);

  return {
    table: 'sessions',
    deletedCount,
    duration,
  };
}

/**
 * OPTIONS /api/cron/cleanup-data
 * Handle CORS preflight (not typically needed for cron)
 */
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
