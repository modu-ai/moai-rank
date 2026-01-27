import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { db, sessions, tokenUsage, dailyAggregates } from '@/db';
import { eq, sql, desc, avg } from 'drizzle-orm';
import { successResponse, Errors, corsOptionsResponse } from '@/lib/api-response';
import {
  validateApiKey,
  extractHmacAuth,
  verifyHmacSignature,
  computeSessionHash,
} from '@/lib/auth';
import {
  logInvalidApiKey,
  logInvalidHmacSignature,
  logSecurityEvent,
  logRateLimitExceeded,
} from '@/lib/audit';
import { checkRateLimit } from '@/lib/rate-limiter';

/**
 * Security Constants
 *
 * NOTE: These are SESSION-level limits, not per-message limits.
 * A session can accumulate tokens across many messages/turns.
 *
 * Typical Claude session usage:
 * - Input tokens: Can accumulate to millions in long sessions
 * - Output tokens: Can accumulate to hundreds of thousands
 * - Cache tokens: Can accumulate to tens of millions (context caching)
 */
// Session-level input token limit (50M tokens per session)
const MAX_INPUT_TOKENS = 50_000_000;
// Session-level output token limit (10M tokens per session)
const MAX_OUTPUT_TOKENS = 10_000_000;
// Session-level cache token limit (100M tokens per session)
const MAX_CACHE_TOKENS = 100_000_000;
// Minimum time between sessions (1 minute)
const MIN_SESSION_INTERVAL_MS = 60000;
// Anomaly detection threshold (10x average)
const ANOMALY_THRESHOLD_MULTIPLIER = 10;

/**
 * V010: Session timestamp tolerance in milliseconds (5 minutes)
 * Sessions must be submitted within +/- 5 minutes of current time
 */
const SESSION_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Code metrics schema for vibe coding analytics
 */
const CodeMetricsSchema = z.object({
  linesAdded: z.number().int().min(0).optional().default(0),
  linesDeleted: z.number().int().min(0).optional().default(0),
  filesModified: z.number().int().min(0).optional().default(0),
  filesCreated: z.number().int().min(0).optional().default(0),
});

/**
 * Session creation request schema
 */
const CreateSessionSchema = z.object({
  sessionHash: z.string().length(64, 'Invalid session hash'),
  anonymousProjectId: z.string().max(16).optional(),
  // V010: Add bounds checking for endedAt timestamp to prevent replay attacks
  endedAt: z
    .string()
    .datetime()
    .refine(
      (val) => {
        const sessionDate = new Date(val);
        const now = Date.now();
        const timeDiff = Math.abs(sessionDate.getTime() - now);
        return timeDiff <= SESSION_TIMESTAMP_TOLERANCE_MS;
      },
      {
        message: 'Session endedAt must be within 5 minutes of current time',
      }
    ),
  modelName: z.string().max(50).optional(),
  // V001: Add maximum token validation to prevent abuse
  inputTokens: z
    .number()
    .int()
    .min(0)
    .max(MAX_INPUT_TOKENS, 'Input tokens exceed Claude context limit'),
  outputTokens: z
    .number()
    .int()
    .min(0)
    .max(MAX_OUTPUT_TOKENS, 'Output tokens exceed Claude output limit'),
  cacheCreationTokens: z
    .number()
    .int()
    .min(0)
    .max(MAX_CACHE_TOKENS, 'Cache creation tokens exceed limit')
    .optional()
    .default(0),
  cacheReadTokens: z
    .number()
    .int()
    .min(0)
    .max(MAX_CACHE_TOKENS, 'Cache read tokens exceed limit')
    .optional()
    .default(0),
  // Vibe coding analytics fields
  startedAt: z.string().datetime().optional(),
  durationSeconds: z.number().int().min(0).max(604800).optional(), // Max 7 days
  turnCount: z.number().int().min(0).max(10000).optional(),
  toolUsage: z.record(z.string(), z.number().int().min(0)).optional(),
  codeMetrics: CodeMetricsSchema.optional(),
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
      return Errors.unauthorized('API key required');
    }

    // Validate user from API key
    const user = await validateApiKey(apiKey);

    if (!user) {
      const prefix = apiKey.substring(0, 16);
      await logInvalidApiKey(prefix, '/api/v1/sessions', request);
      return Errors.unauthorized('Invalid API key');
    }

    // V002 + V007: Distributed rate limiting - 100 requests per minute per user
    const rateLimitResult = await checkRateLimit(user.id);
    if (!rateLimitResult.success) {
      await logRateLimitExceeded(user.id, '/api/v1/sessions', request);
      return Errors.rateLimited(
        `Rate limit exceeded. Try again after ${new Date(rateLimitResult.reset).toISOString()}`
      );
    }

    // Validate timestamp and signature presence
    if (!timestamp || !signature) {
      await logInvalidHmacSignature(
        user.id,
        '/api/v1/sessions',
        'Missing timestamp or signature',
        request
      );
      return Errors.unauthorized('HMAC authentication required');
    }

    // Get raw body for signature verification
    const bodyText = await request.text();

    // Verify HMAC signature
    if (!verifyHmacSignature(apiKey, timestamp, bodyText, signature)) {
      await logInvalidHmacSignature(
        user.id,
        '/api/v1/sessions',
        'Signature mismatch or expired timestamp',
        request
      );
      return Errors.unauthorized('Invalid HMAC signature');
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return Errors.validationError('Invalid JSON body');
    }

    const parseResult = CreateSessionSchema.safeParse(body);

    if (!parseResult.success) {
      return Errors.validationError('Invalid session data', {
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const sessionData = parseResult.data;

    // V003: Session frequency validation - minimum time between sessions
    // Compare the submitted session's endedAt against the latest session in DB,
    // rather than comparing against Date.now(). This allows historical session sync
    // while still preventing duplicate/overlapping sessions.
    const submittedEndedAt = new Date(sessionData.endedAt);
    const lastSession = await db
      .select({ endedAt: sessions.endedAt })
      .from(sessions)
      .where(eq(sessions.userId, user.id))
      .orderBy(desc(sessions.endedAt))
      .limit(1);

    if (
      lastSession.length > 0 &&
      Math.abs(submittedEndedAt.getTime() - lastSession[0].endedAt.getTime()) < MIN_SESSION_INTERVAL_MS
    ) {
      await logSecurityEvent('suspicious_activity', user.id, {
        reason: 'Session endedAt too close to existing session',
        lastSessionEndedAt: lastSession[0].endedAt.toISOString(),
        submittedEndedAt: submittedEndedAt.toISOString(),
        timeDifference: Math.abs(submittedEndedAt.getTime() - lastSession[0].endedAt.getTime()),
        minimumInterval: MIN_SESSION_INTERVAL_MS,
      });
      return Errors.validationError(
        'Session endedAt is too close to an existing session. Sessions must be at least 1 minute apart.'
      );
    }

    // V005: Anomaly detection - flag suspicious token counts
    const submittedTokens = sessionData.inputTokens + sessionData.outputTokens;
    const userAvgResult = await db
      .select({
        avgTokens: avg(sql`${tokenUsage.inputTokens} + ${tokenUsage.outputTokens}`),
      })
      .from(tokenUsage)
      .where(eq(tokenUsage.userId, user.id));

    const avgTokens = userAvgResult[0]?.avgTokens ? Number(userAvgResult[0].avgTokens) : 0;

    // Flag if submitted tokens are >10x the user's historical average
    if (avgTokens > 0 && submittedTokens > avgTokens * ANOMALY_THRESHOLD_MULTIPLIER) {
      await logSecurityEvent('suspicious_activity', user.id, {
        reason: 'Token count anomaly detected',
        submittedTokens,
        averageTokens: avgTokens,
        ratio: submittedTokens / avgTokens,
        threshold: ANOMALY_THRESHOLD_MULTIPLIER,
      });
      // Note: We log but don't block - this allows legitimate high-usage sessions
      // while creating an audit trail for investigation if needed
    }

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
      await logSecurityEvent('session_duplicate', user.id, {
        sessionHash: serverHash.substring(0, 16),
      });
      return Errors.validationError('Session already recorded');
    }

    // Insert session with vibe coding analytics
    const sessionResult = await db
      .insert(sessions)
      .values({
        userId: user.id,
        serverSessionHash: serverHash,
        anonymousProjectId: sessionData.anonymousProjectId,
        startedAt: sessionData.startedAt ? new Date(sessionData.startedAt) : undefined,
        endedAt: new Date(sessionData.endedAt),
        durationSeconds: sessionData.durationSeconds,
        modelName: sessionData.modelName,
        turnCount: sessionData.turnCount,
        toolUsage: sessionData.toolUsage,
        codeMetrics: sessionData.codeMetrics,
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
    const sessionDate = new Date(sessionData.endedAt).toISOString().split('T')[0];

    await db
      .insert(dailyAggregates)
      .values({
        userId: user.id,
        date: sessionDate,
        totalInputTokens: sessionData.inputTokens,
        totalOutputTokens: sessionData.outputTokens,
        totalCacheTokens:
          (sessionData.cacheCreationTokens ?? 0) + (sessionData.cacheReadTokens ?? 0),
        sessionCount: 1,
      })
      .onConflictDoUpdate({
        target: [dailyAggregates.userId, dailyAggregates.date],
        set: {
          totalInputTokens: sql`${dailyAggregates.totalInputTokens} + ${sessionData.inputTokens}`,
          totalOutputTokens: sql`${dailyAggregates.totalOutputTokens} + ${sessionData.outputTokens}`,
          totalCacheTokens: sql`${dailyAggregates.totalCacheTokens} + ${
            (sessionData.cacheCreationTokens ?? 0) + (sessionData.cacheReadTokens ?? 0)
          }`,
          sessionCount: sql`${dailyAggregates.sessionCount} + 1`,
        },
      });

    // Log successful session creation
    await logSecurityEvent('session_created', user.id, {
      sessionId: newSession.id,
      inputTokens: sessionData.inputTokens,
      outputTokens: sessionData.outputTokens,
    });

    const response: CreateSessionResponse = {
      success: true,
      sessionId: newSession.id,
      message: 'Session recorded successfully',
    };

    return successResponse(response, 201);
  } catch (error) {
    console.error('[API] V1 Sessions error:', error);
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
