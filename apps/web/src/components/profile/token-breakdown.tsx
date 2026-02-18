'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber, formatCurrency } from '@/lib/utils';

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

/** Distributes 100% among values using largest-remainder method to ensure sum = 100 */
function distributePercentages(counts: number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return counts.map(() => 0);
  const exact = counts.map(c => (c / total) * 100);
  const floors = exact.map(Math.floor);
  const remainder = 100 - floors.reduce((a, b) => a + b, 0);
  const indices = exact
    .map((v, i) => ({ diff: v - floors[i], i }))
    .sort((a, b) => b.diff - a.diff);
  for (let k = 0; k < remainder; k++) floors[indices[k].i]++;
  return floors;
}

// GitHub-style: Green contribution palette
const TOKEN_COLORS = {
  input: 'bg-[#216e39] dark:bg-[#39d353]',
  output: 'bg-[#40c463] dark:bg-[#006d32]',
  cacheCreation: 'bg-[#9be9a8] dark:bg-[#0e4429]',
  cacheRead: 'bg-[#c6e48b] dark:bg-[#0a3d1e]',
};

export function TokenBreakdownCard({ tokenBreakdown, className }: TokenBreakdownCardProps) {
  const t = useTranslations('profile.tokenBreakdown');

  if (!tokenBreakdown) {
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

  const {
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    totalTokens,
    estimatedCost,
  } = tokenBreakdown;

  // Calculate percentages using largest-remainder method to ensure they sum to exactly 100
  const total = inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens;
  const [inputPercent, outputPercent, cacheCreationPercent, cacheReadPercent] =
    distributePercentages([inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens]);

  // Calculate cache efficiency
  const totalCacheTokens = cacheCreationTokens + cacheReadTokens;
  const cacheEfficiency =
    totalCacheTokens > 0 ? Math.round((cacheReadTokens / totalCacheTokens) * 100) : 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main stats */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{formatNumber(totalTokens)}</div>
            <div className="text-xs text-muted-foreground">{t('totalTokens')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#216e39] dark:text-[#39d353]">
              {formatCurrency(estimatedCost)}
            </div>
            <div className="text-xs text-muted-foreground">{t('estimatedCost')}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
          {inputPercent > 0 && (
            <div
              className={`${TOKEN_COLORS.input} transition-all`}
              style={{ width: `${inputPercent}%` }}
              title={`${t('input')}: ${inputPercent}%`}
            />
          )}
          {outputPercent > 0 && (
            <div
              className={`${TOKEN_COLORS.output} transition-all`}
              style={{ width: `${outputPercent}%` }}
              title={`${t('output')}: ${outputPercent}%`}
            />
          )}
          {cacheCreationPercent > 0 && (
            <div
              className={`${TOKEN_COLORS.cacheCreation} transition-all`}
              style={{ width: `${cacheCreationPercent}%` }}
              title={`${t('cacheCreate')}: ${cacheCreationPercent}%`}
            />
          )}
          {cacheReadPercent > 0 && (
            <div
              className={`${TOKEN_COLORS.cacheRead} transition-all`}
              style={{ width: `${cacheReadPercent}%` }}
              title={`${t('cacheRead')}: ${cacheReadPercent}%`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${TOKEN_COLORS.input}`} />
              <span className="text-muted-foreground">{t('input')}</span>
            </div>
            <span className="font-mono">{formatNumber(inputTokens)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${TOKEN_COLORS.output}`} />
              <span className="text-muted-foreground">{t('output')}</span>
            </div>
            <span className="font-mono">{formatNumber(outputTokens)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${TOKEN_COLORS.cacheCreation}`} />
              <span className="text-muted-foreground">{t('cacheCreate')}</span>
            </div>
            <span className="font-mono">{formatNumber(cacheCreationTokens)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${TOKEN_COLORS.cacheRead}`} />
              <span className="text-muted-foreground">{t('cacheRead')}</span>
            </div>
            <span className="font-mono">{formatNumber(cacheReadTokens)}</span>
          </div>
        </div>

        {/* Cache efficiency */}
        {totalCacheTokens > 0 && (
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('cacheEfficiency')}</span>
              <span className="font-medium">{cacheEfficiency}%</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {cacheEfficiency >= 80
                ? t('excellentCache')
                : cacheEfficiency >= 50
                  ? t('goodCache')
                  : t('improveCacheUsage')}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
