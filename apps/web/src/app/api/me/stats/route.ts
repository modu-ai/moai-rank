import { auth } from "@clerk/nextjs/server";
import { db, users, rankings, dailyAggregates, } from "@/db";
import { eq, desc, and, sql, gte } from "drizzle-orm";
import { successResponse, Errors } from "@/lib/api-response";

/**
 * User detailed statistics response
 */
interface UserDetailedStats {
  overview: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    totalSessions: number;
    averageTokensPerSession: number;
    efficiencyScore: number;
  };
  rankings: {
    daily: RankInfo | null;
    weekly: RankInfo | null;
    monthly: RankInfo | null;
    allTime: RankInfo | null;
  };
  trends: {
    last7Days: DailyStats[];
    last30Days: DailyStats[];
  };
  streaks: {
    current: number;
    longest: number;
  };
}

interface RankInfo {
  position: number;
  compositeScore: number;
  percentile: number;
}

interface DailyStats {
  date: string;
  inputTokens: number;
  outputTokens: number;
  sessions: number;
}

/**
 * GET /api/me/stats
 *
 * Returns detailed statistics for current authenticated user.
 * Includes token usage trends and ranking history.
 * Requires Clerk authentication.
 */
export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return Errors.unauthorized();
    }

    // Find user by Clerk ID
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    const user = userResult[0];

    if (!user) {
      return Errors.notFound("User");
    }

    // Get all rankings for the user
    const rankingsResult = await db
      .select({
        periodType: rankings.periodType,
        rank: rankings.rankPosition,
        compositeScore: rankings.compositeScore,
        totalTokens: rankings.totalTokens,
        sessionCount: rankings.sessionCount,
      })
      .from(rankings)
      .where(eq(rankings.userId, user.id))
      .orderBy(desc(rankings.updatedAt));

    // Get total user count for percentile calculation
    const totalUsersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    const totalUsers = Number(totalUsersResult[0]?.count ?? 1);

    // Build ranking info map
    const rankingMap: Record<string, RankInfo> = {};
    for (const r of rankingsResult) {
      if (!rankingMap[r.periodType]) {
        const percentile = ((totalUsers - r.rank) / totalUsers) * 100;
        rankingMap[r.periodType] = {
          position: r.rank,
          compositeScore: Number(r.compositeScore),
          percentile: Math.round(percentile * 100) / 100,
        };
      }
    }

    // Get daily aggregates for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyStatsResult = await db
      .select({
        date: dailyAggregates.date,
        inputTokens: dailyAggregates.totalInputTokens,
        outputTokens: dailyAggregates.totalOutputTokens,
        sessions: dailyAggregates.sessionCount,
      })
      .from(dailyAggregates)
      .where(
        and(
          eq(dailyAggregates.userId, user.id),
          gte(dailyAggregates.date, thirtyDaysAgo.toISOString().split("T")[0])
        )
      )
      .orderBy(desc(dailyAggregates.date));

    const dailyStats: DailyStats[] = dailyStatsResult.map((d) => ({
      date: d.date,
      inputTokens: Number(d.inputTokens ?? 0),
      outputTokens: Number(d.outputTokens ?? 0),
      sessions: d.sessions ?? 0,
    }));

    // Calculate totals from daily stats
    const totalInputTokens = dailyStats.reduce((sum, d) => sum + d.inputTokens, 0);
    const totalOutputTokens = dailyStats.reduce((sum, d) => sum + d.outputTokens, 0);
    const totalSessions = dailyStats.reduce((sum, d) => sum + d.sessions, 0);

    // Calculate streaks
    const streaks = calculateStreaks(dailyStats);

    // Calculate efficiency score
    const efficiencyScore =
      totalInputTokens > 0
        ? Math.round((totalOutputTokens / totalInputTokens) * 10000) / 10000
        : 0;

    // Split into 7-day and 30-day trends
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const last7Days = dailyStats.filter((d) => d.date >= sevenDaysAgoStr);
    const last30Days = dailyStats;

    const stats: UserDetailedStats = {
      overview: {
        totalInputTokens,
        totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
        totalSessions,
        averageTokensPerSession:
          totalSessions > 0
            ? Math.round((totalInputTokens + totalOutputTokens) / totalSessions)
            : 0,
        efficiencyScore,
      },
      rankings: {
        daily: rankingMap.daily ?? null,
        weekly: rankingMap.weekly ?? null,
        monthly: rankingMap.monthly ?? null,
        allTime: rankingMap.all_time ?? null,
      },
      trends: {
        last7Days,
        last30Days,
      },
      streaks,
    };

    return successResponse(stats);
  } catch (error) {
    console.error("[API] Me stats error:", error);
    return Errors.internalError();
  }
}

/**
 * Calculate current and longest streaks from daily stats
 */
function calculateStreaks(dailyStats: DailyStats[]): {
  current: number;
  longest: number;
} {
  if (dailyStats.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Sort by date descending (most recent first)
  const sorted = [...dailyStats].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate: Date | null = null;

  // Check if most recent day is today or yesterday for current streak
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const mostRecentDate = new Date(sorted[0].date);
  mostRecentDate.setHours(0, 0, 0, 0);

  const isCurrentStreakActive =
    mostRecentDate.getTime() === today.getTime() ||
    mostRecentDate.getTime() === yesterday.getTime();

  for (const day of sorted) {
    const currentDate = new Date(day.date);
    currentDate.setHours(0, 0, 0, 0);

    if (day.sessions > 0) {
      if (lastDate === null) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round(
          (lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      lastDate = currentDate;
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak);
  currentStreak = isCurrentStreakActive ? tempStreak : 0;

  return { current: currentStreak, longest: longestStreak };
}
