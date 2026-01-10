import type { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db, users, rankings } from '@/db';
import { withRLS } from '@/db/rls';
import { eq, and, desc } from 'drizzle-orm';
import { successResponse, Errors, rateLimitResponse } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limiter';

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

    const user = userResult[0];

    if (!user) {
      return Errors.notFound('User');
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
