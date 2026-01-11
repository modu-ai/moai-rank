import { type NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db, users } from '@/db';
import { eq } from 'drizzle-orm';
import { generateApiKey } from '@/lib/auth';
import { logApiKeyGenerated } from '@/lib/audit';
import { randomBytes } from 'node:crypto';

// Import cookie name from main CLI auth route
import { CLI_AUTH_COOKIE } from '../route';

interface CliAuthState {
  redirectUri: string;
  state: string;
  createdAt: number;
}

/**
 * GET /api/auth/cli/callback
 *
 * Handles the callback after Clerk sign-in.
 * Completes the CLI OAuth flow by:
 * 1. Reading stored state from cookie
 * 2. Verifying the user is authenticated
 * 3. Creating or retrieving the user in our database
 * 4. Generating an API key
 * 5. Redirecting to CLI's localhost callback
 */
export async function GET(request: NextRequest) {
  // Read state from cookie
  const cookieValue = request.cookies.get(CLI_AUTH_COOKIE)?.value;

  if (!cookieValue) {
    return renderErrorPage('Auth session expired. Please try again.');
  }

  let stateInfo: CliAuthState;
  try {
    const decoded = Buffer.from(cookieValue, 'base64').toString('utf-8');
    stateInfo = JSON.parse(decoded);
  } catch {
    return renderErrorPage('Invalid auth session. Please try again.');
  }

  // Validate cookie age (5 minutes max)
  if (Date.now() - stateInfo.createdAt > 5 * 60 * 1000) {
    const response = renderErrorPage('Auth session expired. Please try again.');
    response.cookies.delete(CLI_AUTH_COOKIE);
    return response;
  }

  // Check if user is authenticated
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return renderErrorPage('Authentication failed. Please try again.');
  }

  try {
    const user = await currentUser();
    if (!user) {
      return renderErrorPage('Failed to get user information');
    }

    // Get GitHub info from external accounts
    const githubAccount = user.externalAccounts?.find(
      (account) => account.provider === 'oauth_github'
    );

    const githubUsername = githubAccount?.username || user.username || 'user';
    // Ensure githubId is always a string
    const githubId = String(githubAccount?.externalId || clerkId);

    let apiKey: string;
    let isNewUser = false;

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
        isNewUser = true;

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
    const cliCallbackUrl = new URL(stateInfo.redirectUri);
    cliCallbackUrl.searchParams.set('api_key', apiKey);
    cliCallbackUrl.searchParams.set('state', stateInfo.state);
    cliCallbackUrl.searchParams.set('username', githubUsername);

    // Show success page that redirects to CLI and clear the auth cookie
    const response = renderSuccessPage(cliCallbackUrl.toString(), githubUsername, isNewUser);
    response.cookies.delete(CLI_AUTH_COOKIE);

    return response;
  } catch (error) {
    console.error('[CLI Auth Callback] Error:', error);
    const response = renderErrorPage('Failed to complete authentication. Please try again.');
    response.cookies.delete(CLI_AUTH_COOKIE);
    return response;
  }
}

/**
 * Render success page with auto-redirect to CLI
 */
function renderSuccessPage(
  redirectUrl: string,
  username: string,
  isNewUser: boolean
): NextResponse {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="2;url=${redirectUrl}">
  <title>MoAI Rank - CLI Authorization</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 400px;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1.5rem;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    .username {
      color: #4ade80;
      font-weight: 600;
    }
    p {
      color: #94a3b8;
      margin-top: 1rem;
      font-size: 0.9rem;
    }
    .redirect-notice {
      margin-top: 2rem;
      padding: 1rem;
      background: rgba(255,255,255,0.1);
      border-radius: 8px;
      font-size: 0.85rem;
    }
    a {
      color: #60a5fa;
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✅</div>
    <h1>${isNewUser ? 'Welcome to MoAI Rank!' : 'CLI Authorized!'}</h1>
    <p>Hello, <span class="username">@${username}</span>!</p>
    <p>${isNewUser ? 'Your account has been created and' : 'Your'} API key has been generated.</p>
    <div class="redirect-notice">
      Redirecting to your terminal...<br>
      <small>If not redirected, <a href="${redirectUrl}">click here</a></small>
    </div>
  </div>
</body>
</html>
  `;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

/**
 * Render error page
 */
function renderErrorPage(message: string): NextResponse {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MoAI Rank - Authorization Error</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 400px;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1.5rem;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
      color: #f87171;
    }
    p {
      color: #94a3b8;
      margin-top: 1rem;
    }
    .retry {
      margin-top: 2rem;
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: #3b82f6;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
    }
    .retry:hover {
      background: #2563eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">❌</div>
    <h1>Authorization Failed</h1>
    <p>${message}</p>
    <a href="/" class="retry">Return to Home</a>
  </div>
</body>
</html>
  `;

  return new NextResponse(html, {
    status: 400,
    headers: { 'Content-Type': 'text/html' },
  });
}
