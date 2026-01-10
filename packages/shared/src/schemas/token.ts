import { z } from 'zod';

/**
 * Token usage Zod schemas for validation
 */

export const TokenUsageSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  totalTokens: z.number().int().min(0),
  model: z.string().min(1),
  timestamp: z.coerce.date(),
});

export const CreateTokenUsageSchema = TokenUsageSchema.omit({
  id: true,
  totalTokens: true,
  timestamp: true,
}).extend({
  totalTokens: z.number().int().min(0).optional(),
});

export const TokenUsageSummarySchema = z.object({
  userId: z.string().uuid(),
  totalInputTokens: z.number().int().min(0),
  totalOutputTokens: z.number().int().min(0),
  totalTokens: z.number().int().min(0),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
});

export const TokenPeriodSchema = z.enum(['daily', 'weekly', 'monthly', 'all-time']);

export const GetTokenUsageQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  period: TokenPeriodSchema.optional().default('daily'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export type TokenUsageSchemaType = z.infer<typeof TokenUsageSchema>;
export type CreateTokenUsageSchemaType = z.infer<typeof CreateTokenUsageSchema>;
export type TokenUsageSummarySchemaType = z.infer<typeof TokenUsageSummarySchema>;
export type TokenPeriodSchemaType = z.infer<typeof TokenPeriodSchema>;
export type GetTokenUsageQuerySchemaType = z.infer<typeof GetTokenUsageQuerySchema>;
