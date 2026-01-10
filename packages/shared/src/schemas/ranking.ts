import { z } from 'zod';

/**
 * Ranking Zod schemas for validation
 */

export const RankingPeriodSchema = z.enum(['daily', 'weekly', 'monthly', 'all-time']);

export const RankingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  rank: z.number().int().min(1),
  totalTokens: z.number().int().min(0),
  period: RankingPeriodSchema,
  calculatedAt: z.coerce.date(),
});

export const LeaderboardEntrySchema = z.object({
  rank: z.number().int().min(1),
  userId: z.string().uuid(),
  username: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  totalTokens: z.number().int().min(0),
  change: z.number().int().nullable(),
});

export const LeaderboardSchema = z.object({
  period: RankingPeriodSchema,
  entries: z.array(LeaderboardEntrySchema),
  totalParticipants: z.number().int().min(0),
  updatedAt: z.coerce.date(),
});

export const UserRankingStatsSchema = z.object({
  currentRank: z.number().int().min(1),
  previousRank: z.number().int().min(1).nullable(),
  rankChange: z.number().int().nullable(),
  percentile: z.number().min(0).max(100),
  totalTokens: z.number().int().min(0),
});

export const GetLeaderboardQuerySchema = z.object({
  period: RankingPeriodSchema.optional().default('weekly'),
  limit: z.number().int().min(1).max(100).optional().default(10),
  offset: z.number().int().min(0).optional().default(0),
});

export type RankingPeriodSchemaType = z.infer<typeof RankingPeriodSchema>;
export type RankingSchemaType = z.infer<typeof RankingSchema>;
export type LeaderboardEntrySchemaType = z.infer<typeof LeaderboardEntrySchema>;
export type LeaderboardSchemaType = z.infer<typeof LeaderboardSchema>;
export type UserRankingStatsSchemaType = z.infer<typeof UserRankingStatsSchema>;
export type GetLeaderboardQuerySchemaType = z.infer<typeof GetLeaderboardQuerySchema>;
