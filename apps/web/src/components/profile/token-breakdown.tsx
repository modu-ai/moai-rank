'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';

interface TokenBreakdown {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

interface TokenBreakdownCardProps {
  tokenBreakdown: TokenBreakdown | null;
  className?: string;
}

const TOKEN_COLORS = {
  input: 'bg-blue-500',
  output: 'bg-amber-500',
  cacheCreation: 'bg-purple-500',
  cacheRead: 'bg-green-500',
};

export function TokenBreakdownCard({ tokenBreakdown, className }: TokenBreakdownCardProps) {
  if (!tokenBreakdown) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Token Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No token data available</p>
        </CardContent>
      </Card>
    );
  }

  const {
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    totalTokens,
    estimatedCost,
  } = tokenBreakdown;

  // Calculate percentages
  const total = inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens;
  const inputPercent = total > 0 ? Math.round((inputTokens / total) * 100) : 0;
  const outputPercent = total > 0 ? Math.round((outputTokens / total) * 100) : 0;
  const cacheCreationPercent = total > 0 ? Math.round((cacheCreationTokens / total) * 100) : 0;
  const cacheReadPercent = total > 0 ? Math.round((cacheReadTokens / total) * 100) : 0;

  // Calculate cache efficiency
  const totalCacheTokens = cacheCreationTokens + cacheReadTokens;
  const cacheEfficiency =
    totalCacheTokens > 0 ? Math.round((cacheReadTokens / totalCacheTokens) * 100) : 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Token Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main stats */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{formatNumber(totalTokens)}</div>
            <div className="text-xs text-muted-foreground">Total Tokens</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              ${estimatedCost.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Estimated Cost</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
          {inputPercent > 0 && (
            <div
              className={`${TOKEN_COLORS.input} transition-all`}
              style={{ width: `${inputPercent}%` }}
              title={`Input: ${inputPercent}%`}
            />
          )}
          {outputPercent > 0 && (
            <div
              className={`${TOKEN_COLORS.output} transition-all`}
              style={{ width: `${outputPercent}%` }}
              title={`Output: ${outputPercent}%`}
            />
          )}
          {cacheCreationPercent > 0 && (
            <div
              className={`${TOKEN_COLORS.cacheCreation} transition-all`}
              style={{ width: `${cacheCreationPercent}%` }}
              title={`Cache Creation: ${cacheCreationPercent}%`}
            />
          )}
          {cacheReadPercent > 0 && (
            <div
              className={`${TOKEN_COLORS.cacheRead} transition-all`}
              style={{ width: `${cacheReadPercent}%` }}
              title={`Cache Read: ${cacheReadPercent}%`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${TOKEN_COLORS.input}`} />
              <span className="text-muted-foreground">Input</span>
            </div>
            <span className="font-mono">{formatNumber(inputTokens)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${TOKEN_COLORS.output}`} />
              <span className="text-muted-foreground">Output</span>
            </div>
            <span className="font-mono">{formatNumber(outputTokens)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${TOKEN_COLORS.cacheCreation}`} />
              <span className="text-muted-foreground">Cache Create</span>
            </div>
            <span className="font-mono">{formatNumber(cacheCreationTokens)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${TOKEN_COLORS.cacheRead}`} />
              <span className="text-muted-foreground">Cache Read</span>
            </div>
            <span className="font-mono">{formatNumber(cacheReadTokens)}</span>
          </div>
        </div>

        {/* Cache efficiency */}
        {totalCacheTokens > 0 && (
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cache Efficiency</span>
              <span className="font-medium">{cacheEfficiency}%</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {cacheEfficiency >= 80
                ? 'Excellent cache utilization'
                : cacheEfficiency >= 50
                  ? 'Good cache utilization'
                  : 'Consider improving cache usage'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
