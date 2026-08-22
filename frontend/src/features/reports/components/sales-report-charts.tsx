"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SalesReport } from "@/features/reports/api/sales-report-api";

// ── formatters ──
export function naira(n: number) {
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}
export function nairaCompact(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}k`;
  return `₦${Math.round(n)}`;
}
function shortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

const CHART_H = "h-[280px] w-full";

// ── Revenue over time (stacked area) ──
const revenueConfig = {
  purchases: { label: "Purchases", color: "var(--chart-1)" },
  rentals: { label: "Rentals", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function RevenueOverTimeChart({
  data,
}: {
  data: SalesReport["revenue_series"];
}) {
  return (
    <ChartContainer config={revenueConfig} className={CHART_H}>
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          {(["purchases", "rentals"] as const).map((k) => (
            <linearGradient key={k} id={`fill-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={`var(--color-${k})`} stopOpacity={0.3} />
              <stop offset="95%" stopColor={`var(--color-${k})`} stopOpacity={0.03} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 6" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={28}
          tickFormatter={shortDate}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={nairaCompact}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(v) => shortDate(String(v))}
              formatter={(value, name) => (
                <span className="flex w-full justify-between gap-4">
                  <span className="text-(--brc-text-muted)">
                    {revenueConfig[name as keyof typeof revenueConfig]?.label}
                  </span>
                  <span className="font-bold tabular-nums">{naira(Number(value))}</span>
                </span>
              )}
            />
          }
        />
        <Area
          dataKey="rentals"
          type="monotone"
          stackId="a"
          stroke="var(--color-rentals)"
          fill="url(#fill-rentals)"
        />
        <Area
          dataKey="purchases"
          type="monotone"
          stackId="a"
          stroke="var(--color-purchases)"
          fill="url(#fill-purchases)"
        />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}

// ── Volume & revenue (grouped bars) ──
const volumeConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  units: { label: "Units sold", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function VolumeRevenueChart({ data }: { data: SalesReport["by_period"] }) {
  return (
    <ChartContainer config={volumeConfig} className={CHART_H}>
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 6" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          yAxisId="rev"
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={nairaCompact}
        />
        <YAxis yAxisId="units" orientation="right" tickLine={false} axisLine={false} width={30} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar yAxisId="rev" dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="units" dataKey="units" fill="var(--color-units)" radius={[4, 4, 0, 0]} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  );
}

// ── Revenue mix (donut with center total) ──
export function RevenueMixChart({ data }: { data: SalesReport["revenue_mix"] }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  const config: ChartConfig = {
    Purchases: { label: "Purchases", color: "var(--chart-1)" },
    Rentals: { label: "Rentals", color: "var(--chart-2)" },
  };
  return (
    <ChartContainer config={config} className={`${CHART_H} mx-auto aspect-square`}>
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, name) => (
                <span className="flex w-full justify-between gap-4">
                  <span className="text-(--brc-text-muted)">{name}</span>
                  <span className="font-bold tabular-nums">{naira(Number(value))}</span>
                </span>
              )}
            />
          }
        />
        <Pie
          data={data}
          dataKey="value"
          nameKey="category"
          innerRadius={70}
          strokeWidth={4}
        >
          {data.map((d) => (
            <Cell key={d.category} fill={`var(--color-${d.category})`} />
          ))}
          <Label
            content={({ viewBox }) => {
              if (!viewBox || !("cx" in viewBox)) return null;
              return (
                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                  <tspan
                    x={viewBox.cx}
                    y={(viewBox.cy ?? 0) - 6}
                    className="fill-(--brc-text) text-lg font-extrabold"
                  >
                    {nairaCompact(total)}
                  </tspan>
                  <tspan
                    x={viewBox.cx}
                    y={(viewBox.cy ?? 0) + 16}
                    className="fill-(--brc-text-muted) text-xs"
                  >
                    Total revenue
                  </tspan>
                </text>
              );
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

// ── Top models (horizontal bar) ──
export function TopModelsChart({ data }: { data: SalesReport["top_models"] }) {
  const config: ChartConfig = {
    revenue: { label: "Revenue", color: "var(--chart-1)" },
  };
  return (
    <ChartContainer config={config} className={CHART_H}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 8, right: 42, top: 4, bottom: 4 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 6" />
        <YAxis
          dataKey="label"
          type="category"
          tickLine={false}
          axisLine={false}
          width={128}
          tick={{ fontSize: 12 }}
        />
        <XAxis type="number" hide />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => (
                <span className="font-bold tabular-nums">{naira(Number(value))}</span>
              )}
            />
          }
        />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4}>
          <LabelList
            dataKey="revenue"
            position="right"
            offset={8}
            className="fill-(--brc-text-muted)"
            fontSize={11}
            formatter={(v: unknown) => nairaCompact(Number(v))}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// ── Average price trend (line, 2 series) ──
const priceConfig = {
  avg_sale_price: { label: "Avg sale price", color: "var(--chart-1)" },
  avg_rent_per_day: { label: "Avg rent / day", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function AvgPriceChart({ data }: { data: SalesReport["avg_price_series"] }) {
  return (
    <ChartContainer config={priceConfig} className={CHART_H}>
      <LineChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 6" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={nairaCompact} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <span className="flex w-full justify-between gap-4">
                  <span className="text-(--brc-text-muted)">
                    {priceConfig[name as keyof typeof priceConfig]?.label}
                  </span>
                  <span className="font-bold tabular-nums">{naira(Number(value))}</span>
                </span>
              )}
            />
          }
        />
        <Line dataKey="avg_sale_price" type="monotone" stroke="var(--color-avg_sale_price)" strokeWidth={2} dot={false} />
        <Line dataKey="avg_rent_per_day" type="monotone" stroke="var(--color-avg_rent_per_day)" strokeWidth={2} dot={false} />
        <ChartLegend content={<ChartLegendContent />} />
      </LineChart>
    </ChartContainer>
  );
}

// ── Branch performance (grouped bars) ──
export function BranchPerformanceChart({
  data,
}: {
  data: SalesReport["by_branch"];
}) {
  const rows = data.map((d) => ({ ...d, label: d.branch }));
  return (
    <ChartContainer config={volumeConfig} className={CHART_H}>
      <BarChart data={rows} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 6" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 11 }}
        />
        <YAxis yAxisId="rev" tickLine={false} axisLine={false} width={52} tickFormatter={nairaCompact} />
        <YAxis yAxisId="units" orientation="right" tickLine={false} axisLine={false} width={30} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar yAxisId="rev" dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="units" dataKey="units" fill="var(--color-units)" radius={[4, 4, 0, 0]} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  );
}

// ── Revenue against target (radial gauge) ──
export function TargetGauge({ target }: { target: SalesReport["target"] }) {
  const pct = Math.max(0, Math.min(100, target.pct));
  const config: ChartConfig = {
    pct: { label: "Progress", color: "var(--chart-1)" },
  };
  return (
    <ChartContainer config={config} className={`${CHART_H} mx-auto aspect-square`}>
      <RadialBarChart
        data={[{ name: "pct", pct, fill: "var(--color-pct)" }]}
        startAngle={90}
        endAngle={90 - (pct / 100) * 360}
        innerRadius={80}
        outerRadius={130}
      >
        <PolarGrid gridType="circle" radialLines={false} stroke="none" className="first:fill-(--brc-bg-muted) last:fill-transparent" polarRadius={[86, 74]} />
        <RadialBar dataKey="pct" background cornerRadius={10} />
        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
          <Label
            content={({ viewBox }) => {
              if (!viewBox || !("cx" in viewBox)) return null;
              return (
                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                  <tspan
                    x={viewBox.cx}
                    y={(viewBox.cy ?? 0) - 4}
                    className="fill-(--brc-text) text-2xl font-extrabold"
                  >
                    {Math.round(target.pct)}%
                  </tspan>
                  <tspan
                    x={viewBox.cx}
                    y={(viewBox.cy ?? 0) + 20}
                    className="fill-(--brc-text-muted) text-xs"
                  >
                    {target.met ? "Target met" : "of target"}
                  </tspan>
                </text>
              );
            }}
          />
        </PolarRadiusAxis>
      </RadialBarChart>
    </ChartContainer>
  );
}
