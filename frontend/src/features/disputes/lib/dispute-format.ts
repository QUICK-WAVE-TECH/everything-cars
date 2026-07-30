import { formatOfferAmount } from "@/features/offers/lib/offer-format";
import { formatRelativeDate } from "@/shared/utils";

import type { DisputeDeal, DisputeStatus, DisputeTab } from "../api";

/** Pill styling per resolution state — token classes, both light & dark aware. */
export const PILL: Record<
  DisputeStatus,
  { label: string; className: string; dot: string }
> = {
  open: {
    label: "Open dispute",
    className: "bg-(--brc-warning-bg) text-(--brc-accent)",
    dot: "bg-(--brc-warning)",
  },
  upheld: {
    label: "Upheld",
    className: "bg-(--brc-danger-bg) text-(--brc-danger)",
    dot: "bg-(--brc-danger)",
  },
  dismissed: {
    label: "Dismissed",
    className: "bg-(--brc-success-bg) text-(--brc-success)",
    dot: "bg-(--brc-success)",
  },
};

export const TABS: { key: DisputeTab; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "upheld", label: "Upheld" },
  { key: "dismissed", label: "Dismissed" },
  { key: "all", label: "All" },
];

export function money(deal: Pick<DisputeDeal, "amount" | "currency">): string {
  return formatOfferAmount(deal.amount, deal.currency);
}

/** "28 Jul 2026, 14:32" — absolute local time for tooltips and the timeline. */
export function absDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relDate(iso: string | null): string {
  return iso ? formatRelativeDate(iso) : "—";
}

export type TimelineEvent = {
  label: string;
  dot: string;
  abs: string;
  rel: string;
};

/** Chronological case history: reached → completed → disputed → resolved. */
export function buildTimeline(deal: DisputeDeal): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      label: "Deal reached",
      dot: "bg-(--brc-border-strong)",
      abs: absDateTime(deal.created_at),
      rel: relDate(deal.created_at),
    },
  ];
  if (deal.completed_at) {
    events.push({
      label: "Marked completed by seller",
      dot: "bg-(--brc-border-strong)",
      abs: absDateTime(deal.completed_at),
      rel: relDate(deal.completed_at),
    });
  }
  events.push({
    label: "Disputed by buyer",
    dot: "bg-(--brc-warning)",
    abs: absDateTime(deal.disputed_at),
    rel: relDate(deal.disputed_at),
  });
  if (deal.resolved_at) {
    const upheld = deal.dispute_status === "upheld";
    events.push({
      label: `${upheld ? "Upheld" : "Dismissed"}${
        deal.resolved_by_name ? ` by ${deal.resolved_by_name}` : ""
      }`,
      dot: upheld ? "bg-(--brc-danger)" : "bg-(--brc-success)",
      abs: absDateTime(deal.resolved_at),
      rel: relDate(deal.resolved_at),
    });
  }
  return events;
}
