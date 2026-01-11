'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Trophy, Medal, Award, User, EyeOff, Info } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatNumber, formatCurrency } from '@/lib/utils';

// Claude Sonnet 4 pricing (approximate blended rate)
// Input: $3/1M, Output: $15/1M, Cache Read: $0.30/1M
// Assuming ~75% input, ~25% output ratio: ~$6/1M tokens
const COST_PER_TOKEN = 0.000006; // $6 per 1M tokens

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalTokens: number;
  compositeScore: number;
  sessionCount: number;
  efficiencyScore: number | null;
  isPrivate: boolean;
}

interface RankingTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string | null;
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-slate-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return null;
  }
}

function getRankBadge(rank: number) {
  if (rank === 1) return <Badge variant="gold">1st</Badge>;
  if (rank === 2) return <Badge variant="silver">2nd</Badge>;
  if (rank === 3) return <Badge variant="bronze">3rd</Badge>;
  return <span className="font-mono text-muted-foreground">#{rank}</span>;
}

function HeaderWithTooltip({
  label,
  tooltip,
  className,
}: {
  label: string;
  tooltip: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-end gap-1 ${className}`}>
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground/60 hover:text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px] text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function RankingTable({ entries, currentUserId }: RankingTableProps) {
  const t = useTranslations('leaderboard');
  const tCommon = useTranslations('common');
  const tHome = useTranslations('home');

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Trophy className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold">{tHome('noRankingsYet')}</h3>
        <p className="text-sm text-muted-foreground">{tHome('beTheFirst')}</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">{t('rank')}</TableHead>
              <TableHead>{t('user')}</TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                <HeaderWithTooltip label={t('score')} tooltip={t('scoreTooltip')} />
              </TableHead>
              <TableHead className="text-right">
                <HeaderWithTooltip label={t('tokens')} tooltip={t('tokensTooltip')} />
              </TableHead>
              <TableHead className="hidden text-right md:table-cell">
                <HeaderWithTooltip label={t('sessions')} tooltip={t('sessionsTooltip')} />
              </TableHead>
              <TableHead className="hidden text-right lg:table-cell">
                <HeaderWithTooltip label={t('efficiency')} tooltip={t('efficiencyTooltip')} />
              </TableHead>
              <TableHead className="hidden text-right xl:table-cell">
                <HeaderWithTooltip label={t('estCost')} tooltip={t('estCostTooltip')} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const isCurrentUser = currentUserId === entry.userId;
              const rankIcon = getRankIcon(entry.rank);

              return (
                <TableRow
                  key={`${entry.rank}-${entry.userId}`}
                  className={isCurrentUser ? 'bg-primary/5' : undefined}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {rankIcon}
                      {entry.rank > 3 && (
                        <span className="font-mono text-muted-foreground">#{entry.rank}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {entry.avatarUrl ? (
                          <AvatarImage src={entry.avatarUrl} alt={entry.username} />
                        ) : null}
                        <AvatarFallback>
                          {entry.isPrivate ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          {entry.isPrivate ? (
                            <span className="text-sm font-medium text-muted-foreground">
                              {tCommon('anonymous')}
                            </span>
                          ) : (
                            <Link
                              href={`/users/${entry.username}`}
                              className="text-sm font-medium hover:underline"
                            >
                              {entry.username}
                            </Link>
                          )}
                          {entry.rank <= 3 && getRankBadge(entry.rank)}
                        </div>
                        {isCurrentUser && (
                          <span className="text-xs text-primary">{tCommon('you')}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-right sm:table-cell">
                    <span className="font-mono font-medium">
                      {formatNumber(Math.round(entry.compositeScore))}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono">{formatNumber(entry.totalTokens)}</span>
                  </TableCell>
                  <TableCell className="hidden text-right md:table-cell">
                    <span className="font-mono">{entry.sessionCount}</span>
                  </TableCell>
                  <TableCell className="hidden text-right lg:table-cell">
                    {entry.efficiencyScore !== null ? (
                      <span className="font-mono">{(entry.efficiencyScore * 100).toFixed(1)}%</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-right xl:table-cell">
                    <span className="font-mono text-muted-foreground">
                      {formatCurrency(entry.totalTokens * COST_PER_TOKEN)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
