import type { CarListItem } from "@/features/listings/api/types";

export type AdminApprovalStatus =
  | "draft"
  | "listing_approved"
  | "inspection_pending"
  | "inspection_in_progress"
  | "needs_clearance"
  | "inspection_no_show"
  | "inspection_rejected"
  | "needs_changes"
  | "published"
  | "suspended";

export const ADMIN_APPROVAL_GROUPS: {
  label: string;
  statuses: AdminApprovalStatus[];
}[] = [
  { label: "Review", statuses: ["draft", "needs_changes"] },
  {
    label: "Inspection",
    statuses: [
      "listing_approved",
      "inspection_pending",
      "inspection_in_progress",
      "needs_clearance",
      "inspection_no_show",
      "inspection_rejected",
    ],
  },
  { label: "Live", statuses: ["published", "suspended"] },
];

export const ADMIN_APPROVAL_LABELS: Record<AdminApprovalStatus, string> = {
  draft: "Pending Review",
  listing_approved: "Approved for Booking",
  inspection_pending: "Awaiting Inspection",
  inspection_in_progress: "In Progress",
  needs_clearance: "Needs Clearance",
  inspection_no_show: "No Show",
  inspection_rejected: "Rejected",
  needs_changes: "Needs Changes",
  published: "Published",
  suspended: "Suspended",
};

const STATUS_STYLES: Record<
  string,
  { background: string; color: string; label: string }
> = {
  draft: {
    background: "var(--brc-bg-muted)",
    color: "var(--brc-text-muted)",
    label: "Pending Review",
  },
  listing_approved: {
    background: "var(--brc-success-bg)",
    color: "var(--brc-success)",
    label: "Approved for Booking",
  },
  inspection_pending: {
    background: "var(--brc-warning-bg)",
    color: "#8a6800",
    label: "Awaiting Inspection",
  },
  inspection_in_progress: {
    background: "#e0e7ff",
    color: "#4338ca",
    label: "In Progress",
  },
  needs_clearance: {
    background: "#fff0e6",
    color: "#b34700",
    label: "Needs Clearance",
  },
  inspection_rejected: {
    background: "var(--brc-danger-bg)",
    color: "var(--brc-danger)",
    label: "Inspection Rejected",
  },
  inspection_no_show: {
    background: "#fff0e6",
    color: "#b34700",
    label: "No Show",
  },
  needs_changes: {
    background: "var(--brc-accent-bg)",
    color: "var(--brc-accent)",
    label: "Needs Changes",
  },
  published: {
    background: "var(--brc-success-bg)",
    color: "var(--brc-success)",
    label: "Published",
  },
  suspended: {
    background: "var(--brc-danger-bg)",
    color: "var(--brc-danger)",
    label: "Suspended",
  },
  archived: {
    background: "var(--brc-bg-muted)",
    color: "var(--brc-text-muted)",
    label: "Archived",
  },
  paused: {
    background: "var(--brc-accent-bg)",
    color: "var(--brc-accent)",
    label: "Paused",
  },
};

export function AdminStatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft!;

  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold whitespace-nowrap [font-family:var(--brc-font-ui)]"
      style={{ background: style.background, color: style.color }}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: style.color }}
      />
      {style.label}
    </span>
  );
}

export function ListingTypeChip({ type }: { type: string }) {
  const isBuy = type === "buy";

  return (
    <span
      className="inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase [font-family:var(--brc-font-ui)]"
      style={{
        background: isBuy
          ? "var(--brc-accent-bg)"
          : "var(--brc-primary-tint)",
        color: isBuy ? "var(--brc-accent)" : "var(--brc-primary)",
      }}
    >
      {isBuy ? "Buy" : "Rent"}
    </span>
  );
}

export function formatAdminDate(value: string) {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      )
    : new Date(value);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatAdminTime(time: string) {
  const [hours, minutes] = time.split(":");
  const hour = Number(hours);
  const period = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minutes} ${period}`;
}

export function formatAdminPrice(item: CarListItem) {
  const symbol =
    item.currency === "NGN"
      ? "₦"
      : item.currency === "USD"
        ? "$"
        : item.currency;
  const prices: string[] = [];

  if (item.rent_price_per_day) {
    prices.push(
      `${symbol}${Number(item.rent_price_per_day).toLocaleString("en-NG")}/day`,
    );
  }
  if (item.sale_price) {
    prices.push(
      `${symbol}${Number(item.sale_price).toLocaleString("en-NG")}`,
    );
  }

  return prices.join(" / ") || "-";
}
