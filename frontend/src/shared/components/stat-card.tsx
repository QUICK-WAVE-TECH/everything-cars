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

function getIconTone(color: string) {
  if (color === "var(--brc-warning)") {
    return {
      bg: "var(--brc-warning-bg)",
      border: "color-mix(in srgb, var(--brc-warning) 42%, white)",
      fg: "#9a7400",
    };
  }

  return {
    bg: `color-mix(in srgb, ${color} 14%, white)`,
    border: `color-mix(in srgb, ${color} 34%, white)`,
    fg: color,
  };
}

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
  const iconTone = getIconTone(color);

  return (
    <div className="brc-dashboard-card relative overflow-hidden rounded-2xl border border-(--brc-border) bg-white p-5 shadow-[var(--brc-shadow-xs)]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <span
          className="brc-dashboard-icon-bubble flex size-11 items-center justify-center rounded-full border shadow-[0_10px_22px_rgba(18,18,18,0.08)]"
          style={{
            background: iconTone.bg,
            borderColor: iconTone.border,
            color: iconTone.fg,
          }}
        >
          <Icon name={icon} size={21} stroke={iconTone.fg} />
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
