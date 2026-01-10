import { createHmac, createHash, randomBytes } from "crypto";
import { db, users, type User } from "@/db";
import { eq } from "drizzle-orm";

/**
 * API Key format: moai_rank_{prefix}_{secret}
 * prefix: 8 characters for display (stored in DB)
 * secret: 32 characters (only hash stored in DB)
 */
const API_KEY_PREFIX = "moai_rank_";
const PREFIX_LENGTH = 8;
const SECRET_LENGTH = 32;

/**
 * Generate a new API key for a user
 * Returns the full key (shown once) and the hash/prefix for storage
 */
export function generateApiKey(userId: string): {
  key: string;
  hash: string;
  prefix: string;
} {
  const prefix = randomBytes(4).toString("hex"); // 8 chars
  const secret = randomBytes(16).toString("hex"); // 32 chars
  const fullKey = `${API_KEY_PREFIX}${prefix}_${secret}`;

  // Hash the full key for storage
  const hash = createHash("sha256").update(fullKey).digest("hex");

  return {
    key: fullKey,
    hash,
    prefix: `${API_KEY_PREFIX}${prefix}`,
  };
}

/**
 * Hash an API key for comparison
 */
export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Validate an API key and return the associated user
 */
export async function validateApiKey(apiKey: string): Promise<User | null> {
  if (!apiKey || !apiKey.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  const hash = hashApiKey(apiKey);

  const result = await db
    .select()
    .from(users)
    .where(eq(users.apiKeyHash, hash))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Verify HMAC signature for CLI requests
 *
 * Signature is computed as:
 * HMAC-SHA256(apiKey, timestamp + ":" + body)
 *
 * @param apiKey - The API key (used as HMAC secret)
 * @param timestamp - Unix timestamp in seconds
 * @param body - Request body as string
 * @param signature - The signature to verify
 * @param maxAgeSeconds - Maximum age of the request (default 5 minutes)
 */
export function verifyHmacSignature(
  apiKey: string,
  timestamp: string,
  body: string,
  signature: string,
  maxAgeSeconds = 300
): boolean {
  // Validate timestamp is not too old
  const requestTime = parseInt(timestamp, 10);
  if (isNaN(requestTime)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - requestTime) > maxAgeSeconds) {
    return false;
  }

  // Compute expected signature
  const message = `${timestamp}:${body}`;
  const expectedSignature = createHmac("sha256", apiKey)
    .update(message)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(signature, expectedSignature);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Compute server-side session hash
 * Used to verify session integrity and prevent tampering
 */
export function computeSessionHash(
  userId: string,
  userSalt: string,
  sessionData: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
    modelName?: string;
    endedAt: string;
  }
): string {
  const data = [
    userId,
    userSalt,
    sessionData.inputTokens.toString(),
    sessionData.outputTokens.toString(),
    (sessionData.cacheCreationTokens ?? 0).toString(),
    (sessionData.cacheReadTokens ?? 0).toString(),
    sessionData.modelName ?? "",
    sessionData.endedAt,
  ].join(":");

  return createHash("sha256").update(data).digest("hex");
}

/**
 * Extract API key from request headers
 */
export function extractApiKey(headers: Headers): string | null {
  const apiKey = headers.get("X-API-Key");
  return apiKey ?? null;
}

/**
 * Extract HMAC authentication data from headers
 */
export function extractHmacAuth(headers: Headers): {
  apiKey: string | null;
  timestamp: string | null;
  signature: string | null;
} {
  return {
    apiKey: headers.get("X-API-Key"),
    timestamp: headers.get("X-Timestamp"),
    signature: headers.get("X-Signature"),
  };
}
