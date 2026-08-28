"use client";

import { motion } from "motion/react";

/** A segmented control whose active "pill" slides between options via a shared
 * layoutId. Reduced-motion is honoured by the surrounding MotionConfig. */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  groupId,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Unique id so multiple segmented controls on a page don't share a pill. */
  groupId: string;
}) {
  return (
    <div className="flex gap-0.5 rounded-lg bg-(--brc-bg-muted) p-[3px]">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="relative h-8 rounded-md px-3.5 text-[13px] font-bold transition-colors"
          >
            {active && (
              <motion.span
                layoutId={`seg-${groupId}`}
                className="absolute inset-0 rounded-md bg-white shadow-[var(--brc-shadow-xs)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span
              className={`relative z-10 ${
                active ? "text-(--brc-text)" : "text-(--brc-text-muted)"
              }`}
            >
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
