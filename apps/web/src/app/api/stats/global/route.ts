import { db, users, sessions, tokenUsage } from "@/db";
import { sql } from "drizzle-orm";
import {
  successResponse,
  Errors,
  corsOptionsResponse,
} from "@/lib/api-response";

/**
 * Global statistics response
 */
interface GlobalStats {
  totalUsers: number;
  totalSessions: number;
  totalTokens: {
    input: number;
    output: number;
    total: number;
  };
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  averageTokensPerSession: number;
  lastUpdated: string;
}

/**
 * GET /api/stats/global
 *
 * Returns global platform statistics.
 * No authentication required.
 */
export async function GET() {
  try {
    // Get total user count
    const userCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    const totalUsers = Number(userCountResult[0]?.count ?? 0);

    // Get total session count
    const sessionCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessions);
    const totalSessions = Number(sessionCountResult[0]?.count ?? 0);

    // Get total token usage
    const tokenStatsResult = await db
      .select({
        totalInput: sql<number>`COALESCE(SUM(${tokenUsage.inputTokens}), 0)`,
        totalOutput: sql<number>`COALESCE(SUM(${tokenUsage.outputTokens}), 0)`,
      })
      .from(tokenUsage);

    const totalInputTokens = Number(tokenStatsResult[0]?.totalInput ?? 0);
    const totalOutputTokens = Number(tokenStatsResult[0]?.totalOutput ?? 0);
    const totalTokens = totalInputTokens + totalOutputTokens;

    // Get active users (users with sessions in the period)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dailyActiveResult = await db
      .select({ count: sql<number>`count(DISTINCT ${sessions.userId})` })
      .from(sessions)
      .where(sql`${sessions.createdAt} >= ${oneDayAgo.toISOString()}`);

    const weeklyActiveResult = await db
      .select({ count: sql<number>`count(DISTINCT ${sessions.userId})` })
      .from(sessions)
      .where(sql`${sessions.createdAt} >= ${oneWeekAgo.toISOString()}`);

    const monthlyActiveResult = await db
      .select({ count: sql<number>`count(DISTINCT ${sessions.userId})` })
      .from(sessions)
      .where(sql`${sessions.createdAt} >= ${oneMonthAgo.toISOString()}`);

    // Calculate average tokens per session
    const averageTokensPerSession =
      totalSessions > 0 ? Math.round(totalTokens / totalSessions) : 0;

    const stats: GlobalStats = {
      totalUsers,
      totalSessions,
      totalTokens: {
        input: totalInputTokens,
        output: totalOutputTokens,
        total: totalTokens,
      },
      activeUsers: {
        daily: Number(dailyActiveResult[0]?.count ?? 0),
        weekly: Number(weeklyActiveResult[0]?.count ?? 0),
        monthly: Number(monthlyActiveResult[0]?.count ?? 0),
      },
      averageTokensPerSession,
      lastUpdated: now.toISOString(),
    };

    return successResponse(stats);
  } catch (error) {
    console.error("[API] Global stats error:", error);
    return Errors.internalError();
  }
}

/**
 * OPTIONS /api/stats/global
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return corsOptionsResponse();
}
