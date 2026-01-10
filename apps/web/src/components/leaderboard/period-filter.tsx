"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const periods = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "all_time", label: "All Time" },
] as const;

export function PeriodFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPeriod = searchParams.get("period") || "weekly";

  const handlePeriodChange = (period: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    params.delete("page"); // Reset to first page on period change
    router.push(`/?${params.toString()}`);
  };

  return (
    <Tabs value={currentPeriod} onValueChange={handlePeriodChange}>
      <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-none">
        {periods.map((period) => (
          <TabsTrigger key={period.value} value={period.value}>
            {period.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
