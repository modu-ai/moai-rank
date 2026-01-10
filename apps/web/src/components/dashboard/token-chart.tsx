"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DailyStats {
  date: string;
  inputTokens: number;
  outputTokens: number;
  sessions: number;
}

interface TokenChartProps {
  last7Days: DailyStats[];
  last30Days: DailyStats[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

interface ChartData {
  date: string;
  input: number;
  output: number;
  total: number;
}

function prepareChartData(data: DailyStats[]): ChartData[] {
  return [...data]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((d) => ({
      date: formatDate(d.date),
      input: d.inputTokens,
      output: d.outputTokens,
      total: d.inputTokens + d.outputTokens,
    }));
}

function TokenAreaChart({ data }: { data: ChartData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No data available for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
        />
        <YAxis
          tickFormatter={formatNumber}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
          }}
          labelStyle={{ color: "hsl(var(--foreground))" }}
          formatter={(value, name) => [
            typeof value === "number" ? formatNumber(value) : String(value),
            name === "input" ? "Input Tokens" : "Output Tokens",
          ]}
        />
        <Legend
          formatter={(value) =>
            value === "input" ? "Input Tokens" : "Output Tokens"
          }
        />
        <Area
          type="monotone"
          dataKey="input"
          stroke="hsl(var(--chart-1))"
          fillOpacity={1}
          fill="url(#colorInput)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="output"
          stroke="hsl(var(--chart-2))"
          fillOpacity={1}
          fill="url(#colorOutput)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TokenChart({ last7Days, last30Days }: TokenChartProps) {
  const chartData7Days = prepareChartData(last7Days);
  const chartData30Days = prepareChartData(last30Days);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="7days">
          <TabsList className="mb-4">
            <TabsTrigger value="7days">Last 7 Days</TabsTrigger>
            <TabsTrigger value="30days">Last 30 Days</TabsTrigger>
          </TabsList>
          <TabsContent value="7days">
            <TokenAreaChart data={chartData7Days} />
          </TabsContent>
          <TabsContent value="30days">
            <TokenAreaChart data={chartData30Days} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
