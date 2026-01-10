'use client';

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

const styleConfig = {
  Explorer: {
    icon: Search,
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'You love exploring code and understanding systems',
    emoji: '🔍',
  },
  Creator: {
    icon: FileCode,
    color: 'bg-emerald-500',
    textColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    description: 'You focus on creating new code and features',
    emoji: '✨',
  },
  Refactorer: {
    icon: Pencil,
    color: 'bg-amber-500',
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'You excel at improving and refining existing code',
    emoji: '🔧',
  },
  Automator: {
    icon: Terminal,
    color: 'bg-violet-500',
    textColor: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    description: 'You automate tasks and orchestrate complex workflows',
    emoji: '⚡',
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
  if (!vibeStyle) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Vibe Style</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No vibe data available yet</p>
        </CardContent>
      </Card>
    );
  }

  const { primaryStyle, styleScores, avgSessionDuration, avgTurnsPerSession } = vibeStyle;
  const config = styleConfig[primaryStyle];
  const Icon = config.icon;

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
          <CardTitle className="text-base">Vibe Style</CardTitle>
          <Badge variant="outline" className={`${config.textColor} ${config.borderColor}`}>
            {config.emoji} {primaryStyle}
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
              <h3 className={`font-semibold ${config.textColor}`}>{primaryStyle}</h3>
              <p className="text-sm text-muted-foreground">{config.description}</p>
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
                <span className="w-20 text-sm">{name}</span>
                <div className="flex-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${itemConfig.color} transition-all`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
                <span className="w-10 text-right text-sm font-mono">{score}%</span>
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
              <div className="text-xs text-muted-foreground">Avg Session</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{avgTurnsPerSession} turns</div>
              <div className="text-xs text-muted-foreground">Avg per Session</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
