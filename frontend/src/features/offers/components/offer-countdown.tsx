"use client";

import { useEffect, useState } from "react";
import { ClockIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Urgency = "normal" | "soon" | "critical" | "expired";

function describe(expiresAt: string, nowMs: number): { text: string; urgency: Urgency } {
  const diffMs = new Date(expiresAt).getTime() - nowMs;
  if (Number.isNaN(diffMs)) return { text: "", urgency: "normal" };
  if (diffMs <= 0) return { text: "Expired", urgency: "expired" };

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let urgency: Urgency = "normal";
  if (diffMs < 60 * 60 * 1000) urgency = "critical";
  else if (diffMs < 6 * 60 * 60 * 1000) urgency = "soon";

  const text =
    hours > 0 ? `Expires in ${hours}h ${minutes}m` : `Expires in ${minutes}m`;
  return { text, urgency };
}

const URGENCY_CLASS: Record<Urgency, string> = {
  normal: "text-(--brc-text-muted)",
  soon: "text-(--brc-warning-ink,#B38601)",
  critical: "text-(--brc-danger)",
  expired: "text-(--brc-text-muted)",
};

/**
 * The 48-hour offer countdown. Ticks once a minute (a per-second timer would be
 * noisy and battery-hostile), turns amber under 6h and red under 1h, and reads
 * "Expired" once the window closes. Tabular numerals so it never reflows.
 *
 * `isExpired` comes from the server (its clock is the source of truth); we only
 * animate the display between minute ticks.
 */
export function OfferCountdown({
  expiresAt,
  isExpired,
  className,
}: {
  expiresAt: string;
  isExpired?: boolean;
  className?: string;
}) {
  // Start unset so server and client agree on first paint; the real value fills
  // in just after mount. The tick lives in a callback (not the effect body) to
  // satisfy the repo's no-setState-in-effect rule.
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    const initial = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 60_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(id);
    };
  }, []);

  const resolved =
    isExpired || nowMs === null
      ? { text: isExpired ? "Expired" : "", urgency: "expired" as Urgency }
      : describe(expiresAt, nowMs);

  if (!resolved.text) return null;

  return (
    <span
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold tabular-nums [font-family:var(--brc-font-ui)]",
        URGENCY_CLASS[resolved.urgency],
        className,
      )}
    >
      <ClockIcon className="size-3.5" aria-hidden="true" />
      {resolved.text}
    </span>
  );
}
