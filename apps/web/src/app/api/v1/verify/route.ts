import type { NextRequest } from 'next/server';
import { successResponse, Errors, corsOptionsResponse } from '@/lib/api-response';
import { validateApiKey, extractApiKey } from '@/lib/auth';
import { logSecurityEvent, logInvalidApiKey, logRateLimitExceeded } from '@/lib/audit';
import { checkRateLimit } from '@/lib/rate-limiter';

/**
 * API key verification response
 */
interface VerifyResponse {
  valid: boolean;
  username: string;
  apiKeyPrefix: string;
  privacyMode: boolean;
  createdAt: string;
}

/**
 * GET /api/v1/verify
 *
 * Verifies if an API key is valid without submitting any data.
 * Useful for CLI tools to validate stored credentials.
 *
 * Headers:
 * - X-API-Key: User's API key
 *
 * Returns:
 * - valid: Whether the API key is valid
 * - username: GitHub username (if valid)
 * - apiKeyPrefix: First part of API key for identification
 * - privacyMode: Whether privacy mode is enabled
 * - createdAt: When the user account was created
 */
export async function GET(request: NextRequest) {
  try {
    // Extract and validate API key
    const apiKey = extractApiKey(request.headers);

    if (!apiKey) {
      return Errors.unauthorized('API key required');
    }

    const user = await validateApiKey(apiKey);

    if (!user) {
      // Log invalid API key attempt
      const prefix = apiKey.substring(0, 16);
      await logInvalidApiKey(prefix, '/api/v1/verify', request);
      return Errors.unauthorized('Invalid API key');
    }

    // Distributed rate limiting - 100 requests per minute per user
    const rateLimitResult = await checkRateLimit(user.id);
    if (!rateLimitResult.success) {
      await logRateLimitExceeded(user.id, '/api/v1/verify', request);
      return Errors.rateLimited(
        `Rate limit exceeded. Try again after ${new Date(rateLimitResult.reset).toISOString()}`
      );
    }

    // Log successful validation
    await logSecurityEvent(
      'api_key_validated',
      user.id,
      {
        apiKeyPrefix: user.apiKeyPrefix,
        endpoint: '/api/v1/verify',
      },
      request
    );

    const response: VerifyResponse = {
      valid: true,
      username: user.githubUsername,
      apiKeyPrefix: user.apiKeyPrefix,
      privacyMode: user.privacyMode ?? false,
      createdAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
    };

    return successResponse(response);
  } catch (error) {
    console.error('[API] V1 Verify error:', error);
    return Errors.internalError();
  }
}

/**
 * OPTIONS /api/v1/verify
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return corsOptionsResponse();
}
