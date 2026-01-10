/**
 * Token usage type definitions
 */

export interface TokenUsage {
  id: string;
  userId: string;
  sessionId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  timestamp: Date;
}

export interface TokenUsageSummary {
  userId: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface DailyTokenUsage {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export type TokenPeriod = 'daily' | 'weekly' | 'monthly' | 'all-time';
