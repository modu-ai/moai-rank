import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

/**
 * Next-intl middleware for locale handling
 * Uses routing config from i18n/routing.ts for consistency
 */
const intlMiddleware = createMiddleware(routing);

/**
 * V009: Edge Middleware with Rate Limiting
 *
 * Applies rate limiting at the edge before reaching serverless functions.
 * This reduces costs and improves response times for rate-limited requests.
 */

/**
 * Public routes that don't require authentication
 * Note: Locale-prefixed routes must also be included for next-intl compatibility
 */
const isPublicRoute = createRouteMatcher([
  // Pages (root and locale-prefixed)
  '/',
  '/(en|ko|ja|zh)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/(en|ko|ja|zh)/sign-in(.*)',
  '/(en|ko|ja|zh)/sign-up(.*)',

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

/**
 * V009: Edge Middleware with Rate Limiting
 *
 * V014: Keeping middleware.ts for Next.js 16.1.1 compatibility with Clerk
 * Note: middleware.ts is deprecated in Next.js 16, but clerkMiddleware
 * does not yet support the new proxy.ts pattern.
 */
/**
 * Check if the request is for an API route or other non-locale paths
 */
function shouldSkipIntlMiddleware(pathname: string): boolean {
  // Skip intl middleware for API routes, webhooks, and internal Next.js paths
  return (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/trpc/') ||
    pathname.includes('.')
  );
}

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  // 1. Skip intl middleware for API and other non-locale routes
  if (shouldSkipIntlMiddleware(pathname)) {
    // For API routes, skip directly to Clerk auth
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
    return;
  }

  // 2. Apply next-intl middleware for page routes
  const intlResponse = intlMiddleware(request);

  // If intl middleware returned a response (redirect), use it
  if (intlResponse) {
    return intlResponse;
  }

  // 2. Apply edge rate limiting for API routes
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
        console.warn('[Proxy] Edge rate limit check failed:', error);
      }
    }
  }

  // 3. Apply Clerk authentication for protected routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

/**
 * Proxy configuration
 * V014: Updated matcher config name for Next.js 16
 */
export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js|json|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|txt|xml)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
