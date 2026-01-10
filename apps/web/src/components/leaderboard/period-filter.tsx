'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const periods = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'all_time', label: 'All Time' },
] as const;

export function PeriodFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPeriod = searchParams.get('period') || 'weekly';

  const handlePeriodChange = (period: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', period);
    params.delete('page'); // Reset to first page on period change
    router.push(`/?${params.toString()}`);
  };

  return (
    <Tabs value={currentPeriod} onValueChange={handlePeriodChange}>
      <TabsList className="h-10 w-full justify-start gap-1 bg-transparent p-0 sm:w-auto">
        {periods.map((period) => (
          <TabsTrigger
            key={period.value}
            value={period.value}
            className="rounded-full border border-transparent px-4 py-2 data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            {period.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
