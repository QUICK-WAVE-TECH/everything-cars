"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRightIcon, CalendarCheckIcon, RotateCcwIcon } from "lucide-react";
import { Icon } from "@/features/auth/components/icon";
import { Skeleton } from "@/components/ui/skeleton";
import type { IconName } from "@/features/auth/components/icon";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "@/shared/components";
import { useDeleteCar, useMyCarsList } from "@/features/listings/api";
import type { CarListItem } from "@/features/listings/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookingModal } from "@/features/inspections/components/booking-modal";
import { useMyBookings } from "@/features/inspections/api/inspections-api";
import type { InspectionBooking } from "@/features/inspections/api/types";

// ---------- Types ----------
type ListingStatus =
  | "draft"
  | "listing_approved"
  | "needs_changes"
  | "needs_clearance"
  | "published"
  | "paused"
  | "suspended"
  | "archived"
  | "inspection_pending"
  | "inspection_in_progress"
  | "inspection_rejected"
  | "inspection_no_show";

type Listing = {
  id: string;
  car: string;
  type: string;
  date: string;
  price: string;
  status: ListingStatus;
  primaryImage: string | null;
};

function formatPrice(item: CarListItem): string {
  const symbol = item.currency === "NGN" ? "₦" : item.currency === "USD" ? "$" : item.currency;
  if (item.listing_type === "rent" && item.rent_price_per_day) {
    return `${symbol}${Number(item.rent_price_per_day).toLocaleString("en-NG")}/day`;
  }
  if (item.listing_type === "buy" && item.sale_price) {
    return `${symbol}${Number(item.sale_price).toLocaleString("en-NG")}`;
  }
  if (item.listing_type === "both") {
    const parts: string[] = [];
    if (item.rent_price_per_day) parts.push(`${symbol}${Number(item.rent_price_per_day).toLocaleString("en-NG")}/day`);
    if (item.sale_price) parts.push(`${symbol}${Number(item.sale_price).toLocaleString("en-NG")}`);
    return parts.join(" · ") || "—";
  }
  return "—";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function toListing(item: CarListItem): Listing {
  return {
    id: item.id,
    car: `${item.brand} ${item.model}`,
    type: item.listing_type.charAt(0).toUpperCase() + item.listing_type.slice(1),
    date: formatDate(item.created_at),
    price: formatPrice(item),
    status: item.status as ListingStatus,
    primaryImage: item.primary_image,
  };
}

const STATS: { icon: IconName; label: string; key: string; color: string; iconColor?: string; tint: string; wash: string }[] = [
  {
    icon: "car",
    label: "Total Listings",
    key: "total",
    color: "var(--brc-primary)",
    tint: "var(--brc-primary-tint)",
    wash: "linear-gradient(135deg, rgba(0,0,139,0.1), rgba(255,255,255,0.82))",
  },
  {
    icon: "check",
    label: "Published",
    key: "published",
    color: "var(--brc-success)",
    tint: "var(--brc-success-bg)",
    wash: "linear-gradient(135deg, rgba(22,163,74,0.1), rgba(255,255,255,0.84))",
  },
  {
    icon: "clock",
    label: "Draft",
    key: "draft",
    color: "var(--brc-warning)",
    iconColor: "#9a7400",
    tint: "var(--brc-warning-bg)",
    wash: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(255,255,255,0.84))",
  },
  {
    icon: "coins",
    label: "Paused",
    key: "paused",
    color: "var(--brc-accent)",
    tint: "var(--brc-accent-bg)",
    wash: "linear-gradient(135deg, rgba(197,89,30,0.12), rgba(255,255,255,0.84))",
  },
];

const PER_PAGE = 10;
const LISTING_TABLE_COLUMNS =
  "minmax(190px,1.5fr) 76px minmax(100px,0.7fr) minmax(118px,0.85fr) minmax(148px,1fr) minmax(118px,0.8fr) 48px";

// ---------- Status badge ----------
const STATUS_MAP: Record<ListingStatus, { bg: string; fg: string; dot: string; label: string }> = {
  draft: { bg: "var(--brc-bg-muted)", fg: "var(--brc-text-muted)", dot: "var(--brc-text-muted)", label: "Draft" },
  listing_approved: { bg: "var(--brc-success-bg)", fg: "var(--brc-success)", dot: "var(--brc-success)", label: "Approved" },
  needs_changes: { bg: "var(--brc-accent-bg)", fg: "var(--brc-accent)", dot: "var(--brc-accent)", label: "Needs Changes" },
  needs_clearance: { bg: "var(--brc-warning-bg)", fg: "#9a7400", dot: "var(--brc-warning)", label: "Needs Clearance" },
  published: { bg: "var(--brc-success-bg)", fg: "var(--brc-success)", dot: "var(--brc-success)", label: "Published" },
  paused: { bg: "var(--brc-accent-bg)", fg: "var(--brc-accent)", dot: "var(--brc-accent)", label: "Paused" },
  suspended: { bg: "var(--brc-danger-bg)", fg: "var(--brc-danger)", dot: "var(--brc-danger)", label: "Suspended" },
  archived: { bg: "var(--brc-bg-muted)", fg: "var(--brc-text-secondary)", dot: "var(--brc-text-secondary)", label: "Archived" },
  inspection_pending: { bg: "var(--brc-warning-bg)", fg: "#9a7400", dot: "var(--brc-warning)", label: "Inspection Booked" },
  inspection_in_progress: { bg: "var(--brc-accent-bg)", fg: "var(--brc-accent)", dot: "var(--brc-accent)", label: "In Progress" },
  inspection_rejected: { bg: "var(--brc-danger-bg)", fg: "var(--brc-danger)", dot: "var(--brc-danger)", label: "Inspection Failed" },
  inspection_no_show: { bg: "#fff3e0", fg: "#c25800", dot: "#e65100", label: "No Show" },
};

const UNKNOWN_STATUS_STYLE = {
  bg: "var(--brc-bg-muted)",
  fg: "var(--brc-text-muted)",
  dot: "var(--brc-text-muted)",
  label: "Unknown",
} as const;

function StatusBadge({ status }: { status: ListingStatus }) {
  // Statuses come from the API — never crash the whole page on one the
  // frontend doesn't know yet (e.g. mid-deploy or legacy data).
  const s = STATUS_MAP[status] ?? UNKNOWN_STATUS_STYLE;
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold [font-family:var(--brc-font-ui)]"
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="size-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

// ---------- Premium stat card ----------
function StatCard({ stat, value }: { stat: (typeof STATS)[number]; value: string }) {
  const iconColor = stat.iconColor ?? stat.color;

  return (
    <div
      className="group relative min-w-0 overflow-hidden rounded-lg border border-white/80 bg-white p-4 shadow-[0_14px_36px_rgba(18,18,18,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--stat-color)_34%,#fff)] hover:shadow-[0_24px_58px_rgba(18,18,18,0.12)] sm:p-5"
      style={{
        "--stat-color": stat.color,
        background: stat.wash,
      } as CSSProperties}
    >
      <div
        className="absolute inset-x-0 top-0 h-1 origin-left scale-x-75 transition-transform duration-300 group-hover:scale-x-100"
        style={{ background: stat.color }}
      />
      <div className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full border border-white/70 bg-white/45 opacity-70 transition duration-300 group-hover:scale-110 group-hover:opacity-100" />
      <div className="relative flex min-w-0 items-center justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-2">
          <span className="truncate text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            {stat.label}
          </span>
          <span className="text-[28px] font-black leading-none text-(--brc-text) [font-family:var(--brc-font-ui)] sm:text-[32px]">
            {value}
          </span>
        </span>
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-lg border shadow-[0_14px_28px_rgba(18,18,18,0.08)] transition duration-300 group-hover:-rotate-3 group-hover:scale-110"
          style={{
            background: stat.tint,
            borderColor: `color-mix(in srgb, ${stat.color} 34%, white)`,
          }}
        >
          <Icon name={stat.icon} size={19} stroke={iconColor} strokeWidth={2.3} />
        </span>
      </div>
      <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-white/70">
        <div
          className="h-full w-[62%] rounded-full transition-all duration-500 group-hover:w-[88%]"
          style={{ background: stat.color }}
        />
      </div>
    </div>
  );
}

// ---------- Filter panel ----------
function FilterSelect({ label, value, options, onPick }: {
  label: string;
  value: string;
  options: string[];
  onPick: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{label}</span>
        {value && (
          <button type="button" onClick={() => onPick("")} className="cursor-pointer border-none bg-transparent p-0 text-xs text-(--brc-primary) [font-family:var(--brc-font-ui)]">
            Clear
          </button>
        )}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border-none bg-(--brc-bg-subtle) px-3 text-xs [font-family:var(--brc-font-ui)]"
          style={{ color: value ? "var(--brc-text)" : "var(--brc-text-muted)" }}
        >
          {value || "Select"}
          <Icon name="chevdown" size={14} stroke="var(--brc-text-muted)" />
        </button>
        {open && (
          <div className="absolute left-0 right-0 top-11 z-30 overflow-hidden rounded-lg border border-(--brc-border) bg-white shadow-md">
            {options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => { onPick(o); setOpen(false); }}
                className="w-full cursor-pointer border-none bg-white px-3 py-2.5 text-left text-xs text-(--brc-text) hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
              >
                {o}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterPanel({ filters, setFilters, onApply, onReset, onClose }: {
  filters: { type: string; status: string };
  setFilters: (f: { type: string; status: string }) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 top-12 z-40 w-[min(calc(100vw-2rem),15rem)] overflow-visible rounded-lg border border-(--brc-border) bg-white shadow-md">
      <div className="flex items-center justify-between rounded-t-lg bg-(--brc-bg-subtle) px-4 py-3">
        <span className="text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">Filter</span>
        <button type="button" onClick={onClose} className="flex cursor-pointer border-none bg-transparent p-0">
          <Icon name="plus" size={16} stroke="var(--brc-text)" strokeWidth={2} />
        </button>
      </div>
      <div className="flex flex-col gap-4 p-4">
        <FilterSelect label="Type" value={filters.type} options={["Rent", "Buy", "Both"]} onPick={(v) => setFilters({ ...filters, type: v })} />
        <FilterSelect label="Status" value={filters.status} options={["Draft", "Listing Approved", "Needs Changes", "Needs Clearance", "Inspection Pending", "Inspection In Progress", "Published", "Paused", "Suspended", "Archived"]} onPick={(v) => setFilters({ ...filters, status: v })} />
        <div className="my-1 h-px bg-(--brc-border)" />
        <div className="flex gap-3">
          <button type="button" onClick={onReset} className="h-10 flex-1 cursor-pointer rounded-lg border-none bg-(--brc-bg-muted) text-sm font-medium text-(--brc-text) [font-family:var(--brc-font-ui)]">
            Reset
          </button>
          <button type="button" onClick={onApply} className="h-10 flex-1 cursor-pointer rounded-lg border-none bg-(--brc-primary) text-sm font-medium text-white [font-family:var(--brc-font-ui)]">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function ListingDetail({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-(--brc-bg-subtle) px-3 py-2.5">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
        {label}
      </span>
      <span className={cn("mt-1 block truncate text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]", valueClassName)}>
        {value}
      </span>
    </div>
  );
}

function MobileListingCard({
  listing,
  booking,
  onClose,
  onBook,
  isClosing,
}: {
  listing: Listing;
  booking: InspectionBooking | undefined;
  onClose: (listingId: string) => void;
  onBook: (carId: string) => void;
  isClosing: boolean;
}) {
  return (
    <article className="group rounded-lg border border-white/80 bg-white p-3 shadow-[0_16px_38px_rgba(18,18,18,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_58px_rgba(18,18,18,0.13)]">
      <div className="relative mb-4 h-36 overflow-hidden rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle)">
        {listing.primaryImage ? (
          <Image
            src={listing.primaryImage}
            alt={listing.car}
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Icon name="car" size={34} stroke="var(--brc-text-muted)" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <StatusBadge status={listing.status} />
        </div>
      </div>
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-(--brc-primary-tint) shadow-[0_10px_22px_rgba(0,0,139,0.08)] transition duration-300 group-hover:scale-105">
          <Icon name="car" size={22} stroke="var(--brc-text-muted)" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 truncate text-base font-black text-(--brc-text) transition-colors duration-300 group-hover:text-(--brc-primary) [font-family:var(--brc-font-ui)]">
            {listing.car}
          </h2>
          <p className="mt-1 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            {listing.date}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <ListingDetail label="Type" value={listing.type} />
        <ListingDetail label="Price" value={listing.price} />
      </div>

      <div className="mt-3">
        <AppointmentCell listing={listing} booking={booking} compact />
      </div>

      {/* Inspection action row (when applicable) */}
      {(listing.status === "listing_approved" ||
        listing.status === "inspection_no_show" ||
        listing.status === "needs_changes") && (
        <div className="mt-3">
          <ActionCell listing={listing} onBook={onBook} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-(--brc-bg-subtle) p-1.5">
        <Link
          href={`/owner/my-cars/${listing.id}`}
          className="group inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-(--brc-primary) px-3 text-[13px] font-extrabold text-white no-underline shadow-[0_10px_20px_rgba(0,0,139,0.16)] transition duration-200 hover:-translate-y-0.5 hover:bg-(--brc-primary-hover) hover:shadow-[0_14px_24px_rgba(0,0,139,0.2)] active:translate-y-0 [font-family:var(--brc-font-ui)]"
        >
          <span className="truncate">View Details</span>
          <span className="flex transition-transform duration-200 group-hover:translate-x-0.5">
            <Icon name="arrow" size={15} stroke="currentColor" />
          </span>
        </Link>
        <button
          type="button"
          aria-label={`Close listing for ${listing.car}`}
          disabled={isClosing}
          onClick={() => onClose(listing.id)}
          className={cn(
            "group inline-flex h-10 min-w-0 cursor-pointer items-center justify-center gap-1 rounded-xl border border-[color-mix(in_srgb,var(--brc-danger)_24%,#fff)] bg-white px-2.5 text-[13px] font-extrabold text-(--brc-danger) shadow-[0_8px_16px_rgba(18,18,18,0.04)] transition duration-200 hover:-translate-y-0.5 hover:bg-(--brc-danger-bg) hover:shadow-[0_12px_22px_rgba(18,18,18,0.08)] active:translate-y-0 min-[420px]:gap-1.5 min-[420px]:px-3 [font-family:var(--brc-font-ui)]",
            isClosing && "cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-none",
          )}
        >
          <span className="min-[420px]:hidden">Close</span>
          <span className="hidden min-[420px]:inline">Close Listing</span>
          <span className="flex size-4 items-center justify-center rounded-full bg-(--brc-danger-bg) transition-transform duration-200 group-hover:rotate-45 min-[420px]:size-5">
            <Icon name="plus" size={12} stroke="currentColor" strokeWidth={2.4} />
          </span>
        </button>
      </div>
    </article>
  );
}

function EmptyListings() {
  return (
    <div className="py-12 text-center text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
      No listings match your filters.
    </div>
  );
}

// ---------- Inspection booking helpers ----------

function formatSlotDate(date: string): string {
  // Never call `new Date("YYYY-MM-DD")` directly — parse the parts manually
  // to avoid a timezone off-by-one bug.
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatSlotTime(time: string): string {
  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr ?? "0", 10);
  const minute = minuteStr ?? "00";
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${minute} ${period}`;
}

// ---------- Action cell ----------

function AppointmentCell({
  listing,
  booking,
  compact = false,
}: {
  listing: Listing;
  booking: InspectionBooking | undefined;
  compact?: boolean;
}) {
  const { status } = listing;

  if ((status === "inspection_pending" || status === "inspection_in_progress") && booking) {
    return (
      <div
        className={cn(
          "flex min-w-0 flex-col rounded-lg border bg-white [font-family:var(--brc-font-ui)]",
          compact ? "px-3 py-2.5" : "border-transparent px-0 py-0",
        )}
      >
        <span className="block truncate text-[13px] font-extrabold leading-5 text-(--brc-text)">
          {formatSlotDate(booking.slot.date)}
        </span>
        <span className="block truncate text-[12px] font-semibold leading-5 text-(--brc-text-secondary)">
          {formatSlotTime(booking.slot.start_time)} - {formatSlotTime(booking.slot.end_time)}
        </span>
        <span className="mt-1 inline-flex w-fit rounded-full bg-(--brc-success-bg) px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-(--brc-success)">
          Confirmed
        </span>
      </div>
    );
  }

  if (status === "draft") {
    return (
      <span className="text-[12px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
        Awaiting review
      </span>
    );
  }

  if (status === "listing_approved") {
    return (
      <span className="text-[12px] font-bold text-(--brc-success) [font-family:var(--brc-font-ui)]">
        Ready to book
      </span>
    );
  }

  if (status === "needs_clearance") {
    return (
      <span className="text-[12px] font-bold text-[#9a7400] [font-family:var(--brc-font-ui)]">
        Clearance needed
      </span>
    );
  }

  if (status === "inspection_rejected" || status === "inspection_no_show") {
    return (
      <span className="text-[12px] font-bold text-[#c25800] [font-family:var(--brc-font-ui)]">
        Rebook needed
      </span>
    );
  }

  if (status === "needs_changes") {
    return (
      <span className="text-[12px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
        Edit first
      </span>
    );
  }

  return (
    <span className="text-[12px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
      —
    </span>
  );
}

function ActionCell({
  listing,
  onBook,
}: {
  listing: Listing;
  onBook: (carId: string) => void;
}) {
  const router = useRouter();
  const { status } = listing;

  if (status === "listing_approved") {
    return (
      <button
        type="button"
        onClick={() => onBook(listing.id)}
        className="group inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-(--brc-primary)/15 bg-(--brc-primary) px-3.5 text-[12px] font-extrabold text-(--brc-text-on-primary) shadow-[0_10px_24px_rgba(0,0,139,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-(--brc-primary-hover) hover:shadow-[0_14px_30px_rgba(0,0,139,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brc-primary) focus-visible:ring-offset-2 [font-family:var(--brc-font-ui)]"
      >
        <CalendarCheckIcon size={14} strokeWidth={2.4} />
        <span className="whitespace-nowrap">Book Now</span>
        <ArrowRightIcon size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
      </button>
    );
  }

  if (status === "inspection_no_show") {
    return (
      <button
        type="button"
        onClick={() => onBook(listing.id)}
        className="group inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-(--brc-warning)/50 bg-(--brc-warning-bg) px-3.5 text-[12px] font-extrabold text-(--brc-text) shadow-[0_8px_18px_rgba(154,116,0,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_26px_rgba(154,116,0,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brc-warning) focus-visible:ring-offset-2 [font-family:var(--brc-font-ui)]"
        style={{ color: "#9a7400" }}
      >
        <RotateCcwIcon size={14} strokeWidth={2.4} />
        <span className="whitespace-nowrap">Rebook</span>
      </button>
    );
  }

  if (status === "needs_changes") {
    return (
      <button
        type="button"
        onClick={() => router.push(`/owner/my-cars/${listing.id}`)}
        className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-(--brc-accent) bg-(--brc-accent-bg) px-3 text-[12px] font-bold text-(--brc-accent) transition-all duration-150 hover:-translate-y-0.5 hover:brightness-95 [font-family:var(--brc-font-ui)]"
      >
        Edit & Rebook
      </button>
    );
  }

  return null;
}

// ---------- Row action menu ----------
function RowMenu({
  listingId,
  onClose,
  isClosing,
}: {
  listingId: string;
  onClose: (listingId: string) => void;
  isClosing: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className="flex cursor-pointer rounded-md border-none p-1.5 hover:bg-(--brc-bg-subtle) data-[popup-open]:bg-(--brc-bg-subtle)"
      >
        <Icon name="more" size={18} stroke="var(--brc-text)" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[152px] rounded-lg border border-(--brc-border) bg-white p-1 text-(--brc-text) shadow-md"
      >
        <DropdownMenuLinkItem
          closeOnClick
          render={<Link href={`/owner/my-cars/${listingId}`} />}
          className="flex w-full cursor-pointer items-center justify-between px-3 py-2.5 no-underline hover:bg-(--brc-bg-subtle) focus:bg-(--brc-bg-subtle)"
        >
          <span className="text-[13px] text-(--brc-text) [font-family:var(--brc-font-ui)]">View Details</span>
          <Icon name="car" size={15} stroke="var(--brc-text)" />
        </DropdownMenuLinkItem>
        <DropdownMenuSeparator className="my-1 bg-(--brc-bg-subtle)" />
        <DropdownMenuItem
          disabled={isClosing}
          onClick={() => onClose(listingId)}
          className={cn(
            "flex w-full cursor-pointer items-center justify-between px-3 py-2.5 hover:bg-(--brc-bg-subtle) focus:bg-(--brc-bg-subtle)",
            isClosing && "cursor-not-allowed opacity-60",
          )}
        >
          <span className="text-[13px] text-(--brc-danger) [font-family:var(--brc-font-ui)]">Close Listing</span>
          <Icon name="plus" size={15} stroke="var(--brc-danger)" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------- Pagination ----------
function Pagination({ page, setPage, totalPages }: { page: number; setPage: (p: number) => void; totalPages: number }) {
  const btn = (active: boolean, content: React.ReactNode, onClick: () => void, disabled: boolean, key: string | number) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex size-[34px] cursor-pointer items-center justify-center rounded-md border text-sm font-semibold transition-colors disabled:cursor-default disabled:opacity-60 [font-family:var(--brc-font-ui)]"
      style={{
        background: active ? "var(--brc-primary)" : "#fff",
        color: active ? "#fff" : "var(--brc-text)",
        borderColor: "var(--brc-border)",
      }}
    >
      {content}
    </button>
  );

  return (
    <div className="flex items-center justify-center gap-[7px] pt-[18px]">
      {btn(false, <Icon name="chevleft" size={16} stroke={page === 1 ? "var(--brc-border)" : "var(--brc-text)"} />, () => setPage(Math.max(1, page - 1)), page === 1, "prev")}
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) =>
        btn(n === page, n, () => setPage(n), false, n)
      )}
      {btn(false, <Icon name="chevright" size={16} stroke={page === totalPages ? "var(--brc-border)" : "var(--brc-text)"} />, () => setPage(Math.min(totalPages, page + 1)), page === totalPages, "next")}
    </div>
  );
}

// ---------- Main page ----------
export default function MyCarsPage() {
  const { data: rawListings, isLoading } = useMyCarsList();
  const { data: bookingsData } = useMyBookings();
  const deleteCar = useDeleteCar();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ type: "", status: "" });
  const [applied, setApplied] = useState({ type: "", status: "" });
  const [bookingCarId, setBookingCarId] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: selectedBookingsData } = useMyBookings(
    bookingCarId ? { car: bookingCarId } : undefined,
    { enabled: !!bookingCarId },
  );

  // Build a map of car_id → most recent active booking for fast lookup
  const bookingByCarId = useMemo<Record<string, InspectionBooking>>(() => {
    if (!bookingsData?.results) return {};
    return bookingsData.results.reduce<Record<string, InspectionBooking>>((acc, b) => {
      // Keep the most recently created booking per car (first in list = most recent)
      if (!acc[b.car_id]) acc[b.car_id] = b;
      return acc;
    }, {});
  }, [bookingsData]);

  function handleOpenBooking(carId: string) {
    setBookingCarId(carId);
    setBookingOpen(true);
  }

  function handleCloseBooking() {
    setBookingOpen(false);
    setBookingCarId(null);
  }

  const listings = useMemo(() => (rawListings?.results ?? []).map(toListing), [rawListings]);

  async function handleCloseListing(listingId: string) {
    try {
      await deleteCar.mutateAsync(listingId);
      toast.success("Listing closed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to close listing");
    }
  }

  // Dismiss popovers on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!(e.target instanceof HTMLElement)) return;
      if (!e.target.closest("[data-pop]")) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = useMemo(() => {
    return listings.filter((r) => {
      const matchesSearch = !search ||
        r.car.toLowerCase().includes(search.toLowerCase());
      const matchesType = !applied.type || r.type.toLowerCase() === applied.type.toLowerCase();
      const matchesStatus = !applied.status || r.status === applied.status.toLowerCase().replace(/ /g, "_");
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [listings, search, applied]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Compute stats from real data
  const statValues: Record<string, string> = useMemo(() => ({
    total: String(listings.length),
    published: String(listings.filter((l) => l.status === "published").length),
    draft: String(listings.filter((l) => l.status === "draft").length),
    paused: String(listings.filter((l) => l.status === "paused").length),
  }), [listings]);

  const hasActiveFilters = !!(applied.type || applied.status);

  if (isLoading) {
    return (
      <>
        <Breadcrumb items={[{ label: "Dashboard", href: "/owner/dashboard" }, { label: "Listed Cars" }]} />
        <div className="min-h-screen bg-[linear-gradient(180deg,#f8f9fc_0%,#f3f6fb_42%,#fff_100%)]">
          <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 py-6 pb-14 sm:gap-8 sm:px-6 sm:py-10 lg:px-[var(--brc-space-10,40px)] lg:py-12 lg:pb-20">
          {/* Header skeleton */}
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-56 sm:w-72" />
              <Skeleton className="h-5 w-44" />
            </div>
            <Skeleton className="h-12 w-32 rounded-lg" />
          </div>
          {/* Stat cards skeleton */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-(--brc-border) bg-white p-4 sm:p-5">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-16" />
                </div>
              </div>
            ))}
          </div>
          {/* Table card skeleton */}
          <div className="rounded-xl border border-(--brc-border) bg-white p-4 sm:rounded-2xl sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            <div className="mb-4 flex justify-between">
              <Skeleton className="h-10 w-60 rounded-xl" />
              <Skeleton className="h-10 w-24 rounded-xl" />
            </div>
            <div className="flex flex-col gap-1">
              <Skeleton className="h-10 w-full rounded-lg" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard", href: "/owner/dashboard" }, { label: "Listed Cars" }]} />
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8f9fc_0%,#f3f6fb_42%,#fff_100%)]">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 py-6 pb-14 sm:gap-8 sm:px-6 sm:py-10 lg:px-[var(--brc-space-10,40px)] lg:py-12 lg:pb-20" ref={containerRef}>
          {/* Header + List Cars CTA */}
          <div className="relative overflow-hidden rounded-lg border border-white/80 bg-white p-5 shadow-[0_22px_60px_rgba(18,18,18,0.08)] sm:p-7 lg:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--brc-primary),var(--brc-success),var(--brc-accent))]" />
            <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-[linear-gradient(110deg,transparent,rgba(0,0,139,0.055))]" />
            <div className="relative flex flex-col items-stretch gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--brc-primary)_22%,#fff)] bg-(--brc-primary-tint) px-3 py-1 text-xs font-extrabold uppercase text-(--brc-primary) [font-family:var(--brc-font-ui)]">
                  Owner Garage
                </span>
                <h1 className="m-0 mt-3 text-[34px] font-black tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)] sm:text-[48px] lg:text-[56px]">
                  Listed Cars
                </h1>
                <p className="mt-2 max-w-[620px] text-sm leading-6 text-(--brc-text-muted) [font-family:var(--brc-font-ui)] sm:text-base">
                  Manage pricing, visibility, and review status across your vehicle portfolio.
                </p>
              </div>

              <Link
                href="/owner/my-cars/new"
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-(--brc-secondary) px-[22px] text-sm font-extrabold text-[#FAFAFA] no-underline shadow-[0_18px_34px_rgba(18,18,18,0.16)] transition duration-300 hover:-translate-y-1 hover:bg-black hover:shadow-[0_24px_44px_rgba(18,18,18,0.22)] active:translate-y-0 [font-family:var(--brc-font-ui)] sm:w-auto"
              >
                List Cars
                <span className="flex transition-transform duration-300 group-hover:rotate-90">
                  <Icon name="plus" size={18} stroke="currentColor" />
                </span>
              </Link>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {STATS.map((stat) => (
              <StatCard key={stat.label} stat={stat} value={statValues[stat.key] ?? "0"} />
            ))}
          </div>

          {/* Table card */}
          <div className="flex flex-col gap-4 rounded-lg border border-white/80 bg-white/95 p-4 shadow-[0_22px_60px_rgba(18,18,18,0.08)] backdrop-blur sm:p-6">
          {/* Card title + count */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">Listed Cars</span>
            <span className="inline-flex h-[18px] items-center rounded-full border border-[color-mix(in_srgb,var(--brc-primary)_38%,#fff)] bg-(--brc-primary-tint) px-2 text-xs font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">
              {listings.length}
            </span>
          </div>

          {/* Search + filter */}
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex h-10 w-full items-center gap-2 rounded-xl border border-(--brc-border) bg-white px-3 sm:w-60">
              <Icon name="search" size={18} stroke="var(--brc-text-muted)" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search"
                className="flex-1 border-none bg-transparent text-sm text-(--brc-text) outline-none placeholder:text-(--brc-text-muted) [font-family:var(--brc-font-ui)]"
              />
            </div>
            <div className="relative" data-pop>
              <button
                type="button"
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-(--brc-border) bg-white px-3.5 text-sm font-medium [font-family:var(--brc-font-ui)] sm:w-auto"
                style={{ color: hasActiveFilters ? "var(--brc-text)" : "var(--brc-text-muted)" }}
              >
                <Icon name="filter" size={17} stroke={hasActiveFilters ? "var(--brc-primary)" : "var(--brc-text-muted)"} />
                Filter
                {hasActiveFilters && <span className="size-[7px] rounded-full bg-(--brc-primary)" />}
              </button>
              {filterOpen && (
                <FilterPanel
                  filters={filters}
                  setFilters={setFilters}
                  onApply={() => { setApplied(filters); setFilterOpen(false); setPage(1); }}
                  onReset={() => { setFilters({ type: "", status: "" }); setApplied({ type: "", status: "" }); }}
                  onClose={() => setFilterOpen(false)}
                />
              )}
            </div>
          </div>

          {/* Mobile list */}
          <div className="flex flex-col gap-3 md:hidden">
            {paginated.length === 0 ? (
              <EmptyListings />
            ) : (
              paginated.map((listing) => (
                <MobileListingCard
                  key={listing.id}
                  listing={listing}
                  booking={bookingByCarId[listing.id]}
                  onClose={handleCloseListing}
                  onBook={handleOpenBooking}
                  isClosing={deleteCar.isPending}
                />
              ))
            )}
          </div>

          {/* Table */}
          <div className="hidden overflow-x-auto md:block">
            <div className="min-w-[840px]">
              {/* Table header */}
              <div
                className="mb-1 grid items-center rounded-lg bg-(--brc-bg-subtle)"
                style={{ gridTemplateColumns: LISTING_TABLE_COLUMNS }}
              >
                <div className="px-4 py-3"><span className="text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Car</span></div>
                <div className="px-2 py-3 text-center"><span className="text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Type</span></div>
                <div className="px-3 py-3 text-right"><span className="text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Price</span></div>
                <div className="px-3 py-3"><span className="text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Status</span></div>
                <div className="px-3 py-3"><span className="text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Appointment</span></div>
                <div className="px-3 py-3"><span className="text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Action</span></div>
                <div />
              </div>

              {/* Table rows */}
              {paginated.length === 0 ? (
                <EmptyListings />
              ) : (
                <div data-pop>
                  {paginated.map((r, i) => (
                    <div
                      key={r.id}
                      className="group relative grid min-h-[74px] items-center rounded-lg transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_16px_34px_rgba(18,18,18,0.08)]"
                      style={{
                        gridTemplateColumns: LISTING_TABLE_COLUMNS,
                        borderBottom: i === paginated.length - 1 ? "none" : "1px solid var(--brc-border)",
                      }}
                    >
                      <div
                        className="flex min-w-0 items-center px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) shadow-[0_8px_18px_rgba(18,18,18,0.05)]">
                            {r.primaryImage ? (
                              <Image
                                src={r.primaryImage}
                                alt={r.car}
                                fill
                                sizes="48px"
                                className="object-cover transition duration-500 group-hover:scale-110"
                              />
                            ) : (
                              <Icon name="car" size={20} stroke="var(--brc-text-muted)" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-(--brc-text) transition-colors duration-200 group-hover:text-(--brc-primary) [font-family:var(--brc-font-ui)]">{r.car}</span>
                            <span className="block truncate text-[12px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Listed {r.date}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex min-w-0 items-center justify-center px-2 py-3">
                        <span className="truncate text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">{r.type}</span>
                      </div>
                      <div className="flex min-w-0 items-center justify-end px-3 py-3 text-right">
                        <span className="truncate text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{r.price}</span>
                      </div>
                      <div className="flex min-w-0 items-center px-3 py-3">
                        <StatusBadge status={r.status} />
                      </div>
                      <div className="flex min-w-0 items-center px-3 py-3">
                        <AppointmentCell
                          listing={r}
                          booking={bookingByCarId[r.id]}
                        />
                      </div>
                      <div className="flex min-w-0 items-center px-3 py-3">
                        <ActionCell
                          listing={r}
                          onBook={handleOpenBooking}
                        />
                      </div>
                      <div className="flex min-w-0 items-center justify-center px-2 py-3">
                        <RowMenu
                          listingId={r.id}
                          onClose={handleCloseListing}
                          isClosing={deleteCar.isPending}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {filtered.length > 0 && (
            <Pagination page={page} setPage={setPage} totalPages={totalPages} />
          )}
        </div>
      </div>
      </div>

      {bookingCarId && (() => {
        // Rebooking after a no-show goes through the reschedule endpoint so
        // the attempt counts toward the center's cap and history reads right.
        const lastBooking = selectedBookingsData?.results?.[0] ?? bookingByCarId[bookingCarId];
        const isRebooking = lastBooking?.status === "no_show";
        return (
          <BookingModal
            carId={bookingCarId}
            mode={isRebooking ? "reschedule" : "book"}
            bookingId={isRebooking ? lastBooking.id : undefined}
            open={bookingOpen}
            onClose={handleCloseBooking}
            onSuccess={handleCloseBooking}
          />
        );
      })()}
    </>
  );
}
