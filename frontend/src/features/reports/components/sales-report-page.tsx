"use client";

import { useState } from "react";
import {
  ClipboardCheckIcon,
  DownloadIcon,
  HistoryIcon,
  HomeIcon,
  LightbulbIcon,
  LineChartIcon,
  PackageIcon,
  WalletIcon,
} from "lucide-react";
import { toast } from "sonner";
import { MotionConfig, motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSalesReport,
  type SalesRange,
  type SalesReport,
  type SalesType,
} from "@/features/reports/api/sales-report-api";
import {
  AvgPriceChart,
  BranchPerformanceChart,
  RevenueMixChart,
  RevenueOverTimeChart,
  TopModelsChart,
  VolumeRevenueChart,
  naira,
} from "./sales-report-charts";
import { SegmentedTabs } from "@/shared/motion/segmented-tabs";
import { ConsoleLayout } from "@/shared/console/console-layout";
import { ConsoleRail, type RailItem } from "@/shared/console/console-rail";
import { PageHeader } from "@/shared/console/page-header";
import { Kpi, KpiStrip } from "@/shared/console/kpi-strip";
import { PREMIUM_TWEEN } from "@/shared/motion/premium";

const RANGES: { value: SalesRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "3m", label: "Last 3 months" },
  { value: "12m", label: "Last 12 months" },
];
const TYPES: { value: SalesType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "buy", label: "Purchases" },
  { value: "rent", label: "Rentals" },
];

const RAIL: RailItem[] = [
  { key: "overview", label: "Overview", icon: HomeIcon },
  { key: "sales", label: "Sales", icon: LineChartIcon, soon: true },
  { key: "inventory", label: "Inventory", icon: PackageIcon, soon: true },
  { key: "inspections", label: "Inspections", icon: ClipboardCheckIcon, soon: true },
  { key: "finance", label: "Finance", icon: WalletIcon, soon: true },
  { key: "export", label: "Export history", icon: HistoryIcon, soon: true },
];

const SELECT_CLASS =
  "h-9 rounded-xl border border-(--brc-border) bg-white px-3 text-[13px] font-bold text-(--brc-text) outline-none [font-family:var(--brc-font-ui)]";

function compactNaira(n: number): string {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${Math.round(n)}`;
}

// ── Card shell (reveal on enter + hover elevation) ──
function ChartCard({
  title,
  subtitle,
  span,
  children,
}: {
  title: string;
  subtitle?: string;
  span: string;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={PREMIUM_TWEEN}
      className={`flex min-w-0 flex-col gap-3.5 rounded-2xl border border-(--brc-border) bg-white p-[18px] shadow-(--brc-shadow-xs) transition-shadow duration-200 hover:shadow-(--brc-shadow-md) motion-reduce:transition-none [font-family:var(--brc-font-ui)] ${span}`}
    >
      <div className="flex flex-col gap-0.5">
        <h2 className="m-0 [font-family:var(--brc-font-display)] text-[17px] font-bold tracking-tight text-(--brc-text)">
          {title}
        </h2>
        {subtitle ? (
          <p className="m-0 text-[12.5px] font-semibold text-(--brc-text-muted)">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </motion.section>
  );
}

// ── Compare toggle ──
function CompareToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="inline-flex items-center gap-2 text-[13px] font-bold text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]"
    >
      <span
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors motion-reduce:transition-none",
          on ? "bg-(--brc-primary)" : "bg-(--brc-bg-muted)",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white shadow transition-all motion-reduce:transition-none",
            on ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
      Compare previous period
    </button>
  );
}

// ── New cards ──
function RevenueTargetCard({ target }: { target: SalesReport["target"] }) {
  const pct = Math.max(0, Math.round(target.pct));
  const remaining = Math.max(0, target.target - target.revenue);
  return (
    <ChartCard title="Revenue target" span="">
      <div className="flex items-end justify-between">
        <span className="text-[13px] font-semibold text-(--brc-text-muted)">
          {compactNaira(target.target)} target
        </span>
        <span className="text-[24px] font-black leading-none text-(--brc-primary) [font-family:var(--brc-font-display)]">
          {pct}%
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-(--brc-bg-muted)">
        <div
          className="h-full rounded-full bg-(--brc-primary)"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="text-[12px] font-semibold text-(--brc-text-muted)">
        {compactNaira(remaining)} remaining
      </span>
    </ChartCard>
  );
}

function SalesMixCard({ mix }: { mix: SalesReport["revenue_mix"] }) {
  const purchases = mix.find((m) => m.category === "Purchases")?.value ?? 0;
  const rentals = mix.find((m) => m.category === "Rentals")?.value ?? 0;
  const total = purchases + rentals;
  const pPct = total ? Math.round((purchases / total) * 100) : 0;
  const rPct = total ? 100 - pPct : 0;
  return (
    <ChartCard title="Sales mix" span="">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-(--brc-bg-muted)">
        <div style={{ width: `${pPct}%`, background: "var(--brc-primary)" }} />
        <div style={{ width: `${rPct}%`, background: "var(--brc-accent)" }} />
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] font-semibold text-(--brc-text-secondary)">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-(--brc-primary)" />
          Purchases {pPct}% ({compactNaira(purchases)})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-(--brc-accent)" />
          Rentals {rPct}% ({compactNaira(rentals)})
        </span>
      </div>
    </ChartCard>
  );
}

function KeyInsightCard({
  topModels,
  totalRevenue,
}: {
  topModels: SalesReport["top_models"];
  totalRevenue: number;
}) {
  const top = topModels[0];
  const share = top && totalRevenue > 0 ? Math.round((top.revenue / totalRevenue) * 100) : null;
  const text =
    top && share !== null
      ? `${top.label} generated ${share}% of revenue.`
      : "Not enough completed sales yet for an insight.";
  return (
    <ChartCard title="Key insight" span="">
      <div className="flex items-start gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-(--brc-primary-tint) text-(--brc-primary)">
          <LightbulbIcon size={16} />
        </span>
        <p className="m-0 text-[13.5px] leading-relaxed text-(--brc-text-secondary)">{text}</p>
      </div>
    </ChartCard>
  );
}

function toCsv(data: SalesReport) {
  const rows = [
    ["Metric", "Value"],
    ["Total revenue", String(data.kpis.total_revenue)],
    ["Units sold", String(data.kpis.units_sold)],
    ["Avg sale price", String(data.kpis.avg_sale_price)],
    ["Conversion %", String(data.kpis.conversion_rate)],
    ["Inspection revenue", String(data.kpis.inspection_revenue)],
    [],
    ["Period", "Units", "Revenue"],
    ...data.by_period.map((p) => [p.label, String(p.units), String(p.revenue)]),
  ];
  return rows.map((r) => r.join(",")).join("\n");
}

export function SalesReportPage() {
  const [range, setRange] = useState<SalesRange>("3m");
  const [type, setType] = useState<SalesType>("all");
  const [branch, setBranch] = useState("");
  const [compare, setCompare] = useState(true);

  const { data, isLoading, isError, refetch } = useSalesReport({
    range,
    type,
    branch: branch || undefined,
  });

  const isEmpty =
    !!data && data.kpis.total_revenue === 0 && data.kpis.units_sold === 0;

  function exportCsv() {
    if (!data) return;
    const blob = new Blob([toCsv(data)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${data.range.from}_${data.range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  const pctFmt = (n: number) => `${n.toFixed(n % 1 === 0 ? 0 : 1)}%`;
  const unitFmt = (n: number) => Math.round(n).toLocaleString("en-NG");

  return (
    <MotionConfig reducedMotion="user">
      <ConsoleLayout
        rail={
          <ConsoleRail eyebrow="Reports" items={RAIL} active="overview" onSelect={() => {}} />
        }
      >
        <PageHeader
          eyebrow="Reporting"
          title="Sales performance"
          subtitle="Revenue, conversion and branch performance"
          actions={
            <button
              type="button"
              onClick={exportCsv}
              disabled={!data}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-(--brc-border) bg-white px-3.5 text-[13px] font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-muted) disabled:opacity-50 [font-family:var(--brc-font-ui)]"
            >
              <DownloadIcon size={15} /> Export CSV
            </button>
          }
        />

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as SalesRange)}
            aria-label="Date range"
            className={SELECT_CLASS}
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <SegmentedTabs options={TYPES} value={type} onChange={setType} groupId="report-type" />
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            aria-label="Branch"
            className={cn(SELECT_CLASS, "max-w-[220px]")}
          >
            <option value="">All branches</option>
            {data?.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
          <div className="ml-auto">
            <CompareToggle on={compare} onChange={setCompare} />
          </div>
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-(--brc-border) bg-white p-12 text-center">
            <p className="text-sm font-semibold text-(--brc-text)">
              Couldn&apos;t load the sales report.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="h-10 rounded-lg bg-(--brc-primary) px-4 text-sm font-bold text-(--brc-text-on-primary)"
            >
              Try again
            </button>
          </div>
        ) : isLoading || !data ? (
          <ReportSkeleton />
        ) : (
          <>
            <KpiStrip>
              <Kpi
                label="Total revenue"
                value={data.kpis.total_revenue}
                format={naira}
                delta={data.kpis.deltas.total_revenue}
                compare={compare}
              />
              <Kpi
                label="Units sold"
                value={data.kpis.units_sold}
                format={unitFmt}
                delta={data.kpis.deltas.units_sold}
                compare={compare}
              />
              <Kpi
                label="Average sale price"
                value={data.kpis.avg_sale_price}
                format={naira}
                delta={data.kpis.deltas.avg_sale_price}
                compare={compare}
              />
              <Kpi
                label="Conversion"
                value={data.kpis.conversion_rate}
                format={pctFmt}
                delta={data.kpis.deltas.conversion_rate}
                compare={compare}
              />
              <Kpi
                label="Inspection revenue"
                value={data.kpis.inspection_revenue}
                format={naira}
                delta={data.kpis.deltas.inspection_revenue}
                compare={compare}
              />
            </KpiStrip>

            {isEmpty ? (
              <div className="rounded-2xl border border-dashed border-(--brc-border) bg-white p-16 text-center text-sm text-(--brc-text-muted)">
                No completed sales in this period. Adjust the filters to see more.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <ChartCard
                  title="Revenue over time"
                  subtitle="Completed purchases and rentals, naira"
                  span="lg:col-span-8"
                >
                  <RevenueOverTimeChart data={data.revenue_series} />
                </ChartCard>
                <div className="flex flex-col gap-4 lg:col-span-4">
                  <RevenueTargetCard target={data.target} />
                  <SalesMixCard mix={data.revenue_mix} />
                  <KeyInsightCard
                    topModels={data.top_models}
                    totalRevenue={data.kpis.total_revenue}
                  />
                </div>

                <ChartCard title="Top models by revenue" span="lg:col-span-6">
                  <TopModelsChart data={data.top_models} />
                </ChartCard>
                <ChartCard
                  title="Branch performance"
                  subtitle="Revenue and units by branch"
                  span="lg:col-span-6"
                >
                  <BranchPerformanceChart data={data.by_branch} />
                </ChartCard>

                <ChartCard
                  title="Volume and revenue"
                  subtitle="Units sold and revenue by month"
                  span="lg:col-span-7"
                >
                  <VolumeRevenueChart data={data.by_period} />
                </ChartCard>
                <ChartCard
                  title="Revenue mix"
                  subtitle="Purchases vs rentals"
                  span="lg:col-span-5"
                >
                  <RevenueMixChart data={data.revenue_mix} />
                </ChartCard>
                <ChartCard
                  title="Average price trend"
                  subtitle="Avg sale price and rent per day"
                  span="lg:col-span-12"
                >
                  <AvgPriceChart data={data.avg_price_series} />
                </ChartCard>
              </div>
            )}
          </>
        )}
      </ConsoleLayout>
    </MotionConfig>
  );
}

function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-[92px] rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Skeleton className="h-[340px] rounded-2xl lg:col-span-8" />
        <Skeleton className="h-[340px] rounded-2xl lg:col-span-4" />
      </div>
    </div>
  );
}
