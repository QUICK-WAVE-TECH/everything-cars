"use client";

import { useMemo, useState } from "react";
import {
  BanknoteIcon,
  CarIcon,
  DownloadIcon,
  PercentIcon,
  TagIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { toast } from "sonner";

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
  TargetGauge,
  TopModelsChart,
  VolumeRevenueChart,
  naira,
} from "./sales-report-charts";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import { AnimatedNumber } from "@/shared/motion/animated-number";
import { SegmentedTabs } from "@/shared/motion/segmented-tabs";
import { Parallax } from "@/shared/motion/parallax";
import { StaggerGroup, StaggerItem } from "@/shared/motion/stagger";
import { StickyToolbar } from "@/shared/motion/sticky-toolbar";
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

// ── tiny sparkline ──
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <div className="h-[30px] w-[82px]" />;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const w = 82;
  const h = 30;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={w} height={h} className="shrink-0 overflow-visible" aria-hidden>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="rounded-full bg-(--brc-bg-muted) px-2 py-0.5 text-[11.5px] font-bold text-(--brc-text-muted)">
        No prior data
      </span>
    );
  }
  const up = delta >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-extrabold tabular-nums ${
        up
          ? "bg-(--brc-success-bg) text-(--brc-success)"
          : "bg-(--brc-danger-bg) text-(--brc-danger)"
      }`}
    >
      {up ? <TrendingUpIcon size={12} /> : <TrendingDownIcon size={12} />}
      {Math.abs(delta)}%
    </span>
  );
}

function KpiCard({
  label,
  value,
  format,
  delta,
  spark,
  sparkColor,
  icon,
  iconBg,
  iconFg,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  delta: number | null;
  spark: number[];
  sparkColor: string;
  icon: React.ReactNode;
  iconBg: string;
  iconFg: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3.5 rounded-2xl border border-(--brc-border) bg-white p-[18px] shadow-(--brc-shadow-xs) transition-shadow duration-200 hover:shadow-(--brc-shadow-md) motion-reduce:transition-none [font-family:var(--brc-font-ui)]">
      <div className="flex items-start justify-between gap-2.5">
        <span className="text-[11.5px] font-bold uppercase leading-snug tracking-wider text-(--brc-text-muted)">
          {label}
        </span>
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-[9px]"
          style={{ background: iconBg, color: iconFg }}
        >
          {icon}
        </span>
      </div>
      <AnimatedNumber
        value={value}
        format={format}
        className="[font-family:var(--brc-font-display)] text-[29px] font-extrabold leading-none tracking-tight text-(--brc-text)"
      />
      <div className="flex items-end justify-between gap-2.5">
        <DeltaBadge delta={delta} />
        <Sparkline values={spark} color={sparkColor} />
      </div>
    </div>
  );
}

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
          <p className="m-0 text-[12.5px] font-semibold text-(--brc-text-muted)">
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </motion.section>
  );
}

function toCsv(data: SalesReport) {
  const rows = [
    ["Metric", "Value"],
    ["Total revenue", String(data.kpis.total_revenue)],
    ["Units sold", String(data.kpis.units_sold)],
    ["Avg sale price", String(data.kpis.avg_sale_price)],
    ["Conversion %", String(data.kpis.conversion_rate)],
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

  const { data, isLoading, isError, refetch } = useSalesReport({
    range,
    type,
    branch: branch || undefined,
  });

  const dirty = range !== "3m" || type !== "all" || branch !== "";
  const isEmpty =
    !!data && data.kpis.total_revenue === 0 && data.kpis.units_sold === 0;

  const sparks = useMemo(() => {
    if (!data) return { rev: [], units: [], price: [] };
    return {
      rev: data.revenue_series.map((d) => d.purchases + d.rentals),
      units: data.by_period.map((p) => p.units),
      price: data.avg_price_series.map((p) => p.avg_sale_price),
    };
  }, [data]);

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

  return (
    <MotionConfig reducedMotion="user">
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-9 sm:px-8 lg:px-14 [font-family:var(--brc-font-ui)]">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Parallax distance={-8}>
            <span className="block text-xs font-bold uppercase tracking-[0.14em] text-(--brc-text-muted)">
              Admin · Reports
            </span>
          </Parallax>
          <Parallax distance={-4}>
            <h1 className="m-0 [font-family:var(--brc-font-display)] text-[40px] font-extrabold leading-tight tracking-tight text-(--brc-text)">
              Sales performance
            </h1>
          </Parallax>
          <Parallax distance={-9}>
            <p className="m-0 max-w-[62ch] text-sm leading-relaxed text-(--brc-text-secondary) text-pretty">
              Completed purchase and rental transactions across every branch.
              {data ? ` ${data.range.label}.` : ""}
            </p>
          </Parallax>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!data}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-(--brc-border) bg-white px-4 text-[13.5px] font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-muted) disabled:opacity-50"
        >
          <DownloadIcon size={15} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <StickyToolbar className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-(--brc-border) bg-white px-4 py-3.5 shadow-(--brc-shadow-xs)">
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as SalesRange)}
          className="h-[38px] rounded-lg border border-(--brc-border) bg-white px-3 text-[13.5px] font-bold text-(--brc-text) outline-none"
        >
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <SegmentedTabs
          options={TYPES}
          value={type}
          onChange={setType}
          groupId="report-type"
        />

        <select
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="h-[38px] max-w-[240px] rounded-lg border border-(--brc-border) bg-white px-3 text-[13.5px] font-bold text-(--brc-text) outline-none"
        >
          <option value="">All branches</option>
          {data?.branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>

        <div className="flex-1" />
        {dirty && (
          <button
            type="button"
            onClick={() => {
              setRange("3m");
              setType("all");
              setBranch("");
            }}
            className="text-[13px] font-bold text-(--brc-primary) underline underline-offset-[3px]"
          >
            Reset filters
          </button>
        )}
      </StickyToolbar>

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
          {/* KPI row */}
          <StaggerGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StaggerItem>
            <KpiCard
              label="Total revenue"
              value={data.kpis.total_revenue}
              format={naira}
              delta={data.kpis.deltas.total_revenue}
              spark={sparks.rev}
              sparkColor="var(--chart-1)"
              icon={<BanknoteIcon size={16} />}
              iconBg="var(--brc-primary-tint)"
              iconFg="var(--brc-primary)"
            />
            </StaggerItem>
            <StaggerItem>
            <KpiCard
              label="Units sold"
              value={data.kpis.units_sold}
              format={(n) => Math.round(n).toLocaleString("en-NG")}
              delta={data.kpis.deltas.units_sold}
              spark={sparks.units}
              sparkColor="var(--chart-2)"
              icon={<CarIcon size={16} />}
              iconBg="var(--brc-accent-bg)"
              iconFg="var(--brc-accent)"
            />
            </StaggerItem>
            <StaggerItem>
            <KpiCard
              label="Avg sale price"
              value={data.kpis.avg_sale_price}
              format={naira}
              delta={data.kpis.deltas.avg_sale_price}
              spark={sparks.price}
              sparkColor="var(--chart-3)"
              icon={<TagIcon size={16} />}
              iconBg="var(--brc-primary-tint)"
              iconFg="var(--brc-primary)"
            />
            </StaggerItem>
            <StaggerItem>
            <KpiCard
              label="Conversion"
              value={data.kpis.conversion_rate}
              format={(n) => `${n.toFixed(n % 1 === 0 ? 0 : 1)}%`}
              delta={data.kpis.deltas.conversion_rate}
              spark={sparks.units}
              sparkColor="var(--chart-4)"
              icon={<PercentIcon size={16} />}
              iconBg="var(--brc-success-bg)"
              iconFg="var(--brc-success)"
            />
            </StaggerItem>
          </StaggerGroup>

          {isEmpty ? (
            <div className="rounded-2xl border border-dashed border-(--brc-border) bg-white p-16 text-center text-sm text-(--brc-text-muted)">
              No completed sales in this period. Adjust the filters to see more.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-12">
              <ChartCard
                title="Revenue over time"
                subtitle="Completed purchases and rentals, naira"
                span="lg:col-span-12"
              >
                <RevenueOverTimeChart data={data.revenue_series} />
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
                title="Top models by revenue"
                span="lg:col-span-6"
              >
                <TopModelsChart data={data.top_models} />
              </ChartCard>
              <ChartCard
                title="Average price trend"
                subtitle="Avg sale price and rent per day"
                span="lg:col-span-6"
              >
                <AvgPriceChart data={data.avg_price_series} />
              </ChartCard>
              <ChartCard
                title="Branch performance"
                subtitle="Revenue and units by branch"
                span="lg:col-span-8"
              >
                <BranchPerformanceChart data={data.by_branch} />
              </ChartCard>
              <ChartCard
                title="Revenue against target"
                subtitle="Versus the previous period"
                span="lg:col-span-4"
              >
                <TargetGauge target={data.target} />
              </ChartCard>
            </div>
          )}
        </>
      )}
    </div>
    </MotionConfig>
  );
}

function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[132px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[340px] rounded-2xl" />
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-12">
        <Skeleton className="h-[340px] rounded-2xl lg:col-span-7" />
        <Skeleton className="h-[340px] rounded-2xl lg:col-span-5" />
      </div>
    </div>
  );
}
