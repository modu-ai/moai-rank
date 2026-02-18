import type { NextRequest } from 'next/server';
import { db, users, rankings, dailyAggregates, sessions, tokenUsage } from '@/db';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import { successResponse, Errors, corsOptionsResponse } from '@/lib/api-response';
import { checkPublicRateLimit, extractIpAddress } from '@/lib/rate-limiter';

/** Distributes 100% among values using largest-remainder method to ensure sum = 100 */
function distributePercentages(counts: number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return counts.map(() => 0);
  const exact = counts.map(c => (c / total) * 100);
  const floors = exact.map(Math.floor);
  const remainder = 100 - floors.reduce((a, b) => a + b, 0);
  const indices = exact
    .map((v, i) => ({ diff: v - floors[i], i }))
    .sort((a, b) => b.diff - a.diff);
  for (let k = 0; k < remainder; k++) floors[indices[k].i]++;
  return floors;
}

/**
 * Daily activity data for heatmap
 */
interface DailyActivity {
  date: string;
  tokens: number;
  sessions: number;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Model usage breakdown
 */
interface ModelUsage {
  modelName: string;
  sessionCount: number;
  percentage: number;
}

/**
 * Token breakdown
 */
interface TokenBreakdown {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

/**
 * Streak information
 */
interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

/**
 * Hourly activity pattern (0-23 hours)
 */
interface HourlyActivity {
  hour: number;
  tokens: number;
  sessions: number;
}

/**
 * Day of week activity pattern (0=Sunday, 6=Saturday)
 */
interface DayOfWeekActivity {
  dayOfWeek: number;
  dayName: string;
  tokens: number;
  sessions: number;
  avgTokensPerSession: number;
}

/**
 * Code productivity metrics
 */
interface CodeMetrics {
  linesAdded: number;
  linesDeleted: number;
  filesModified: number;
  filesCreated: number;
  productivity: number; // linesAdded / turnCount
  refactorRatio: number; // linesDeleted / linesAdded
}

/**
 * Tool usage pattern
 */
interface ToolUsagePattern {
  toolName: string;
  count: number;
  percentage: number;
}

/**
 * Vibe coding style analysis
 */
interface VibeStyle {
  primaryStyle: 'Explorer' | 'Creator' | 'Refactorer' | 'Automator';
  styleScores: {
    explorer: number; // Read, Grep, Glob percentage
    creator: number; // Write percentage
    refactorer: number; // Edit percentage
    automator: number; // Bash, Task percentage
  };
  avgSessionDuration: number;
  avgTurnsPerSession: number;
}

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
  tokenBreakdown: TokenBreakdown | null;
  modelUsage: ModelUsage[];
  dailyActivity: DailyActivity[];
  hourlyActivity: HourlyActivity[];
  dayOfWeekActivity: DayOfWeekActivity[];
  streak: StreakInfo | null;
  // New: Vibe Coding Analytics
  codeMetrics: CodeMetrics | null;
  toolUsage: ToolUsagePattern[];
  vibeStyle: VibeStyle | null;
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
    // V011: IP-based rate limiting for public endpoint (DoS protection)
    const ipAddress = extractIpAddress(request.headers);
    const rateLimitResult = await checkPublicRateLimit(ipAddress);
    if (!rateLimitResult.success) {
      return Errors.rateLimited(
        `Rate limit exceeded. Try again after ${new Date(rateLimitResult.reset).toISOString()}`
      );
    }

    const { username } = await params;

    if (!username || username.length < 1) {
      return Errors.validationError('Username is required');
    }

    // Find user by GitHub username
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.githubUsername, username))
      .limit(1);

    const user = userResult[0];

    if (!user) {
      return Errors.notFound('User');
    }

    // If privacy mode is enabled, return limited info
    if (user.privacyMode) {
      const privateProfile: PublicUserProfile = {
        username: 'Private User',
        avatarUrl: null,
        joinedAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
        stats: {
          totalTokens: 0,
          totalSessions: 0,
          currentRank: null,
          compositeScore: null,
        },
        tokenBreakdown: null,
        modelUsage: [],
        dailyActivity: [],
        hourlyActivity: [],
        dayOfWeekActivity: [],
        streak: null,
        codeMetrics: null,
        toolUsage: [],
        vibeStyle: null,
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
      .where(and(eq(rankings.userId, user.id), eq(rankings.periodType, 'all_time')))
      .orderBy(desc(rankings.updatedAt))
      .limit(1);

    const ranking = rankingResult[0];

    // Get aggregated stats with token breakdown
    const statsResult = await db
      .select({
        totalInputTokens: sql<number>`COALESCE(SUM(${dailyAggregates.totalInputTokens}), 0)`,
        totalOutputTokens: sql<number>`COALESCE(SUM(${dailyAggregates.totalOutputTokens}), 0)`,
        totalCacheTokens: sql<number>`COALESCE(SUM(${dailyAggregates.totalCacheTokens}), 0)`,
        totalSessions: sql<number>`COALESCE(SUM(${dailyAggregates.sessionCount}), 0)`,
      })
      .from(dailyAggregates)
      .where(eq(dailyAggregates.userId, user.id));

    const stats = statsResult[0];

    // Get detailed token breakdown from tokenUsage
    const tokenBreakdownResult = await db
      .select({
        inputTokens: sql<number>`COALESCE(SUM(${tokenUsage.inputTokens}), 0)`,
        outputTokens: sql<number>`COALESCE(SUM(${tokenUsage.outputTokens}), 0)`,
        cacheCreationTokens: sql<number>`COALESCE(SUM(${tokenUsage.cacheCreationTokens}), 0)`,
        cacheReadTokens: sql<number>`COALESCE(SUM(${tokenUsage.cacheReadTokens}), 0)`,
      })
      .from(tokenUsage)
      .where(eq(tokenUsage.userId, user.id));

    const tokenData = tokenBreakdownResult[0];
    const inputTokens = Number(tokenData?.inputTokens ?? 0);
    const outputTokens = Number(tokenData?.outputTokens ?? 0);
    const cacheCreationTokens = Number(tokenData?.cacheCreationTokens ?? 0);
    const cacheReadTokens = Number(tokenData?.cacheReadTokens ?? 0);
    const totalTokens = inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens;

    // Calculate estimated cost (using Claude Sonnet 4 pricing as default)
    // Input: $3/MTok, Output: $15/MTok, Cache Creation: $3.75/MTok, Cache Read: $0.30/MTok
    const estimatedCost =
      (inputTokens / 1_000_000) * 3.0 +
      (outputTokens / 1_000_000) * 15.0 +
      (cacheCreationTokens / 1_000_000) * 3.75 +
      (cacheReadTokens / 1_000_000) * 0.3;

    const tokenBreakdown: TokenBreakdown = {
      inputTokens,
      outputTokens,
      cacheCreationTokens,
      cacheReadTokens,
      totalTokens,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
    };

    // Get model usage breakdown
    const modelUsageResult = await db
      .select({
        modelName: sessions.modelName,
        sessionCount: sql<number>`COUNT(*)`,
      })
      .from(sessions)
      .where(eq(sessions.userId, user.id))
      .groupBy(sessions.modelName);

    const totalModelSessions = modelUsageResult.reduce((sum, m) => sum + Number(m.sessionCount), 0);

    const filteredModels = modelUsageResult.filter((m) => m.modelName);
    const modelCounts = filteredModels.map((m) => Number(m.sessionCount));
    const modelPercentages = distributePercentages(modelCounts);

    const modelUsage: ModelUsage[] = filteredModels
      .map((m, i) => ({
        modelName: m.modelName ?? 'unknown',
        sessionCount: Number(m.sessionCount),
        percentage: totalModelSessions > 0 ? modelPercentages[i] : 0,
      }))
      .sort((a, b) => b.sessionCount - a.sessionCount);

    // Get daily activity for last 365 days (for heatmap)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

    const dailyActivityResult = await db
      .select({
        date: dailyAggregates.date,
        inputTokens: dailyAggregates.totalInputTokens,
        outputTokens: dailyAggregates.totalOutputTokens,
        sessions: dailyAggregates.sessionCount,
      })
      .from(dailyAggregates)
      .where(and(eq(dailyAggregates.userId, user.id), gte(dailyAggregates.date, oneYearAgoStr)))
      .orderBy(dailyAggregates.date);

    const dailyActivity: DailyActivity[] = dailyActivityResult.map((d) => ({
      date: d.date,
      tokens: Number(d.inputTokens ?? 0) + Number(d.outputTokens ?? 0),
      sessions: Number(d.sessions ?? 0),
      inputTokens: Number(d.inputTokens ?? 0),
      outputTokens: Number(d.outputTokens ?? 0),
    }));

    // Calculate streak
    const sortedDates = dailyActivityResult
      .filter((d) => Number(d.sessions ?? 0) > 0)
      .map((d) => d.date)
      .sort()
      .reverse();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (sortedDates.length > 0) {
      const lastActive = sortedDates[0];

      // Check if streak is active (last activity was today or yesterday)
      if (lastActive === today || lastActive === yesterday) {
        currentStreak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const prevDate = new Date(sortedDates[i - 1]);
          const currDate = new Date(sortedDates[i]);
          const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / 86400000);

          if (diffDays === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Calculate longest streak
      tempStreak = 1;
      longestStreak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / 86400000);

        if (diffDays === 1) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
      }
    }

    const streak: StreakInfo = {
      currentStreak,
      longestStreak,
      lastActiveDate: sortedDates[0] ?? null,
    };

    // Calculate hourly activity pattern from sessions
    const hourlyActivityResult = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM (${sessions.endedAt} AT TIME ZONE 'UTC'))`,
        sessionCount: sql<number>`COUNT(*)`,
      })
      .from(sessions)
      .where(eq(sessions.userId, user.id))
      .groupBy(sql`EXTRACT(HOUR FROM (${sessions.endedAt} AT TIME ZONE 'UTC'))`);

    // Get hourly token data from tokenUsage
    const hourlyTokenResult = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM (${tokenUsage.recordedAt} AT TIME ZONE 'UTC'))`,
        tokens: sql<number>`COALESCE(SUM(${tokenUsage.inputTokens} + ${tokenUsage.outputTokens}), 0)`,
      })
      .from(tokenUsage)
      .where(eq(tokenUsage.userId, user.id))
      .groupBy(sql`EXTRACT(HOUR FROM (${tokenUsage.recordedAt} AT TIME ZONE 'UTC'))`);

    // Merge hourly data and fill missing hours with zeros
    const hourlyMap = new Map<number, { tokens: number; sessions: number }>();
    for (let h = 0; h < 24; h++) {
      hourlyMap.set(h, { tokens: 0, sessions: 0 });
    }
    for (const row of hourlyActivityResult) {
      const existing = hourlyMap.get(Number(row.hour)) ?? { tokens: 0, sessions: 0 };
      existing.sessions = Number(row.sessionCount);
      hourlyMap.set(Number(row.hour), existing);
    }
    for (const row of hourlyTokenResult) {
      const existing = hourlyMap.get(Number(row.hour)) ?? { tokens: 0, sessions: 0 };
      existing.tokens = Number(row.tokens);
      hourlyMap.set(Number(row.hour), existing);
    }

    const hourlyActivity: HourlyActivity[] = Array.from(hourlyMap.entries())
      .map(([hour, data]) => ({
        hour,
        tokens: data.tokens,
        sessions: data.sessions,
      }))
      .sort((a, b) => a.hour - b.hour);

    // Calculate day of week activity pattern
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const dayOfWeekResult = await db
      .select({
        dayOfWeek: sql<number>`EXTRACT(DOW FROM (${sessions.endedAt} AT TIME ZONE 'UTC'))`,
        sessionCount: sql<number>`COUNT(*)`,
      })
      .from(sessions)
      .where(eq(sessions.userId, user.id))
      .groupBy(sql`EXTRACT(DOW FROM (${sessions.endedAt} AT TIME ZONE 'UTC'))`);

    const dayOfWeekTokenResult = await db
      .select({
        dayOfWeek: sql<number>`EXTRACT(DOW FROM (${tokenUsage.recordedAt} AT TIME ZONE 'UTC'))`,
        tokens: sql<number>`COALESCE(SUM(${tokenUsage.inputTokens} + ${tokenUsage.outputTokens}), 0)`,
      })
      .from(tokenUsage)
      .where(eq(tokenUsage.userId, user.id))
      .groupBy(sql`EXTRACT(DOW FROM (${tokenUsage.recordedAt} AT TIME ZONE 'UTC'))`);

    // Merge day of week data
    const dayMap = new Map<number, { tokens: number; sessions: number }>();
    for (let d = 0; d < 7; d++) {
      dayMap.set(d, { tokens: 0, sessions: 0 });
    }
    for (const row of dayOfWeekResult) {
      const existing = dayMap.get(Number(row.dayOfWeek)) ?? { tokens: 0, sessions: 0 };
      existing.sessions = Number(row.sessionCount);
      dayMap.set(Number(row.dayOfWeek), existing);
    }
    for (const row of dayOfWeekTokenResult) {
      const existing = dayMap.get(Number(row.dayOfWeek)) ?? { tokens: 0, sessions: 0 };
      existing.tokens = Number(row.tokens);
      dayMap.set(Number(row.dayOfWeek), existing);
    }

    const dayOfWeekActivity: DayOfWeekActivity[] = Array.from(dayMap.entries())
      .map(([dayOfWeek, data]) => ({
        dayOfWeek,
        dayName: dayNames[dayOfWeek],
        tokens: data.tokens,
        sessions: data.sessions,
        avgTokensPerSession: data.sessions > 0 ? Math.round(data.tokens / data.sessions) : 0,
      }))
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

    // ===== NEW: Vibe Coding Analytics =====

    // Get aggregated code metrics from sessions
    const sessionMetricsResult = await db
      .select({
        totalTurns: sql<number>`COALESCE(SUM(${sessions.turnCount}), 0)`,
        totalDuration: sql<number>`COALESCE(SUM(${sessions.durationSeconds}), 0)`,
        sessionCount: sql<number>`COUNT(*)`,
      })
      .from(sessions)
      .where(eq(sessions.userId, user.id));

    const sessionMetrics = sessionMetricsResult[0];
    const totalTurns = Number(sessionMetrics?.totalTurns ?? 0);
    const totalDuration = Number(sessionMetrics?.totalDuration ?? 0);
    const totalSessionCount = Number(sessionMetrics?.sessionCount ?? 0);

    // Get code metrics (aggregated from all sessions with codeMetrics)
    const codeMetricsResult = await db
      .select({
        codeMetrics: sessions.codeMetrics,
      })
      .from(sessions)
      .where(eq(sessions.userId, user.id));

    let totalLinesAdded = 0;
    let totalLinesDeleted = 0;
    let totalFilesModified = 0;
    let totalFilesCreated = 0;

    for (const row of codeMetricsResult) {
      if (row.codeMetrics) {
        totalLinesAdded += row.codeMetrics.linesAdded ?? 0;
        totalLinesDeleted += row.codeMetrics.linesDeleted ?? 0;
        totalFilesModified += row.codeMetrics.filesModified ?? 0;
        totalFilesCreated += row.codeMetrics.filesCreated ?? 0;
      }
    }

    const codeMetrics: CodeMetrics | null =
      totalLinesAdded > 0 || totalFilesModified > 0
        ? {
            linesAdded: totalLinesAdded,
            linesDeleted: totalLinesDeleted,
            filesModified: totalFilesModified,
            filesCreated: totalFilesCreated,
            productivity: totalTurns > 0 ? Math.round((totalLinesAdded / totalTurns) * 10) / 10 : 0,
            refactorRatio:
              totalLinesAdded > 0
                ? Math.round((totalLinesDeleted / totalLinesAdded) * 100) / 100
                : 0,
          }
        : null;

    // Get tool usage (aggregated from all sessions)
    const toolUsageResult = await db
      .select({
        toolUsage: sessions.toolUsage,
      })
      .from(sessions)
      .where(eq(sessions.userId, user.id));

    const toolCounts = new Map<string, number>();
    for (const row of toolUsageResult) {
      if (row.toolUsage) {
        for (const [tool, count] of Object.entries(row.toolUsage)) {
          toolCounts.set(tool, (toolCounts.get(tool) ?? 0) + Number(count));
        }
      }
    }

    const totalToolUsage = Array.from(toolCounts.values()).reduce((sum, count) => sum + count, 0);
    const sortedToolEntries = Array.from(toolCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10 tools
    const toolCountsSliced = sortedToolEntries.map(([, count]) => count);
    const toolPercentages = distributePercentages(toolCountsSliced);
    const toolUsagePatterns: ToolUsagePattern[] = sortedToolEntries.map(([toolName, count], i) => ({
      toolName,
      count,
      percentage: totalToolUsage > 0 ? toolPercentages[i] : 0,
    }));

    // Calculate Vibe Style
    let vibeStyle: VibeStyle | null = null;
    if (totalToolUsage > 0) {
      const explorerTools = ['Read', 'Grep', 'Glob', 'WebSearch', 'WebFetch'];
      const creatorTools = ['Write'];
      const refactorerTools = ['Edit', 'MultiEdit'];
      const automatorTools = ['Bash', 'Task'];

      const getToolScore = (tools: string[]) => {
        return tools.reduce((sum, tool) => sum + (toolCounts.get(tool) ?? 0), 0);
      };

      const explorerScore = getToolScore(explorerTools);
      const creatorScore = getToolScore(creatorTools);
      const refactorerScore = getToolScore(refactorerTools);
      const automatorScore = getToolScore(automatorTools);

      const maxScore = Math.max(explorerScore, creatorScore, refactorerScore, automatorScore);

      let primaryStyle: VibeStyle['primaryStyle'] = 'Explorer';
      if (maxScore === creatorScore) primaryStyle = 'Creator';
      else if (maxScore === refactorerScore) primaryStyle = 'Refactorer';
      else if (maxScore === automatorScore) primaryStyle = 'Automator';

      const vibeScoreCounts = [explorerScore, creatorScore, refactorerScore, automatorScore];
      const vibePercentages = distributePercentages(vibeScoreCounts);

      vibeStyle = {
        primaryStyle,
        styleScores: {
          explorer: vibePercentages[0],
          creator: vibePercentages[1],
          refactorer: vibePercentages[2],
          automator: vibePercentages[3],
        },
        avgSessionDuration:
          totalSessionCount > 0 ? Math.round(totalDuration / totalSessionCount) : 0,
        avgTurnsPerSession: totalSessionCount > 0 ? Math.round(totalTurns / totalSessionCount) : 0,
      };
    }

    // ===== END: Vibe Coding Analytics =====

    const profile: PublicUserProfile = {
      username: user.githubUsername,
      avatarUrl: user.githubAvatarUrl,
      joinedAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
      stats: {
        totalTokens: ranking
          ? Number(ranking.totalTokens)
          : Number(stats?.totalInputTokens ?? 0) + Number(stats?.totalOutputTokens ?? 0),
        totalSessions: ranking ? ranking.sessionCount : Number(stats?.totalSessions ?? 0),
        currentRank: ranking?.rank ?? null,
        compositeScore: ranking?.compositeScore ? Number(ranking.compositeScore) : null,
      },
      tokenBreakdown,
      modelUsage,
      dailyActivity,
      hourlyActivity,
      dayOfWeekActivity,
      streak,
      codeMetrics,
      toolUsage: toolUsagePatterns,
      vibeStyle,
      isPrivate: false,
    };

    return successResponse(profile);
  } catch (error) {
    console.error('[API] User profile error:', error);
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
