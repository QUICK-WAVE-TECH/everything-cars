"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/features/auth/components/icon";
import type { IconName } from "@/features/auth/components/icon";

export type StatCardProps = {
  label: string;
  value: string;
  unit?: string;
  icon: IconName;
  color: string;
};

function AnimatedValue({ value }: { value: string }) {
  const target = useMemo(() => {
    const digits = value.replace(/[^\d]/g, "");
    return digits ? Number(digits) : null;
  }, [value]);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (target == null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = window.setTimeout(() => setDisplay(target), 0);
      return () => window.clearTimeout(t);
    }
    let frame = 0;
    const start = performance.now();
    const duration = 850;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  if (target == null) return value;
  return display.toLocaleString("en-NG");
}

export function StatCard({ label, value, unit, icon, color }: StatCardProps) {
  return (
    <div className="brc-dashboard-card relative overflow-hidden rounded-2xl border border-(--brc-border) bg-white p-5 shadow-[var(--brc-shadow-xs)]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <span
          className="flex size-11 items-center justify-center rounded-full text-white shadow-[0_10px_22px_rgba(18,18,18,0.1)]"
          style={{ background: color }}
        >
          <Icon name={icon} size={21} stroke="#fff" />
        </span>
      </div>
      <p className="mb-2 text-sm font-medium text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black text-(--brc-text) [font-family:var(--brc-font-display)]">
          <AnimatedValue value={value} />
        </span>
        {unit && (
          <span className="text-sm font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
