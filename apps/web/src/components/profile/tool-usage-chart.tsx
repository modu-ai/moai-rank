'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';
import {
  FileText,
  FileEdit,
  FilePlus,
  Terminal,
  Search,
  Globe,
  ListTodo,
  Layers,
  HelpCircle,
  Wrench,
} from 'lucide-react';

interface ToolUsagePattern {
  toolName: string;
  count: number;
  percentage: number;
}

interface ToolUsageChartProps {
  toolUsage: ToolUsagePattern[];
  className?: string;
}

// GitHub-style: Green contribution palette
const toolConfig: Record<string, { icon: typeof FileText; color: string }> = {
  Read: { icon: FileText, color: 'bg-[#40c463] dark:bg-[#006d32]' },
  Write: { icon: FilePlus, color: 'bg-[#216e39] dark:bg-[#39d353]' },
  Edit: { icon: FileEdit, color: 'bg-[#30a14e] dark:bg-[#26a641]' },
  MultiEdit: { icon: FileEdit, color: 'bg-[#30a14e] dark:bg-[#26a641]' },
  Bash: { icon: Terminal, color: 'bg-[#216e39] dark:bg-[#39d353]' },
  Grep: { icon: Search, color: 'bg-[#9be9a8] dark:bg-[#0e4429]' },
  Glob: { icon: Search, color: 'bg-[#9be9a8] dark:bg-[#0e4429]' },
  WebSearch: { icon: Globe, color: 'bg-[#c6e48b] dark:bg-[#0a3d1e]' },
  WebFetch: { icon: Globe, color: 'bg-[#c6e48b] dark:bg-[#0a3d1e]' },
  TodoWrite: { icon: ListTodo, color: 'bg-emerald-300 dark:bg-emerald-800' },
  Task: { icon: Layers, color: 'bg-[#40c463] dark:bg-[#006d32]' },
  AskUserQuestion: { icon: HelpCircle, color: 'bg-[#c6e48b] dark:bg-[#0a3d1e]' },
};

const defaultConfig = {
  icon: Wrench,
  color: 'bg-[#9be9a8] dark:bg-[#0e4429]',
};

export function ToolUsageChart({ toolUsage, className }: ToolUsageChartProps) {
  const t = useTranslations('profile.toolUsage');

  if (!toolUsage || toolUsage.length === 0) {
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

  const totalUsage = toolUsage.reduce((sum, tool) => sum + tool.count, 0);
  const topTools = toolUsage.slice(0, 8);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('title')}</CardTitle>
          <div className="text-right">
            <div className="text-sm font-medium">{formatNumber(totalUsage)}</div>
            <div className="text-xs text-muted-foreground">{t('totalCalls')}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {topTools.map((tool) => {
          const config = toolConfig[tool.toolName] ?? defaultConfig;
          const Icon = config.icon;

          return (
            <div key={tool.toolName} className="flex items-center gap-2">
              <div className={`rounded p-1 ${config.color}`}>
                <Icon className="h-3 w-3 text-white" />
              </div>
              <span className="w-24 truncate text-sm">{tool.toolName}</span>
              <div className="flex-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${config.color} transition-all`}
                    style={{ width: `${tool.percentage}%` }}
                  />
                </div>
              </div>
              <span className="w-12 text-right font-mono text-xs text-muted-foreground">
                {formatNumber(tool.count)}
              </span>
              <span className="w-10 text-right font-mono text-xs">{tool.percentage}%</span>
            </div>
          );
        })}

        {/* Summary by Category */}
        <div className="mt-4 grid grid-cols-4 gap-2 rounded-lg bg-muted/50 p-3 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Read</div>
            <div className="text-sm font-medium">
              {toolUsage.find((tool) => tool.toolName === 'Read')?.percentage ?? 0}%
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Write</div>
            <div className="text-sm font-medium">
              {toolUsage.find((tool) => tool.toolName === 'Write')?.percentage ?? 0}%
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Edit</div>
            <div className="text-sm font-medium">
              {toolUsage.find((tool) => tool.toolName === 'Edit')?.percentage ?? 0}%
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Bash</div>
            <div className="text-sm font-medium">
              {toolUsage.find((tool) => tool.toolName === 'Bash')?.percentage ?? 0}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
