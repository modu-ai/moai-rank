import { NextRequest } from "next/server";
import { z } from "zod";
import { db, sessions, tokenUsage, dailyAggregates } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import {
  successResponse,
  Errors,
  corsOptionsResponse,
} from "@/lib/api-response";
import {
  validateApiKey,
  extractHmacAuth,
  verifyHmacSignature,
  computeSessionHash,
} from "@/lib/auth";
import {
  logInvalidApiKey,
  logInvalidHmacSignature,
  logSecurityEvent,
} from "@/lib/audit";

/**
 * Session creation request schema
 */
const CreateSessionSchema = z.object({
  sessionHash: z.string().length(64, "Invalid session hash"),
  anonymousProjectId: z.string().max(16).optional(),
  endedAt: z.string().datetime(),
  modelName: z.string().max(50).optional(),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  cacheCreationTokens: z.number().int().min(0).optional().default(0),
  cacheReadTokens: z.number().int().min(0).optional().default(0),
});

/**
 * Session creation response
 */
interface CreateSessionResponse {
  success: boolean;
  sessionId: string;
  message: string;
}

/**
 * POST /api/v1/sessions
 *
 * Records a Claude Code session with token usage.
 * Requires API key authentication with HMAC signature.
 *
 * Headers:
 * - X-API-Key: User's API key
 * - X-Timestamp: Unix timestamp in seconds
 * - X-Signature: HMAC-SHA256 signature
 *
 * Body:
 * - sessionHash: Client-generated session hash
 * - anonymousProjectId: Optional anonymized project identifier
 * - endedAt: ISO timestamp when session ended
 * - modelName: Optional model name (e.g., "claude-3-opus")
 * - inputTokens: Number of input tokens used
 * - outputTokens: Number of output tokens used
 * - cacheCreationTokens: Optional cache creation tokens
 * - cacheReadTokens: Optional cache read tokens
 */
export async function POST(request: NextRequest) {
  try {
    // Extract authentication headers
    const { apiKey, timestamp, signature } = extractHmacAuth(request.headers);

    // Validate API key presence
    if (!apiKey) {
      return Errors.unauthorized("API key required");
    }

    // Validate user from API key
    const user = await validateApiKey(apiKey);

    if (!user) {
      const prefix = apiKey.substring(0, 16);
      await logInvalidApiKey(prefix, "/api/v1/sessions", request);
      return Errors.unauthorized("Invalid API key");
    }

    // Validate timestamp and signature presence
    if (!timestamp || !signature) {
      await logInvalidHmacSignature(
        user.id,
        "/api/v1/sessions",
        "Missing timestamp or signature",
        request
      );
      return Errors.unauthorized("HMAC authentication required");
    }

    // Get raw body for signature verification
    const bodyText = await request.text();

    // Verify HMAC signature
    if (!verifyHmacSignature(apiKey, timestamp, bodyText, signature)) {
      await logInvalidHmacSignature(
        user.id,
        "/api/v1/sessions",
        "Signature mismatch or expired timestamp",
        request
      );
      return Errors.unauthorized("Invalid HMAC signature");
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return Errors.validationError("Invalid JSON body");
    }

    const parseResult = CreateSessionSchema.safeParse(body);

    if (!parseResult.success) {
      return Errors.validationError("Invalid session data", {
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const sessionData = parseResult.data;

    // Recalculate session hash server-side
    const serverHash = computeSessionHash(user.id, user.userSalt, {
      inputTokens: sessionData.inputTokens,
      outputTokens: sessionData.outputTokens,
      cacheCreationTokens: sessionData.cacheCreationTokens,
      cacheReadTokens: sessionData.cacheReadTokens,
      modelName: sessionData.modelName,
      endedAt: sessionData.endedAt,
    });

    // Check for duplicate session
    const existingSession = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.serverSessionHash, serverHash))
      .limit(1);

    if (existingSession.length > 0) {
      await logSecurityEvent("session_duplicate", user.id, {
        sessionHash: serverHash.substring(0, 16),
      });
      return Errors.validationError("Session already recorded");
    }

    // Insert session
    const sessionResult = await db
      .insert(sessions)
      .values({
        userId: user.id,
        serverSessionHash: serverHash,
        anonymousProjectId: sessionData.anonymousProjectId,
        endedAt: new Date(sessionData.endedAt),
        modelName: sessionData.modelName,
      })
      .returning({ id: sessions.id });

    const newSession = sessionResult[0];

    // Insert token usage
    await db.insert(tokenUsage).values({
      sessionId: newSession.id,
      userId: user.id,
      inputTokens: sessionData.inputTokens,
      outputTokens: sessionData.outputTokens,
      cacheCreationTokens: sessionData.cacheCreationTokens,
      cacheReadTokens: sessionData.cacheReadTokens,
    });

    // Update daily aggregates
    const sessionDate = new Date(sessionData.endedAt).toISOString().split("T")[0];

    await db
      .insert(dailyAggregates)
      .values({
        userId: user.id,
        date: sessionDate,
        totalInputTokens: sessionData.inputTokens,
        totalOutputTokens: sessionData.outputTokens,
        totalCacheTokens:
          (sessionData.cacheCreationTokens ?? 0) +
          (sessionData.cacheReadTokens ?? 0),
        sessionCount: 1,
      })
      .onConflictDoUpdate({
        target: [dailyAggregates.userId, dailyAggregates.date],
        set: {
          totalInputTokens: sql`${dailyAggregates.totalInputTokens} + ${sessionData.inputTokens}`,
          totalOutputTokens: sql`${dailyAggregates.totalOutputTokens} + ${sessionData.outputTokens}`,
          totalCacheTokens: sql`${dailyAggregates.totalCacheTokens} + ${
            (sessionData.cacheCreationTokens ?? 0) +
            (sessionData.cacheReadTokens ?? 0)
          }`,
          sessionCount: sql`${dailyAggregates.sessionCount} + 1`,
        },
      });

    // Log successful session creation
    await logSecurityEvent("session_created", user.id, {
      sessionId: newSession.id,
      inputTokens: sessionData.inputTokens,
      outputTokens: sessionData.outputTokens,
    });

    const response: CreateSessionResponse = {
      success: true,
      sessionId: newSession.id,
      message: "Session recorded successfully",
    };

    return successResponse(response, 201);
  } catch (error) {
    console.error("[API] V1 Sessions error:", error);
    return Errors.internalError();
  }
}

/**
 * OPTIONS /api/v1/sessions
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return corsOptionsResponse();
}
