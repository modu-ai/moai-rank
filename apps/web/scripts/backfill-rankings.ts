/**
 * Backfill Rankings Script
 *
 * This script generates ranking records for all historical dates
 * found in the token_usage table. It ensures that each day has
 * its own ranking record instead of aggregating everything into
 * the current date.
 *
 * Usage:
 *   bun run scripts/backfill-rankings.ts
 *
 * Environment:
 *   DATABASE_URL must be set
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/db/schema';
import { users, rankings, tokenUsage } from '../src/db';
import { eq, and, sql, gte, lt } from 'drizzle-orm';

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

/**
 * Get all unique dates from token_usage table
 */
async function getUniqueDates(): Promise<string[]> {
  const result = await db
    .selectDistinct({
      date: sql<string>`DATE(${tokenUsage.recordedAt})`,
    })
    .from(tokenUsage)
    .orderBy(sql`DATE(${tokenUsage.recordedAt})`);

  return result.map((r) => r.date);
}

/**
 * Calculate rankings for a specific date
 * This creates ranking records as if the cron ran on that specific date
 */
async function calculateRankingsForDate(targetDate: string) {
  console.log(`  [${targetDate}] Processing...`);

  // Calculate period start dates for each period type
  // For daily: the date itself
  // For weekly: the Monday of that week
  // For monthly: the 1st of that month
  const date = new Date(targetDate);
  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();

  // Weekly: find Monday of that week
  const weeklyStart = new Date(date);
  const diff = dayOfWeek === 0 ? -6 : dayOfWeek - 1;
  weeklyStart.setDate(date.getDate() + diff);
  const weeklyStartStr = weeklyStart.toISOString().split('T')[0];

  // Monthly: 1st of that month
  const monthlyStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthlyStartStr = monthlyStart.toISOString().split('T')[0];

  const periods = [
    { type: 'daily' as const, start: targetDate },
    { type: 'weekly' as const, start: weeklyStartStr },
    { type: 'monthly' as const, start: monthlyStartStr },
    { type: 'all_time' as const, start: '2024-01-01' },
  ];

  let totalProcessed = 0;

  for (const period of periods) {
    // Get token usage up to and including the target date
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 1); // Include the target date

    const userStats = await db
      .select({
        userId: users.id,
        totalInputTokens: sql<number>`COALESCE(SUM(${tokenUsage.inputTokens}), 0)`,
        totalOutputTokens: sql<number>`COALESCE(SUM(${tokenUsage.outputTokens}), 0)`,
        sessionCount: sql<number>`COUNT(DISTINCT ${tokenUsage.sessionId})`,
      })
      .from(users)
      .leftJoin(
        tokenUsage,
        and(
          eq(tokenUsage.userId, users.id),
          period.type === 'all_time'
            ? sql`1=1`
            : and(
                gte(tokenUsage.recordedAt, new Date(period.start)),
                lt(tokenUsage.recordedAt, endDate)
              )
        )
      )
      .groupBy(users.id)
      .having(sql`COALESCE(SUM(${tokenUsage.inputTokens}), 0) > 0`);

    if (userStats.length === 0) continue;

    // Calculate scores
    const scoredUsers = userStats.map((user) => {
      const totalTokens = Number(user.totalInputTokens) + Number(user.totalOutputTokens);
      const inputTokens = Number(user.totalInputTokens);
      const outputTokens = Number(user.totalOutputTokens);
      const sessionCount = Number(user.sessionCount);

      // Simplified composite score calculation
      const compositeScore = totalTokens / 1000 + sessionCount * 10;
      const efficiencyScore = outputTokens / (inputTokens || 1);

      return {
        userId: user.userId,
        totalTokens,
        sessionCount,
        compositeScore: compositeScore.toFixed(4),
        efficiencyScore: efficiencyScore.toFixed(4),
      };
    });

    // Sort by score
    scoredUsers.sort((a, b) => parseFloat(b.compositeScore) - parseFloat(a.compositeScore));

    // Upsert rankings
    for (let i = 0; i < scoredUsers.length; i++) {
      const user = scoredUsers[i];
      await db
        .insert(rankings)
        .values({
          userId: user.userId,
          periodType: period.type,
          periodStart: period.start,
          rankPosition: i + 1,
          totalTokens: user.totalTokens,
          compositeScore: user.compositeScore,
          sessionCount: user.sessionCount,
          efficiencyScore: user.efficiencyScore,
          updatedAt: date,
        })
        .onConflictDoUpdate({
          target: [rankings.userId, rankings.periodType, rankings.periodStart],
          set: {
            rankPosition: sql`EXCLUDED.rank_position`,
            totalTokens: sql`EXCLUDED.total_tokens`,
            compositeScore: sql`EXCLUDED.composite_score`,
            sessionCount: sql`EXCLUDED.session_count`,
            efficiencyScore: sql`EXCLUDED.efficiency_score`,
            updatedAt: sql`EXCLUDED.updated_at`,
          },
        });
    }

    totalProcessed += userStats.length;
  }

  console.log(`  [${targetDate}] ✓ Processed ${totalProcessed} user-period combinations`);
  return totalProcessed;
}

/**
 * Main backfill function
 */
async function backfillRankings() {
  console.log('🔍 Starting rankings backfill...\n');

  // Get all unique dates from token_usage
  const dates = await getUniqueDates();
  console.log(`📅 Found ${dates.length} unique date(s) in token_usage\n`);

  if (dates.length === 0) {
    console.log('⚠️  No dates found. Nothing to backfill.');
    return;
  }

  console.log('First 5 dates:', dates.slice(0, 5));
  console.log('Last 5 dates:', dates.slice(-5));
  console.log('');

  let totalProcessed = 0;

  for (const date of dates) {
    const processed = await calculateRankingsForDate(date);
    totalProcessed += processed;
  }

  console.log(`\n✅ Backfill complete!`);
  console.log(`   Total dates processed: ${dates.length}`);
  console.log(`   Total ranking records created: ${totalProcessed}`);
}

// Run the backfill
backfillRankings()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
