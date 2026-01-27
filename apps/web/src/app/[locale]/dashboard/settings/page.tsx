import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { currentUser, auth } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { ApiKeyCard, PrivacyToggle } from '@/components/dashboard';
import { db, users, rankings } from '@/db';
import { withRLS } from '@/db/rls';
import { eq, and, desc } from 'drizzle-orm';
import { generateApiKey } from '@/lib/auth';
import { randomBytes } from 'node:crypto';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Settings - MoAI Rank',
  description: 'Manage your MoAI Rank account settings',
};

interface CurrentUserInfo {
  id: string;
  githubUsername: string;
  githubAvatarUrl: string | null;
  apiKeyPrefix: string;
  privacyMode: boolean;
  currentRank: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get user info directly from DB (server-side only)
 * This avoids the need for internal API calls from server components
 */
async function getUserInfo(): Promise<CurrentUserInfo | null> {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return null;
    }

    // Find user by Clerk ID
    const userResult = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);

    let user = userResult[0];

    // Auto-create user if not found
    if (!user) {
      const clerkUser = await currentUser();

      if (!clerkUser) {
        return null;
      }

      // Get GitHub info from external accounts
      const githubAccount = clerkUser.externalAccounts?.find(
        (account) => account.provider === 'oauth_github'
      );

      const githubUsername = githubAccount?.username || clerkUser.username || `user_${randomBytes(4).toString('hex')}`;
      const githubId = String(githubAccount?.externalId || clerkId);
      const githubAvatarUrl = githubAccount?.imageUrl || clerkUser.imageUrl || null;

      // Generate API key for new user
      const { hash, prefix } = generateApiKey(clerkId);

      // Create new user
      const newUserResult = await db
        .insert(users)
        .values({
          clerkId,
          githubId,
          githubUsername,
          githubAvatarUrl,
          apiKeyHash: hash,
          apiKeyPrefix: prefix,
          userSalt: randomBytes(32).toString('hex'),
          privacyMode: false,
        })
        .returning();

      user = newUserResult[0];
    }

    // Use RLS context for ranking query
    const currentRank = await withRLS(user.id, async (rlsDb) => {
      const rankingResult = await rlsDb
        .select({ rank: rankings.rankPosition })
        .from(rankings)
        .where(and(eq(rankings.userId, user.id), eq(rankings.periodType, 'all_time')))
        .orderBy(desc(rankings.updatedAt))
        .limit(1);

      return rankingResult[0]?.rank ?? null;
    });

    return {
      id: user.id,
      githubUsername: user.githubUsername,
      githubAvatarUrl: user.githubAvatarUrl,
      apiKeyPrefix: user.apiKeyPrefix,
      privacyMode: user.privacyMode ?? false,
      currentRank,
      createdAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: user.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Settings] Failed to get user info:', error);
    return null;
  }
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {['api-key', 'privacy'].map((cardId) => (
          <Card key={cardId}>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

async function SettingsContent() {
  const t = await getTranslations('settings');
  const userInfo = await getUserInfo();

  if (!userInfo) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <h3 className="text-lg font-semibold">{t('unableToLoad')}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t('tryAgainMessage')}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard" aria-label={t('backToDashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{t('title')}</h1>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <ApiKeyCard apiKeyPrefix={userInfo.apiKeyPrefix} />
        <PrivacyToggle initialValue={userInfo.privacyMode} />
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}
