import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Trophy, Calendar, Zap, Activity, User, Github, Settings } from 'lucide-react';
import Link from 'next/link';
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

async function getUserInfo(): Promise<ApiResponse<CurrentUserInfo>> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    const response = await fetch(`${baseUrl}/api/me`, {
      cache: 'no-store',
      headers: {
        Cookie: cookieStore.toString(),
      },
    });

    if (!response.ok) return { success: false };
    return response.json();
  } catch {
    return { success: false };
  }
}

async function getUserProfile(username: string): Promise<ApiResponse<UserProfile>> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}/api/users/${username}`, {
      cache: 'no-store',
    });

    if (!response.ok) return { success: false };
    return response.json();
  } catch {
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
