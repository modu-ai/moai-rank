'use client';

import { useMemo } from 'react';
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

function getIntensityColor(level: number): string {
  switch (level) {
    case 0:
      return 'bg-muted hover:bg-muted/80';
    case 1:
      return 'bg-emerald-200 dark:bg-emerald-900 hover:bg-emerald-300 dark:hover:bg-emerald-800';
    case 2:
      return 'bg-emerald-400 dark:bg-emerald-700 hover:bg-emerald-500 dark:hover:bg-emerald-600';
    case 3:
      return 'bg-emerald-500 dark:bg-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-400';
    case 4:
      return 'bg-emerald-600 dark:bg-emerald-400 hover:bg-emerald-700 dark:hover:bg-emerald-300';
    default:
      return 'bg-muted';
  }
}

export function ActivityHeatmap({ dailyActivity, className }: ActivityHeatmapProps) {
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

    // Generate month labels
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0]?.date;
      if (firstDayOfWeek) {
        const month = firstDayOfWeek.getMonth();
        if (month !== lastMonth) {
          labels.push({ month: MONTHS[month], weekIndex });
          lastMonth = month;
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
          {formatNumber(totalTokens)} tokens in the last year
        </h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Less</span>
          <div className={`h-3 w-3 rounded-sm ${getIntensityColor(0)}`} />
          <div className={`h-3 w-3 rounded-sm ${getIntensityColor(1)}`} />
          <div className={`h-3 w-3 rounded-sm ${getIntensityColor(2)}`} />
          <div className={`h-3 w-3 rounded-sm ${getIntensityColor(3)}`} />
          <div className={`h-3 w-3 rounded-sm ${getIntensityColor(4)}`} />
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="mb-1 flex">
            <div className="w-8" /> {/* Spacer for day labels */}
            <div className="relative flex flex-1">
              {monthLabels.map((label, i) => (
                <div
                  key={`${label.month}-${i}`}
                  className="absolute text-xs text-muted-foreground"
                  style={{ left: `${label.weekIndex * 14}px` }}
                >
                  {label.month}
                </div>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="flex">
            {/* Day labels */}
            <div className="mr-1 flex flex-col justify-between py-[2px]">
              {DAYS_OF_WEEK.map((day, i) => (
                <div
                  key={day}
                  className={`h-3 text-xs text-muted-foreground ${i % 2 === 0 ? 'invisible' : ''}`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Heatmap cells */}
            <TooltipProvider delayDuration={100}>
              <div className="flex gap-[3px]">
                {grid.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[3px]">
                    {week.map((day, dayIndex) => {
                      const tokens = day.activity?.tokens ?? 0;
                      const sessions = day.activity?.sessions ?? 0;
                      const level = getIntensityLevel(tokens, maxTokens);
                      const dateStr = day.date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });

                      return (
                        <Tooltip key={`${weekIndex}-${dayIndex}`}>
                          <TooltipTrigger asChild>
                            <div
                              className={`h-3 w-3 rounded-sm transition-colors ${getIntensityColor(level)}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <div className="font-medium">{dateStr}</div>
                            {tokens > 0 ? (
                              <>
                                <div>{formatNumber(tokens)} tokens</div>
                                <div>
                                  {sessions} session{sessions !== 1 ? 's' : ''}
                                </div>
                              </>
                            ) : (
                              <div className="text-muted-foreground">No activity</div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span>{activeDays} active days</span>
        <span>{Math.round((activeDays / Math.min(totalDays, 365)) * 100)}% activity rate</span>
      </div>
    </div>
  );
}
