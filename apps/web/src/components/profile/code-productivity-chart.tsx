'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';
import { FileCode, FilePlus, FileEdit, TrendingUp } from 'lucide-react';

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
  if (!codeMetrics) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Code Productivity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No code metrics available yet</p>
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
          <CardTitle className="text-base">Code Productivity</CardTitle>
          <div className="text-right">
            <div className="text-sm font-medium">{productivity.toFixed(1)} lines/turn</div>
            <div className="text-xs text-muted-foreground">Productivity</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lines Added/Deleted Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Lines Added
            </span>
            <span className="font-mono font-medium text-emerald-600">
              +{formatNumber(linesAdded)}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${addedPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              Lines Deleted
            </span>
            <span className="font-mono font-medium text-rose-600">
              -{formatNumber(linesDeleted)}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-rose-500 transition-all"
              style={{ width: `${deletedPercent}%` }}
            />
          </div>
        </div>

        {/* Net Change */}
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Net Change</span>
            <span
              className={`font-mono font-bold ${netLines >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
            >
              {netLines >= 0 ? '+' : ''}
              {formatNumber(netLines)} lines
            </span>
          </div>
        </div>

        {/* File Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center rounded-lg bg-muted/50 p-2">
            <FilePlus className="mb-1 h-4 w-4 text-emerald-500" />
            <span className="text-lg font-bold">{filesCreated}</span>
            <span className="text-xs text-muted-foreground">Created</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-muted/50 p-2">
            <FileEdit className="mb-1 h-4 w-4 text-blue-500" />
            <span className="text-lg font-bold">{filesModified}</span>
            <span className="text-xs text-muted-foreground">Modified</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-muted/50 p-2">
            <TrendingUp className="mb-1 h-4 w-4 text-amber-500" />
            <span className="text-lg font-bold">{Math.round(refactorRatio * 100)}%</span>
            <span className="text-xs text-muted-foreground">Refactor</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
