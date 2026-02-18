import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Trophy, Calendar, Zap, Activity, User, Github, Settings } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { db, users, rankings, dailyAggregates, sessions, tokenUsage } from '@/db';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import { generateApiKey } from '@/lib/auth';
import { randomBytes } from 'node:crypto';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, formatRelativeDate } from '@/lib/utils';
import { ActivityHeatmap } from '@/components/profile/activity-heatmap';
import { ModelUsageChart } from '@/components/profile/model-usage-chart';
import { TokenBreakdownCard } from '@/components/profile/token-breakdown';
import { StreakCard } from '@/components/profile/streak-card';
import { HourlyActivityChart } from '@/components/profile/hourly-activity-chart';
import { DayOfWeekChart } from '@/components/profile/day-of-week-chart';
import { CodeProductivityChart } from '@/components/profile/code-productivity-chart';
import { VibeStyleCard } from '@/components/profile/vibe-style-card';
import { ToolUsageChart } from '@/components/profile/tool-usage-chart';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'View your AI token usage statistics and manage your account',
};

interface DailyActivity {
  date: string;
  tokens: number;
  sessions: number;
  inputTokens: number;
  outputTokens: number;
}

interface ModelUsage {
  modelName: string;
  sessionCount: number;
  percentage: number;
}

interface TokenBreakdown {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

interface HourlyActivity {
  hour: number;
  tokens: number;
  sessions: number;
}

interface DayOfWeekActivity {
  dayOfWeek: number;
  dayName: string;
  tokens: number;
  sessions: number;
  avgTokensPerSession: number;
}

interface CodeMetrics {
  linesAdded: number;
  linesDeleted: number;
  filesModified: number;
  filesCreated: number;
  productivity: number;
  refactorRatio: number;
}

interface ToolUsagePattern {
  toolName: string;
  count: number;
  percentage: number;
}

interface VibeStyle {
  primaryStyle: 'Explorer' | 'Creator' | 'Refactorer' | 'Automator';
  styleScores: {
    explorer: number;
    creator: number;
    refactorer: number;
    automator: number;
  };
  avgSessionDuration: number;
  avgTurnsPerSession: number;
}

interface UserProfile {
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
  codeMetrics: CodeMetrics | null;
  toolUsage: ToolUsagePattern[];
  vibeStyle: VibeStyle | null;
  isPrivate: boolean;
}

interface CurrentUserInfo {
  id: string;
  githubUsername: string;
  githubAvatarUrl: string | null;
  apiKeyPrefix: string;
  privacyMode: boolean;
  currentRank: number | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
}

/**
 * Get current user info directly from database
 * This avoids server-side fetch to self which can cause issues in production
 */
async function getUserInfo(): Promise<ApiResponse<CurrentUserInfo>> {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return { success: false };
    }

    // Find user by Clerk ID
    const userResult = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);

    let user = userResult[0];

    // Auto-create user if not found
    if (!user) {
      const clerkUser = await currentUser();

      if (!clerkUser) {
        return { success: false };
      }

      // Get GitHub info from external accounts
      const githubAccount = clerkUser.externalAccounts?.find(
        (account) => account.provider === 'oauth_github'
      );

      const githubUsername =
        githubAccount?.username || clerkUser.username || `user_${randomBytes(4).toString('hex')}`;
      const githubId = String(githubAccount?.externalId || clerkId);
      const githubAvatarUrl = githubAccount?.imageUrl || clerkUser.imageUrl || null;

      // Generate API key for new user
      const { hash, prefix } = generateApiKey(clerkId);

      // Create new user
      const newUserResult = await db
        .insert(users)
        .values({
          clerkId,
          githubId,
          githubUsername,
          githubAvatarUrl,
          apiKeyHash: hash,
          apiKeyPrefix: prefix,
          userSalt: randomBytes(32).toString('hex'),
          privacyMode: false,
        })
        .returning();

      user = newUserResult[0];
    }

    // Get current rank
    const rankingResult = await db
      .select({ rank: rankings.rankPosition })
      .from(rankings)
      .where(and(eq(rankings.userId, user.id), eq(rankings.periodType, 'all_time')))
      .orderBy(desc(rankings.updatedAt))
      .limit(1);

    const currentRank = rankingResult[0]?.rank ?? null;

    return {
      success: true,
      data: {
        id: user.id,
        githubUsername: user.githubUsername,
        githubAvatarUrl: user.githubAvatarUrl,
        apiKeyPrefix: user.apiKeyPrefix,
        privacyMode: user.privacyMode ?? false,
        currentRank,
        createdAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
        updatedAt: user.updatedAt?.toISOString() ?? new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('getUserInfo error:', error);
    return { success: false };
  }
}

/**
 * Get user profile directly from database
 * This avoids server-side fetch to self which can cause issues in production
 */
async function getUserProfile(username: string): Promise<ApiResponse<UserProfile>> {
  try {
    // Find user by GitHub username
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.githubUsername, username))
      .limit(1);

    const user = userResult[0];

    if (!user) {
      return { success: false };
    }

    // If privacy mode is enabled, return limited info
    if (user.privacyMode) {
      return {
        success: true,
        data: {
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
        },
      };
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

    const validModels = modelUsageResult.filter((m) => m.modelName);
    const modelCounts = validModels.map((m) => Number(m.sessionCount));
    const modelPercentages = distributePercentages(modelCounts);
    const modelUsage: ModelUsage[] = validModels
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

    // Calculate hourly activity pattern from sessions (last 90 days, KST timezone)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoTokens = new Date();
    ninetyDaysAgoTokens.setDate(ninetyDaysAgoTokens.getDate() - 90);

    const hourlyActivityResult = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM (${sessions.endedAt} AT TIME ZONE 'Asia/Seoul'))`,
        sessionCount: sql<number>`COUNT(*)`,
      })
      .from(sessions)
      .where(and(eq(sessions.userId, user.id), gte(sessions.endedAt, ninetyDaysAgo)))
      .groupBy(sql`EXTRACT(HOUR FROM (${sessions.endedAt} AT TIME ZONE 'Asia/Seoul'))`);

    // Get hourly token data from tokenUsage
    const hourlyTokenResult = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM (${tokenUsage.recordedAt} AT TIME ZONE 'Asia/Seoul'))`,
        tokens: sql<number>`COALESCE(SUM(${tokenUsage.inputTokens} + ${tokenUsage.outputTokens}), 0)`,
      })
      .from(tokenUsage)
      .where(and(eq(tokenUsage.userId, user.id), gte(tokenUsage.recordedAt, ninetyDaysAgoTokens)))
      .groupBy(sql`EXTRACT(HOUR FROM (${tokenUsage.recordedAt} AT TIME ZONE 'Asia/Seoul'))`);

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

    const ninetyDaysAgoDow = new Date();
    ninetyDaysAgoDow.setDate(ninetyDaysAgoDow.getDate() - 90);
    const ninetyDaysAgoDowTokens = new Date();
    ninetyDaysAgoDowTokens.setDate(ninetyDaysAgoDowTokens.getDate() - 90);

    const dayOfWeekResult = await db
      .select({
        dayOfWeek: sql<number>`EXTRACT(DOW FROM (${sessions.endedAt} AT TIME ZONE 'Asia/Seoul'))`,
        sessionCount: sql<number>`COUNT(*)`,
      })
      .from(sessions)
      .where(and(eq(sessions.userId, user.id), gte(sessions.endedAt, ninetyDaysAgoDow)))
      .groupBy(sql`EXTRACT(DOW FROM (${sessions.endedAt} AT TIME ZONE 'Asia/Seoul'))`);

    const dayOfWeekTokenResult = await db
      .select({
        dayOfWeek: sql<number>`EXTRACT(DOW FROM (${tokenUsage.recordedAt} AT TIME ZONE 'Asia/Seoul'))`,
        tokens: sql<number>`COALESCE(SUM(${tokenUsage.inputTokens} + ${tokenUsage.outputTokens}), 0)`,
      })
      .from(tokenUsage)
      .where(and(eq(tokenUsage.userId, user.id), gte(tokenUsage.recordedAt, ninetyDaysAgoDowTokens)))
      .groupBy(sql`EXTRACT(DOW FROM (${tokenUsage.recordedAt} AT TIME ZONE 'Asia/Seoul'))`);

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

    // ===== Vibe Coding Analytics =====

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
    const toolUsagePatterns: ToolUsagePattern[] = Array.from(toolCounts.entries())
      .map(([toolName, count]) => ({
        toolName,
        count,
        percentage: totalToolUsage > 0 ? Math.round((count / totalToolUsage) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 tools

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

      const [explorerPct, creatorPct, refactorerPct, automatorPct] = distributePercentages([
        explorerScore, creatorScore, refactorerScore, automatorScore
      ]);
      vibeStyle = {
        primaryStyle,
        styleScores: {
          explorer: explorerPct,
          creator: creatorPct,
          refactorer: refactorerPct,
          automator: automatorPct,
        },
        avgSessionDuration:
          totalSessionCount > 0 ? Math.round(totalDuration / totalSessionCount) : 0,
        avgTurnsPerSession: totalSessionCount > 0 ? Math.round(totalTurns / totalSessionCount) : 0,
      };
    } else if (totalSessionCount > 0) {
      // Fallback: no toolUsage data in DB, derive style from session patterns alone
      vibeStyle = {
        primaryStyle: 'Explorer' as const,
        styleScores: { explorer: 25, creator: 25, refactorer: 25, automator: 25 },
        avgSessionDuration:
          totalSessionCount > 0 ? Math.round(totalDuration / totalSessionCount) : 0,
        avgTurnsPerSession: totalSessionCount > 0 ? Math.round(totalTurns / totalSessionCount) : 0,
      };
    }

    return {
      success: true,
      data: {
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
      },
    };
  } catch (error) {
    console.error('getUserProfile error:', error);
    return { success: false };
  }
}

function getRankBadgeVariant(rank: number | null) {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return 'secondary';
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  description?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-primary/50 bg-primary/5' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${highlight ? 'text-primary' : ''}`}>{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

const SKELETON_STAT_CARDS = ['rank', 'tokens', 'sessions', 'score'] as const;

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6">
        <Skeleton className="h-28 w-28 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {SKELETON_STAT_CARDS.map((id) => (
          <Card key={id}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

async function DashboardContent() {
  const t = await getTranslations('dashboard');
  const tCommon = await getTranslations('common');
  const userInfoResult = await getUserInfo();

  if (!userInfoResult.success || !userInfoResult.data) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <h3 className="text-lg font-semibold">{t('accountSetupRequired')}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t('accountSetupMessage')}</p>
      </div>
    );
  }

  const userInfo = userInfoResult.data;
  const profileResult = await getUserProfile(userInfo.githubUsername);

  if (!profileResult.success || !profileResult.data) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <h3 className="text-lg font-semibold">{t('profileLoadingError')}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t('profileLoadingMessage')}</p>
      </div>
    );
  }

  const profile = profileResult.data;

  return (
    <div>
      {/* Profile Header */}
      <div className="mb-8 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
          {profile.avatarUrl ? (
            <AvatarImage src={profile.avatarUrl} alt={profile.username} />
          ) : null}
          <AvatarFallback>
            <User className="h-12 w-12" />
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-1 flex-col items-center gap-3 sm:items-start">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <h1 className="text-3xl font-bold">{profile.username}</h1>
            {profile.stats.currentRank && (
              <Badge variant={getRankBadgeVariant(profile.stats.currentRank)} className="text-sm">
                #{profile.stats.currentRank}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {t('joined', { date: formatRelativeDate(profile.joinedAt) })}
            </span>
            <a
              href={`https://github.com/${profile.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <Github className="h-4 w-4" />
              {tCommon('github')}
            </a>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
              {tCommon('settings')}
            </Link>
          </div>

          {/* Streak Card */}
          <StreakCard streak={profile.streak} className="mt-2 w-full max-w-lg" />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Trophy}
          label={t('currentRank')}
          value={profile.stats.currentRank ? `#${profile.stats.currentRank}` : t('unranked')}
          description={t('allTimeRanking')}
          highlight={profile.stats.currentRank !== null && profile.stats.currentRank <= 10}
        />
        <StatCard
          icon={Zap}
          label={t('totalTokens')}
          value={formatNumber(profile.stats.totalTokens)}
          description={t('lifetimeUsage')}
        />
        <StatCard
          icon={Activity}
          label={t('totalSessions')}
          value={formatNumber(profile.stats.totalSessions)}
          description={t('totalSessionsTracked')}
        />
        <StatCard
          icon={Trophy}
          label={t('compositeScore')}
          value={
            profile.stats.compositeScore
              ? formatNumber(Math.round(profile.stats.compositeScore))
              : '-'
          }
          description={t('rankingScore')}
        />
      </div>

      {/* Activity Heatmap */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">{t('activity')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityHeatmap dailyActivity={profile.dailyActivity} />
        </CardContent>
      </Card>

      {/* Time-based Analytics */}
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <HourlyActivityChart hourlyActivity={profile.hourlyActivity} />
        <DayOfWeekChart dayOfWeekActivity={profile.dayOfWeekActivity} />
      </div>

      {/* Charts Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <TokenBreakdownCard tokenBreakdown={profile.tokenBreakdown} />
        <ModelUsageChart modelUsage={profile.modelUsage} />
      </div>

      {/* Vibe Coding Analytics */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">{t('vibeCodingAnalytics')}</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <VibeStyleCard vibeStyle={profile.vibeStyle} />
          <CodeProductivityChart codeMetrics={profile.codeMetrics} />
        </div>
      </div>

      {/* Tool Usage */}
      <div className="grid gap-6 md:grid-cols-1">
        <ToolUsageChart toolUsage={profile.toolUsage} />
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
