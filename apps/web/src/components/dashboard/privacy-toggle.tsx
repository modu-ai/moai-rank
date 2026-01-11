'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EyeOff, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PrivacyToggleProps {
  initialValue: boolean;
}

export function PrivacyToggle({ initialValue }: PrivacyToggleProps) {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const [privacyMode, setPrivacyMode] = useState(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async (checked: boolean) => {
    const previousValue = privacyMode;
    setPrivacyMode(checked); // Optimistic update - immediate UI change
    setIsUpdating(true);

    try {
      const response = await fetch('/api/me/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ privacyMode: checked }),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error('API returned failure');
      }
    } catch (error) {
      console.error('Failed to update privacy mode:', error);
      setPrivacyMode(previousValue); // Rollback on error
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <EyeOff className="h-5 w-5" />
          {t('privacyMode')}
        </CardTitle>
        <CardDescription>{t('privacyModeDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              {privacyMode ? tCommon('enabled') : tCommon('disabled')}
            </p>
            <p className="text-xs text-muted-foreground">
              {privacyMode ? t('privacyEnabled') : t('privacyDisabled')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
            <Switch
              checked={privacyMode}
              onCheckedChange={handleToggle}
              disabled={isUpdating}
              aria-label="Toggle privacy mode"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
