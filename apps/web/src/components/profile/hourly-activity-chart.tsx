'use client';

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
  if (!hourlyActivity || hourlyActivity.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Hourly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No activity data available</p>
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
    if (hour >= 5 && hour < 9) return 'Early Morning';
    if (hour >= 9 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 14) return 'Lunch';
    if (hour >= 14 && hour < 18) return 'Afternoon';
    if (hour >= 18 && hour < 22) return 'Evening';
    return 'Night';
  };

  // Get color based on intensity
  const getBarColor = (tokens: number) => {
    const intensity = tokens / maxTokens;
    if (intensity > 0.8) return 'bg-emerald-500';
    if (intensity > 0.6) return 'bg-emerald-400';
    if (intensity > 0.4) return 'bg-emerald-300';
    if (intensity > 0.2) return 'bg-emerald-200';
    if (intensity > 0) return 'bg-emerald-100';
    return 'bg-muted';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Coding Hours</CardTitle>
          <div className="text-right">
            <div className="text-sm font-medium">Peak: {formatHour(peakHour.hour)}</div>
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
                      <div className="text-xs">{formatNumber(h.tokens)} tokens</div>
                      <div className="text-xs text-muted-foreground">{h.sessions} sessions</div>
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
            <div className="text-xs text-muted-foreground">Total Tokens</div>
          </div>
          <div>
            <div className="text-sm font-medium">{totalSessions}</div>
            <div className="text-xs text-muted-foreground">Sessions</div>
          </div>
          <div>
            <div className="text-sm font-medium">{formatHour(peakHour.hour)}</div>
            <div className="text-xs text-muted-foreground">Peak Hour</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
