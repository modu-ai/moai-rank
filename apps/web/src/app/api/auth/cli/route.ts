import { type NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db, users } from '@/db';
import { eq } from 'drizzle-orm';
import { generateApiKey } from '@/lib/auth';
import { logApiKeyGenerated } from '@/lib/audit';
import { randomBytes, createHash } from 'crypto';

/**
 * Temporary store for CLI auth states
 * In production, use Redis or a database table
 */
const cliAuthStates = new Map<
  string,
  {
    redirectUri: string;
    state: string;
    createdAt: number;
    userId?: string;
    apiKey?: string;
  }
>();

// Clean up expired states (older than 5 minutes)
function cleanupExpiredStates() {
  const now = Date.now();
  const expiryMs = 5 * 60 * 1000; // 5 minutes
  for (const [key, value] of cliAuthStates.entries()) {
    if (now - value.createdAt > expiryMs) {
      cliAuthStates.delete(key);
    }
  }
}

/**
 * GET /api/auth/cli
 *
 * Initiates CLI OAuth flow.
 * Accepts redirect_uri (CLI's local callback) and state (CSRF token).
 *
 * Flow:
 * 1. CLI opens browser to this endpoint with redirect_uri and state
 * 2. If user is authenticated, process immediately
 * 3. If not, redirect to sign-in, then back here
 * 4. Create/get user, generate API key, redirect to CLI's redirect_uri
 */
export async function GET(request: NextRequest) {
  cleanupExpiredStates();

  const searchParams = request.nextUrl.searchParams;
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');

  // Validate required parameters
  if (!redirectUri || !state) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required parameters: redirect_uri and state',
        },
      },
      { status: 400 }
    );
  }

  // Validate redirect_uri is localhost (security measure)
  try {
    const url = new URL(redirectUri);
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'redirect_uri must be localhost',
          },
        },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid redirect_uri',
        },
      },
      { status: 400 }
    );
  }

  // Store the auth state
  const stateKey = createHash('sha256').update(state).digest('hex').slice(0, 32);
  cliAuthStates.set(stateKey, {
    redirectUri,
    state,
    createdAt: Date.now(),
  });

  // Check if user is already authenticated
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    // Not authenticated - redirect to sign-in with return URL
    const callbackUrl = new URL('/api/auth/cli/callback', request.url);
    callbackUrl.searchParams.set('state_key', stateKey);

    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect_url', callbackUrl.toString());

    return NextResponse.redirect(signInUrl);
  }

  // User is authenticated - process the CLI auth
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Failed to get user information',
          },
        },
        { status: 401 }
      );
    }

    // Get GitHub info from external accounts
    const githubAccount = user.externalAccounts?.find(
      (account) => account.provider === 'oauth_github'
    );

    if (!githubAccount) {
      // Redirect to sign-in to link GitHub
      const callbackUrl = new URL('/api/auth/cli/callback', request.url);
      callbackUrl.searchParams.set('state_key', stateKey);

      const signInUrl = new URL('/sign-in', request.url);
      signInUrl.searchParams.set('redirect_url', callbackUrl.toString());

      return NextResponse.redirect(signInUrl);
    }

    // Check if user exists in database
    let dbUser = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);

    let apiKey: string;

    if (dbUser.length === 0) {
      // Create new user
      const { key, hash, prefix } = generateApiKey(clerkId);
      apiKey = key;

      const newUser = await db
        .insert(users)
        .values({
          clerkId,
          githubId: githubAccount.externalId || clerkId,
          githubUsername: githubAccount.username || user.username || 'unknown',
          githubAvatarUrl: user.imageUrl,
          apiKeyHash: hash,
          apiKeyPrefix: prefix,
          userSalt: randomBytes(32).toString('hex'),
        })
        .returning();

      await logApiKeyGenerated(newUser[0].id, prefix, request);
    } else {
      // User exists - generate new API key for CLI registration
      const existingUser = dbUser[0];
      const { key, hash, prefix } = generateApiKey(existingUser.id);
      apiKey = key;

      await db
        .update(users)
        .set({
          apiKeyHash: hash,
          apiKeyPrefix: prefix,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id));

      await logApiKeyGenerated(existingUser.id, prefix, request);
    }

    // Get stored state info
    const stateInfo = cliAuthStates.get(stateKey);
    if (!stateInfo) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Auth state expired or invalid',
          },
        },
        { status: 400 }
      );
    }

    // Clean up state
    cliAuthStates.delete(stateKey);

    // Redirect to CLI's callback with API key
    const cliCallbackUrl = new URL(stateInfo.redirectUri);
    cliCallbackUrl.searchParams.set('api_key', apiKey);
    cliCallbackUrl.searchParams.set('state', stateInfo.state);

    return NextResponse.redirect(cliCallbackUrl);
  } catch (error) {
    console.error('[CLI Auth] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process CLI authentication',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Export state store for callback handler
 */
export { cliAuthStates };
