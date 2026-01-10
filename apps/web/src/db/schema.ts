import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  bigint,
  integer,
  decimal,
  date,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";

/**
 * Users table
 * Stores user information linked to Clerk authentication
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: varchar("clerk_id", { length: 255 }).unique().notNull(),
  githubId: varchar("github_id", { length: 255 }).unique(),
  githubUsername: varchar("github_username", { length: 255 }).notNull(),
  githubAvatarUrl: text("github_avatar_url"),
  apiKeyHash: varchar("api_key_hash", { length: 64 }).notNull(), // SHA-256 hash only
  apiKeyPrefix: varchar("api_key_prefix", { length: 16 }).notNull(), // 'moai_rank_ab12...'
  userSalt: varchar("user_salt", { length: 64 }).notNull().default(crypto.randomUUID()),
  privacyMode: boolean("privacy_mode").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/**
 * Sessions table
 * Tracks Claude Code sessions
 */
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  serverSessionHash: varchar("server_session_hash", { length: 64 }).unique().notNull(),
  anonymousProjectId: varchar("anonymous_project_id", { length: 16 }),
  endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
  modelName: varchar("model_name", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/**
 * Token Usage table
 * Records token usage per session
 */
export const tokenUsage = pgTable("token_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id),
  userId: uuid("user_id").references(() => users.id),
  inputTokens: bigint("input_tokens", { mode: "number" }).notNull().default(0),
  outputTokens: bigint("output_tokens", { mode: "number" }).notNull().default(0),
  cacheCreationTokens: bigint("cache_creation_tokens", { mode: "number" }).default(0),
  cacheReadTokens: bigint("cache_read_tokens", { mode: "number" }).default(0),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow(),
});

/**
 * Daily Aggregates table
 * Pre-computed daily statistics for faster queries
 */
export const dailyAggregates = pgTable(
  "daily_aggregates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    date: date("date").notNull(),
    totalInputTokens: bigint("total_input_tokens", { mode: "number" }).default(0),
    totalOutputTokens: bigint("total_output_tokens", { mode: "number" }).default(0),
    totalCacheTokens: bigint("total_cache_tokens", { mode: "number" }).default(0),
    sessionCount: integer("session_count").default(0),
    avgEfficiency: decimal("avg_efficiency", { precision: 5, scale: 4 }),
    compositeScore: decimal("composite_score", { precision: 12, scale: 4 }),
  },
  (table) => [unique().on(table.userId, table.date)]
);

/**
 * Rankings table
 * Stores computed rankings for different time periods
 */
export const rankings = pgTable(
  "rankings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    periodType: varchar("period_type", { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly', 'all_time'
    periodStart: date("period_start").notNull(),
    rankPosition: integer("rank_position").notNull(),
    totalTokens: bigint("total_tokens", { mode: "number" }).notNull(),
    compositeScore: decimal("composite_score", { precision: 12, scale: 4 }).notNull(),
    sessionCount: integer("session_count").notNull(),
    efficiencyScore: decimal("efficiency_score", { precision: 5, scale: 4 }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [unique().on(table.userId, table.periodType, table.periodStart)]
);

/**
 * Security Audit Log table
 * Tracks security-related events
 */
export const securityAuditLog = pgTable("security_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id), // nullable for unauthenticated events
  eventType: varchar("event_type", { length: 50 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }), // supports IPv6
  userAgent: text("user_agent"),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Type exports for use in application code
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type TokenUsage = typeof tokenUsage.$inferSelect;
export type NewTokenUsage = typeof tokenUsage.$inferInsert;

export type DailyAggregate = typeof dailyAggregates.$inferSelect;
export type NewDailyAggregate = typeof dailyAggregates.$inferInsert;

export type Ranking = typeof rankings.$inferSelect;
export type NewRanking = typeof rankings.$inferInsert;

export type SecurityAuditLog = typeof securityAuditLog.$inferSelect;
export type NewSecurityAuditLog = typeof securityAuditLog.$inferInsert;
