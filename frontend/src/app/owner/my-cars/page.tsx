"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Icon } from "@/features/auth/components/icon";
import { Skeleton } from "@/components/ui/skeleton";
import type { IconName } from "@/features/auth/components/icon";
import { cn } from "@/lib/utils";
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

// ---------- Types ----------
type ListingStatus = "draft" | "pending_review" | "needs_changes" | "published" | "paused" | "suspended" | "archived";

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

const STATS: { icon: IconName; label: string; key: string; color: string; iconColor?: string; tint: string }[] = [
  { icon: "car", label: "Total Listings", key: "total", color: "var(--brc-primary)", tint: "var(--brc-primary-tint)" },
  { icon: "check", label: "Published", key: "published", color: "var(--brc-success)", tint: "var(--brc-success-bg)" },
  { icon: "clock", label: "Draft", key: "draft", color: "var(--brc-warning)", iconColor: "#9a7400", tint: "var(--brc-warning-bg)" },
  { icon: "coins", label: "Paused", key: "paused", color: "var(--brc-accent)", tint: "var(--brc-accent-bg)" },
];

const PER_PAGE = 10;
const LISTING_TABLE_COLUMNS = "minmax(220px,1.6fr) 90px 130px 150px 120px 56px";

// ---------- Status badge ----------
const STATUS_MAP: Record<ListingStatus, { bg: string; fg: string; dot: string; label: string }> = {
  draft: { bg: "var(--brc-bg-muted)", fg: "var(--brc-text-muted)", dot: "var(--brc-text-muted)", label: "Draft" },
  pending_review: { bg: "var(--brc-warning-bg)", fg: "#9a7400", dot: "var(--brc-warning)", label: "In Review" },
  needs_changes: { bg: "var(--brc-accent-bg)", fg: "var(--brc-accent)", dot: "var(--brc-accent)", label: "Needs Changes" },
  published: { bg: "var(--brc-success-bg)", fg: "var(--brc-success)", dot: "var(--brc-success)", label: "Published" },
  paused: { bg: "var(--brc-accent-bg)", fg: "var(--brc-accent)", dot: "var(--brc-accent)", label: "Paused" },
  suspended: { bg: "var(--brc-danger-bg)", fg: "var(--brc-danger)", dot: "var(--brc-danger)", label: "Suspended" },
  archived: { bg: "var(--brc-bg-muted)", fg: "var(--brc-text-secondary)", dot: "var(--brc-text-secondary)", label: "Archived" },
};

function StatusBadge({ status }: { status: ListingStatus }) {
  const s = STATUS_MAP[status];
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

// ---------- Stat card (navy border, matching design) ----------
function StatCard({ stat, value }: { stat: (typeof STATS)[number]; value: string }) {
  const iconColor = stat.iconColor ?? stat.color;

  return (
    <div
      className="flex min-w-0 items-center gap-3 rounded-lg border border-(--brc-border) border-b-2 bg-white p-4 shadow-[var(--brc-shadow-xs)] sm:p-5"
      style={{ borderBottomColor: stat.color }}
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full border"
        style={{
          background: stat.tint,
          borderColor: `color-mix(in srgb, ${stat.color} 36%, white)`,
        }}
      >
        <Icon name={stat.icon} size={16} stroke={iconColor} />
      </span>
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="truncate text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{stat.label}</span>
        <span className="text-xl font-bold text-(--brc-text) [font-family:var(--brc-font-ui)] sm:text-2xl">{value}</span>
      </span>
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
        <FilterSelect label="Status" value={filters.status} options={["Draft", "Pending_review", "Published", "Paused", "Suspended", "Archived"]} onPick={(v) => setFilters({ ...filters, status: v })} />
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
  onClose,
  isClosing,
}: {
  listing: Listing;
  onClose: (listingId: string) => void;
  isClosing: boolean;
}) {
  return (
    <article className="rounded-xl border border-(--brc-border) bg-white p-4 shadow-[var(--brc-shadow-xs)]">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-(--brc-bg-subtle)">
          <Icon name="car" size={22} stroke="var(--brc-text-muted)" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 truncate text-base font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
            {listing.car}
          </h2>
          <p className="mt-1 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            {listing.date}
          </p>
        </div>
        <StatusBadge status={listing.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <ListingDetail label="Type" value={listing.type} />
        <ListingDetail label="Price" value={listing.price} />
      </div>

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
  const deleteCar = useDeleteCar();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ type: "", status: "" });
  const [applied, setApplied] = useState({ type: "", status: "" });
  const containerRef = useRef<HTMLDivElement>(null);

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
      const matchesStatus = !applied.status || r.status === applied.status.toLowerCase();
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
      <div className="bg-(--brc-bg-subtle)">
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
    );
  }

  return (
    <div className="bg-(--brc-bg-subtle)">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 py-6 pb-14 sm:gap-8 sm:px-6 sm:py-10 lg:px-[var(--brc-space-10,40px)] lg:py-12 lg:pb-20" ref={containerRef}>
        {/* Header + List Cars CTA */}
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <h1 className="m-0 text-[32px] font-extrabold tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)] sm:text-[44px]">
              Listed Cars
            </h1>
            <p className="mt-2 text-base text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              Keep track of all your listings
            </p>
          </div>
          <Link
            href="/owner/my-cars/new"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-(--brc-secondary) px-[22px] text-sm font-bold text-[#FAFAFA] no-underline transition duration-200 hover:-translate-y-0.5 hover:bg-black hover:shadow-md [font-family:var(--brc-font-ui)] sm:w-auto"
          >
            List Cars
            <Icon name="plus" size={18} stroke="currentColor" />
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {STATS.map((stat) => (
            <StatCard key={stat.label} stat={stat} value={statValues[stat.key] ?? "0"} />
          ))}
        </div>

        {/* Table card */}
        <div className="flex flex-col gap-4 rounded-xl border border-(--brc-border) bg-white p-4 shadow-[var(--brc-shadow-xs)] sm:rounded-2xl sm:p-6">
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
                  onClose={handleCloseListing}
                  isClosing={deleteCar.isPending}
                />
              ))
            )}
          </div>

          {/* Table */}
          <div className="hidden overflow-x-auto md:block">
            <div className="min-w-[980px]">
              {/* Table header */}
              <div
                className="mb-1 grid items-center rounded-lg bg-(--brc-bg-subtle)"
                style={{ gridTemplateColumns: LISTING_TABLE_COLUMNS }}
              >
                <div className="px-4 py-3"><span className="text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Car</span></div>
                <div className="px-3 py-3 text-center"><span className="text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Type</span></div>
                <div className="px-3 py-3"><span className="text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Listed</span></div>
                <div className="px-3 py-3 text-right"><span className="text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Price</span></div>
                <div className="px-3 py-3"><span className="text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Status</span></div>
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
                      className="relative grid min-h-[66px] items-center transition-colors hover:bg-(--brc-bg-subtle)/55"
                      style={{
                        gridTemplateColumns: LISTING_TABLE_COLUMNS,
                        borderBottom: i === paginated.length - 1 ? "none" : "1px solid var(--brc-border)",
                      }}
                    >
                      <div
                        className="flex min-w-0 items-center px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-(--brc-bg-subtle)">
                            <Icon name="car" size={20} stroke="var(--brc-text-muted)" />
                          </span>
                          <span className="truncate text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">{r.car}</span>
                        </div>
                      </div>
                      <div className="flex min-w-0 items-center justify-center px-3 py-3">
                        <span className="truncate text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">{r.type}</span>
                      </div>
                      <div className="flex min-w-0 items-center px-3 py-3">
                        <span className="truncate text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">{r.date}</span>
                      </div>
                      <div className="flex min-w-0 items-center justify-end px-3 py-3 text-right">
                        <span className="truncate text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">{r.price}</span>
                      </div>
                      <div className="flex min-w-0 items-center px-3 py-3">
                        <StatusBadge status={r.status} />
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
  );
}
