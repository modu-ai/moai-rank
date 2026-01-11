'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ModelUsage {
  modelName: string;
  sessionCount: number;
  percentage: number;
}

interface ModelUsageChartProps {
  modelUsage: ModelUsage[];
  className?: string;
}

// GitHub-style: Green contribution palette
const MODEL_COLORS: Record<string, string> = {
  'claude-sonnet-4-20250514': 'bg-[#216e39] dark:bg-[#39d353]',
  'claude-opus-4-20250514': 'bg-[#30a14e] dark:bg-[#26a641]',
  'claude-3-5-sonnet-20241022': 'bg-[#40c463] dark:bg-[#006d32]',
  'claude-3-5-haiku-20241022': 'bg-[#9be9a8] dark:bg-[#0e4429]',
  'claude-3-opus-20240229': 'bg-[#c6e48b] dark:bg-[#0a3d1e]',
  'claude-3-sonnet-20240229': 'bg-emerald-300 dark:bg-emerald-800',
  'claude-3-haiku-20240307': 'bg-emerald-200 dark:bg-emerald-900',
};

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'claude-sonnet-4-20250514': 'Claude Sonnet 4',
  'claude-opus-4-20250514': 'Claude Opus 4',
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
  'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
  'claude-3-opus-20240229': 'Claude 3 Opus',
  'claude-3-sonnet-20240229': 'Claude 3 Sonnet',
  'claude-3-haiku-20240307': 'Claude 3 Haiku',
};

function getModelColor(modelName: string): string {
  return MODEL_COLORS[modelName] ?? 'bg-gray-500';
}

function getModelDisplayName(modelName: string): string {
  return MODEL_DISPLAY_NAMES[modelName] ?? modelName;
}

export function ModelUsageChart({ modelUsage, className }: ModelUsageChartProps) {
  const t = useTranslations('profile.modelUsage');

  const sortedUsage = useMemo(() => {
    return [...modelUsage].sort((a, b) => b.percentage - a.percentage);
  }, [modelUsage]);

  const totalSessions = useMemo(() => {
    return modelUsage.reduce((sum, m) => sum + m.sessionCount, 0);
  }, [modelUsage]);

  if (modelUsage.length === 0) {
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

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar showing all models */}
        <div className="flex h-4 overflow-hidden rounded-full bg-muted">
          {sortedUsage.map((model) => (
            <div
              key={model.modelName}
              className={`${getModelColor(model.modelName)} transition-all`}
              style={{ width: `${model.percentage}%` }}
              title={`${getModelDisplayName(model.modelName)}: ${model.percentage}%`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="space-y-2">
          {sortedUsage.map((model) => (
            <div key={model.modelName} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${getModelColor(model.modelName)}`} />
                <span className="text-sm">{getModelDisplayName(model.modelName)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{model.sessionCount} sessions</span>
                <span className="font-medium text-foreground">{model.percentage}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="border-t pt-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('totalSessions')}</span>
            <span className="font-medium">{totalSessions}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
