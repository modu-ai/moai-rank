'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';

interface DayOfWeekActivity {
  dayOfWeek: number;
  dayName: string;
  tokens: number;
  sessions: number;
  avgTokensPerSession: number;
}

interface DayOfWeekChartProps {
  dayOfWeekActivity: DayOfWeekActivity[];
  className?: string;
}

export function DayOfWeekChart({ dayOfWeekActivity, className }: DayOfWeekChartProps) {
  const t = useTranslations('profile.weeklyPattern');

  if (!dayOfWeekActivity || dayOfWeekActivity.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('noData')}</p>
        </CardContent>
      </Card>
    );
  }

  // Find max for scaling
  const maxTokens = Math.max(...dayOfWeekActivity.map((d) => d.tokens), 1);
  const totalTokens = dayOfWeekActivity.reduce((sum, d) => sum + d.tokens, 0);

  // Find most active day
  const mostActiveDay = dayOfWeekActivity.reduce(
    (max, d) => (d.tokens > max.tokens ? d : max),
    dayOfWeekActivity[0]
  );

  // Short day names for display
  const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get weekday vs weekend comparison
  const weekdayTokens = dayOfWeekActivity
    .filter((d) => d.dayOfWeek >= 1 && d.dayOfWeek <= 5)
    .reduce((sum, d) => sum + d.tokens, 0);
  const weekendTokens = dayOfWeekActivity
    .filter((d) => d.dayOfWeek === 0 || d.dayOfWeek === 6)
    .reduce((sum, d) => sum + d.tokens, 0);

  const weekdayPercent = totalTokens > 0 ? Math.round((weekdayTokens / totalTokens) * 100) : 0;

  // Get bar color based on intensity (GitHub-style: green)
  const getBarColor = (tokens: number) => {
    const intensity = tokens / maxTokens;
    if (intensity > 0.8) return 'bg-[#216e39] dark:bg-[#39d353]';
    if (intensity > 0.6) return 'bg-[#30a14e] dark:bg-[#26a641]';
    if (intensity > 0.4) return 'bg-[#40c463] dark:bg-[#006d32]';
    if (intensity > 0.2) return 'bg-[#9be9a8] dark:bg-[#0e4429]';
    if (intensity > 0) return 'bg-[#c6e48b] dark:bg-[#0a3d1e]';
    return 'bg-muted';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('title')}</CardTitle>
          <div className="text-right">
            <div className="text-sm font-medium">{mostActiveDay.dayName}</div>
            <div className="text-xs text-muted-foreground">{t('mostActiveDay')}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bar Chart */}
        <div className="space-y-2">
          {dayOfWeekActivity.map((d) => {
            const widthPercent = maxTokens > 0 ? (d.tokens / maxTokens) * 100 : 0;
            return (
              <div key={d.dayOfWeek} className="flex items-center gap-2">
                <div className="w-8 text-xs text-muted-foreground">
                  {shortDayNames[d.dayOfWeek]}
                </div>
                <div className="flex-1">
                  <div className="h-6 w-full overflow-hidden rounded bg-muted/50">
                    <div
                      className={`h-full transition-all ${getBarColor(d.tokens)}`}
                      style={{ width: `${Math.max(widthPercent, 1)}%` }}
                    />
                  </div>
                </div>
                <div className="w-16 text-right font-mono text-xs">{formatNumber(d.tokens)}</div>
              </div>
            );
          })}
        </div>

        {/* Weekday vs Weekend comparison */}
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('weekdaysVsWeekends')}</span>
            <span className="font-medium">
              {weekdayPercent}% / {100 - weekdayPercent}%
            </span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="bg-[#30a14e] dark:bg-[#26a641] transition-all"
              style={{ width: `${weekdayPercent}%` }}
            />
            <div
              className="bg-[#9be9a8] dark:bg-[#0e4429] transition-all"
              style={{ width: `${100 - weekdayPercent}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{t('monFri', { count: formatNumber(weekdayTokens) })}</span>
            <span>{t('satSun', { count: formatNumber(weekendTokens) })}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
