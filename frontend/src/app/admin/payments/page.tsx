"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { SearchIcon, Loader2Icon, XIcon, CheckIcon, ExternalLinkIcon } from "lucide-react";
import { Icon } from "@/features/auth/components/icon";
import type { IconName } from "@/features/auth/components/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/features/requests/components/status-badge";
import { cn } from "@/lib/utils";
import { useAdminRequests, useAdminRequestDetail } from "@/features/listings/api/admin-api";
import { useStaffConfirmPayment } from "@/features/payments/api";
import type { RequestListItem } from "@/features/requests/api/types";

// ── Helpers ──
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtMoney(amount: string | number, currency: string) {
  const sym: Record<string, string> = { NGN: "\u20A6", USD: "$", GBP: "\u00A3", EUR: "\u20AC" };
  return `${sym[currency] ?? currency}${Number(amount).toLocaleString("en-NG")}`;
}

type TabKey = "payment_submitted" | "paid" | "active" | "completed";

const TABS: { key: TabKey; label: string }[] = [
  { key: "payment_submitted", label: "Awaiting Verification" },
  { key: "paid", label: "Confirmed" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];

// ── KPI Card ──
function KpiCard({ icon, label, value, accent }: { icon: IconName; label: string; value: number; accent: string }) {
  return (
    <div className="group/kpi relative isolate flex min-w-0 overflow-hidden rounded-2xl border border-(--brc-border) bg-white p-[1px] shadow-[var(--brc-shadow-xs)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-transparent hover:shadow-[0_18px_38px_rgba(0,0,139,0.12)]">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover/kpi:opacity-100" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <div className="relative z-10 flex w-full min-w-0 flex-col gap-3 rounded-[calc(1rem-1px)] bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 ease-out group-hover/kpi:scale-110 group-hover/kpi:-rotate-3 sm:size-11" style={{ background: `color-mix(in srgb, ${accent} 13%, #fff)`, borderColor: `color-mix(in srgb, ${accent} 22%, transparent)` }}>
            <Icon name={icon} size={21} stroke={accent} />
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-[26px] font-extrabold leading-none tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)] sm:text-[36px]">{value}</span>
          <span className="truncate text-xs font-semibold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{label}</span>
        </div>
      </div>
    </div>
  );
}

// ── Review drawer for payment verification ──
function PaymentDrawer({ requestId, open, onClose, onConfirmed }: {
  requestId: string | null; open: boolean; onClose: () => void; onConfirmed: () => void;
}) {
  const { data: req } = useAdminRequestDetail(open ? requestId : null);
  const confirmPayment = useStaffConfirmPayment();

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  async function handleConfirm() {
    if (!requestId) return;
    try {
      await confirmPayment.mutateAsync(requestId);
      toast.success("Payment confirmed — transaction created");
      onConfirmed();
      onClose();
    } catch {
      toast.error("Failed to confirm payment");
    }
  }

  const car = req?.car;
  const primaryImage = car?.images?.find((img) => img.is_primary)?.image ?? car?.images?.[0]?.image;
  const ownerName = car ? `${car.owner.first_name} ${car.owner.last_name}` : "";
  const customerName = req ? `${req.customer.first_name} ${req.customer.last_name}` : "";
  const canConfirm = req?.status === "payment_submitted";

  return (
    <div aria-hidden={!open} className={cn("fixed inset-0 z-[100]", open ? "pointer-events-auto" : "pointer-events-none")}>
      <div onClick={onClose} className="absolute inset-0 transition-opacity duration-300" style={{ background: "rgba(18,18,18,0.42)", opacity: open ? 1 : 0 }} />
      <aside
        className="absolute bottom-0 right-0 top-0 flex w-full flex-col bg-white shadow-lg sm:w-[min(560px,92vw)]"
        style={{ transform: open ? "translateX(0)" : "translateX(102%)", transition: "transform .34s cubic-bezier(.2,.8,.2,1)" }}
      >
        {!req ? (
          <div className="flex flex-1 flex-col gap-4 p-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-[200px] w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-(--brc-border) px-6 py-[18px]">
              <div className="min-w-0 flex-1">
                <span className="block truncate text-lg font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">Payment Verification</span>
                <span className="text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  {req.request_type === "rent" ? "Rental" : "Purchase"} request · {formatDate(req.created_at)}
                </span>
              </div>
              <StatusBadge status={req.status} />
              <button onClick={onClose} aria-label="Close" className="flex size-[34px] shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-(--brc-bg-subtle)">
                <XIcon size={17} className="text-(--brc-text)" />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
              {/* Car info */}
              <section className="flex items-center gap-4 rounded-xl border border-(--brc-border) p-4">
                {primaryImage ? (
                  <Image src={primaryImage} alt={car?.title ?? ""} width={80} height={60} className="rounded-lg object-cover" />
                ) : (
                  <span className="flex size-[60px] items-center justify-center rounded-lg bg-(--brc-bg-subtle)">
                    <Icon name="car" size={24} stroke="var(--brc-text-muted)" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{car?.title}</span>
                  <span className="text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{car?.year} · {car?.brand} {car?.model}</span>
                </div>
              </section>

              {/* Amount */}
              <section className="rounded-xl bg-(--brc-primary-tint) p-5">
                <span className="text-xs font-semibold uppercase tracking-widest text-(--brc-primary) [font-family:var(--brc-font-ui)]">Amount</span>
                <span className="mt-1 block text-[32px] font-extrabold text-(--brc-primary) [font-family:var(--brc-font-display)]">
                  {fmtMoney(req.price_offered, req.currency)}
                </span>
                {req.payment_method_choice && (
                  <span className="mt-1 text-sm text-(--brc-primary)/70 [font-family:var(--brc-font-ui)]">
                    via {req.payment_method_choice === "transfer" ? "Bank Transfer" : "Card"}
                  </span>
                )}
              </section>

              {/* Parties */}
              <section className="flex flex-col gap-3">
                <h3 className="m-0 text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Parties</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0 rounded-lg border border-(--brc-border) p-3.5">
                    <span className="block truncate text-[11px] font-semibold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Customer (Payer)</span>
                    <span className="mt-1 block truncate text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{customerName}</span>
                  </div>
                  <div className="min-w-0 rounded-lg border border-(--brc-border) p-3.5">
                    <span className="block truncate text-[11px] font-semibold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Owner (Receiver)</span>
                    <span className="mt-1 block truncate text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{ownerName}</span>
                  </div>
                </div>
              </section>

              {/* Request details */}
              <section className="flex flex-col gap-3">
                <h3 className="m-0 text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Request Details</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Type", req.request_type === "rent" ? "Rental" : "Purchase"],
                    ["Duration", req.duration_days ? `${req.duration_days} days` : "—"],
                    ["Start Date", req.start_date ? formatDate(req.start_date) : "—"],
                    ["Submitted", formatDate(req.created_at)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex flex-col gap-[3px] rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-3 py-2.5">
                      <span className="text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{label}</span>
                      <span className="text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">{value}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Receipt */}
              {req.payment_receipt && (
                <section className="flex flex-col gap-3">
                  <h3 className="m-0 text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Payment Receipt</h3>
                  <div className="overflow-hidden rounded-xl border border-(--brc-border)">
                    {req.payment_receipt.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                      <Image src={req.payment_receipt} alt="Payment receipt" width={500} height={300} className="w-full object-contain" />
                    ) : (
                      <a href={req.payment_receipt} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 text-sm font-semibold text-(--brc-primary) no-underline hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]">
                        <Icon name="file" size={20} stroke="var(--brc-primary)" />
                        View Receipt (PDF)
                        <ExternalLinkIcon size={14} />
                      </a>
                    )}
                  </div>
                </section>
              )}

              {/* Message */}
              {req.message && (
                <section className="flex flex-col gap-3">
                  <h3 className="m-0 text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Customer Message</h3>
                  <p className="m-0 text-sm leading-relaxed text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">{req.message}</p>
                </section>
              )}

              {/* Status events */}
              {req.status_events.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h3 className="m-0 text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Status History</h3>
                  <div className="relative ml-4 border-l-2 border-(--brc-border) pl-5">
                    {req.status_events.map((event, i) => (
                      <div key={event.id} className="relative pb-4 last:pb-0">
                        <span className="absolute left-[-25px] top-0.5 size-3 rounded-full border-2 border-white" style={{ background: i === req.status_events.length - 1 ? "var(--brc-primary)" : "var(--brc-border)" }} />
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={event.to_status} />
                          </div>
                          {event.note && <p className="m-0 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">{event.note}</p>}
                          <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{event.actor_name} · {formatDate(event.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Action bar */}
            <div className="shrink-0 border-t border-(--brc-border) bg-white px-6 py-3.5">
              {canConfirm ? (
                <div className="flex flex-col gap-2.5">
                  <div className="flex gap-2.5">
                    <button type="button" onClick={onClose}
                      className="flex h-[46px] flex-1 cursor-pointer items-center justify-center rounded-lg border border-(--brc-border) bg-white text-sm font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]">
                      Close
                    </button>
                    <button type="button" disabled={confirmPayment.isPending} onClick={handleConfirm}
                      className="flex h-[46px] flex-[2] cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-(--brc-success) text-sm font-bold text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 [font-family:var(--brc-font-ui)]">
                      {confirmPayment.isPending ? <Loader2Icon size={16} className="animate-spin" /> : <CheckIcon size={16} />}
                      Confirm Payment
                    </button>
                  </div>
                  <span className="text-center text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                    This will create a transaction and mark the request as paid.
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 py-1">
                  <CheckIcon size={16} className="text-(--brc-success)" />
                  <span className="text-sm font-semibold text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                    Payment already verified
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

// ── Mobile card (md:hidden) ──
function MobileRequestCard({ req, onOpen }: { req: RequestListItem; onOpen: (req: RequestListItem) => void }) {
  return (
    <div
      onClick={() => onOpen(req)}
      className="cursor-pointer rounded-xl border border-(--brc-border) bg-white p-4 shadow-[var(--brc-shadow-xs)] transition-colors active:bg-(--brc-bg-subtle)"
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
          <span className="block truncate text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">{fmtMoney(req.price_offered, req.currency)}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          {req.request_type === "rent" ? "Rent" : "Buy"} · {formatDate(req.created_at)}
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpen(req); }}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-(--brc-border) bg-white px-3 text-[13px] font-bold text-(--brc-primary) [font-family:var(--brc-font-ui)]"
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

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState<TabKey>("payment_submitted");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: paginatedData, isLoading, isFetching } = useAdminRequests({
    status: tab,
    search: debouncedSearch || undefined,
    page,
  });

  const showSkeleton = isLoading || (isFetching && !paginatedData);
  const requests = paginatedData?.results ?? [];
  const totalCount = paginatedData?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Counts for KPIs
  const { data: awaitingData } = useAdminRequests({ status: "payment_submitted" });
  const { data: confirmedData } = useAdminRequests({ status: "paid" });
  const { data: activeData } = useAdminRequests({ status: "active" });
  const { data: completedData } = useAdminRequests({ status: "completed" });

  const counts = useMemo(() => ({
    payment_submitted: awaitingData?.count ?? 0,
    paid: confirmedData?.count ?? 0,
    active: activeData?.count ?? 0,
    completed: completedData?.count ?? 0,
  }), [awaitingData?.count, confirmedData?.count, activeData?.count, completedData?.count]);

  const [drawerRequestId, setDrawerRequestId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function openDrawer(req: RequestListItem) {
    setDrawerRequestId(req.id);
    setDrawerOpen(true);
  }

  return (
    <>
      {/* Hero */}
      <section className="border-b border-(--brc-border) bg-white">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-end justify-between gap-8 px-4 pb-8 pt-10 sm:px-6 lg:px-(--brc-space-10,40px)">
          <div className="max-w-[580px]">
            <span className="text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              Moderation · Payment desk
            </span>
            <h1 className="mt-3 text-[clamp(32px,5vw,44px)] font-extrabold leading-tight tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
              Payment Verification
            </h1>
            <p className="mt-2.5 text-base leading-relaxed text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              Review and confirm customer payments before they&apos;re processed.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-(--brc-space-10,40px)">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-[18px] lg:grid-cols-4">
          <KpiCard icon="clock" label="Awaiting Verification" value={counts.payment_submitted} accent="#C8870B" />
          <KpiCard icon="check" label="Confirmed" value={counts.paid} accent="var(--brc-success)" />
          <KpiCard icon="car" label="Active Rentals" value={counts.active} accent="var(--brc-primary)" />
          <KpiCard icon="banknote" label="Completed" value={counts.completed} accent="var(--brc-accent)" />
        </div>

        {/* Table card */}
        <div className="flex flex-col gap-4 rounded-2xl border border-(--brc-border) bg-white p-4 shadow-[var(--brc-shadow-xs)] sm:p-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h2 className="m-0 text-xl font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">Payment queue</h2>
              <p className="mt-1 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Customer payments awaiting verification</p>
            </div>
            {counts.payment_submitted > 0 && (
              <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-(--brc-warning-bg) px-3.5 py-1.5 text-[13px] font-bold text-[#9a7400] [font-family:var(--brc-font-ui)]">
                <span className="size-[7px] rounded-full bg-[#C8870B]" />
                {counts.payment_submitted} awaiting
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto border-b border-(--brc-border)">
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <button key={t.key} type="button" onClick={() => { setTab(t.key); setPage(1); }}
                  className={cn("relative flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-none bg-transparent px-3.5 pb-3 pt-2.5 text-sm transition-colors [font-family:var(--brc-font-ui)]", active ? "font-bold text-(--brc-primary)" : "font-medium text-(--brc-text-muted) hover:text-(--brc-text)")}>
                  {t.label}
                  <span className={cn("inline-flex h-[18px] items-center rounded-full px-[7px] text-[11px] font-bold", active ? "bg-(--brc-primary-tint) text-(--brc-primary)" : "bg-(--brc-bg-muted) text-(--brc-text-muted)")}>
                    {counts[t.key]}
                  </span>
                  {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-(--brc-primary)" />}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="flex h-10 w-full items-center gap-2 rounded-xl border border-(--brc-border) bg-white px-3 sm:w-72">
            <SearchIcon size={18} className="text-(--brc-text-muted)" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search car, customer or owner"
              className="flex-1 border-none bg-transparent text-sm text-(--brc-text) outline-none placeholder:text-(--brc-text-muted) [font-family:var(--brc-font-ui)]" />
          </div>

          {/* Loading bar */}
          {isFetching && !showSkeleton && (
            <div className="h-0.5 w-full overflow-hidden rounded-full bg-(--brc-bg-muted)">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-(--brc-primary)" />
            </div>
          )}

          {/* Table / Mobile list */}
          {showSkeleton ? (
            <div className="flex flex-col gap-2 md:gap-1">
              <Skeleton className="hidden h-12 w-full rounded-lg md:block" />
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg md:rounded-none" />)}
            </div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">No requests match your filters.</div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="flex flex-col gap-3 md:hidden">
                {requests.map((req) => (
                  <MobileRequestCard key={req.id} req={req} onOpen={openDrawer} />
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse" style={{ minWidth: 860 }}>
                <thead>
                  <tr className="bg-(--brc-bg-subtle)">
                    <th className="rounded-l-lg px-4 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Car</th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Customer</th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Type</th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Amount</th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Date</th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Status</th>
                    <th className="rounded-r-lg px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req, i) => (
                    <tr key={req.id} onClick={() => openDrawer(req)}
                      className="group/row relative cursor-pointer transition-[background-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:bg-[rgba(0,0,139,0.035)] hover:shadow-[0_16px_34px_rgba(0,0,139,0.10)]"
                      style={{ borderBottom: i === requests.length - 1 ? "none" : "1px solid var(--brc-border)" }}>
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
                      <td className="px-3 py-3 text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                        {fmtMoney(req.price_offered, req.currency)}
                      </td>
                      <td className="px-3 py-3 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                        {formatDate(req.created_at)}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => openDrawer(req)}
                          className="group/btn inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-lg border border-(--brc-border) bg-white px-3 text-[13px] font-bold text-(--brc-primary) shadow-[0_4px_10px_rgba(18,18,18,0.03)] transition-all duration-250 hover:-translate-y-0.5 hover:border-(--brc-primary) hover:bg-(--brc-primary) hover:text-white hover:shadow-[0_10px_18px_rgba(0,0,139,0.16)] [font-family:var(--brc-font-ui)]">
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
                className="flex size-[34px] cursor-pointer items-center justify-center rounded-md border border-(--brc-border) bg-white text-sm font-semibold transition-colors disabled:cursor-default disabled:opacity-60 [font-family:var(--brc-font-ui)]">
                <Icon name="chevleft" size={16} stroke={page === 1 ? "var(--brc-border)" : "var(--brc-text)"} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" onClick={() => setPage(n)}
                  className="flex size-[34px] cursor-pointer items-center justify-center rounded-md border text-sm font-semibold transition-colors [font-family:var(--brc-font-ui)]"
                  style={{ background: n === page ? "var(--brc-primary)" : "#fff", color: n === page ? "#fff" : "var(--brc-text)", borderColor: "var(--brc-border)" }}>
                  {n}
                </button>
              ))}
              <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex size-[34px] cursor-pointer items-center justify-center rounded-md border border-(--brc-border) bg-white text-sm font-semibold transition-colors disabled:cursor-default disabled:opacity-60 [font-family:var(--brc-font-ui)]">
                <Icon name="chevright" size={16} stroke={page === totalPages ? "var(--brc-border)" : "var(--brc-text)"} />
              </button>
            </div>
          )}

          {!showSkeleton && requests.length > 0 && (
            <span className="text-center text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} requests
            </span>
          )}
        </div>
      </div>

      <PaymentDrawer
        key={`${drawerRequestId ?? "empty"}-${drawerOpen ? "open" : "closed"}`}
        requestId={drawerRequestId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onConfirmed={() => {
          // Refetch happens via query invalidation in the hook
        }}
      />
    </>
  );
}
