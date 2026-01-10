import { Suspense } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  StatsOverview,
  TokenChart,
  ApiKeyCard,
  PrivacyToggle,
} from "@/components/dashboard";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "View your AI token usage statistics and manage your account",
};

interface UserStats {
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

async function getUserInfo(): Promise<ApiResponse<CurrentUserInfo>> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/me`, {
      cache: "no-store",
      headers: {
        Cookie: (await import("next/headers")).cookies().toString(),
      },
    });

    if (!response.ok) return { success: false };
    return response.json();
  } catch {
    return { success: false };
  }
}

async function getUserStats(): Promise<ApiResponse<UserStats>> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/me/stats`, {
      cache: "no-store",
      headers: {
        Cookie: (await import("next/headers")).cookies().toString(),
      },
    });

    if (!response.ok) return { success: false };
    return response.json();
  } catch {
    return { success: false };
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
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
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function DashboardContent() {
  const [userInfoResult, userStatsResult] = await Promise.all([
    getUserInfo(),
    getUserStats(),
  ]);

  if (!userInfoResult.success || !userInfoResult.data) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <h3 className="text-lg font-semibold">Account Setup Required</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is being set up. Please refresh the page in a moment.
        </p>
      </div>
    );
  }

  const userInfo = userInfoResult.data;
  const stats = userStatsResult.data;

  // Default stats if not available
  const defaultStats: UserStats = {
    overview: {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalSessions: 0,
      averageTokensPerSession: 0,
      efficiencyScore: 0,
    },
    rankings: {
      daily: null,
      weekly: null,
      monthly: null,
      allTime: null,
    },
    trends: {
      last7Days: [],
      last30Days: [],
    },
    streaks: {
      current: 0,
      longest: 0,
    },
  };

  const userStats = stats || defaultStats;

  return (
    <div className="space-y-6">
      <StatsOverview
        overview={userStats.overview}
        rankings={userStats.rankings}
        streaks={userStats.streaks}
      />

      <TokenChart
        last7Days={userStats.trends.last7Days}
        last30Days={userStats.trends.last30Days}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <ApiKeyCard apiKeyPrefix={userInfo.apiKeyPrefix} />
        <PrivacyToggle initialValue={userInfo.privacyMode} />
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome back, {user.firstName || user.username || "User"}! Here&apos;s
          your token usage overview.
        </p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
