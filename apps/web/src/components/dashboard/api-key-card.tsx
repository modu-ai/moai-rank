'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Key, Copy, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ApiKeyCardProps {
  apiKeyPrefix: string;
}

export function ApiKeyCard({ apiKeyPrefix }: ApiKeyCardProps) {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/me/regenerate-key', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate API key');
      }

      const result = await response.json();
      if (result.success && result.data) {
        setNewApiKey(result.data.apiKey);
      } else {
        throw new Error(result.error?.message || 'Failed to regenerate API key');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopy = async () => {
    if (newApiKey) {
      await navigator.clipboard.writeText(newApiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setNewApiKey(null);
    setError(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          {t('apiKey')}
        </CardTitle>
        <CardDescription>{t('apiKeyDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-sm">
            {apiKeyPrefix}...
          </code>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('regenerateApiKey')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {newApiKey ? t('newKeyGenerated') : t('regenerateConfirmTitle')}
              </DialogTitle>
              <DialogDescription>
                {newApiKey ? (
                  <span className="text-amber-600">{t('saveKeyWarning')}</span>
                ) : (
                  t('regenerateConfirmMessage')
                )}
              </DialogDescription>
            </DialogHeader>

            {newApiKey ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded-md bg-muted px-3 py-2 font-mono text-xs">
                    {newApiKey}
                  </code>
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <DialogFooter>
                  <Button onClick={handleDialogClose}>{tCommon('done')}</Button>
                </DialogFooter>
              </div>
            ) : error ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleDialogClose}>
                    {tCommon('cancel')}
                  </Button>
                  <Button onClick={handleRegenerate} disabled={isRegenerating}>
                    {tCommon('retry')}
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <DialogFooter>
                <Button variant="outline" onClick={handleDialogClose}>
                  {tCommon('cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      {t('regenerating')}
                    </>
                  ) : (
                    t('regenerate')
                  )}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
