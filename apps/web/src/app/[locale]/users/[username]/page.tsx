import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Link } from '@/i18n/routing';
import { Trophy, Calendar, Zap, Activity, ArrowLeft, EyeOff, User, Github } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  codeMetrics: CodeMetrics | null;
  toolUsage: ToolUsagePattern[];
  vibeStyle: VibeStyle | null;
  isPrivate: boolean;
}

interface ApiResponse {
  success: boolean;
  data?: PublicUserProfile;
}

async function getUserProfile(username: string): Promise<ApiResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}/api/users/${username}`, {
      cache: 'no-store',
    });

    if (response.status === 404) {
      return { success: false };
    }

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    return response.json();
  } catch (error) {
    console.error('User profile fetch error:', error);
    return { success: false };
  }
}

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username}'s Profile`,
    description: `View ${username}'s AI token usage statistics and ranking on MoAI Rank.`,
  };
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

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;
  const result = await getUserProfile(username);

  if (!result.success || !result.data) {
    notFound();
  }

  const profile = result.data;

  if (profile.isPrivate) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leaderboard
          </Link>
        </Button>

        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto mb-4">
              <Avatar className="h-24 w-24">
                <AvatarFallback>
                  <EyeOff className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-2xl">Private Profile</CardTitle>
            <p className="text-muted-foreground">
              This user has enabled privacy mode and their statistics are hidden.
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Member since {formatRelativeDate(profile.joinedAt)}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Leaderboard
        </Link>
      </Button>

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
              Joined {formatRelativeDate(profile.joinedAt)}
            </span>
            <a
              href={`https://github.com/${profile.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </div>

          {/* Streak Card */}
          <StreakCard streak={profile.streak} className="mt-2 w-full max-w-lg" />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Trophy}
          label="Current Rank"
          value={profile.stats.currentRank ? `#${profile.stats.currentRank}` : 'Unranked'}
          description="All-time ranking"
          highlight={profile.stats.currentRank !== null && profile.stats.currentRank <= 10}
        />
        <StatCard
          icon={Zap}
          label="Total Tokens"
          value={formatNumber(profile.stats.totalTokens)}
          description="Lifetime usage"
        />
        <StatCard
          icon={Activity}
          label="Sessions"
          value={formatNumber(profile.stats.totalSessions)}
          description="Total sessions tracked"
        />
        <StatCard
          icon={Trophy}
          label="Composite Score"
          value={
            profile.stats.compositeScore
              ? formatNumber(Math.round(profile.stats.compositeScore))
              : '-'
          }
          description="Ranking score"
        />
      </div>

      {/* Activity Heatmap */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Activity</CardTitle>
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
        <h2 className="mb-4 text-xl font-semibold">Vibe Coding Analytics</h2>
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
