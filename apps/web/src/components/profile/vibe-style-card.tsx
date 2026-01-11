'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Pencil, FileCode, Terminal, Clock, MessageSquare } from 'lucide-react';

interface VibeStyle {
  primaryStyle: 'Explorer' | 'Creator' | 'Refactorer' | 'Automator';
  styleScores: {
    explorer: number;
    creator: number;
    refactorer: number;
    automator: number;
  };
  avgSessionDuration: number;
  avgTurnsPerSession: number;
}

interface VibeStyleCardProps {
  vibeStyle: VibeStyle | null;
  className?: string;
}

// GitHub-style: Green contribution palette
const styleConfig = {
  Explorer: {
    icon: Search,
    color: 'bg-[#40c463] dark:bg-[#006d32]',
    textColor: 'text-[#216e39] dark:text-[#39d353]',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    descKey: 'explorerDesc' as const,
    emoji: '',
  },
  Creator: {
    icon: FileCode,
    color: 'bg-[#216e39] dark:bg-[#39d353]',
    textColor: 'text-[#216e39] dark:text-[#39d353]',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    descKey: 'creatorDesc' as const,
    emoji: '',
  },
  Refactorer: {
    icon: Pencil,
    color: 'bg-[#9be9a8] dark:bg-[#0e4429]',
    textColor: 'text-[#30a14e] dark:text-[#26a641]',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    descKey: 'refactorerDesc' as const,
    emoji: '',
  },
  Automator: {
    icon: Terminal,
    color: 'bg-[#30a14e] dark:bg-[#26a641]',
    textColor: 'text-[#30a14e] dark:text-[#26a641]',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    descKey: 'automatorDesc' as const,
    emoji: '',
  },
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function VibeStyleCard({ vibeStyle, className }: VibeStyleCardProps) {
  const t = useTranslations('profile.vibeStyle');

  if (!vibeStyle) {
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

  const { primaryStyle, styleScores, avgSessionDuration, avgTurnsPerSession } = vibeStyle;
  const config = styleConfig[primaryStyle];
  const Icon = config.icon;

  const getStyleName = (style: string) => {
    switch (style) {
      case 'Explorer':
        return t('explorer');
      case 'Creator':
        return t('creator');
      case 'Refactorer':
        return t('refactorer');
      case 'Automator':
        return t('automator');
      default:
        return style;
    }
  };

  // Sort scores for radar-like display
  const scores = [
    { name: 'Explorer', score: styleScores.explorer, icon: Search },
    { name: 'Creator', score: styleScores.creator, icon: FileCode },
    { name: 'Refactorer', score: styleScores.refactorer, icon: Pencil },
    { name: 'Automator', score: styleScores.automator, icon: Terminal },
  ].sort((a, b) => b.score - a.score);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('title')}</CardTitle>
          <Badge variant="outline" className={`${config.textColor} ${config.borderColor}`}>
            {getStyleName(primaryStyle)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Style Display */}
        <div className={`rounded-lg ${config.bgColor} p-4 ${config.borderColor} border`}>
          <div className="flex items-center gap-3">
            <div className={`rounded-full ${config.color} p-2`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className={`font-semibold ${config.textColor}`}>{getStyleName(primaryStyle)}</h3>
              <p className="text-sm text-muted-foreground">{t(config.descKey)}</p>
            </div>
          </div>
        </div>

        {/* Style Breakdown */}
        <div className="space-y-2">
          {scores.map(({ name, score, icon: StyleIcon }) => {
            const itemConfig = styleConfig[name as keyof typeof styleConfig];
            return (
              <div key={name} className="flex items-center gap-2">
                <StyleIcon className={`h-4 w-4 ${itemConfig.textColor}`} />
                <span className="w-20 text-sm">{getStyleName(name)}</span>
                <div className="flex-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${itemConfig.color} transition-all`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
                <span className="w-10 text-right font-mono text-sm">{score}%</span>
              </div>
            );
          })}
        </div>

        {/* Session Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{formatDuration(avgSessionDuration)}</div>
              <div className="text-xs text-muted-foreground">{t('avgSession')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{t('turns', { count: avgTurnsPerSession })}</div>
              <div className="text-xs text-muted-foreground">{t('avgPerSession')}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
