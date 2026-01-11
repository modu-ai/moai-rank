'use client';

import { Flame, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('profile.streak');
  const tCommon = useTranslations('common');

  // Use default values when streak is null
  const currentStreak = streak?.currentStreak ?? 0;
  const longestStreak = streak?.longestStreak ?? 0;
  const lastActiveDate = streak?.lastActiveDate ?? null;

  const formatLastActive = (dateStr: string | null) => {
    if (!dateStr) return tCommon('never');

    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - dateOnly.getTime()) / 86400000);

    if (diffDays === 0) return tCommon('today');
    if (diffDays === 1) return tCommon('yesterday');
    if (diffDays < 7) return tCommon('daysAgo', { count: diffDays });

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card className={className}>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          {/* Current Streak */}
          <div className="flex items-center gap-2">
            <div
              className={`rounded-full p-2 ${currentStreak > 0 ? 'bg-neutral-200' : 'bg-muted'}`}
            >
              <Flame
                className={`h-5 w-5 ${currentStreak > 0 ? 'text-neutral-900' : 'text-muted-foreground'}`}
              />
            </div>
            <div>
              <div className="text-xl font-bold">{currentStreak}</div>
              <div className="text-xs text-muted-foreground">
                {t('dayStreak', { count: currentStreak })}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-10 w-px bg-border" />

          {/* Longest Streak */}
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-neutral-100 p-2">
              <Trophy className="h-5 w-5 text-neutral-700" />
            </div>
            <div>
              <div className="text-xl font-bold">{longestStreak}</div>
              <div className="text-xs text-muted-foreground">{t('longestStreak')}</div>
            </div>
          </div>
        </div>

        {/* Last Active */}
        <div className="text-right">
          <div className="text-sm font-medium">{t('lastActive')}</div>
          <div className="text-xs text-muted-foreground">{formatLastActive(lastActiveDate)}</div>
        </div>
      </CardContent>
    </Card>
  );
}
