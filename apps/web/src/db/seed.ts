/**
 * Database Seed Script for UI/UX Development
 *
 * Generates dummy data for local development and testing.
 * Run with: bun run db:seed
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users, sessions, tokenUsage, dailyAggregates, rankings } from './schema';
import crypto from 'crypto';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Vibe Style Profiles for diverse user types
type VibeStyle = 'Explorer' | 'Creator' | 'Refactorer' | 'Automator';

interface UserProfile {
  username: string;
  avatar: string;
  vibeStyle: VibeStyle;
  activityLevel: 'high' | 'medium' | 'low';
  avgSessionDuration: number; // seconds
  avgTurnsPerSession: number;
}

// Diverse developer profiles with different coding styles
const DUMMY_USERS: UserProfile[] = [
  // Explorers - Heavy Read/Grep/Glob users
  {
    username: 'goos',
    avatar: 'https://avatars.githubusercontent.com/u/1?v=4',
    vibeStyle: 'Creator',
    activityLevel: 'high',
    avgSessionDuration: 2400,
    avgTurnsPerSession: 45,
  },
  {
    username: 'kim_coder',
    avatar: 'https://avatars.githubusercontent.com/u/2?v=4',
    vibeStyle: 'Explorer',
    activityLevel: 'high',
    avgSessionDuration: 1800,
    avgTurnsPerSession: 60,
  },
  {
    username: 'park_dev',
    avatar: 'https://avatars.githubusercontent.com/u/3?v=4',
    vibeStyle: 'Refactorer',
    activityLevel: 'medium',
    avgSessionDuration: 3600,
    avgTurnsPerSession: 80,
  },
  {
    username: 'lee_hacker',
    avatar: 'https://avatars.githubusercontent.com/u/4?v=4',
    vibeStyle: 'Automator',
    activityLevel: 'high',
    avgSessionDuration: 1200,
    avgTurnsPerSession: 30,
  },
  {
    username: 'choi_ninja',
    avatar: 'https://avatars.githubusercontent.com/u/5?v=4',
    vibeStyle: 'Creator',
    activityLevel: 'high',
    avgSessionDuration: 2700,
    avgTurnsPerSession: 55,
  },
  {
    username: 'jung_master',
    avatar: 'https://avatars.githubusercontent.com/u/6?v=4',
    vibeStyle: 'Explorer',
    activityLevel: 'medium',
    avgSessionDuration: 1500,
    avgTurnsPerSession: 40,
  },
  {
    username: 'kang_wizard',
    avatar: 'https://avatars.githubusercontent.com/u/7?v=4',
    vibeStyle: 'Refactorer',
    activityLevel: 'high',
    avgSessionDuration: 4200,
    avgTurnsPerSession: 100,
  },
  {
    username: 'cho_guru',
    avatar: 'https://avatars.githubusercontent.com/u/8?v=4',
    vibeStyle: 'Automator',
    activityLevel: 'medium',
    avgSessionDuration: 900,
    avgTurnsPerSession: 25,
  },
  {
    username: 'yoon_pro',
    avatar: 'https://avatars.githubusercontent.com/u/9?v=4',
    vibeStyle: 'Creator',
    activityLevel: 'medium',
    avgSessionDuration: 2100,
    avgTurnsPerSession: 50,
  },
  {
    username: 'jang_ace',
    avatar: 'https://avatars.githubusercontent.com/u/10?v=4',
    vibeStyle: 'Explorer',
    activityLevel: 'low',
    avgSessionDuration: 1200,
    avgTurnsPerSession: 35,
  },
  {
    username: 'shin_elite',
    avatar: 'https://avatars.githubusercontent.com/u/11?v=4',
    vibeStyle: 'Refactorer',
    activityLevel: 'medium',
    avgSessionDuration: 3000,
    avgTurnsPerSession: 70,
  },
  {
    username: 'han_legend',
    avatar: 'https://avatars.githubusercontent.com/u/12?v=4',
    vibeStyle: 'Automator',
    activityLevel: 'high',
    avgSessionDuration: 1800,
    avgTurnsPerSession: 45,
  },
  {
    username: 'oh_sensei',
    avatar: 'https://avatars.githubusercontent.com/u/13?v=4',
    vibeStyle: 'Creator',
    activityLevel: 'low',
    avgSessionDuration: 1500,
    avgTurnsPerSession: 30,
  },
  {
    username: 'seo_king',
    avatar: 'https://avatars.githubusercontent.com/u/14?v=4',
    vibeStyle: 'Explorer',
    activityLevel: 'high',
    avgSessionDuration: 2400,
    avgTurnsPerSession: 75,
  },
  {
    username: 'hwang_boss',
    avatar: 'https://avatars.githubusercontent.com/u/15?v=4',
    vibeStyle: 'Refactorer',
    activityLevel: 'low',
    avgSessionDuration: 2700,
    avgTurnsPerSession: 60,
  },
  {
    username: 'son_champ',
    avatar: 'https://avatars.githubusercontent.com/u/16?v=4',
    vibeStyle: 'Automator',
    activityLevel: 'medium',
    avgSessionDuration: 1100,
    avgTurnsPerSession: 28,
  },
  {
    username: 'yang_star',
    avatar: 'https://avatars.githubusercontent.com/u/17?v=4',
    vibeStyle: 'Creator',
    activityLevel: 'high',
    avgSessionDuration: 3300,
    avgTurnsPerSession: 65,
  },
  {
    username: 'im_hero',
    avatar: 'https://avatars.githubusercontent.com/u/18?v=4',
    vibeStyle: 'Explorer',
    activityLevel: 'medium',
    avgSessionDuration: 1600,
    avgTurnsPerSession: 42,
  },
  {
    username: 'ahn_titan',
    avatar: 'https://avatars.githubusercontent.com/u/19?v=4',
    vibeStyle: 'Refactorer',
    activityLevel: 'high',
    avgSessionDuration: 3900,
    avgTurnsPerSession: 90,
  },
  {
    username: 'song_saint',
    avatar: 'https://avatars.githubusercontent.com/u/20?v=4',
    vibeStyle: 'Automator',
    activityLevel: 'low',
    avgSessionDuration: 800,
    avgTurnsPerSession: 20,
  },
];

// Tool usage patterns by vibe style
function generateToolUsage(vibeStyle: VibeStyle, turns: number): Record<string, number> {
  const baseMultiplier = turns / 50; // Scale based on session length

  switch (vibeStyle) {
    case 'Explorer':
      return {
        Read: Math.floor(30 * baseMultiplier + randomInt(5, 15)),
        Grep: Math.floor(20 * baseMultiplier + randomInt(3, 10)),
        Glob: Math.floor(15 * baseMultiplier + randomInt(2, 8)),
        WebSearch: Math.floor(8 * baseMultiplier + randomInt(1, 5)),
        WebFetch: Math.floor(5 * baseMultiplier + randomInt(0, 3)),
        Write: Math.floor(5 * baseMultiplier + randomInt(1, 4)),
        Edit: Math.floor(8 * baseMultiplier + randomInt(2, 5)),
        Bash: Math.floor(6 * baseMultiplier + randomInt(1, 4)),
        Task: Math.floor(2 * baseMultiplier + randomInt(0, 2)),
        TodoWrite: Math.floor(3 * baseMultiplier + randomInt(0, 2)),
        AskUserQuestion: Math.floor(4 * baseMultiplier + randomInt(1, 3)),
      };
    case 'Creator':
      return {
        Read: Math.floor(15 * baseMultiplier + randomInt(3, 8)),
        Grep: Math.floor(8 * baseMultiplier + randomInt(1, 5)),
        Glob: Math.floor(5 * baseMultiplier + randomInt(1, 3)),
        Write: Math.floor(25 * baseMultiplier + randomInt(5, 15)),
        Edit: Math.floor(12 * baseMultiplier + randomInt(3, 8)),
        Bash: Math.floor(10 * baseMultiplier + randomInt(2, 6)),
        Task: Math.floor(5 * baseMultiplier + randomInt(1, 3)),
        TodoWrite: Math.floor(8 * baseMultiplier + randomInt(2, 5)),
        AskUserQuestion: Math.floor(6 * baseMultiplier + randomInt(1, 4)),
        WebSearch: Math.floor(3 * baseMultiplier + randomInt(0, 2)),
      };
    case 'Refactorer':
      return {
        Read: Math.floor(20 * baseMultiplier + randomInt(4, 10)),
        Grep: Math.floor(15 * baseMultiplier + randomInt(3, 8)),
        Glob: Math.floor(10 * baseMultiplier + randomInt(2, 5)),
        Edit: Math.floor(30 * baseMultiplier + randomInt(8, 20)),
        MultiEdit: Math.floor(12 * baseMultiplier + randomInt(3, 8)),
        Write: Math.floor(8 * baseMultiplier + randomInt(2, 5)),
        Bash: Math.floor(12 * baseMultiplier + randomInt(3, 7)),
        Task: Math.floor(6 * baseMultiplier + randomInt(1, 4)),
        TodoWrite: Math.floor(5 * baseMultiplier + randomInt(1, 3)),
        AskUserQuestion: Math.floor(3 * baseMultiplier + randomInt(0, 2)),
      };
    case 'Automator':
      return {
        Bash: Math.floor(35 * baseMultiplier + randomInt(8, 20)),
        Task: Math.floor(20 * baseMultiplier + randomInt(5, 12)),
        Read: Math.floor(12 * baseMultiplier + randomInt(2, 6)),
        Write: Math.floor(10 * baseMultiplier + randomInt(2, 6)),
        Edit: Math.floor(8 * baseMultiplier + randomInt(1, 5)),
        Grep: Math.floor(6 * baseMultiplier + randomInt(1, 4)),
        Glob: Math.floor(4 * baseMultiplier + randomInt(0, 3)),
        TodoWrite: Math.floor(10 * baseMultiplier + randomInt(3, 6)),
        AskUserQuestion: Math.floor(2 * baseMultiplier + randomInt(0, 2)),
        WebFetch: Math.floor(3 * baseMultiplier + randomInt(0, 2)),
      };
  }
}

// Code metrics by vibe style
function generateCodeMetrics(
  vibeStyle: VibeStyle,
  turns: number
): { linesAdded: number; linesDeleted: number; filesModified: number; filesCreated: number } {
  const baseMultiplier = turns / 50;

  switch (vibeStyle) {
    case 'Explorer':
      return {
        linesAdded: Math.floor(50 * baseMultiplier + randomInt(10, 30)),
        linesDeleted: Math.floor(20 * baseMultiplier + randomInt(5, 15)),
        filesModified: Math.floor(3 * baseMultiplier + randomInt(1, 3)),
        filesCreated: Math.floor(1 * baseMultiplier + randomInt(0, 2)),
      };
    case 'Creator':
      return {
        linesAdded: Math.floor(200 * baseMultiplier + randomInt(50, 150)),
        linesDeleted: Math.floor(30 * baseMultiplier + randomInt(10, 25)),
        filesModified: Math.floor(5 * baseMultiplier + randomInt(2, 5)),
        filesCreated: Math.floor(8 * baseMultiplier + randomInt(3, 10)),
      };
    case 'Refactorer':
      return {
        linesAdded: Math.floor(80 * baseMultiplier + randomInt(20, 60)),
        linesDeleted: Math.floor(120 * baseMultiplier + randomInt(30, 80)),
        filesModified: Math.floor(12 * baseMultiplier + randomInt(5, 15)),
        filesCreated: Math.floor(2 * baseMultiplier + randomInt(0, 3)),
      };
    case 'Automator':
      return {
        linesAdded: Math.floor(100 * baseMultiplier + randomInt(20, 50)),
        linesDeleted: Math.floor(40 * baseMultiplier + randomInt(10, 30)),
        filesModified: Math.floor(4 * baseMultiplier + randomInt(1, 4)),
        filesCreated: Math.floor(3 * baseMultiplier + randomInt(1, 4)),
      };
  }
}

function generateApiKey(): { hash: string; prefix: string } {
  const key = `moai_rank_${crypto.randomBytes(24).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 16);
  return { hash, prefix };
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateTokenUsage(): {
  input: number;
  output: number;
  cacheCreation: number;
  cacheRead: number;
} {
  const input = randomInt(50000, 500000);
  const output = randomInt(30000, 300000);
  const cacheCreation = randomInt(0, 50000);
  const cacheRead = randomInt(0, 100000);
  return { input, output, cacheCreation, cacheRead };
}

function calculateCompositeScore(
  input: number,
  output: number,
  sessionCount: number,
  streak: number
): number {
  const totalTokens = input + output;
  const efficiency = output / (input + 1);
  return (
    totalTokens * 0.4 +
    efficiency * 1000000 * 0.3 +
    sessionCount * 10000 * 0.2 +
    streak * 5000 * 0.1
  );
}

function getActivityMultiplier(level: 'high' | 'medium' | 'low'): number {
  switch (level) {
    case 'high':
      return 1.5;
    case 'medium':
      return 1.0;
    case 'low':
      return 0.5;
  }
}

async function seed() {
  console.log('🌱 Starting database seed with Vibe Coding profiles...\n');

  try {
    // Clear existing data (in reverse order due to foreign keys)
    console.log('🗑️  Clearing existing data...');
    await db.delete(rankings);
    await db.delete(dailyAggregates);
    await db.delete(tokenUsage);
    await db.delete(sessions);
    await db.delete(users);
    console.log('✅ Existing data cleared\n');

    // Create users
    console.log('👥 Creating dummy users with diverse vibe styles...');
    const createdUsers: { id: string; username: string; profile: UserProfile }[] = [];

    for (let i = 0; i < DUMMY_USERS.length; i++) {
      const profile = DUMMY_USERS[i];
      const { hash, prefix } = generateApiKey();
      const userSalt = crypto.randomUUID();

      const result = await db
        .insert(users)
        .values({
          clerkId: `clerk_dummy_${i + 1}`,
          githubId: `github_${i + 1}`,
          githubUsername: profile.username,
          githubAvatarUrl: profile.avatar,
          apiKeyHash: hash,
          apiKeyPrefix: prefix,
          userSalt,
          privacyMode: i % 10 === 0, // 10% in privacy mode
        })
        .returning({ id: users.id });

      createdUsers.push({ id: result[0].id, username: profile.username, profile });
      console.log(`  ✅ Created user: ${profile.username} (${profile.vibeStyle})`);
    }
    console.log(`\n✅ Created ${createdUsers.length} users\n`);

    // Create sessions and token usage for past 90 days (more data for heatmap)
    console.log('📊 Generating session and token usage data with vibe metrics...');
    const now = new Date();
    const userStats: Map<string, { totalInput: number; totalOutput: number; sessions: number }> =
      new Map();

    for (const user of createdUsers) {
      userStats.set(user.id, { totalInput: 0, totalOutput: 0, sessions: 0 });

      const activityMultiplier = getActivityMultiplier(user.profile.activityLevel);
      // Random number of sessions per user (10-80 based on activity level)
      const sessionCount = Math.floor(randomInt(20, 80) * activityMultiplier);

      for (let s = 0; s < sessionCount; s++) {
        // Random date in past 90 days for better heatmap visualization
        const daysAgo = randomInt(0, 90);
        const sessionEndDate = new Date(now);
        sessionEndDate.setDate(sessionEndDate.getDate() - daysAgo);
        sessionEndDate.setHours(randomInt(8, 22), randomInt(0, 59), randomInt(0, 59));

        // Session duration with variance
        const durationVariance = 0.5 + Math.random();
        const durationSeconds = Math.floor(user.profile.avgSessionDuration * durationVariance);
        const sessionStartDate = new Date(sessionEndDate.getTime() - durationSeconds * 1000);

        // Turn count with variance
        const turnVariance = 0.6 + Math.random() * 0.8;
        const turnCount = Math.floor(user.profile.avgTurnsPerSession * turnVariance);

        const sessionHash = crypto.randomBytes(32).toString('hex');

        // Generate vibe-style specific data
        const toolUsage = generateToolUsage(user.profile.vibeStyle, turnCount);
        const codeMetrics = generateCodeMetrics(user.profile.vibeStyle, turnCount);

        const modelName =
          Math.random() > 0.3 ? 'claude-sonnet-4-20250514' : 'claude-opus-4-20250514';

        const sessionResult = await db
          .insert(sessions)
          .values({
            userId: user.id,
            serverSessionHash: sessionHash,
            anonymousProjectId: `proj_${randomInt(1000, 9999)}`,
            startedAt: sessionStartDate,
            endedAt: sessionEndDate,
            durationSeconds,
            modelName,
            turnCount,
            toolUsage,
            codeMetrics,
            modelUsageDetails: {
              [modelName]: {
                input: randomInt(30000, 200000),
                output: randomInt(20000, 150000),
              },
            },
          })
          .returning({ id: sessions.id });

        const { input, output, cacheCreation, cacheRead } = generateTokenUsage();

        await db.insert(tokenUsage).values({
          sessionId: sessionResult[0].id,
          userId: user.id,
          inputTokens: input,
          outputTokens: output,
          cacheCreationTokens: cacheCreation,
          cacheReadTokens: cacheRead,
          recordedAt: sessionEndDate,
        });

        // Update user stats
        const stats = userStats.get(user.id)!;
        stats.totalInput += input;
        stats.totalOutput += output;
        stats.sessions += 1;
      }
    }
    console.log('✅ Session and token usage data generated\n');

    // Generate rankings
    console.log('🏆 Generating rankings...');
    const periodTypes = ['daily', 'weekly', 'monthly', 'all_time'] as const;
    const today = new Date().toISOString().split('T')[0];

    for (const periodType of periodTypes) {
      // Sort users by total tokens for this period
      const userRankings = Array.from(userStats.entries())
        .map(([userId, stats]) => {
          const compositeScore = calculateCompositeScore(
            stats.totalInput,
            stats.totalOutput,
            stats.sessions,
            randomInt(1, 30)
          );
          const efficiency = stats.totalOutput / (stats.totalInput + 1);
          return {
            userId,
            totalTokens: stats.totalInput + stats.totalOutput,
            compositeScore,
            sessionCount: stats.sessions,
            efficiencyScore: Math.min(efficiency, 2.0),
          };
        })
        .sort((a, b) => b.compositeScore - a.compositeScore);

      for (let rank = 0; rank < userRankings.length; rank++) {
        const ur = userRankings[rank];
        await db.insert(rankings).values({
          userId: ur.userId,
          periodType,
          periodStart: today,
          rankPosition: rank + 1,
          totalTokens: ur.totalTokens,
          compositeScore: ur.compositeScore.toFixed(4),
          sessionCount: ur.sessionCount,
          efficiencyScore: ur.efficiencyScore.toFixed(4),
        });
      }
      console.log(`  ✅ Generated ${periodType} rankings`);
    }
    console.log('\n✅ Rankings generated\n');

    // Generate daily aggregates for 90 days
    console.log('📈 Generating daily aggregates for 90 days...');
    for (const user of createdUsers) {
      const stats = userStats.get(user.id)!;
      const activityMultiplier = getActivityMultiplier(user.profile.activityLevel);
      const dailyInput = Math.floor(stats.totalInput / 60); // Spread over 60 active days
      const dailyOutput = Math.floor(stats.totalOutput / 60);
      const dailySessions = Math.max(1, Math.floor(stats.sessions / 60));

      for (let d = 0; d < 90; d++) {
        const date = new Date(now);
        date.setDate(date.getDate() - d);
        const dateStr = date.toISOString().split('T')[0];

        // Some days have no activity (weekends, holidays)
        const hasActivity = Math.random() < 0.7 * activityMultiplier;
        if (!hasActivity && d > 0) continue;

        const variance = 0.3 + Math.random() * 1.4;
        const inputTokens = Math.floor(dailyInput * variance);
        const outputTokens = Math.floor(dailyOutput * variance);
        const efficiency = outputTokens / (inputTokens + 1);
        const compositeScore = calculateCompositeScore(
          inputTokens,
          outputTokens,
          dailySessions,
          d + 1
        );

        await db.insert(dailyAggregates).values({
          userId: user.id,
          date: dateStr,
          totalInputTokens: inputTokens,
          totalOutputTokens: outputTokens,
          totalCacheTokens: randomInt(0, 10000),
          sessionCount: Math.max(1, Math.floor(dailySessions * variance)),
          avgEfficiency: Math.min(efficiency, 2.0).toFixed(4),
          compositeScore: compositeScore.toFixed(4),
        });
      }
    }
    console.log('✅ Daily aggregates generated\n');

    // Print vibe style summary
    console.log('🎭 Vibe Style Distribution:');
    const vibeCount = { Explorer: 0, Creator: 0, Refactorer: 0, Automator: 0 };
    for (const user of createdUsers) {
      vibeCount[user.profile.vibeStyle]++;
    }
    console.log(`   🔍 Explorers: ${vibeCount.Explorer}`);
    console.log(`   ✨ Creators: ${vibeCount.Creator}`);
    console.log(`   🔧 Refactorers: ${vibeCount.Refactorer}`);
    console.log(`   ⚡ Automators: ${vibeCount.Automator}`);

    console.log('\n🎉 Database seed completed successfully!');
    console.log(`
📊 Summary:
   - Users: ${createdUsers.length} (with diverse vibe styles)
   - Sessions: ~${createdUsers.reduce((acc, u) => acc + Math.floor(randomInt(20, 80) * getActivityMultiplier(u.profile.activityLevel)), 0)} (with toolUsage & codeMetrics)
   - Rankings: ${createdUsers.length * 4} (4 period types)
   - Daily Aggregates: ~${createdUsers.length * 60} (90 days with ~70% activity)

🧪 Test URLs:
   - http://localhost:3000/users/goos (Creator - High Activity)
   - http://localhost:3000/users/lee_hacker (Automator - High Activity)
   - http://localhost:3000/users/kim_coder (Explorer - High Activity)
   - http://localhost:3000/users/kang_wizard (Refactorer - High Activity)
`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
