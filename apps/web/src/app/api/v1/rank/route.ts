import type { NextRequest } from 'next/server';
import { db, rankings, dailyAggregates } from '@/db';
import { eq, desc, sql } from 'drizzle-orm';
import { successResponse, Errors, corsOptionsResponse } from '@/lib/api-response';
import { validateApiKey, extractApiKey } from '@/lib/auth';
import { logInvalidApiKey, logRateLimitExceeded } from '@/lib/audit';
import { checkRateLimit } from '@/lib/rate-limiter';
import { withCache } from '@/lib/cache';
import { userRankKey } from '@/cache/keys';
import { CACHE_TTL } from '@/cache/config';

/**
 * User rank response for CLI
 */
interface UserRankResponse {
  username: string;
  rankings: {
    daily: RankInfo | null;
    weekly: RankInfo | null;
    monthly: RankInfo | null;
    allTime: RankInfo | null;
  };
  stats: {
    totalTokens: number;
    totalSessions: number;
    inputTokens: number;
    outputTokens: number;
  };
  lastUpdated: string;
}

interface RankInfo {
  position: number;
  compositeScore: number;
  totalParticipants: number;
}

/**
 * GET /api/v1/rank
 *
 * Returns current user's rank and basic stats.
 * Requires API key authentication.
 *
 * Headers:
 * - X-API-Key: User's API key
 */
export async function GET(request: NextRequest) {
  try {
    // Extract and validate API key
    const apiKey = extractApiKey(request.headers);

    if (!apiKey) {
      return Errors.unauthorized('API key required');
    }

    const user = await validateApiKey(apiKey);

    if (!user) {
      // Log invalid API key attempt
      const prefix = apiKey.substring(0, 16);
      await logInvalidApiKey(prefix, '/api/v1/rank', request);
      return Errors.unauthorized('Invalid API key');
    }

    // Distributed rate limiting - 100 requests per minute per user
    const rateLimitResult = await checkRateLimit(user.id);
    if (!rateLimitResult.success) {
      await logRateLimitExceeded(user.id, '/api/v1/rank', request);
      return Errors.rateLimited(
        `Rate limit exceeded. Try again after ${new Date(rateLimitResult.reset).toISOString()}`
      );
    }

    // Fetch user rank data with per-user caching
    const cacheKey = userRankKey(user.id);
    const response = await withCache(cacheKey, CACHE_TTL.USER_RANK, async () => {
      // Get user's rankings for all periods
      const rankingsResult = await db
        .select({
          periodType: rankings.periodType,
          rank: rankings.rankPosition,
          compositeScore: rankings.compositeScore,
          totalTokens: rankings.totalTokens,
          sessionCount: rankings.sessionCount,
          updatedAt: rankings.updatedAt,
        })
        .from(rankings)
        .where(eq(rankings.userId, user.id))
        .orderBy(desc(rankings.updatedAt));

      // Get total participants for each period
      const participantCounts = await db
        .select({
          periodType: rankings.periodType,
          count: sql<number>`count(DISTINCT ${rankings.userId})`,
        })
        .from(rankings)
        .groupBy(rankings.periodType);

      const participantMap: Record<string, number> = {};
      for (const p of participantCounts) {
        participantMap[p.periodType] = Number(p.count);
      }

      // Build ranking info map
      const rankingMap: Record<string, RankInfo> = {};
      for (const r of rankingsResult) {
        if (!rankingMap[r.periodType]) {
          rankingMap[r.periodType] = {
            position: r.rank,
            compositeScore: Number(r.compositeScore),
            totalParticipants: participantMap[r.periodType] ?? 0,
          };
        }
      }

      // Get aggregated stats
      const statsResult = await db
        .select({
          totalInputTokens: sql<number>`COALESCE(SUM(${dailyAggregates.totalInputTokens}), 0)`,
          totalOutputTokens: sql<number>`COALESCE(SUM(${dailyAggregates.totalOutputTokens}), 0)`,
          totalSessions: sql<number>`COALESCE(SUM(${dailyAggregates.sessionCount}), 0)`,
        })
        .from(dailyAggregates)
        .where(eq(dailyAggregates.userId, user.id));

      const stats = statsResult[0];
      const totalInputTokens = Number(stats?.totalInputTokens ?? 0);
      const totalOutputTokens = Number(stats?.totalOutputTokens ?? 0);

      return {
        username: user.githubUsername,
        rankings: {
          daily: rankingMap.daily ?? null,
          weekly: rankingMap.weekly ?? null,
          monthly: rankingMap.monthly ?? null,
          allTime: rankingMap.all_time ?? null,
        },
        stats: {
          totalTokens: totalInputTokens + totalOutputTokens,
          totalSessions: Number(stats?.totalSessions ?? 0),
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
        },
        lastUpdated: new Date().toISOString(),
      } as UserRankResponse;
    });

    return successResponse(response);
  } catch (error) {
    console.error('[API] V1 Rank error:', error);
    return Errors.internalError();
  }
}

/**
 * OPTIONS /api/v1/rank
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return corsOptionsResponse();
}
