import { db, securityAuditLog } from '@/db';

/**
 * Security event types for audit logging
 */
export type SecurityEventType =
  | 'api_key_generated'
  | 'api_key_regenerated'
  | 'api_key_revoked'
  | 'api_key_validated'
  | 'api_key_invalid'
  | 'hmac_signature_invalid'
  | 'hmac_timestamp_expired'
  | 'rate_limit_exceeded'
  | 'unauthorized_access'
  | 'session_created'
  | 'session_duplicate'
  | 'batch_sessions_created'
  | 'user_settings_updated'
  | 'privacy_mode_changed'
  | 'suspicious_activity';

/**
 * Details structure for different event types
 */
export interface EventDetails {
  apiKeyPrefix?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  errorMessage?: string;
  requestId?: string;
  rateLimitRemaining?: number;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  [key: string]: unknown;
}

/**
 * Log a security event to the audit log
 *
 * @param eventType - Type of security event
 * @param userId - Optional user ID (null for unauthenticated events)
 * @param details - Additional event details
 * @param request - Optional request object for IP/UA extraction
 */
export async function logSecurityEvent(
  eventType: SecurityEventType,
  userId?: string | null,
  details?: EventDetails,
  request?: Request
): Promise<void> {
  try {
    const ipAddress = request ? extractIpAddress(request) : null;
    const userAgent = request?.headers.get('User-Agent') ?? null;

    await db.insert(securityAuditLog).values({
      userId: userId ?? null,
      eventType,
      ipAddress,
      userAgent,
      details: details ?? null,
    });
  } catch (error) {
    // Log to console but don't throw - audit logging should not break the request
    console.error('[AUDIT] Failed to log security event:', {
      eventType,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Extract IP address from request headers
 * Handles various proxy headers
 */
function extractIpAddress(request: Request): string | null {
  const headers = request.headers;

  // Check common proxy headers in order of preference
  const forwardedFor = headers.get('X-Forwarded-For');
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('X-Real-IP');
  if (realIp) {
    return realIp.trim();
  }

  const cfConnectingIp = headers.get('CF-Connecting-IP');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  return null;
}

/**
 * Log API key generation event
 */
export async function logApiKeyGenerated(
  userId: string,
  apiKeyPrefix: string,
  request?: Request
): Promise<void> {
  await logSecurityEvent('api_key_generated', userId, { apiKeyPrefix }, request);
}

/**
 * Log API key regeneration event
 */
export async function logApiKeyRegenerated(
  userId: string,
  oldPrefix: string,
  newPrefix: string,
  request?: Request
): Promise<void> {
  await logSecurityEvent(
    'api_key_regenerated',
    userId,
    {
      oldApiKeyPrefix: oldPrefix,
      newApiKeyPrefix: newPrefix,
    },
    request
  );
}

/**
 * Log API key revocation event
 */
export async function logApiKeyRevoked(
  userId: string,
  apiKeyPrefix: string,
  reason?: string,
  request?: Request
): Promise<void> {
  await logSecurityEvent(
    'api_key_revoked',
    userId,
    {
      apiKeyPrefix,
      reason: reason ?? 'user_requested',
    },
    request
  );
}

/**
 * Log invalid API key attempt
 */
export async function logInvalidApiKey(
  apiKeyPrefix: string | null,
  endpoint: string,
  request?: Request
): Promise<void> {
  await logSecurityEvent(
    'api_key_invalid',
    null,
    {
      apiKeyPrefix: apiKeyPrefix ?? 'unknown',
      endpoint,
    },
    request
  );
}

/**
 * Log invalid HMAC signature attempt
 */
export async function logInvalidHmacSignature(
  userId: string | null,
  endpoint: string,
  reason: string,
  request?: Request
): Promise<void> {
  await logSecurityEvent(
    'hmac_signature_invalid',
    userId,
    {
      endpoint,
      reason,
    },
    request
  );
}

/**
 * Log rate limit exceeded
 */
export async function logRateLimitExceeded(
  userId: string | null,
  endpoint: string,
  request?: Request
): Promise<void> {
  await logSecurityEvent('rate_limit_exceeded', userId, { endpoint }, request);
}

/**
 * Log user settings update
 */
export async function logUserSettingsUpdated(
  userId: string,
  changes: Record<string, { old: unknown; new: unknown }>,
  request?: Request
): Promise<void> {
  await logSecurityEvent('user_settings_updated', userId, { changes }, request);
}

/**
 * Log privacy mode change specifically
 */
export async function logPrivacyModeChanged(
  userId: string,
  newValue: boolean,
  request?: Request
): Promise<void> {
  await logSecurityEvent(
    'privacy_mode_changed',
    userId,
    {
      oldValue: !newValue,
      newValue,
    },
    request
  );
}
