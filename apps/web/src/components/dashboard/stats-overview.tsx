"use client";

import { Trophy, Zap, Activity, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatPercentage } from "@/lib/utils";

interface RankInfo {
  position: number;
  compositeScore: number;
  percentile: number;
}

interface StatsOverviewProps {
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
  streaks: {
    current: number;
    longest: number;
  };
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  description?: string;
  badge?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold">{value}</div>
          {badge}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function getRankBadge(rank: RankInfo | null) {
  if (!rank) return null;
  if (rank.position === 1) return <Badge variant="gold">1st</Badge>;
  if (rank.position === 2) return <Badge variant="silver">2nd</Badge>;
  if (rank.position === 3) return <Badge variant="bronze">3rd</Badge>;
  return null;
}

export function StatsOverview({
  overview,
  rankings,
  streaks,
}: StatsOverviewProps) {
  const currentRank = rankings.allTime;
  const weeklyRank = rankings.weekly;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={Trophy}
        label="Current Rank"
        value={currentRank ? `#${currentRank.position}` : "Unranked"}
        description={
          currentRank
            ? `Top ${formatPercentage(100 - currentRank.percentile)}`
            : "Start tracking to get ranked"
        }
        badge={getRankBadge(currentRank)}
      />
      <StatCard
        icon={Zap}
        label="Total Tokens"
        value={formatNumber(overview.totalTokens)}
        description={`${formatNumber(overview.totalInputTokens)} in / ${formatNumber(overview.totalOutputTokens)} out`}
      />
      <StatCard
        icon={Activity}
        label="Sessions"
        value={formatNumber(overview.totalSessions)}
        description={`~${formatNumber(overview.averageTokensPerSession)} tokens/session`}
      />
      <StatCard
        icon={Flame}
        label="Current Streak"
        value={`${streaks.current} days`}
        description={`Longest: ${streaks.longest} days`}
      />
    </div>
  );
}
