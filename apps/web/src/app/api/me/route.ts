import type { NextRequest } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db, users, rankings } from '@/db';
import { withRLS } from '@/db/rls';
import { eq, and, desc } from 'drizzle-orm';
import { successResponse, Errors, rateLimitResponse } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limiter';
import { generateApiKey } from '@/lib/auth';
import { randomBytes } from 'node:crypto';

/**
 * Current user info response
 */
interface CurrentUserInfo {
  id: string;
  githubUsername: string;
  githubAvatarUrl: string | null;
  apiKeyPrefix: string;
  privacyMode: boolean;
  currentRank: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /api/me
 *
 * Returns current authenticated user info including API key prefix.
 * Requires Clerk authentication.
 * Auto-creates user if not found in database.
 *
 * Security:
 * - V014: Rate limiting applied (100 requests/minute per user)
 * - V015: RLS context for user data queries
 */
export async function GET(_request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return Errors.unauthorized();
    }

    // V014: Apply rate limiting using Clerk user ID
    const rateLimitResult = await checkRateLimit(`me:${clerkId}`);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.reset);
    }

    // Find user by Clerk ID (initial lookup before RLS can be applied)
    const userResult = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);

    let user = userResult[0];

    // Auto-create user if not found
    if (!user) {
      const clerkUser = await currentUser();

      if (!clerkUser) {
        return Errors.unauthorized();
      }

      // Get GitHub info from external accounts
      const githubAccount = clerkUser.externalAccounts?.find(
        (account) => account.provider === 'oauth_github'
      );

      const githubUsername = githubAccount?.username || clerkUser.username || `user_${randomBytes(4).toString('hex')}`;
      const githubId = String(githubAccount?.externalId || clerkId);
      const githubAvatarUrl = githubAccount?.imageUrl || clerkUser.imageUrl || null;

      // Generate API key for new user
      const { hash, prefix } = generateApiKey(clerkId);

      // Create new user
      const newUserResult = await db
        .insert(users)
        .values({
          clerkId,
          githubId,
          githubUsername,
          githubAvatarUrl,
          apiKeyHash: hash,
          apiKeyPrefix: prefix,
          userSalt: randomBytes(32).toString('hex'),
          privacyMode: false,
        })
        .returning();

      user = newUserResult[0];
    }

    // V015: Use RLS context for ranking query to ensure data isolation
    const currentRank = await withRLS(user.id, async (rlsDb) => {
      const rankingResult = await rlsDb
        .select({ rank: rankings.rankPosition })
        .from(rankings)
        .where(and(eq(rankings.userId, user.id), eq(rankings.periodType, 'all_time')))
        .orderBy(desc(rankings.updatedAt))
        .limit(1);

      return rankingResult[0]?.rank ?? null;
    });

    const response: CurrentUserInfo = {
      id: user.id,
      githubUsername: user.githubUsername,
      githubAvatarUrl: user.githubAvatarUrl,
      apiKeyPrefix: user.apiKeyPrefix,
      privacyMode: user.privacyMode ?? false,
      currentRank,
      createdAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: user.updatedAt?.toISOString() ?? new Date().toISOString(),
    };

    return successResponse(response);
  } catch (error) {
    console.error('[API] Me error:', error);
    return Errors.internalError();
  }
}
