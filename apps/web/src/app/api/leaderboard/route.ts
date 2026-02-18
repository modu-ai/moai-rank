import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { db, users, rankings } from '@/db';
import { eq, and, sql } from 'drizzle-orm';
import {
  Errors,
  createPaginationMeta,
  paginatedResponse,
  corsOptionsResponse,
} from '@/lib/api-response';
import { checkPublicRateLimit, extractIpAddress } from '@/lib/rate-limiter';
import { getPeriodStart } from '@/lib/date-utils';
import { withCache, set as cacheSet } from '@/lib/cache';
import { leaderboardKey } from '@/cache/keys';
import { CACHE_TTL } from '@/cache/config';

/**
 * Query parameters schema for leaderboard
 */
const LeaderboardQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'all_time']).optional().default('weekly'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

/**
 * Leaderboard entry response type
 */
interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalTokens: number;
  compositeScore: number;
  sessionCount: number;
  efficiencyScore: number | null;
  isPrivate: boolean;
}

/**
 * GET /api/leaderboard
 *
 * Returns the leaderboard rankings for a given period.
 * Respects user privacy settings.
 *
 * Query params:
 * - period: 'daily' | 'weekly' | 'monthly' | 'all_time' (default: 'weekly')
 * - limit: number (1-100, default: 50)
 * - offset: number (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    // IP-based rate limiting for public endpoint
    const ipAddress = extractIpAddress(request.headers);
    const rateLimitResult = await checkPublicRateLimit(ipAddress);
    if (!rateLimitResult.success) {
      return Errors.rateLimited(
        `Rate limit exceeded. Try again after ${new Date(rateLimitResult.reset).toISOString()}`
      );
    }

    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const parseResult = LeaderboardQuerySchema.safeParse({
      period: searchParams.get('period'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    if (!parseResult.success) {
      return Errors.validationError('Invalid query parameters', {
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const { period, limit, offset } = parseResult.data;

    // Get period start date using yesterday as base to match cron job calculation
    // The cron job calculates rankings based on yesterday's complete data
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const periodStart = getPeriodStart(period, yesterday);

    // Cache configuration
    const cacheKey = leaderboardKey(period, limit, offset);
    const defaultTtl = CACHE_TTL.LEADERBOARD[period];
    // Use short TTL (5 min) for empty results so data appears quickly once available
    const EMPTY_RESULT_TTL = 5 * 60;

    // Fetch data with caching
    const result = await withCache(cacheKey, defaultTtl, async () => {
      // Query rankings with user info and total count in a single query
      // using COUNT(*) OVER() window function to avoid a second round-trip
      const rankingsData = await db
        .select({
          rank: rankings.rankPosition,
          userId: rankings.userId,
          username: users.githubUsername,
          avatarUrl: users.githubAvatarUrl,
          totalTokens: rankings.totalTokens,
          compositeScore: rankings.compositeScore,
          sessionCount: rankings.sessionCount,
          efficiencyScore: rankings.efficiencyScore,
          privacyMode: users.privacyMode,
          totalCount: sql<number>`COUNT(*) OVER()`,
        })
        .from(rankings)
        .innerJoin(users, eq(rankings.userId, users.id))
        .where(and(eq(rankings.periodType, period), eq(rankings.periodStart, periodStart)))
        .orderBy(rankings.rankPosition)
        .limit(limit)
        .offset(offset);

      const total = Number(rankingsData[0]?.totalCount ?? 0);

      // Transform data respecting privacy settings
      const entries: LeaderboardEntry[] = rankingsData.map((r) => ({
        rank: r.rank,
        userId: r.privacyMode ? 'private' : (r.userId ?? 'unknown'),
        username: r.privacyMode ? `User #${r.rank}` : r.username,
        avatarUrl: r.privacyMode ? null : r.avatarUrl,
        totalTokens: Number(r.totalTokens),
        compositeScore: Number(r.compositeScore),
        sessionCount: r.sessionCount,
        efficiencyScore: r.efficiencyScore ? Number(r.efficiencyScore) : null,
        isPrivate: r.privacyMode ?? false,
      }));

      const pagination = createPaginationMeta(Math.floor(offset / limit) + 1, limit, total);

      return { entries, pagination };
    });

    // Re-cache with short TTL if result is empty, so data appears quickly once available
    if (result.entries.length === 0 && defaultTtl > EMPTY_RESULT_TTL) {
      await cacheSet(cacheKey, result, EMPTY_RESULT_TTL);
    }

    return paginatedResponse(result.entries, result.pagination);
  } catch (error) {
    console.error('[API] Leaderboard error:', error);
    return Errors.internalError();
  }
}

/**
 * OPTIONS /api/leaderboard
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return corsOptionsResponse();
}
