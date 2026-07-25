"use client";

import { ClockIcon, CheckCircle2Icon, FlagIcon } from "lucide-react";
import { Icon } from "@/features/auth/components/icon";
import { cn } from "@/lib/utils";

export type PaymentCounts = {
  payment_submitted: number;
  paid: number;
  active: number;
  completed: number;
};

const METRICS: {
  key: keyof PaymentCounts;
  label: string;
  icon: React.ReactNode;
  accentClass: string;
}[] = [
  {
    key: "payment_submitted",
    label: "Awaiting",
    icon: <ClockIcon size={15} />,
    accentClass: "text-(--brc-accent-deep)",
  },
  {
    key: "paid",
    label: "Confirmed",
    icon: <CheckCircle2Icon size={15} />,
    accentClass: "text-(--brc-success)",
  },
  {
    key: "active",
    label: "Active",
    icon: <Icon name="car" size={15} stroke="currentColor" />,
    accentClass: "text-(--brc-primary)",
  },
  {
    key: "completed",
    label: "Completed",
    icon: <FlagIcon size={15} />,
    accentClass: "text-(--brc-text-muted)",
  },
];

/**
 * The flat, single-row KPI band above the payment queue. Mirrors the
 * `.dc.html` prototype's "summary band": one bordered container split into
 * four columns with hairline dividers, rather than four separate cards.
 */
export function PaymentSummaryBand({ counts }: { counts: PaymentCounts }) {
  return (
    <div className="flex flex-wrap overflow-hidden rounded-xl border border-(--brc-border) bg-(--brc-bg)">
      {METRICS.map((m, i) => {
        const value = counts[m.key];
        const emphasize = m.key === "payment_submitted" && value > 0;
        return (
          <div
            key={m.key}
            className={cn(
              "flex min-w-[150px] flex-1 flex-col gap-1.5 px-5 py-4",
              i > 0 && "border-l border-(--brc-border)",
              emphasize && "bg-(--brc-warning-bg)",
            )}
          >
            <div className={cn("flex items-center gap-2", m.accentClass)}>
              {m.icon}
              <span className="text-[11.5px] font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                {m.label}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[27px] font-extrabold leading-none tracking-tight tabular-nums text-(--brc-text) [font-family:var(--brc-font-display)]">
                {value}
              </span>
              {emphasize && (
                <span className="text-[11.5px] font-bold text-(--brc-accent-deep) [font-family:var(--brc-font-ui)]">
                  needs action
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
