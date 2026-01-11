'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HourlyActivity {
  hour: number;
  tokens: number;
  sessions: number;
}

interface HourlyActivityChartProps {
  hourlyActivity: HourlyActivity[];
  className?: string;
}

export function HourlyActivityChart({ hourlyActivity, className }: HourlyActivityChartProps) {
  const t = useTranslations('profile.hourlyActivity');
  const tCommon = useTranslations('common');

  if (!hourlyActivity || hourlyActivity.length === 0) {
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

  // Find max values for scaling
  const maxTokens = Math.max(...hourlyActivity.map((h) => h.tokens), 1);
  const totalTokens = hourlyActivity.reduce((sum, h) => sum + h.tokens, 0);
  const totalSessions = hourlyActivity.reduce((sum, h) => sum + h.sessions, 0);

  // Find peak hour
  const peakHour = hourlyActivity.reduce(
    (max, h) => (h.tokens > max.tokens ? h : max),
    hourlyActivity[0]
  );

  // Format hour for display
  const formatHour = (hour: number) => {
    if (hour === 0) return '12AM';
    if (hour === 12) return '12PM';
    if (hour < 12) return `${hour}AM`;
    return `${hour - 12}PM`;
  };

  // Get time period label
  const getTimePeriod = (hour: number) => {
    if (hour >= 5 && hour < 9) return t('earlyMorning');
    if (hour >= 9 && hour < 12) return t('morning');
    if (hour >= 12 && hour < 14) return t('lunch');
    if (hour >= 14 && hour < 18) return t('afternoon');
    if (hour >= 18 && hour < 22) return t('evening');
    return t('night');
  };

  // GitHub-style: Green contribution colors
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
            <div className="text-sm font-medium">
              {t('peak', { hour: formatHour(peakHour.hour) })}
            </div>
            <div className="text-xs text-muted-foreground">{getTimePeriod(peakHour.hour)}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bar Chart */}
        <TooltipProvider>
          <div className="flex h-32 items-end gap-0.5">
            {hourlyActivity.map((h) => {
              const height = maxTokens > 0 ? (h.tokens / maxTokens) * 100 : 0;
              return (
                <Tooltip key={h.hour}>
                  <TooltipTrigger asChild>
                    <div
                      className="flex-1 cursor-pointer transition-all hover:opacity-80"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    >
                      <div className={`h-full w-full rounded-t ${getBarColor(h.tokens)}`} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-center">
                      <div className="font-medium">{formatHour(h.hour)}</div>
                      <div className="text-xs">
                        {formatNumber(h.tokens)} {tCommon('tokens')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {h.sessions} {t('sessions')}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Hour labels */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>12AM</span>
          <span>6AM</span>
          <span>12PM</span>
          <span>6PM</span>
          <span>11PM</span>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-center">
          <div>
            <div className="text-sm font-medium">{formatNumber(totalTokens)}</div>
            <div className="text-xs text-muted-foreground">{t('totalTokens')}</div>
          </div>
          <div>
            <div className="text-sm font-medium">{totalSessions}</div>
            <div className="text-xs text-muted-foreground">{t('sessions')}</div>
          </div>
          <div>
            <div className="text-sm font-medium">{formatHour(peakHour.hour)}</div>
            <div className="text-xs text-muted-foreground">{t('peakHour')}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
