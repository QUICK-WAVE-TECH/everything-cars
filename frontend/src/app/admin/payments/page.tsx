"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  SearchIcon,
  RefreshCwIcon,
  XIcon,
  ChevronDownIcon,
} from "lucide-react";
import { Icon } from "@/features/auth/components/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/features/requests/components/status-badge";
import { cn } from "@/lib/utils";
import {
  useAdminRequestCounts,
  useAdminRequests,
} from "@/features/listings/api/admin-api";
import type { RequestListItem } from "@/features/requests/api/types";
import { PaymentSummaryBand, type PaymentCounts } from "@/features/payments/components/payment-summary-band";
import { PaymentDrawer } from "@/features/payments/components/payment-drawer";
import { InspectionPaymentQueue } from "@/features/inspections/components/inspection-payment-queue";

// ── Helpers ──
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtMoney(amount: string | number, currency: string) {
  const sym: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };
  return `${sym[currency] ?? currency}${Number(amount).toLocaleString("en-NG")}`;
}

function relativeTime(fromMs: number, nowMs: number) {
  const diffSec = Math.floor((nowMs - fromMs) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

type TabKey = "payment_submitted" | "paid" | "active" | "completed";
type SortKey = "newest" | "oldest" | "highest" | "lowest";
type TypeFilter = "all" | "rent" | "buy";

const SORT_ORDERING: Record<
  SortKey,
  "created_at" | "-created_at" | "price_offered" | "-price_offered"
> = {
  newest: "-created_at",
  oldest: "created_at",
  highest: "-price_offered",
  lowest: "price_offered",
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "payment_submitted", label: "Awaiting Verification" },
  { key: "paid", label: "Confirmed" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];

const EMPTY_COPY: Record<TabKey, { title: string; body: string }> = {
  payment_submitted: { title: "Nothing awaiting verification", body: "All submitted payments in this view have been handled." },
  paid: { title: "No confirmed payments", body: "Confirmed payments waiting to become active will appear here." },
  active: { title: "No active transactions", body: "Active rentals and purchases will show up here." },
  completed: { title: "No completed transactions", body: "Finished transactions land here for your records." },
};

// ── Mobile card (md:hidden) ──
function MobileRequestCard({ req, onOpen }: { req: RequestListItem; onOpen: (req: RequestListItem) => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(req)}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(req); }}
      className="cursor-pointer rounded-xl border border-(--brc-border) bg-(--brc-bg) p-4 shadow-[var(--brc-shadow-xs)] transition-colors active:bg-(--brc-bg-subtle)"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-(--brc-bg-subtle)">
          {req.car.primary_image ? (
            <Image src={req.car.primary_image} alt="" width={44} height={33} className="object-contain" />
          ) : (
            <Icon name="car" size={18} stroke="var(--brc-text-muted)" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">{req.car.title}</span>
          <span className="block truncate text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{req.car.year} · {req.car.brand}</span>
        </div>
        <StatusBadge status={req.status} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="min-w-0 rounded-lg bg-(--brc-bg-subtle) px-2.5 py-2">
          <span className="block text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Customer</span>
          <span className="block truncate text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">{req.customer.first_name} {req.customer.last_name}</span>
        </div>
        <div className="min-w-0 rounded-lg bg-(--brc-bg-subtle) px-2.5 py-2">
          <span className="block text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Amount</span>
          <span className="block truncate text-sm font-semibold tabular-nums text-(--brc-text) [font-family:var(--brc-font-ui)]">{fmtMoney(req.price_offered, req.currency)}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          {req.request_type === "rent" ? "Rent" : "Buy"} · {formatDate(req.created_at)}
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpen(req); }}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-(--brc-border) bg-(--brc-bg) px-3 text-[13px] font-bold text-(--brc-primary) [font-family:var(--brc-font-ui)]"
        >
          <span>{req.status === "payment_submitted" ? "Verify" : "View"}</span>
          <Icon name="chevright" size={12} stroke="currentColor" />
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──
const PAGE_SIZE = 20;

/**
 * Windowed page list: first and last page always, the current page with a
 * neighbour either side, and "…" gaps — so a 40-page queue never renders 40
 * buttons. Returns page numbers interleaved with the "ellipsis" sentinel.
 */
const ELLIPSIS = "ellipsis" as const;
function pageWindow(current: number, total: number): (number | typeof ELLIPSIS)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | typeof ELLIPSIS)[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (n - prev > 1) out.push(ELLIPSIS);
    out.push(n);
    prev = n;
  }
  return out;
}

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState<TabKey>("payment_submitted");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortKey>("newest");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  // "just now" freshens once after mount, then every 30s — kept out of the
  // effect body itself (repo lints react-hooks/set-state-in-effect).
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    const initial = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 30_000);
    return () => { window.clearTimeout(initial); window.clearInterval(id); };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const ordering = SORT_ORDERING[sort];

  const { data: paginatedData, isLoading, isFetching, dataUpdatedAt, refetch } = useAdminRequests({
    status: tab,
    search: debouncedSearch || undefined,
    request_type: typeFilter === "all" ? undefined : typeFilter,
    page,
    ordering,
  });

  const showSkeleton = isLoading || (isFetching && !paginatedData);
  const requests = useMemo(() => paginatedData?.results ?? [], [paginatedData]);
  const totalCount = paginatedData?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const displayedRequests = requests;

  // Counts for KPIs
  const { data: requestCounts } = useAdminRequestCounts();

  const counts: PaymentCounts = useMemo(() => ({
    payment_submitted: requestCounts?.payment_submitted ?? 0,
    paid: requestCounts?.paid ?? 0,
    active: requestCounts?.active ?? 0,
    completed: requestCounts?.completed ?? 0,
  }), [requestCounts]);

  const [drawerRequestId, setDrawerRequestId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function openDrawer(req: RequestListItem) {
    setDrawerRequestId(req.id);
    setDrawerOpen(true);
  }

  const filtersActive = search.trim() !== "" || typeFilter !== "all" || sort !== "newest";
  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setSort("newest");
    setPage(1);
  }

  const emptyCopy = filtersActive && requests.length === 0
    ? { title: "No matching payments", body: "No payments match your current search or filters. Try adjusting them." }
    : EMPTY_COPY[tab];

  const showingLabel = totalCount === 0
    ? "No requests"
    : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalCount)} of ${totalCount} requests`;

  return (
    <>
      {/* Hero */}
      <section className="border-b border-(--brc-border) bg-(--brc-bg)">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-start justify-between gap-6 px-4 pb-8 pt-10 sm:px-6 lg:px-(--brc-space-10,40px)">
          <div className="max-w-[580px]">
            <span className="text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              Moderation · Payment desk
            </span>
            <h1 className="mt-3 text-[clamp(28px,5vw,40px)] font-extrabold leading-tight tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
              Payment Verification
            </h1>
            <p className="mt-2.5 text-base leading-relaxed text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              Review and confirm customer payments before they&apos;re processed into transactions.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={() => refetch()}
              aria-label="Refresh queue"
              title="Refresh queue"
              className="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-(--brc-border) bg-(--brc-bg) text-(--brc-text-secondary) transition-colors hover:bg-(--brc-bg-subtle)"
            >
              <RefreshCwIcon size={17} className={cn(isFetching && "animate-spin motion-reduce:animate-none")} />
            </button>
            <span className="whitespace-nowrap text-[11.5px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              {isFetching ? "Updating…" : nowMs === null ? "" : `Updated ${relativeTime(dataUpdatedAt, nowMs)}`}
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-(--brc-space-10,40px)">
        {/* Summary band */}
        <PaymentSummaryBand counts={counts} />

        {/* Owner inspection payments (pay-to-book) */}
        <InspectionPaymentQueue />

        {/* Queue card */}
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-(--brc-border) bg-(--brc-bg) shadow-[var(--brc-shadow-xs)]">
          <div className="flex flex-col items-start gap-3 px-4 pb-2 pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
            <div className="min-w-0">
              <h2 className="m-0 text-xl font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">Payment queue</h2>
              <p className="mt-1 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Customer payments awaiting verification</p>
            </div>
            {counts.payment_submitted > 0 && (
              <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-(--brc-warning-bg) px-3.5 py-1.5 text-[13px] font-bold text-(--brc-accent-deep) [font-family:var(--brc-font-ui)]">
                <span className="size-[7px] rounded-full bg-(--brc-accent-deep)" />
                {counts.payment_submitted} awaiting
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="ec-tabscroll flex gap-1 overflow-x-auto border-b border-(--brc-border) px-4 sm:px-6">
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <button key={t.key} type="button" onClick={() => { setTab(t.key); setPage(1); }}
                  className={cn("relative flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-none bg-transparent px-3.5 pb-3 pt-2.5 text-sm transition-colors [font-family:var(--brc-font-ui)]", active ? "font-bold text-(--brc-primary)" : "font-medium text-(--brc-text-muted) hover:text-(--brc-text)")}>
                  {t.label}
                  <span className={cn("inline-flex h-[18px] items-center rounded-full px-[7px] text-[11px] font-bold tabular-nums", active ? "bg-(--brc-primary-tint) text-(--brc-primary)" : "bg-(--brc-bg-muted) text-(--brc-text-muted)")}>
                    {counts[t.key]}
                  </span>
                  {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-(--brc-primary)" />}
                </button>
              );
            })}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 px-4 py-3.5 sm:px-6">
            <div className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-(--brc-border) bg-(--brc-bg) px-3 sm:max-w-72">
              <SearchIcon size={16} className="shrink-0 text-(--brc-text-muted)" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search car, customer or owner"
                aria-label="Search payments"
                className="w-full min-w-0 border-none bg-transparent text-sm text-(--brc-text) outline-none placeholder:text-(--brc-text-muted) [font-family:var(--brc-font-ui)]"
              />
            </div>

            <div className="relative inline-flex">
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortKey);
                  setPage(1);
                }}
                aria-label="Sort payments"
                className="h-10 cursor-pointer appearance-none rounded-lg border border-(--brc-border) bg-(--brc-bg) py-0 pl-3 pr-8 text-[12.5px] font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest amount</option>
                <option value="lowest">Lowest amount</option>
              </select>
              <ChevronDownIcon size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-(--brc-text-muted)" />
            </div>

            <div className="relative inline-flex">
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as TypeFilter);
                  setPage(1);
                }}
                aria-label="Filter by request type"
                className="h-10 cursor-pointer appearance-none rounded-lg border border-(--brc-border) bg-(--brc-bg) py-0 pl-3 pr-8 text-[12.5px] font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]"
              >
                <option value="all">All types</option>
                <option value="rent">Rent</option>
                <option value="buy">Buy</option>
              </select>
              <ChevronDownIcon size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-(--brc-text-muted)" />
            </div>

            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-(--brc-border) bg-(--brc-bg) px-3 text-[12.5px] font-bold text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]"
              >
                <XIcon size={13} /> Clear
              </button>
            )}

            <span className="ml-auto whitespace-nowrap text-[12.5px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{showingLabel}</span>
          </div>

          {/* Refresh loading bar */}
          <div className="relative h-0.5 w-full overflow-hidden bg-transparent">
            {isFetching && !showSkeleton && (
              <span className="absolute inset-y-0 w-1/3 rounded-full bg-(--brc-primary) motion-safe:animate-[brc-loadbar_1s_linear_infinite] motion-reduce:opacity-60" />
            )}
          </div>
          <style>{"@keyframes brc-loadbar { from { left: -35%; } to { left: 100%; } }"}</style>

          <div className="flex flex-col gap-4 p-4 pt-3 sm:p-6 sm:pt-3">
            {/* Table / Mobile list */}
            {showSkeleton ? (
              <div className="flex flex-col gap-2 md:gap-1">
                <Skeleton className="hidden h-12 w-full rounded-lg md:block" />
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg md:rounded-none" />)}
              </div>
            ) : displayedRequests.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-(--brc-bg-subtle) text-(--brc-text-muted)">
                  <SearchIcon size={24} />
                </span>
                <div>
                  <div className="text-[17px] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{emptyCopy.title}</div>
                  <p className="mx-auto mt-1 max-w-[380px] text-sm leading-relaxed text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{emptyCopy.body}</p>
                </div>
                {filtersActive && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-10 cursor-pointer rounded-lg border border-(--brc-border) bg-(--brc-bg) px-4 text-[13px] font-bold text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="flex flex-col gap-3 md:hidden">
                  {displayedRequests.map((req) => (
                    <MobileRequestCard key={req.id} req={req} onOpen={openDrawer} />
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full border-collapse" style={{ minWidth: 860 }}>
                    <thead>
                      <tr className="bg-(--brc-bg-subtle)">
                        <th className="rounded-l-lg px-4 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Vehicle</th>
                        <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Customer</th>
                        <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Type</th>
                        <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Amount</th>
                        <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Submitted</th>
                        <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Status</th>
                        <th className="rounded-r-lg px-3 py-3 text-right text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Review</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedRequests.map((req, i) => (
                        <tr key={req.id} onClick={() => openDrawer(req)}
                          className="group/row relative cursor-pointer transition-[background-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:bg-(--brc-primary-tint) hover:shadow-[0_16px_34px_rgba(0,0,139,0.10)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                          style={{ borderBottom: i === displayedRequests.length - 1 ? "none" : "1px solid var(--brc-border)" }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="relative flex size-[48px] shrink-0 items-center justify-center overflow-hidden rounded-md border border-transparent bg-(--brc-bg-subtle) transition-all duration-300 group-hover/row:border-(--brc-primary) group-hover/row:bg-(--brc-primary-tint)">
                                {req.car.primary_image ? (
                                  <Image src={req.car.primary_image} alt="" width={44} height={33} className="object-contain transition-transform duration-500 group-hover/row:scale-110" />
                                ) : (
                                  <Icon name="car" size={18} stroke="var(--brc-text-muted)" />
                                )}
                              </span>
                              <div className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-(--brc-text) transition-colors duration-300 group-hover/row:text-(--brc-primary) [font-family:var(--brc-font-ui)]">{req.car.title}</span>
                                <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{req.car.year} · {req.car.brand}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                            {req.customer.first_name} {req.customer.last_name}
                          </td>
                          <td className="px-3 py-3">
                            <span className="whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold [font-family:var(--brc-font-ui)]"
                              style={{ background: req.request_type === "rent" ? "var(--brc-primary-tint)" : "var(--brc-accent-bg)", color: req.request_type === "rent" ? "var(--brc-primary)" : "var(--brc-accent)" }}>
                              {req.request_type === "rent" ? "Rent" : "Buy"}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold tabular-nums text-(--brc-text) [font-family:var(--brc-font-ui)]">
                            {fmtMoney(req.price_offered, req.currency)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <div className="text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">{formatDate(req.created_at)}</div>
                            <div className="text-[11.5px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{formatTime(req.created_at)}</div>
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge status={req.status} />
                          </td>
                          <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <button type="button" onClick={() => openDrawer(req)}
                              className="group/btn inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-lg border border-(--brc-border) bg-(--brc-bg) px-3 text-[13px] font-bold text-(--brc-primary) shadow-[0_4px_10px_rgba(18,18,18,0.03)] transition-all duration-250 hover:-translate-y-0.5 hover:border-(--brc-primary) hover:bg-(--brc-primary) hover:text-white hover:shadow-[0_10px_18px_rgba(0,0,139,0.16)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 [font-family:var(--brc-font-ui)]">
                              <span>{req.status === "payment_submitted" ? "Verify" : "View"}</span>
                              <Icon name="chevright" size={13} stroke="currentColor" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Pagination */}
            {!showSkeleton && totalPages > 1 && (
              <div className="flex items-center justify-center gap-[7px] pt-2">
                <button type="button" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                  className="flex size-[34px] cursor-pointer items-center justify-center rounded-md border border-(--brc-border) bg-(--brc-bg) text-sm font-semibold transition-colors disabled:cursor-default disabled:opacity-60 [font-family:var(--brc-font-ui)]">
                  <Icon name="chevleft" size={16} stroke={page === 1 ? "var(--brc-border)" : "var(--brc-text)"} />
                </button>
                {pageWindow(page, totalPages).map((n, i) =>
                  n === ELLIPSIS ? (
                    <span key={`gap-${i}`} aria-hidden="true"
                      className="flex size-[34px] items-center justify-center text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      &hellip;
                    </span>
                  ) : (
                    <button key={n} type="button" onClick={() => setPage(n)}
                      aria-label={`Go to page ${n}`}
                      aria-current={n === page ? "page" : undefined}
                      className="flex size-[34px] cursor-pointer items-center justify-center rounded-md border text-sm font-semibold tabular-nums transition-colors [font-family:var(--brc-font-ui)]"
                      style={{ background: n === page ? "var(--brc-primary)" : "var(--brc-bg)", color: n === page ? "#fff" : "var(--brc-text)", borderColor: "var(--brc-border)" }}>
                      {n}
                    </button>
                  ),
                )}
                <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                  className="flex size-[34px] cursor-pointer items-center justify-center rounded-md border border-(--brc-border) bg-(--brc-bg) text-sm font-semibold transition-colors disabled:cursor-default disabled:opacity-60 [font-family:var(--brc-font-ui)]">
                  <Icon name="chevright" size={16} stroke={page === totalPages ? "var(--brc-border)" : "var(--brc-text)"} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <PaymentDrawer
        key={`${drawerRequestId ?? "empty"}-${drawerOpen ? "open" : "closed"}`}
        requestId={drawerRequestId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
