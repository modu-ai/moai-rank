/**
 * Ranking-related type definitions
 */

export interface Ranking {
  id: string;
  userId: string;
  rank: number;
  totalTokens: number;
  period: RankingPeriod;
  calculatedAt: Date;
}

export type RankingPeriod = 'daily' | 'weekly' | 'monthly' | 'all-time';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string | null;
  imageUrl: string | null;
  totalTokens: number;
  change: number | null;
}

export interface Leaderboard {
  period: RankingPeriod;
  entries: LeaderboardEntry[];
  totalParticipants: number;
  updatedAt: Date;
}

export interface UserRankingStats {
  currentRank: number;
  previousRank: number | null;
  rankChange: number | null;
  percentile: number;
  totalTokens: number;
}
