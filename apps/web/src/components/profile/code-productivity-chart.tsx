'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';
import { FilePlus, FileEdit, TrendingUp } from 'lucide-react';

interface CodeMetrics {
  linesAdded: number;
  linesDeleted: number;
  filesModified: number;
  filesCreated: number;
  productivity: number;
  refactorRatio: number;
}

interface CodeProductivityChartProps {
  codeMetrics: CodeMetrics | null;
  className?: string;
}

export function CodeProductivityChart({ codeMetrics, className }: CodeProductivityChartProps) {
  const t = useTranslations('profile.codeProductivity');

  if (!codeMetrics) {
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

  const { linesAdded, linesDeleted, filesModified, filesCreated, productivity, refactorRatio } =
    codeMetrics;
  const netLines = linesAdded - linesDeleted;

  // Calculate percentage for bar visualization
  const maxLines = Math.max(linesAdded, linesDeleted, 1);
  const addedPercent = (linesAdded / maxLines) * 100;
  const deletedPercent = (linesDeleted / maxLines) * 100;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('title')}</CardTitle>
          <div className="text-right">
            <div className="text-sm font-medium">
              {t('linesPerTurn', { count: productivity.toFixed(1) })}
            </div>
            <div className="text-xs text-muted-foreground">{t('productivity')}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lines Added/Deleted Bar - GitHub-style: Green */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#216e39] dark:bg-[#39d353]" />
              {t('linesAdded')}
            </span>
            <span className="font-mono font-medium text-[#216e39] dark:text-[#39d353]">
              +{formatNumber(linesAdded)}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-[#216e39] dark:bg-[#39d353] transition-all"
              style={{ width: `${addedPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#9be9a8] dark:bg-[#0e4429]" />
              {t('linesDeleted')}
            </span>
            <span className="font-mono font-medium text-[#40c463] dark:text-[#006d32]">
              -{formatNumber(linesDeleted)}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-[#9be9a8] dark:bg-[#0e4429] transition-all"
              style={{ width: `${deletedPercent}%` }}
            />
          </div>
        </div>

        {/* Net Change */}
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('netChange')}</span>
            <span
              className={`font-mono font-bold ${netLines >= 0 ? 'text-[#216e39] dark:text-[#39d353]' : 'text-[#9be9a8] dark:text-[#0e4429]'}`}
            >
              {netLines >= 0 ? '+' : ''}
              {formatNumber(netLines)} {t('lines')}
            </span>
          </div>
        </div>

        {/* File Stats - GitHub-style: Green */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center rounded-lg bg-muted/50 p-2">
            <FilePlus className="mb-1 h-4 w-4 text-[#216e39] dark:text-[#39d353]" />
            <span className="text-lg font-bold">{filesCreated}</span>
            <span className="text-xs text-muted-foreground">{t('created')}</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-muted/50 p-2">
            <FileEdit className="mb-1 h-4 w-4 text-[#30a14e] dark:text-[#26a641]" />
            <span className="text-lg font-bold">{filesModified}</span>
            <span className="text-xs text-muted-foreground">{t('modified')}</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-muted/50 p-2">
            <TrendingUp className="mb-1 h-4 w-4 text-[#40c463] dark:text-[#006d32]" />
            <span className="text-lg font-bold">{Math.round(refactorRatio * 100)}%</span>
            <span className="text-xs text-muted-foreground">{t('refactor')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
