import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

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

  // CLI OAuth routes
  '/api/auth/cli(.*)',

  // Public API routes (no auth required)
  '/api/leaderboard',
  '/api/users/(.*)',
  '/api/stats/global',

  // CLI API routes (use API key auth, not Clerk)
  '/api/v1/(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
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
