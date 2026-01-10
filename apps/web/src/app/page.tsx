import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";
import { Trophy } from "lucide-react";
import {
  PeriodFilter,
  RankingTable,
  Pagination,
  LeaderboardSkeleton,
} from "@/components/leaderboard";

// Force dynamic rendering
export const dynamic = "force-dynamic";

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

async function getLeaderboardData(
  period: string,
  page: number,
  limit: number
): Promise<LeaderboardResponse> {
  const offset = (page - 1) * limit;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const response = await fetch(
      `${baseUrl}/api/leaderboard?period=${period}&limit=${limit}&offset=${offset}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch leaderboard");
    }

    return response.json();
  } catch (error) {
    console.error("Leaderboard fetch error:", error);
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

async function LeaderboardContent({
  period,
  page,
}: {
  period: string;
  page: number;
}) {
  const [leaderboardData, currentUserId] = await Promise.all([
    getLeaderboardData(period, page, 20),
    getCurrentUserDbId(),
  ]);

  if (!leaderboardData.success || !leaderboardData.data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Trophy className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold">Unable to load rankings</h3>
        <p className="text-sm text-muted-foreground">
          Please try again later.
        </p>
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
  const period = params.period || "weekly";
  const page = Number(params.page) || 1;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="mt-2 text-muted-foreground">
          See how your AI token usage compares to the community
        </p>
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
