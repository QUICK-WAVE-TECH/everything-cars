"use client";

import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { AnimatedNumber } from "@/shared/motion/animated-number";
import { StaggerGroup, StaggerItem } from "@/shared/motion/stagger";

/** The bordered KPI strip. Its `Kpi` children count up and stagger in. */
export function KpiStrip({ children }: { children: React.ReactNode }) {
  return (
    <StaggerGroup className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-(--brc-border) bg-(--brc-border) sm:grid-cols-3 lg:grid-cols-5">
      {children}
    </StaggerGroup>
  );
}

function DeltaRow({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="text-[11.5px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
        No prior data
      </span>
    );
  }
  const up = delta >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11.5px] font-bold [font-family:var(--brc-font-ui)] ${
        up ? "text-(--brc-success)" : "text-(--brc-danger)"
      }`}
    >
      {up ? <TrendingUpIcon size={12} /> : <TrendingDownIcon size={12} />}
      {up ? "+" : ""}
      {delta}%
      <span className="font-semibold text-(--brc-text-muted)">vs prior period</span>
    </span>
  );
}

/** One KPI tile. Counts up to `value`; shows the delta row only while `compare`
 * is on. `valueColor` tints the number (matching the mockup accents). */
export function Kpi({
  label,
  value,
  format,
  delta,
  compare = false,
  valueColor = "var(--brc-text)",
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  delta?: number | null;
  compare?: boolean;
  valueColor?: string;
}) {
  return (
    <StaggerItem className="bg-white">
      <div className="flex flex-col gap-1.5 px-4 py-3.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          {label}
        </span>
        <span style={{ color: valueColor }}>
          <AnimatedNumber
            value={value}
            format={format}
            className="text-[clamp(22px,2.4vw,28px)] font-black leading-none tabular-nums [font-family:var(--brc-font-display)]"
          />
        </span>
        {compare && <DeltaRow delta={delta ?? null} />}
      </div>
    </StaggerItem>
  );
}
