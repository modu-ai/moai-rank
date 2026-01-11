import { type NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db, users } from '@/db';
import { eq } from 'drizzle-orm';
import { generateApiKey } from '@/lib/auth';
import { logApiKeyGenerated } from '@/lib/audit';
import { randomBytes } from 'node:crypto';

// Cookie name for CLI auth state
const CLI_AUTH_COOKIE = 'moai_cli_auth';

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

  // Check if user is already authenticated
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    // Not authenticated - store state in cookie and redirect to sign-in
    const callbackUrl = new URL('/api/auth/cli/callback', request.url);

    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect_url', callbackUrl.toString());

    const response = NextResponse.redirect(signInUrl);

    // Store CLI auth state in encrypted cookie
    const cookieData = JSON.stringify({ redirectUri, state, createdAt: Date.now() });
    response.cookies.set(CLI_AUTH_COOKIE, Buffer.from(cookieData).toString('base64'), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 300, // 5 minutes
      path: '/',
    });

    return response;
  }

  // User is authenticated - process the CLI auth
  return processCliAuth(request, clerkId, redirectUri, state);
}

/**
 * Process CLI authentication for an authenticated user
 */
async function processCliAuth(
  request: NextRequest,
  clerkId: string,
  redirectUri: string,
  state: string
): Promise<NextResponse> {
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

    const githubUsername = githubAccount?.username || user.username || 'user';
    // Ensure githubId is always a string
    const githubId = String(githubAccount?.externalId || clerkId);

    let apiKey: string;

    // Step 1: Check by clerkId first (primary identifier)
    let dbUser = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);

    if (dbUser.length > 0) {
      // User found by clerkId - update info and generate new API key
      const existingUser = dbUser[0];
      const { key, hash, prefix } = generateApiKey(existingUser.id);
      apiKey = key;

      await db
        .update(users)
        .set({
          githubUsername,
          githubAvatarUrl: user.imageUrl,
          apiKeyHash: hash,
          apiKeyPrefix: prefix,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id));

      await logApiKeyGenerated(existingUser.id, prefix, request);
    } else {
      // Step 2: Not found by clerkId, check by githubId (migration case)
      dbUser = await db.select().from(users).where(eq(users.githubId, githubId)).limit(1);

      if (dbUser.length > 0) {
        // User found by githubId - update clerkId and other info
        const existingUser = dbUser[0];
        const { key, hash, prefix } = generateApiKey(existingUser.id);
        apiKey = key;

        await db
          .update(users)
          .set({
            clerkId, // Update clerkId for migration
            githubUsername,
            githubAvatarUrl: user.imageUrl,
            apiKeyHash: hash,
            apiKeyPrefix: prefix,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));

        await logApiKeyGenerated(existingUser.id, prefix, request);
      } else {
        // Step 3: User not found at all - create new user
        const { key, hash, prefix } = generateApiKey(clerkId);
        apiKey = key;

        const newUser = await db
          .insert(users)
          .values({
            clerkId,
            githubId,
            githubUsername,
            githubAvatarUrl: user.imageUrl,
            apiKeyHash: hash,
            apiKeyPrefix: prefix,
            userSalt: randomBytes(32).toString('hex'),
          })
          .returning();

        await logApiKeyGenerated(newUser[0].id, prefix, request);
      }
    }

    // Redirect to CLI's callback with API key
    const cliCallbackUrl = new URL(redirectUri);
    cliCallbackUrl.searchParams.set('api_key', apiKey);
    cliCallbackUrl.searchParams.set('state', state);
    cliCallbackUrl.searchParams.set('username', githubUsername);

    const response = NextResponse.redirect(cliCallbackUrl);

    // Clear the CLI auth cookie
    response.cookies.delete(CLI_AUTH_COOKIE);

    return response;
  } catch (error) {
    // V011: Log detailed error server-side only, return generic message to client
    // This prevents information disclosure of database structure, credentials, etc.
    console.error('[CLI Auth] Error:', error);

    if (error instanceof Error) {
      // Log detailed info server-side for debugging
      const errorDetails = {
        message: error.message,
        cause: 'cause' in error ? error.cause : undefined,
        code: 'code' in error ? (error as { code: string }).code : undefined,
      };
      console.error('[CLI Auth] Error details:', JSON.stringify(errorDetails));
    }

    // Return generic error to client (no sensitive details exposed)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process CLI authentication. Please try again.',
        },
      },
      { status: 500 }
    );
  }
}

// Export cookie name for callback handler
export { CLI_AUTH_COOKIE };
