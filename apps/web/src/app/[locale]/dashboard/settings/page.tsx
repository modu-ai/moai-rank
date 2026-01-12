import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { ApiKeyCard, PrivacyToggle } from '@/components/dashboard';

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

interface ApiResponse<T> {
  success: boolean;
  data?: T;
}

async function getUserInfo(): Promise<ApiResponse<CurrentUserInfo>> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    const response = await fetch(`${baseUrl}/api/me`, {
      cache: 'no-store',
      headers: {
        Cookie: cookieStore.toString(),
      },
    });

    if (!response.ok) return { success: false };
    return response.json();
  } catch {
    return { success: false };
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
  const userInfoResult = await getUserInfo();

  if (!userInfoResult.success || !userInfoResult.data) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <h3 className="text-lg font-semibold">{t('unableToLoad')}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t('tryAgainMessage')}</p>
      </div>
    );
  }

  const userInfo = userInfoResult.data;

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
