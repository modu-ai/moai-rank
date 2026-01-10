import { NextRequest } from "next/server";
import { db, users, rankings, dailyAggregates } from "@/db";
import { eq, desc, sql, and } from "drizzle-orm";
import {
  successResponse,
  Errors,
  corsOptionsResponse,
} from "@/lib/api-response";

/**
 * Public user profile response
 */
interface PublicUserProfile {
  username: string;
  avatarUrl: string | null;
  joinedAt: string;
  stats: {
    totalTokens: number;
    totalSessions: number;
    currentRank: number | null;
    compositeScore: number | null;
  };
  isPrivate: boolean;
}

/**
 * GET /api/users/[username]
 *
 * Returns public user profile with stats.
 * If privacy_mode is true, returns limited info.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    if (!username || username.length < 1) {
      return Errors.validationError("Username is required");
    }

    // Find user by GitHub username
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.githubUsername, username))
      .limit(1);

    const user = userResult[0];

    if (!user) {
      return Errors.notFound("User");
    }

    // If privacy mode is enabled, return limited info
    if (user.privacyMode) {
      const privateProfile: PublicUserProfile = {
        username: "Private User",
        avatarUrl: null,
        joinedAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
        stats: {
          totalTokens: 0,
          totalSessions: 0,
          currentRank: null,
          compositeScore: null,
        },
        isPrivate: true,
      };

      return successResponse(privateProfile);
    }

    // Get user's current all-time ranking
    const rankingResult = await db
      .select({
        rank: rankings.rankPosition,
        totalTokens: rankings.totalTokens,
        compositeScore: rankings.compositeScore,
        sessionCount: rankings.sessionCount,
      })
      .from(rankings)
      .where(
        and(
          eq(rankings.userId, user.id),
          eq(rankings.periodType, "all_time")
        )
      )
      .orderBy(desc(rankings.updatedAt))
      .limit(1);

    const ranking = rankingResult[0];

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

    const profile: PublicUserProfile = {
      username: user.githubUsername,
      avatarUrl: user.githubAvatarUrl,
      joinedAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
      stats: {
        totalTokens: ranking
          ? Number(ranking.totalTokens)
          : Number(stats?.totalInputTokens ?? 0) + Number(stats?.totalOutputTokens ?? 0),
        totalSessions: ranking
          ? ranking.sessionCount
          : Number(stats?.totalSessions ?? 0),
        currentRank: ranking?.rank ?? null,
        compositeScore: ranking?.compositeScore
          ? Number(ranking.compositeScore)
          : null,
      },
      isPrivate: false,
    };

    return successResponse(profile);
  } catch (error) {
    console.error("[API] User profile error:", error);
    return Errors.internalError();
  }
}

/**
 * OPTIONS /api/users/[username]
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return corsOptionsResponse();
}
