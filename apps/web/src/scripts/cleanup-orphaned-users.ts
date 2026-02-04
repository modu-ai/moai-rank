#!/usr/bin/env bun

/**
 * Cleanup Orphaned Users Script
 *
 * Safely removes users from the database that no longer exist in Clerk.
 *
 * Usage:
 *   bun run src/scripts/cleanup-orphaned-users.ts              # Dry-run (default)
 *   bun run src/scripts/cleanup-orphaned-users.ts --execute    # Execute deletion
 *   bun run src/scripts/cleanup-orphaned-users.ts --execute --force  # Bypass 100-user limit
 *
 * Environment Variables:
 *   DATABASE_URL - Neon PostgreSQL connection URL
 *   CLERK_SECRET_KEY - Clerk API authentication key
 */

import { clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import {
  users,
  sessions,
  tokenUsage,
  dailyAggregates,
  rankings,
  securityAuditLog,
} from '../db/schema';
import * as fs from 'fs';
import * as path from 'path';

// ========================================
// Configuration
// ========================================

const MAX_USERS_LIMIT = 100;
const CLERK_PAGE_SIZE = 500;

interface OrphanedUser {
  clerkId: string;
  userId: string;
  impact: {
    rankings: number;
    sessions: number;
    tokenUsage: number;
    dailyAggregates: number;
    securityAuditLog: number;
  };
  totalRecords: number;
}

interface FailedUser {
  user: OrphanedUser;
  error: Error;
}

interface ScriptOptions {
  dryRun: boolean;
  force: boolean;
}

// ========================================
// Logging Utilities
// ========================================

const logFilePath = path.join(
  process.cwd(),
  `cleanup-orphaned-users-${new Date().toISOString().replace(/[:.]/g, '-')}.log`
);

function log(message: string, toFileOnly = false): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;

  // Write to file
  fs.appendFileSync(logFilePath, `${logMessage}\n`);

  // Write to console unless file-only
  if (!toFileOnly) {
    console.log(message);
  }
}

function logError(message: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ERROR: ${message}`;

  fs.appendFileSync(logFilePath, `${logMessage}\n`);
  console.error(`❌ ${message}`);
}

// ========================================
// Clerk API Functions
// ========================================

async function getAllClerkUsers(): Promise<Set<string>> {
  const clerkUserIds = new Set<string>();
  let offset = 0;
  let hasMore = true;
  let retries = 0;
  const MAX_RETRIES = 3;

  log('📡 Fetching users from Clerk API...');

  while (hasMore) {
    try {
      const client = await clerkClient();
      const response = await client.users.getUserList({
        limit: CLERK_PAGE_SIZE,
        offset,
      });

      const users = response.data;

      for (const user of users) {
        clerkUserIds.add(user.id);
      }

      log(
        `   Retrieved ${users.length} users (offset: ${offset}, total: ${clerkUserIds.size})`,
        true
      );

      hasMore = users.length === CLERK_PAGE_SIZE;
      offset += CLERK_PAGE_SIZE;
      retries = 0; // Reset retries on success
    } catch (error) {
      retries++;
      if (retries >= MAX_RETRIES) {
        throw new Error(
          `Failed to fetch Clerk users after ${MAX_RETRIES} retries: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      log(
        `   Retry ${retries}/${MAX_RETRIES} after error: ${error instanceof Error ? error.message : String(error)}`,
        true
      );

      // Exponential backoff: 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)));
    }
  }

  log(`✅ Found ${clerkUserIds.size} users in Clerk`);
  return clerkUserIds;
}

// ========================================
// Database Functions
// ========================================

async function getAllDatabaseUsers(): Promise<Map<string, string>> {
  log('🗄️  Fetching users from database...');

  const dbUsers = await db
    .select({
      id: users.id,
      clerkId: users.clerkId,
    })
    .from(users);

  const userMap = new Map<string, string>(); // clerkId -> userId
  for (const user of dbUsers) {
    userMap.set(user.clerkId, user.id);
  }

  log(`✅ Found ${userMap.size} users in database`);
  return userMap;
}

async function analyzeImpact(userId: string): Promise<OrphanedUser['impact']> {
  const [
    rankingsCount,
    sessionsCount,
    tokenUsageCount,
    dailyAggregatesCount,
    securityAuditLogCount,
  ] = await Promise.all([
    db.select({ count: rankings.id }).from(rankings).where(eq(rankings.userId, userId)),
    db.select({ count: sessions.id }).from(sessions).where(eq(sessions.userId, userId)),
    db.select({ count: tokenUsage.id }).from(tokenUsage).where(eq(tokenUsage.userId, userId)),
    db
      .select({ count: dailyAggregates.id })
      .from(dailyAggregates)
      .where(eq(dailyAggregates.userId, userId)),
    db
      .select({ count: securityAuditLog.id })
      .from(securityAuditLog)
      .where(eq(securityAuditLog.userId, userId)),
  ]);

  return {
    rankings: rankingsCount.length,
    sessions: sessionsCount.length,
    tokenUsage: tokenUsageCount.length,
    dailyAggregates: dailyAggregatesCount.length,
    securityAuditLog: securityAuditLogCount.length,
  };
}

async function identifyOrphanedUsers(
  clerkUserIds: Set<string>,
  dbUserMap: Map<string, string>
): Promise<OrphanedUser[]> {
  log('🔍 Analyzing orphaned users...');

  const orphanedUsers: OrphanedUser[] = [];

  for (const [clerkId, userId] of dbUserMap.entries()) {
    if (!clerkUserIds.has(clerkId)) {
      log(`   Analyzing user: ${clerkId}...`, true);

      const impact = await analyzeImpact(userId);
      const totalRecords =
        impact.rankings +
        impact.sessions +
        impact.tokenUsage +
        impact.dailyAggregates +
        impact.securityAuditLog;

      orphanedUsers.push({
        clerkId,
        userId,
        impact,
        totalRecords,
      });
    }
  }

  log(`✅ Found ${orphanedUsers.length} orphaned users`);
  return orphanedUsers;
}

// ========================================
// Deletion Functions
// ========================================

async function deleteOrphanedUsers(orphanedUsers: OrphanedUser[]): Promise<{
  successCount: number;
  failedUsers: FailedUser[];
}> {
  log('🗑️  Starting deletion with individual transactions...\n');

  const total = orphanedUsers.length;
  let successCount = 0;
  const failedUsers: FailedUser[] = [];
  const startTime = Date.now();

  for (let i = 0; i < orphanedUsers.length; i++) {
    const orphan = orphanedUsers[i];
    const userNumber = i + 1;

    console.log(
      `Deleting user ${userNumber}/${total}: ${orphan.clerkId} (${orphan.totalRecords.toLocaleString()} records)`
    );
    log(
      `[${userNumber}/${total}] Starting deletion: ${orphan.clerkId} (${orphan.userId})`,
      true
    );

    try {
      // Each user deletion in its own transaction
      await db.transaction(async (tx) => {
        // Delete in correct order (Foreign Key constraints)
        await tx.delete(rankings).where(eq(rankings.userId, orphan.userId));
        await tx.delete(dailyAggregates).where(eq(dailyAggregates.userId, orphan.userId));
        await tx.delete(tokenUsage).where(eq(tokenUsage.userId, orphan.userId));
        await tx.delete(sessions).where(eq(sessions.userId, orphan.userId));
        await tx.delete(securityAuditLog).where(eq(securityAuditLog.userId, orphan.userId));
        await tx.delete(users).where(eq(users.id, orphan.userId));
      });

      console.log(`✓ Deleted user ${userNumber}/${total}: ${orphan.clerkId}`);
      log(`[${userNumber}/${total}] Successfully deleted: ${orphan.clerkId}`, true);
      successCount++;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error(`✗ Failed to delete user ${userNumber}/${total}: ${orphan.clerkId}`);
      console.error(`  Reason: ${errorObj.message}`);

      log(`[${userNumber}/${total}] FAILED to delete: ${orphan.clerkId}`, true);
      log(`  Error: ${errorObj.message}`, true);

      if (errorObj.stack) {
        log(`  Stack trace: ${errorObj.stack}`, true);
      }

      failedUsers.push({ user: orphan, error: errorObj });
      // Continue with next user despite failure
    }
  }

  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
  log(`\n✅ Deletion process completed in ${elapsedTime}s`);
  log(`   Success: ${successCount}/${total}`);
  log(`   Failed: ${failedUsers.length}/${total}`);

  return { successCount, failedUsers };
}

// ========================================
// Display Functions
// ========================================

function displayReport(
  clerkCount: number,
  dbCount: number,
  orphanedUsers: OrphanedUser[],
  options: ScriptOptions
): void {
  const mode = options.dryRun ? 'DRY RUN' : 'EXECUTE MODE';

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log(`║        Orphaned Users Cleanup Report (${mode})               ║`);
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log('📊 Summary:');
  console.log(`  • Clerk users found: ${clerkCount}`);
  console.log(`  • Database users found: ${dbCount}`);
  console.log(`  • Orphaned users: ${orphanedUsers.length}\n`);

  if (orphanedUsers.length === 0) {
    console.log('✨ No orphaned users found. Database is clean!\n');
    return;
  }

  console.log('🔍 Orphaned User Details:\n');

  orphanedUsers.forEach((orphan, index) => {
    console.log(`[${index + 1}] clerkId: ${orphan.clerkId}`);
    console.log(`    userId: ${orphan.userId}`);
    console.log(`    ├─ rankings: ${orphan.impact.rankings.toLocaleString()} records`);
    console.log(`    ├─ sessions: ${orphan.impact.sessions.toLocaleString()} records`);
    console.log(`    ├─ tokenUsage: ${orphan.impact.tokenUsage.toLocaleString()} records`);
    console.log(
      `    ├─ dailyAggregates: ${orphan.impact.dailyAggregates.toLocaleString()} records`
    );
    console.log(
      `    └─ securityAuditLog: ${orphan.impact.securityAuditLog.toLocaleString()} records`
    );
    console.log(`    Total: ${orphan.totalRecords.toLocaleString()} records\n`);
  });

  const totalImpact = orphanedUsers.reduce(
    (acc, orphan) => ({
      users: acc.users + 1,
      rankings: acc.rankings + orphan.impact.rankings,
      sessions: acc.sessions + orphan.impact.sessions,
      tokenUsage: acc.tokenUsage + orphan.impact.tokenUsage,
      dailyAggregates: acc.dailyAggregates + orphan.impact.dailyAggregates,
      securityAuditLog: acc.securityAuditLog + orphan.impact.securityAuditLog,
    }),
    {
      users: 0,
      rankings: 0,
      sessions: 0,
      tokenUsage: 0,
      dailyAggregates: 0,
      securityAuditLog: 0,
    }
  );

  const totalRecords =
    totalImpact.rankings +
    totalImpact.sessions +
    totalImpact.tokenUsage +
    totalImpact.dailyAggregates +
    totalImpact.securityAuditLog;

  console.log('📈 Total Impact:');
  console.log(`  • Users: ${totalImpact.users}`);
  console.log(`  • Rankings: ${totalImpact.rankings.toLocaleString()} records`);
  console.log(`  • Sessions: ${totalImpact.sessions.toLocaleString()} records`);
  console.log(`  • TokenUsage: ${totalImpact.tokenUsage.toLocaleString()} records`);
  console.log(`  • DailyAggregates: ${totalImpact.dailyAggregates.toLocaleString()} records`);
  console.log(
    `  • SecurityAuditLog: ${totalImpact.securityAuditLog.toLocaleString()} records`
  );
  console.log(`  • Total Records: ${totalRecords.toLocaleString()}\n`);

  console.log('════════════════════════════════════════════════════════════════\n');
}

function displayDeletionSummary(
  total: number,
  successCount: number,
  failedUsers: FailedUser[]
): void {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    Deletion Summary                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log('📊 Results:');
  console.log(`  • Total orphaned users: ${total}`);
  console.log(`  • Successfully deleted: ${successCount}`);
  console.log(`  • Failed to delete: ${failedUsers.length}\n`);

  if (failedUsers.length > 0) {
    console.log('❌ Failed Users:\n');

    failedUsers.forEach((failed, index) => {
      console.log(`  ${index + 1}. ${failed.user.clerkId}`);
      console.log(`     userId: ${failed.user.userId}`);
      console.log(`     records: ${failed.user.totalRecords.toLocaleString()}`);
      console.log(`     reason: ${failed.error.message}\n`);
    });
  }

  if (successCount === total) {
    console.log('✅ Cleanup completed successfully with all users deleted.\n');
  } else if (successCount > 0) {
    console.log(`⚠️  Cleanup completed with ${successCount}/${total} users deleted.\n`);
  } else {
    console.log('❌ Cleanup failed - no users were deleted.\n');
  }

  console.log('════════════════════════════════════════════════════════════════\n');
}

async function promptUserConfirmation(orphanedCount: number): Promise<boolean> {
  console.log('\n⚠️  WARNING: This operation will permanently delete data.');
  console.log('Please ensure you have:');
  console.log('  1. Database backup (Neon PITR enabled)');
  console.log('  2. Reviewed the dry-run results');
  console.log('  3. Confirmed the deletion targets\n');

  console.log(`About to delete ${orphanedCount} orphaned user(s) and all related data.\n`);

  const answer = prompt('Continue? (y/N): ');

  return answer?.toLowerCase() === 'y';
}

// ========================================
// Main Execution
// ========================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {
    dryRun: !args.includes('--execute'),
    force: args.includes('--force'),
  };

  log('════════════════════════════════════════════════════════════════');
  log(`Cleanup Orphaned Users Script - ${options.dryRun ? 'DRY RUN' : 'EXECUTE'} MODE`);
  log(`Started at: ${new Date().toISOString()}`);
  log(`Log file: ${logFilePath}`);
  log('════════════════════════════════════════════════════════════════\n');

  try {
    // Phase 1: Data Collection
    log('📋 Phase 1: Data Collection\n');

    const [clerkUserIds, dbUserMap] = await Promise.all([
      getAllClerkUsers(),
      getAllDatabaseUsers(),
    ]);

    // Phase 2: Impact Analysis
    log('\n📋 Phase 2: Impact Analysis\n');

    const orphanedUsers = await identifyOrphanedUsers(clerkUserIds, dbUserMap);

    // Display Report
    displayReport(clerkUserIds.size, dbUserMap.size, orphanedUsers, options);

    if (orphanedUsers.length === 0) {
      log('Script completed: No orphaned users found.');
      return;
    }

    // Safety Check: Maximum limit
    if (orphanedUsers.length > MAX_USERS_LIMIT && !options.force) {
      logError(
        `Found ${orphanedUsers.length} orphaned users, which exceeds the safety limit of ${MAX_USERS_LIMIT}.`
      );
      console.log('\nTo proceed, run with --force flag:');
      console.log('  bun run src/scripts/cleanup-orphaned-users.ts --execute --force\n');
      process.exit(1);
    }

    if (orphanedUsers.length > MAX_USERS_LIMIT && options.force) {
      console.log(
        `⚠️  WARNING: Proceeding with ${orphanedUsers.length} users (--force enabled)\n`
      );
    }

    // Dry-run mode
    if (options.dryRun) {
      console.log('[DRY RUN] No data was deleted.');
      console.log('Run with --execute to perform actual deletion:\n');
      console.log('  bun run src/scripts/cleanup-orphaned-users.ts --execute\n');
      log('Script completed: Dry-run mode, no data deleted.');
      return;
    }

    // Phase 3: User Confirmation
    log('\n📋 Phase 3: User Confirmation\n');

    const confirmed = await promptUserConfirmation(orphanedUsers.length);

    if (!confirmed) {
      console.log('\n❌ Operation cancelled by user.\n');
      log('Script cancelled: User declined confirmation.');
      return;
    }

    // Phase 4: Deletion
    log('\n📋 Phase 4: Deletion\n');

    const { successCount, failedUsers } = await deleteOrphanedUsers(orphanedUsers);

    // Display deletion summary
    displayDeletionSummary(orphanedUsers.length, successCount, failedUsers);

    // Log final summary
    log(`Script completed: ${successCount}/${orphanedUsers.length} users deleted successfully.`);

    if (failedUsers.length > 0) {
      log(`Failed users (${failedUsers.length}):`);
      failedUsers.forEach((failed) => {
        log(`  - ${failed.user.clerkId}: ${failed.error.message}`);
      });
    }
  } catch (error) {
    logError(error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.stack) {
      log(`Stack trace: ${error.stack}`, true);
    }

    console.error('\n💥 Script failed. Check the log file for details:');
    console.error(`   ${logFilePath}\n`);

    process.exit(1);
  }
}

// ========================================
// Environment Validation
// ========================================

function validateEnvironment(): void {
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is required.\n');
    process.exit(1);
  }

  if (!process.env.CLERK_SECRET_KEY) {
    console.error('❌ ERROR: CLERK_SECRET_KEY environment variable is required.\n');
    process.exit(1);
  }
}

// ========================================
// Entry Point
// ========================================

validateEnvironment();
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
