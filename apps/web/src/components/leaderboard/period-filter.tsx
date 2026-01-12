'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const periodValues = ['daily', 'weekly', 'monthly', 'all_time'] as const;

export function PeriodFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPeriod = searchParams.get('period') || 'daily';
  const t = useTranslations('leaderboard');

  const handlePeriodChange = (period: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', period);
    params.delete('page'); // Reset to first page on period change
    router.push(`/?${params.toString()}`);
  };

  const getPeriodLabel = (value: string) => {
    switch (value) {
      case 'daily':
        return t('daily');
      case 'weekly':
        return t('weekly');
      case 'monthly':
        return t('monthly');
      case 'all_time':
        return t('allTime');
      default:
        return value;
    }
  };

  return (
    <Tabs value={currentPeriod} onValueChange={handlePeriodChange}>
      <TabsList className="h-10 w-full justify-center gap-1 bg-transparent p-0 sm:w-auto">
        {periodValues.map((period) => (
          <TabsTrigger
            key={period}
            value={period}
            className="cursor-pointer rounded-full border border-transparent px-4 py-2 data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            {getPeriodLabel(period)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
