'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatNumber } from '@/lib/utils';

interface DailyActivity {
  date: string;
  tokens: number;
  sessions: number;
  inputTokens: number;
  outputTokens: number;
}

interface ActivityHeatmapProps {
  dailyActivity: DailyActivity[];
  className?: string;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getIntensityLevel(tokens: number, maxTokens: number): number {
  if (tokens === 0) return 0;
  if (maxTokens === 0) return 1;

  const ratio = tokens / maxTokens;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

// GitHub-style: Green intensity colors for contribution graph
function getIntensityColor(level: number): string {
  switch (level) {
    case 0:
      return 'bg-[#ebedf0] dark:bg-[#161b22] hover:bg-[#d0d7de] dark:hover:bg-[#21262d]';
    case 1:
      return 'bg-[#9be9a8] dark:bg-[#0e4429] hover:bg-[#7dd390] dark:hover:bg-[#196c35]';
    case 2:
      return 'bg-[#40c463] dark:bg-[#006d32] hover:bg-[#2ea44f] dark:hover:bg-[#00803a]';
    case 3:
      return 'bg-[#30a14e] dark:bg-[#26a641] hover:bg-[#238636] dark:hover:bg-[#2ea44f]';
    case 4:
      return 'bg-[#216e39] dark:bg-[#39d353] hover:bg-[#1a5a2d] dark:hover:bg-[#4ae168]';
    default:
      return 'bg-[#ebedf0] dark:bg-[#161b22]';
  }
}

export function ActivityHeatmap({ dailyActivity, className }: ActivityHeatmapProps) {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');

  const { grid, monthLabels, maxTokens, totalDays, activeDays, totalTokens } = useMemo(() => {
    const activityMap = new Map(dailyActivity.map((d) => [d.date, d]));

    // Calculate max tokens for intensity scaling
    const max = Math.max(...dailyActivity.map((d) => d.tokens), 1);

    // Generate grid for last 52 weeks + current week
    const today = new Date();
    const endDate = new Date(today);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364); // Go back 364 days

    // Adjust to start from Sunday
    const startDayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDayOfWeek);

    const weeks: { date: Date; activity: DailyActivity | null }[][] = [];
    const currentDate = new Date(startDate);
    let currentWeek: { date: Date; activity: DailyActivity | null }[] = [];

    let totalDaysCount = 0;
    let activeDaysCount = 0;
    let totalTokensCount = 0;

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const activity = activityMap.get(dateStr) ?? null;

      currentWeek.push({
        date: new Date(currentDate),
        activity,
      });

      if (activity) {
        activeDaysCount++;
        totalTokensCount += activity.tokens;
      }
      totalDaysCount++;

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    // Generate month labels with minimum spacing to prevent overlap
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    let lastLabelWeekIndex = -3; // Ensure minimum 3 weeks gap between labels

    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0]?.date;
      if (firstDayOfWeek) {
        const month = firstDayOfWeek.getMonth();
        // Only add label if month changed AND there's enough space from last label
        if (month !== lastMonth && weekIndex - lastLabelWeekIndex >= 3) {
          labels.push({ month: MONTHS[month], weekIndex });
          lastMonth = month;
          lastLabelWeekIndex = weekIndex;
        } else if (month !== lastMonth) {
          lastMonth = month; // Update month tracking even if we skip the label
        }
      }
    });

    return {
      grid: weeks,
      monthLabels: labels,
      maxTokens: max,
      totalDays: totalDaysCount,
      activeDays: activeDaysCount,
      totalTokens: totalTokensCount,
    };
  }, [dailyActivity]);

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t('tokensInYear', { count: formatNumber(totalTokens) })}
        </h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>{tCommon('less')}</span>
          <div className={`h-3 w-3 rounded-sm ${getIntensityColor(0)}`} />
          <div className={`h-3 w-3 rounded-sm ${getIntensityColor(1)}`} />
          <div className={`h-3 w-3 rounded-sm ${getIntensityColor(2)}`} />
          <div className={`h-3 w-3 rounded-sm ${getIntensityColor(3)}`} />
          <div className={`h-3 w-3 rounded-sm ${getIntensityColor(4)}`} />
          <span>{tCommon('more')}</span>
        </div>
      </div>

      <div className="w-full">
        <div className="w-full">
          {/* Month labels */}
          <div className="mb-2 flex">
            <div className="w-8 shrink-0" /> {/* Spacer for day labels */}
            <div className="relative h-4 flex-1">
              {monthLabels.map((label, i) => (
                <div
                  key={`${label.month}-${i}`}
                  className="absolute text-xs text-muted-foreground"
                  style={{ left: `${(label.weekIndex / grid.length) * 100}%` }}
                >
                  {label.month}
                </div>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="flex">
            {/* Day labels */}
            <div className="mr-1 flex shrink-0 flex-col justify-between py-[2px]">
              {DAYS_OF_WEEK.map((day, i) => (
                <div
                  key={day}
                  className={`h-[10px] text-xs leading-[10px] text-muted-foreground sm:h-3 sm:leading-3 ${i % 2 === 0 ? 'invisible' : ''}`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Heatmap cells */}
            <TooltipProvider delayDuration={100}>
              <div className="flex flex-1 justify-between gap-[2px]">
                {grid.map((week) => {
                  const weekKey = week[0]?.date.toISOString().split('T')[0] ?? 'empty';
                  return (
                  <div key={weekKey} className="flex flex-1 flex-col gap-[2px]">
                    {week.map((day) => {
                      const tokens = day.activity?.tokens ?? 0;
                      const sessions = day.activity?.sessions ?? 0;
                      const level = getIntensityLevel(tokens, maxTokens);
                      const dateKey = day.date.toISOString().split('T')[0];
                      const dateStr = day.date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });

                      return (
                        <Tooltip key={dateKey}>
                          <TooltipTrigger asChild>
                            <div
                              className={`aspect-square w-full rounded-sm transition-colors ${getIntensityColor(level)}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <div className="font-medium">{dateStr}</div>
                            {tokens > 0 ? (
                              <>
                                <div>
                                  {formatNumber(tokens)} {tCommon('tokens')}
                                </div>
                                <div>{tCommon('sessions', { count: sessions })}</div>
                              </>
                            ) : (
                              <div className="text-muted-foreground">{tCommon('noActivity')}</div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                  );
                })}
              </div>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span>{t('activeDays', { count: activeDays })}</span>
        <span>
          {t('activityRate', {
            percent: Math.round((activeDays / Math.min(totalDays, 365)) * 100),
          })}
        </span>
      </div>
    </div>
  );
}
