import { auth } from "@clerk/nextjs/server";
import { db, users, rankings } from "@/db";
import { eq, and, desc } from "drizzle-orm";
import { successResponse, Errors } from "@/lib/api-response";

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
 */
export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return Errors.unauthorized();
    }

    // Find user by Clerk ID
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    const user = userResult[0];

    if (!user) {
      return Errors.notFound("User");
    }

    // Get current all-time ranking
    const rankingResult = await db
      .select({ rank: rankings.rankPosition })
      .from(rankings)
      .where(
        and(
          eq(rankings.userId, user.id),
          eq(rankings.periodType, "all_time")
        )
      )
      .orderBy(desc(rankings.updatedAt))
      .limit(1);

    const currentRank = rankingResult[0]?.rank ?? null;

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
    console.error("[API] Me error:", error);
    return Errors.internalError();
  }
}
