"use client";

import Link from "next/link";
import { Trophy, Medal, Award, User, EyeOff } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

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
      return <Trophy className="h-5 w-5 text-amber-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-zinc-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-700" />;
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

export function RankingTable({ entries, currentUserId }: RankingTableProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Trophy className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold">No rankings yet</h3>
        <p className="text-sm text-muted-foreground">
          Be the first to submit your token usage and climb the leaderboard!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Rank</TableHead>
            <TableHead>User</TableHead>
            <TableHead className="hidden text-right sm:table-cell">
              Score
            </TableHead>
            <TableHead className="text-right">Tokens</TableHead>
            <TableHead className="hidden text-right md:table-cell">
              Sessions
            </TableHead>
            <TableHead className="hidden text-right lg:table-cell">
              Efficiency
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
                className={isCurrentUser ? "bg-primary/5" : undefined}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    {rankIcon}
                    {getRankBadge(entry.rank)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {entry.avatarUrl ? (
                        <AvatarImage
                          src={entry.avatarUrl}
                          alt={entry.username}
                        />
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
                      {entry.isPrivate ? (
                        <span className="text-sm font-medium text-muted-foreground">
                          Anonymous
                        </span>
                      ) : (
                        <Link
                          href={`/users/${entry.username}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {entry.username}
                        </Link>
                      )}
                      {isCurrentUser && (
                        <span className="text-xs text-primary">You</span>
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
                  <span className="font-mono">
                    {formatNumber(entry.totalTokens)}
                  </span>
                </TableCell>
                <TableCell className="hidden text-right md:table-cell">
                  <span className="font-mono">{entry.sessionCount}</span>
                </TableCell>
                <TableCell className="hidden text-right lg:table-cell">
                  {entry.efficiencyScore !== null ? (
                    <span className="font-mono">
                      {(entry.efficiencyScore * 100).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
