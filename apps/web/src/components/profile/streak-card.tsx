'use client';

import { Flame, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

interface StreakCardProps {
  streak: StreakInfo | null;
  className?: string;
}

export function StreakCard({ streak, className }: StreakCardProps) {
  if (!streak) {
    return null;
  }

  const { currentStreak, longestStreak, lastActiveDate } = streak;

  const formatLastActive = (dateStr: string | null) => {
    if (!dateStr) return 'Never';

    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - dateOnly.getTime()) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card className={className}>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          {/* Current Streak */}
          <div className="flex items-center gap-2">
            <div
              className={`rounded-full p-2 ${currentStreak > 0 ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-muted'}`}
            >
              <Flame
                className={`h-5 w-5 ${currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}
              />
            </div>
            <div>
              <div className="text-xl font-bold">{currentStreak}</div>
              <div className="text-xs text-muted-foreground">
                {currentStreak === 1 ? 'day streak' : 'days streak'}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-10 w-px bg-border" />

          {/* Longest Streak */}
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <div className="text-xl font-bold">{longestStreak}</div>
              <div className="text-xs text-muted-foreground">longest streak</div>
            </div>
          </div>
        </div>

        {/* Last Active */}
        <div className="text-right">
          <div className="text-sm font-medium">Last Active</div>
          <div className="text-xs text-muted-foreground">{formatLastActive(lastActiveDate)}</div>
        </div>
      </CardContent>
    </Card>
  );
}
