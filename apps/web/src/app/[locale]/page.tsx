import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';
import { db, users, rankings } from '@/db';
import { eq, and, sql } from 'drizzle-orm';
import { Trophy } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getPeriodStart } from '@/lib/date-utils';
import {
  PeriodFilter,
  RankingTable,
  Pagination,
  LeaderboardSkeleton,
} from '@/components/leaderboard';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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

interface LeaderboardResponse {
  success: boolean;
  data?: {
    items: LeaderboardEntry[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  };
}

/**
 * Get leaderboard data directly from database
 * This avoids server-side fetch to self which can cause issues in production
 */
async function getLeaderboardData(
  period: string,
  page: number,
  limit: number
): Promise<LeaderboardResponse> {
  const offset = (page - 1) * limit;

  try {
    // Validate period
    const validPeriods = ['daily', 'weekly', 'monthly', 'all_time'] as const;
    const validPeriod = validPeriods.includes(period as (typeof validPeriods)[number])
      ? (period as (typeof validPeriods)[number])
      : 'daily';

    // Get current period start date
    const periodStart = getPeriodStart(validPeriod);

    // Query rankings with user info directly
    const rankingsData = await db
      .select({
        rank: rankings.rankPosition,
        odUserId: rankings.userId,
        username: users.githubUsername,
        avatarUrl: users.githubAvatarUrl,
        totalTokens: rankings.totalTokens,
        compositeScore: rankings.compositeScore,
        sessionCount: rankings.sessionCount,
        efficiencyScore: rankings.efficiencyScore,
        privacyMode: users.privacyMode,
      })
      .from(rankings)
      .innerJoin(users, eq(rankings.userId, users.id))
      .where(and(eq(rankings.periodType, validPeriod), eq(rankings.periodStart, periodStart)))
      .orderBy(rankings.rankPosition)
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(rankings)
      .where(and(eq(rankings.periodType, validPeriod), eq(rankings.periodStart, periodStart)));

    const total = Number(countResult[0]?.count ?? 0);

    // Transform data respecting privacy settings
    const entries: LeaderboardEntry[] = rankingsData.map((r) => ({
      rank: r.rank,
      userId: r.privacyMode ? 'private' : (r.odUserId ?? 'unknown'),
      username: r.privacyMode ? `User #${r.rank}` : r.username,
      avatarUrl: r.privacyMode ? null : r.avatarUrl,
      totalTokens: Number(r.totalTokens),
      compositeScore: Number(r.compositeScore),
      sessionCount: r.sessionCount,
      efficiencyScore: r.efficiencyScore ? Number(r.efficiencyScore) : null,
      isPrivate: r.privacyMode ?? false,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: {
        items: entries,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      },
    };
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return { success: false };
  }
}

async function getCurrentUserDbId(): Promise<string | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const userResult = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  return userResult[0]?.id ?? null;
}

interface PageProps {
  searchParams: Promise<{ period?: string; page?: string }>;
}

async function LeaderboardContent({ period, page }: { period: string; page: number }) {
  const t = await getTranslations('home');
  const [leaderboardData, currentUserId] = await Promise.all([
    getLeaderboardData(period, page, 20),
    getCurrentUserDbId(),
  ]);

  if (!leaderboardData.success || !leaderboardData.data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Trophy className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold">{t('unableToLoad')}</h3>
        <p className="text-sm text-muted-foreground">{t('tryAgainLater')}</p>
      </div>
    );
  }

  const { items, pagination } = leaderboardData.data;

  return (
    <>
      <RankingTable entries={items} currentUserId={currentUserId} />

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        hasNext={pagination.hasNext}
        hasPrevious={pagination.hasPrevious}
      />
    </>
  );
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = params.period || 'daily';
  const page = Number(params.page) || 1;
  const t = await getTranslations('home');

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('description')}</p>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Suspense fallback={<div className="h-10 w-80 animate-pulse rounded-lg bg-muted" />}>
            <PeriodFilter />
          </Suspense>
        </div>

        <Suspense fallback={<LeaderboardSkeleton />}>
          <LeaderboardContent period={period} page={page} />
        </Suspense>
      </div>
    </div>
  );
}
