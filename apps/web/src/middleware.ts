import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * V009: Edge Middleware with Rate Limiting
 *
 * Applies rate limiting at the edge before reaching serverless functions.
 * This reduces costs and improves response times for rate-limited requests.
 */

/**
 * Public routes that don't require authentication
 */
const isPublicRoute = createRouteMatcher([
  // Pages
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',

  // Webhooks
  '/api/webhooks(.*)',

  // Cron jobs (authenticated via CRON_SECRET, not Clerk)
  '/api/cron/(.*)',

  // CLI OAuth routes
  '/api/auth/cli(.*)',

  // Public API routes (no auth required)
  '/api/leaderboard',
  '/api/users/(.*)',
  '/api/stats/global',

  // CLI API routes (use API key auth, not Clerk)
  '/api/v1/(.*)',
]);

/**
 * Routes that should have rate limiting applied
 */
const isRateLimitedRoute = createRouteMatcher(['/api/(.*)']);

/**
 * Routes exempt from edge rate limiting (handled separately)
 * - Webhooks: May have specific rate limits from providers
 * - Cron: Protected by CRON_SECRET, not public
 */
const isRateLimitExempt = createRouteMatcher(['/api/webhooks(.*)', '/api/cron/(.*)']);

/**
 * Edge rate limiter configuration
 * Uses Upstash Redis for distributed rate limiting
 */
let edgeRateLimiter: Ratelimit | null = null;

function getEdgeRateLimiter(): Ratelimit | null {
  if (edgeRateLimiter) return edgeRateLimiter;

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    // Redis not configured - skip edge rate limiting
    return null;
  }

  try {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    edgeRateLimiter = new Ratelimit({
      redis,
      // Edge rate limit: 200 requests per minute per IP
      // This is higher than API-level limits to catch only egregious abuse
      limiter: Ratelimit.slidingWindow(200, '1 m'),
      analytics: true,
      prefix: 'moai-rank:edge-ratelimit',
    });

    return edgeRateLimiter;
  } catch {
    return null;
  }
}

/**
 * Extract client IP from request headers
 */
function getClientIp(request: NextRequest): string {
  // Vercel provides the real IP in x-forwarded-for
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Fallback for local development
  return '127.0.0.1';
}

/**
 * Create rate limit exceeded response
 */
function rateLimitResponse(resetTime: number): NextResponse {
  return new NextResponse(
    JSON.stringify({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
      },
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Reset': resetTime.toString(),
        'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
      },
    }
  );
}

export default clerkMiddleware(async (auth, request) => {
  // V009: Apply edge rate limiting for API routes
  if (isRateLimitedRoute(request) && !isRateLimitExempt(request)) {
    const rateLimiter = getEdgeRateLimiter();

    if (rateLimiter) {
      const clientIp = getClientIp(request);
      const identifier = `edge:${clientIp}`;

      try {
        const { success, reset } = await rateLimiter.limit(identifier);

        if (!success) {
          // Rate limited at edge - return immediately without invoking function
          return rateLimitResponse(reset);
        }
      } catch (error) {
        // Redis error - log and continue (fail open)
        console.warn('[Middleware] Edge rate limit check failed:', error);
      }
    }
  }

  // Apply Clerk authentication for protected routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js|json|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|txt|xml)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
