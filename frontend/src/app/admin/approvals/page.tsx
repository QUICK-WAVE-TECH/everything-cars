"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { XIcon, CheckIcon, SearchIcon, Loader2Icon } from "lucide-react";
import { Icon } from "@/features/auth/components/icon";
import type { IconName } from "@/features/auth/components/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useAdminCars,
  useAdminCarDetail,
  useAdminCarStatus,
  useApproveListing,
  useRequestChanges,
  useAdminCarCounts,
  useAdminCarHistory,
} from "@/features/listings/api/admin-api";
import type { CarListItem } from "@/features/listings/api/types";
import { CarStatusTimeline } from "@/features/listings/components/car-status-timeline";
import {
  useStaffBookings,
  useStartInspection,
  useMarkNoShow,
  useResolveClearance,
} from "@/features/inspections/api/inspections-api";

// ── Types ──
type TabKey =
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

const TABS: { key: TabKey; label: string }[] = [
  { key: "draft", label: "Pending Review" },
  { key: "listing_approved", label: "Approved for Booking" },
  { key: "inspection_pending", label: "Awaiting Inspection" },
  { key: "inspection_in_progress", label: "In Progress" },
  { key: "needs_clearance", label: "Needs Clearance" },
  { key: "inspection_no_show", label: "No Show" },
  { key: "inspection_rejected", label: "Rejected" },
  { key: "needs_changes", label: "Needs Changes" },
  { key: "published", label: "Published" },
  { key: "suspended", label: "Suspended" },
];

// ── Helpers ──
function formatDate(value: string) {
  // Date-only strings must be parsed by parts — new Date("YYYY-MM-DD") is
  // interpreted as UTC midnight and renders a day early west of Greenwich.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(time: string) {
  // time is "HH:MM:SS" or "HH:MM"
  const [h, m] = time.split(":");
  const hour = Number(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function formatPrice(item: CarListItem) {
  const sym = item.currency === "NGN" ? "₦" : item.currency === "USD" ? "$" : item.currency;
  const parts: string[] = [];
  if (item.rent_price_per_day) parts.push(`${sym}${Number(item.rent_price_per_day).toLocaleString("en-NG")}/day`);
  if (item.sale_price) parts.push(`${sym}${Number(item.sale_price).toLocaleString("en-NG")}`);
  return parts.join(" · ") || "—";
}

function listingTypeLabel(t: string) {
  if (t === "both") return "Rent · Buy";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// ── Status pill ──
const STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  draft: { bg: "var(--brc-bg-muted)", fg: "var(--brc-text-muted)", label: "Pending Review" },
  listing_approved: { bg: "var(--brc-success-bg)", fg: "var(--brc-success)", label: "Approved for Booking" },
  inspection_pending: { bg: "var(--brc-warning-bg)", fg: "#9a7400", label: "Awaiting Inspection" },
  inspection_in_progress: { bg: "#e0e7ff", fg: "#4338ca", label: "In Progress" },
  needs_clearance: { bg: "#ffe0cc", fg: "#b34700", label: "Needs Clearance" },
  inspection_rejected: { bg: "var(--brc-danger-bg)", fg: "var(--brc-danger)", label: "Inspection Rejected" },
  inspection_no_show: { bg: "#ffe0cc", fg: "#b34700", label: "No Show" },
  needs_changes: { bg: "var(--brc-accent-bg)", fg: "var(--brc-accent)", label: "Needs Changes" },
  published: { bg: "var(--brc-success-bg)", fg: "var(--brc-success)", label: "Published" },
  suspended: { bg: "var(--brc-danger-bg)", fg: "var(--brc-danger)", label: "Suspended" },
  archived: { bg: "var(--brc-bg-muted)", fg: "var(--brc-text-muted)", label: "Archived" },
  paused: { bg: "var(--brc-accent-bg)", fg: "var(--brc-accent)", label: "Paused" },
};

function AdminStatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.draft!;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold [font-family:var(--brc-font-ui)]" style={{ background: s.bg, color: s.fg }}>
      <span className="size-1.5 rounded-full" style={{ background: s.fg }} />
      {s.label}
    </span>
  );
}

// ── Type chip ──
function TypeChip({ type }: { type: string }) {
  const label = listingTypeLabel(type);
  const colors: Record<string, { bg: string; fg: string }> = {
    rent: { bg: "var(--brc-primary-tint)", fg: "var(--brc-primary)" },
    buy: { bg: "var(--brc-accent-bg)", fg: "var(--brc-accent)" },
    both: { bg: "var(--brc-bg-muted)", fg: "var(--brc-text-secondary)" },
  };
  const c = colors[type] || colors.rent!;
  return (
    <span className="whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold [font-family:var(--brc-font-ui)]" style={{ background: c.bg, color: c.fg }}>
      {label}
    </span>
  );
}

// ── Trend pill ──
function TrendPill({ tone = "neutral", children }: { tone?: "up" | "warn" | "neutral"; children: React.ReactNode }) {
  const colors = {
    up: { bg: "var(--brc-success-bg)", fg: "var(--brc-success)" },
    warn: { bg: "var(--brc-warning-bg)", fg: "#9a7400" },
    neutral: { bg: "var(--brc-bg-muted)", fg: "var(--brc-text-muted)" },
  };
  const c = colors[tone];
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold [font-family:var(--brc-font-ui)]" style={{ background: c.bg, color: c.fg }}>
      {children}
    </span>
  );
}

// ── KPI Card ──
function KpiCard({ icon, label, value, accent, sub, share }: {
  icon: IconName; label: string; value: number; accent: string; sub: React.ReactNode; share: number;
}) {
  return (
    <div className="group/kpi relative isolate flex min-w-[200px] flex-1 overflow-hidden rounded-2xl border border-(--brc-border) bg-white p-[1px] shadow-[var(--brc-shadow-xs)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-transparent hover:shadow-[0_18px_38px_rgba(0,0,139,0.12)]">
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover/kpi:opacity-100"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <span
        className="pointer-events-none absolute -right-12 -top-16 size-36 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover/kpi:opacity-20"
        style={{ background: accent }}
      />
      <div className="relative z-10 flex w-full flex-col gap-[18px] rounded-[calc(1rem-1px)] bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <span
            className="flex size-11 items-center justify-center rounded-xl border transition-transform duration-300 ease-out group-hover/kpi:scale-110 group-hover/kpi:-rotate-3"
            style={{ background: `color-mix(in srgb, ${accent} 13%, #fff)`, borderColor: `color-mix(in srgb, ${accent} 22%, transparent)` }}
          >
            <Icon name={icon} size={21} stroke={accent} />
          </span>
          {sub}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[40px] font-extrabold leading-none tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)]">{value}</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{label}</span>
        </div>
        <div className="h-[5px] overflow-hidden rounded-full bg-(--brc-bg-muted)">
          <div className="h-full rounded-full transition-all duration-500 group-hover/kpi:brightness-110" style={{ width: `${Math.round(Math.min(1, share) * 100)}%`, background: accent }} />
        </div>
      </div>
    </div>
  );
}

// ── Admin checklist ──
const CHECKLIST = [
  "Photos clearly show the actual car",
  "Listing details match uploaded documents",
  "Price is within a reasonable market range",
  "Owner identity & contact are verified",
];

// ── Inspection Booking Card ──
function InspectionBookingCard({ carId, trackingId, phase }: { carId: string; trackingId: string | null; phase: "pending" | "in_progress" }) {
  const { data: bookingsData, isLoading } = useStaffBookings({ status: "pending", car: carId });
  const bookingResults = bookingsData?.results;

  const booking = useMemo(() => {
    if (!bookingResults) return null;
    return bookingResults.find((b) => b.car_id === carId) ?? null;
  }, [bookingResults, carId]);

  const cardStyle = phase === "pending"
    ? { background: "#f0f4ff", borderColor: "#d0dcff" }
    : { background: "#eef2ff", borderColor: "#c7d2fe" };

  const labelColor = phase === "pending" ? "#1d4ed8" : "#4338ca";

  if (isLoading) {
    return (
      <div className="rounded-xl border p-4" style={cardStyle}>
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="rounded-xl border p-4" style={cardStyle}>
        <span className="text-sm font-semibold [font-family:var(--brc-font-ui)]" style={{ color: labelColor }}>
          No inspection booking found for this listing.
        </span>
      </div>
    );
  }

  const slot = booking.slot;

  return (
    <div className="rounded-xl border p-4" style={cardStyle}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="block min-w-0 text-[13px] font-bold uppercase tracking-widest [font-family:var(--brc-font-ui)]" style={{ color: labelColor }}>
          {phase === "pending" ? "Inspection Booking — Awaiting Start" : "Inspection Booking — In Progress"}
        </span>
        {trackingId && (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold tabular-nums text-(--brc-text) [font-family:var(--brc-font-ui)]">
            #{trackingId}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-[3px] rounded-lg bg-white/70 px-3 py-2.5">
          <span className="text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Date</span>
          <span className="text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">
            {formatDate(slot.date)}
          </span>
        </div>
        <div className="flex flex-col gap-[3px] rounded-lg bg-white/70 px-3 py-2.5">
          <span className="text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Time</span>
          <span className="text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">
            {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
          </span>
        </div>
        <div className="col-span-2 flex flex-col gap-[3px] rounded-lg bg-white/70 px-3 py-2.5">
          <span className="text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Inspection Center</span>
          <span className="truncate text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">{slot.center.company_name}</span>
          <span className="truncate text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{slot.center.address}, {slot.center.city}</span>
        </div>
        <div className="flex flex-col gap-[3px] rounded-lg bg-white/70 px-3 py-2.5">
          <span className="text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Owner</span>
          <span className="truncate text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">{booking.booked_by_name}</span>
        </div>
        {booking.reschedule_count > 0 && (
          <div className="flex flex-col gap-[3px] rounded-lg bg-white/70 px-3 py-2.5">
            <span className="text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Reschedules</span>
            <span className="text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">{booking.reschedule_count}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Review Drawer ──
function ReviewDrawer({ carId, open, onClose, onAction, isActing }: {
  carId: string | null; open: boolean; onClose: () => void;
  onAction: (carId: string, status: string, note?: string) => void; isActing: boolean;
}) {
  const router = useRouter();
  const { data: car } = useAdminCarDetail(open ? carId : null);
  const [checks, setChecks] = useState<number[]>([]);
  const [activeImg, setActiveImg] = useState(0);
  const [noteMode, setNoteMode] = useState<"changes" | null>(null);
  const [staffNote, setStaffNote] = useState("");

  const approveListing = useApproveListing();
  const requestChanges = useRequestChanges();
  const startInspection = useStartInspection();
  const markNoShow = useMarkNoShow();
  const resolveClearance = useResolveClearance();

  const isDraft = car?.status === "draft";
  const isListingApproved = car?.status === "listing_approved";
  const isInspectionPending = car?.status === "inspection_pending";
  const isInspectionInProgress = car?.status === "inspection_in_progress";
  const isNeedsClearance = car?.status === "needs_clearance";

  // Fetch the relevant booking directly instead of depending on the first page
  // of the admin booking list.
  const { data: bookingsData } = useStaffBookings({
    status: "pending",
    car: carId ?? undefined,
  });
  const drawerBookingResults = bookingsData?.results;
  const booking = useMemo(() => {
    if (!drawerBookingResults || !carId) return null;
    return drawerBookingResults.find((b) => b.car_id === carId) ?? null;
  }, [drawerBookingResults, carId]);

  // Full status timeline — also the source for owner clearance responses,
  // which are same-status annotation rows.
  const { data: carHistory, isLoading: historyLoading } = useAdminCarHistory(
    open ? carId : null,
  );
  const clearanceResponses = useMemo(
    () =>
      (carHistory ?? []).filter(
        (e) =>
          e.actor_role === "owner" &&
          e.from_status === "needs_clearance" &&
          e.to_status === "needs_clearance" &&
          e.note,
      ),
    [carHistory],
  );

  // needs_clearance cars have a COMPLETED booking — the pending query
  // above can't find it, so fetch completed bookings for resolution.
  const { data: completedData } = useStaffBookings({
    status: "completed",
    car: carId ?? undefined,
  });
  const completedResults = completedData?.results;
  const clearanceBooking = useMemo(() => {
    if (!completedResults || !carId) return null;
    return completedResults.find((b) => b.car_id === carId) ?? null;
  }, [completedResults, carId]);

  const allChecked = checks.length === CHECKLIST.length;
  const reviewable = isDraft;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  // Reset note state when drawer opens/closes or car changes
  // (state-adjustment-during-render pattern — avoids an effect re-render)
  const resetKey = `${carId ?? "none"}-${open}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setNoteMode(null);
    setStaffNote("");
    setChecks([]);
    setActiveImg(0);
  }

  function toggle(i: number) {
    setChecks((c) => c.includes(i) ? c.filter((x) => x !== i) : [...c, i]);
  }

  // Build price cards
  const prices: { label: string; value: string; unit?: string }[] = [];
  if (car?.rent_price_per_day) {
    const sym = car.currency === "NGN" ? "₦" : car.currency;
    prices.push({ label: "Rental price", value: `${sym}${Number(car.rent_price_per_day).toLocaleString("en-NG")}`, unit: "/day" });
  }
  if (car?.sale_price) {
    const sym = car.currency === "NGN" ? "₦" : car.currency;
    prices.push({ label: "Sale price", value: `${sym}${Number(car.sale_price).toLocaleString("en-NG")}` });
  }

  const images = car?.images ?? [];

  // ── Action handlers ──
  async function handleApproveListing() {
    if (!car) return;
    try {
      await approveListing.mutateAsync(car.id);
      toast.success("Listing approved — owner can now book an inspection");
      onClose();
    } catch { toast.error("Failed to approve listing"); }
  }

  async function handleRequestChanges() {
    if (!car || !staffNote.trim()) return;
    try {
      await requestChanges.mutateAsync({ carId: car.id, note: staffNote.trim() });
      toast.success("Changes requested — owner will be notified");
      onClose();
    } catch { toast.error("Failed to request changes"); }
  }

  async function handleStartInspection() {
    if (!car || !booking) return;
    try {
      await startInspection.mutateAsync(booking.id);
      toast.success("Inspection started");
      onClose();
      router.push(`/admin/inspections/${booking.id}/inspect`);
    } catch { toast.error("Failed to start inspection"); }
  }

  function handleContinueInspection() {
    if (!booking) return;
    onClose();
    router.push(`/admin/inspections/${booking.id}/inspect`);
  }

  async function handleNoShow() {
    if (!car || !booking) return;
    try {
      await markNoShow.mutateAsync({ bookingId: booking.id });
      toast.success("Marked as no-show");
      onClose();
    } catch { toast.error("Failed to mark no-show"); }
  }

  async function handleResolveClearance(action: "publish" | "reject") {
    if (!car || !clearanceBooking) return;
    if (action === "reject" && !staffNote.trim()) return;
    try {
      await resolveClearance.mutateAsync({
        bookingId: clearanceBooking.id,
        action,
        staff_note: staffNote.trim() || undefined,
      });
      toast.success(
        action === "publish"
          ? "Clearance resolved — listing published"
          : "Clearance rejected — inspection failed",
      );
      onClose();
    } catch { toast.error("Failed to resolve clearance"); }
  }

  const isSectionActing = approveListing.isPending || requestChanges.isPending || startInspection.isPending || markNoShow.isPending || resolveClearance.isPending;
  const anyActing = isActing || isSectionActing;

  return (
    <div aria-hidden={!open} className={cn("fixed inset-0 z-[100]", open ? "pointer-events-auto" : "pointer-events-none")}>
      <div onClick={onClose} className="absolute inset-0 transition-opacity duration-300" style={{ background: "rgba(18,18,18,0.42)", opacity: open ? 1 : 0 }} />
      <aside
        className="absolute bottom-0 right-0 top-0 flex w-full flex-col bg-white shadow-lg sm:w-[min(560px,92vw)]"
        style={{ transform: open ? "translateX(0)" : "translateX(102%)", transition: "transform .34s cubic-bezier(.2,.8,.2,1)" }}
      >
        {!car ? (
          <div className="flex flex-1 flex-col gap-4 p-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-[240px] w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <div className="grid grid-cols-2 gap-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-(--brc-border) px-6 py-[18px]">
              <div className="min-w-0 flex-1">
                <span className="block truncate text-lg font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{car.title}</span>
                <span className="text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  {car.year} · {car.body_type || car.brand} · submitted {formatDate(car.created_at)}
                  {car.tracking_id ? ` · #${car.tracking_id}` : ""}
                </span>
              </div>
              <AdminStatusBadge status={car.status} />
              <button onClick={onClose} aria-label="Close review" className="flex size-[34px] shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-(--brc-bg-subtle)">
                <XIcon size={17} className="text-(--brc-text)" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex flex-1 flex-col gap-7 overflow-y-auto p-6">
              {/* Inspection booking info card */}
              {isInspectionPending && carId && (
                <InspectionBookingCard carId={carId} trackingId={car.tracking_id} phase="pending" />
              )}
              {isInspectionInProgress && carId && (
                <InspectionBookingCard carId={carId} trackingId={car.tracking_id} phase="in_progress" />
              )}

              {/* Gallery with arrows + thumbnails + counter */}
              {images.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <div className="relative h-[240px] overflow-hidden rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle)">
                    <Image src={images[activeImg]?.image ?? ""} alt={car.title} fill className="object-cover" />
                    {images.length > 1 && (
                      <>
                        <button type="button" onClick={() => setActiveImg((i) => (i === 0 ? images.length - 1 : i - 1))} className="absolute left-2.5 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-(--brc-border) bg-white/95 shadow-sm">
                          <Icon name="chevleft" size={16} stroke="var(--brc-text)" />
                        </button>
                        <button type="button" onClick={() => setActiveImg((i) => (i === images.length - 1 ? 0 : i + 1))} className="absolute right-2.5 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-(--brc-border) bg-white/95 shadow-sm">
                          <Icon name="chevright" size={16} stroke="var(--brc-text)" />
                        </button>
                      </>
                    )}
                    <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/70 px-2.5 py-[3px] text-[11px] font-semibold text-white">{activeImg + 1} / {images.length}</span>
                  </div>
                  {images.length > 1 && (
                    <div className="flex gap-2">
                      {images.map((img, i) => (
                        <button key={img.id} type="button" onClick={() => setActiveImg(i)}
                          className={cn("relative h-[46px] w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 bg-(--brc-bg-subtle) p-0 transition-all", i === activeImg ? "border-(--brc-primary) opacity-100" : "border-(--brc-border) opacity-75 hover:opacity-100")}>
                          <Image src={img.thumbnail ?? img.image} alt="" fill className="object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Price cards */}
              {prices.length > 0 && (
                <div className="flex gap-3">
                  {prices.map((p) => (
                    <div key={p.label} className="flex flex-1 flex-col gap-1 rounded-xl bg-(--brc-primary-tint) p-4">
                      <span className="text-xs font-semibold text-(--brc-primary) [font-family:var(--brc-font-ui)]">{p.label}</span>
                      <span className="text-[22px] font-extrabold text-(--brc-primary) [font-family:var(--brc-font-display)]">
                        {p.value}<span className="text-[13px] font-semibold">{p.unit ?? ""}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Specs */}
              <section className="flex flex-col gap-3">
                <h3 className="m-0 text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Car specifications</h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
                  {[
                    ["Brand", car.brand], ["Model", car.model], ["Year", String(car.year)],
                    ["Body Type", car.body_type || "—"], ["Transmission", car.transmission || "—"],
                    ["Fuel", car.fuel_type || "—"], ["Seats", String(car.seats)],
                    ["Mileage", car.mileage ? `${car.mileage.toLocaleString()} km` : "—"],
                    ["Colour", car.color || "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex flex-col gap-[3px] rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-3 py-2.5">
                      <span className="text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{label}</span>
                      <span className="truncate text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">{value}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Owner */}
              <section className="flex flex-col gap-3">
                <h3 className="m-0 text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Owner</h3>
                <div className="flex items-center gap-3.5 rounded-xl border border-(--brc-border) p-3.5">
                  <span className="flex size-[46px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--brc-border) bg-(--brc-primary-tint) text-base font-bold text-(--brc-primary) [font-family:var(--brc-font-ui)]">
                    {car.owner.first_name[0]}{car.owner.last_name[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{car.owner.first_name} {car.owner.last_name}</span>
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[11px] font-bold [font-family:var(--brc-font-ui)]", car.owner.is_verified ? "bg-(--brc-success-bg) text-(--brc-success)" : "bg-(--brc-warning-bg) text-[#9a7400]")}>
                        <Icon name={car.owner.is_verified ? "check" : "clock"} size={11} stroke="currentColor" />
                        {car.owner.is_verified ? "Verified" : "Unverified"}
                      </span>
                    </div>
                    <span className="mt-1 block truncate text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      {car.owner.email} · {car.owner.phone || "No phone"}
                    </span>
                    <span className="mt-0.5 block text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      {car.owner.listing_count} listing{car.owner.listing_count !== 1 ? "s" : ""} · member since {new Date(car.owner.date_joined).getFullYear()}
                    </span>
                  </div>
                </div>
              </section>

              {/* Location */}
              <section className="flex flex-col gap-3">
                <h3 className="m-0 text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Location</h3>
                <span className="inline-flex items-center gap-2 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                  <Icon name="pin" size={16} stroke="var(--brc-accent)" />
                  {car.state}{car.city ? `, ${car.city}` : ""}{car.country ? `, ${car.country}` : ""}
                </span>
              </section>

              {/* Description */}
              {car.description && (
                <section className="flex flex-col gap-3">
                  <h3 className="m-0 text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Description</h3>
                  <p className="m-0 text-sm leading-relaxed text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]" style={{ textWrap: "pretty" }}>{car.description}</p>
                </section>
              )}

              {/* Features */}
              {car.features && car.features.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h3 className="m-0 text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {car.features.map((f) => (
                      <span key={f.id} className="rounded-full bg-(--brc-bg-subtle) px-3 py-1.5 text-xs font-medium text-(--brc-text) [font-family:var(--brc-font-ui)]">
                        {f.name}{f.value ? `: ${f.value}` : ""}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Checklist — shown only for draft (pending review) */}
              {reviewable && (
                <section className="flex flex-col gap-3">
                  <h3 className="m-0 text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                    Admin checklist · {checks.length}/{CHECKLIST.length}
                  </h3>
                  <div className="flex flex-col gap-2">
                    {CHECKLIST.map((item, i) => {
                      const on = checks.includes(i);
                      return (
                        <button key={i} type="button" onClick={() => toggle(i)}
                          className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-[11px] text-left transition-all duration-150", on ? "border-(--brc-success) bg-(--brc-success-bg)" : "border-(--brc-border) bg-white")}>
                          <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md", on ? "bg-(--brc-success)" : "border-[1.5px] border-(--brc-border) bg-white")}>
                            {on && <CheckIcon size={13} className="text-white" strokeWidth={3} />}
                          </span>
                          <span className="text-sm text-(--brc-text) [font-family:var(--brc-font-ui)]">{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Status timeline */}
              <section className="flex flex-col gap-3">
                <h3 className="m-0 text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Status timeline</h3>
                <CarStatusTimeline
                  entries={carHistory ?? []}
                  loading={historyLoading}
                  viewer="staff"
                />
              </section>

              {/* Needs clearance note */}
              {isNeedsClearance && (
                <section className="flex flex-col gap-3">
                  <h3 className="m-0 text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Clearance note</h3>
                  {car.admin_note ? (
                    <div className="rounded-lg border border-[#f97316]/30 bg-[#fff7ed] p-3">
                      <p className="m-0 text-sm text-[#b34700] [font-family:var(--brc-font-ui)]">{car.admin_note}</p>
                    </div>
                  ) : (
                    <span className="text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">No clearance note recorded.</span>
                  )}

                  {clearanceResponses.length > 0 && (
                    <>
                      <h3 className="m-0 mt-1 text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Owner responses</h3>
                      {clearanceResponses.map((entry) => (
                        <div key={entry.id} className="rounded-lg border border-(--brc-primary)/20 bg-(--brc-primary-tint) p-3">
                          <p className="m-0 text-sm text-(--brc-text) [font-family:var(--brc-font-ui)]">{entry.note}</p>
                          <span className="mt-1 block text-[11px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                            Owner · {formatDate(entry.created_at)}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </section>
              )}
            </div>

            {/* Sticky action bar */}
            <div className="shrink-0 border-t border-(--brc-border) bg-white px-6 py-3.5">
              {/* ── draft: request changes note ── */}
              {isDraft && noteMode === "changes" ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <span className="text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">What needs to change?</span>
                    <p className="mt-1 text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">The owner will see this note on their listing detail page.</p>
                  </div>
                  <textarea
                    value={staffNote}
                    onChange={(e) => setStaffNote(e.target.value)}
                    placeholder="e.g. Photos are blurry — please upload clearer images of the car exterior and interior."
                    rows={3}
                    className="resize-none rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) p-3 text-sm leading-relaxed text-(--brc-text) outline-none placeholder:text-(--brc-text-muted) focus:border-(--brc-primary) [font-family:var(--brc-font-ui)]"
                  />
                  <div className="flex gap-2.5">
                    <button type="button" onClick={() => { setNoteMode(null); setStaffNote(""); }}
                      className="flex h-[46px] flex-1 cursor-pointer items-center justify-center rounded-lg border border-(--brc-border) bg-white text-sm font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]">
                      Cancel
                    </button>
                    <button type="button" disabled={anyActing || !staffNote.trim()} onClick={handleRequestChanges}
                      className="flex h-[46px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-(--brc-warning) text-sm font-bold text-[#121212] transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 [font-family:var(--brc-font-ui)]">
                      {anyActing ? <Loader2Icon size={16} className="animate-spin" /> : null}
                      Send to Owner
                    </button>
                  </div>
                </div>
              ) : isDraft ? (
                /* draft default: Approve for Inspection / Request Changes */
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2.5">
                    <button type="button" disabled={anyActing} onClick={() => setNoteMode("changes")}
                      className="flex h-[46px] flex-1 cursor-pointer items-center justify-center rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) text-sm font-bold text-(--brc-text) transition-colors hover:brightness-95 disabled:opacity-50 [font-family:var(--brc-font-ui)]">
                      Request Changes
                    </button>
                    <button type="button" disabled={anyActing || !allChecked} onClick={handleApproveListing}
                      className="flex h-[46px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-(--brc-success) text-sm font-bold text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45 [font-family:var(--brc-font-ui)]">
                      {anyActing ? <Loader2Icon size={16} className="animate-spin" /> : null}
                      Approve for Inspection
                    </button>
                  </div>
                  {!allChecked && <span className="text-center text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Complete the admin checklist to enable approval.</span>}
                </div>

              ) : isListingApproved ? (
                <span className="block text-center text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Waiting for the owner to book an inspection slot.</span>

              ) : isInspectionPending ? (
                /* Start Inspection / Mark No-Show */
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2.5">
                    <button type="button" disabled={anyActing || !booking} onClick={handleNoShow}
                      className="flex h-[46px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#f97316] bg-white text-sm font-bold text-[#b34700] transition-colors hover:bg-[#fff7ed] disabled:opacity-50 [font-family:var(--brc-font-ui)]">
                      {markNoShow.isPending ? <Loader2Icon size={16} className="animate-spin" /> : null}
                      Mark No-Show
                    </button>
                    <button type="button" disabled={anyActing || !booking} onClick={handleStartInspection}
                      className="flex h-[46px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-(--brc-primary) text-sm font-bold text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 [font-family:var(--brc-font-ui)]">
                      {startInspection.isPending ? <Loader2Icon size={16} className="animate-spin" /> : null}
                      Start Inspection
                    </button>
                  </div>
                  {!booking && (
                    <span className="text-center text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      No active booking found for this car — the owner may need to rebook.
                    </span>
                  )}
                </div>

              ) : isInspectionInProgress ? (
                <div className="flex flex-col gap-2">
                  <button type="button" disabled={!booking} onClick={handleContinueInspection}
                    className="group relative flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl border border-(--brc-primary)/15 bg-(--brc-primary) px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(0,0,139,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-(--brc-primary-hover) hover:shadow-[0_18px_38px_rgba(0,0,139,0.26)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brc-primary) focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 [font-family:var(--brc-font-ui)]">
                    <span className="relative z-10 whitespace-nowrap">Continue Inspection</span>
                    <span className="relative z-10 flex size-7 items-center justify-center rounded-lg bg-white/14 transition-transform duration-200 group-hover:translate-x-0.5">
                      <Icon name="chevright" size={15} stroke="currentColor" />
                    </span>
                  </button>
                  {!booking && (
                    <span className="text-center text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      No active booking found for this car — the owner may need to rebook.
                    </span>
                  )}
                </div>

              ) : isNeedsClearance ? (
                <div className="flex flex-col gap-3">
                  {car.admin_note && (
                    <div className="rounded-lg border border-[#f0c4a1] bg-[#ffe0cc] p-3">
                      <span className="text-xs font-bold text-[#b34700] [font-family:var(--brc-font-ui)]">Clearance required:</span>
                      <p className="mt-1 text-sm text-[#b34700] [font-family:var(--brc-font-ui)]">{car.admin_note}</p>
                    </div>
                  )}
                  <textarea
                    value={staffNote}
                    onChange={(e) => setStaffNote(e.target.value)}
                    rows={2}
                    placeholder="Resolution note (required when rejecting)"
                    className="w-full resize-none rounded-lg border border-(--brc-border) bg-white p-3 text-sm text-(--brc-text) outline-none transition-colors focus:border-(--brc-primary) [font-family:var(--brc-font-ui)]"
                  />
                  <div className="flex gap-2.5">
                    <button type="button" disabled={anyActing || !clearanceBooking || !staffNote.trim()} onClick={() => handleResolveClearance("reject")}
                      className="flex h-[46px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-(--brc-danger) bg-white text-sm font-bold text-(--brc-danger) transition-colors hover:bg-(--brc-danger-bg) disabled:cursor-not-allowed disabled:opacity-50 [font-family:var(--brc-font-ui)]">
                      {resolveClearance.isPending ? <Loader2Icon size={16} className="animate-spin" /> : null}
                      Reject
                    </button>
                    <button type="button" disabled={anyActing || !clearanceBooking} onClick={() => handleResolveClearance("publish")}
                      className="flex h-[46px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-(--brc-success) text-sm font-bold text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 [font-family:var(--brc-font-ui)]">
                      {resolveClearance.isPending ? <Loader2Icon size={16} className="animate-spin" /> : null}
                      Clear & Publish
                    </button>
                  </div>
                  {!clearanceBooking && (
                    <span className="text-center text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Loading booking details…</span>
                  )}
                </div>

              ) : car.status === "inspection_no_show" ? (
                <span className="block text-center text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Owner missed the appointment — waiting for them to rebook.</span>
              ) : car.status === "inspection_rejected" ? (
                <span className="block text-center text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Inspection failed — waiting for the owner to fix the issues and resubmit.</span>
              ) : car.status === "needs_changes" ? (
                <div className="flex flex-col gap-3">
                  {car.admin_note && (
                    <div className="rounded-lg border border-(--brc-warning)/30 bg-(--brc-warning-bg) p-3">
                      <span className="text-xs font-bold text-[#9a7400] [font-family:var(--brc-font-ui)]">Changes requested:</span>
                      <p className="mt-1 text-sm text-[#9a7400] [font-family:var(--brc-font-ui)]">{car.admin_note}</p>
                    </div>
                  )}
                  <span className="text-center text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Waiting for owner to make changes and resubmit.</span>
                </div>
              ) : car.status === "suspended" ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">This listing has been suspended.</span>
                  <button type="button" disabled={anyActing} onClick={() => onAction(car.id, "published")}
                    className="flex h-[46px] cursor-pointer items-center gap-2 rounded-lg border-none bg-(--brc-success) px-5 text-sm font-bold text-white hover:brightness-95 disabled:opacity-50 [font-family:var(--brc-font-ui)]">
                    Reinstate
                  </button>
                </div>
              ) : car.status === "published" ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">This listing is currently live.</span>
                  <button type="button" disabled={anyActing} onClick={() => onAction(car.id, "suspended")}
                    className="flex h-[46px] cursor-pointer items-center rounded-lg border border-(--brc-danger) bg-white px-5 text-sm font-bold text-(--brc-danger) hover:bg-(--brc-danger-bg) disabled:opacity-50 [font-family:var(--brc-font-ui)]">
                    Suspend Listing
                  </button>
                </div>
              ) : (
                <span className="block text-center text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">This listing has already been processed.</span>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

// ── Page ──
const PAGE_SIZE = 20;

export default function AdminApprovalsPage() {
  const [tab, setTab] = useState<TabKey>("draft");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  // Debounce search — wait 400ms after typing stops
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: paginatedData, isLoading, isFetching } = useAdminCars({ status: tab, search: debouncedSearch || undefined, page });
  const showSkeleton = isLoading || (isFetching && !paginatedData);
  const adminStatus = useAdminCarStatus();
  const cars = paginatedData?.results ?? [];
  const totalCount = paginatedData?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const [drawerCarId, setDrawerCarId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Server-side aggregate — counting a single paginated page undercounts.
  const { data: rawCounts } = useAdminCarCounts();
  const counts = useMemo(() => ({
    draft: rawCounts?.draft ?? 0,
    listing_approved: rawCounts?.listing_approved ?? 0,
    inspection_pending: rawCounts?.inspection_pending ?? 0,
    inspection_in_progress: rawCounts?.inspection_in_progress ?? 0,
    needs_clearance: rawCounts?.needs_clearance ?? 0,
    inspection_no_show: rawCounts?.inspection_no_show ?? 0,
    inspection_rejected: rawCounts?.inspection_rejected ?? 0,
    needs_changes: rawCounts?.needs_changes ?? 0,
    published: rawCounts?.published ?? 0,
    suspended: rawCounts?.suspended ?? 0,
  }), [rawCounts]);
  const totalCars = useMemo(
    () => Object.values(rawCounts ?? {}).reduce((sum, n) => sum + n, 0),
    [rawCounts],
  );

  const approvalRate = Math.round((counts.published / Math.max(1, counts.published + counts.suspended)) * 100);

  const openDrawer = useCallback((car: CarListItem) => { setDrawerCarId(car.id); setDrawerOpen(true); }, []);

  async function handleAction(carId: string, status: string, note?: string) {
    try {
      await adminStatus.mutateAsync({ carId, status, note });
      const messages: Record<string, string> = {
        published: "Listing published",
        suspended: "Listing suspended",
      };
      toast.success(messages[status] ?? "Status updated");
      setDrawerOpen(false);
    } catch {
      toast.error("Failed to update listing status");
    }
  }

  return (
    <>
      {/* Hero band */}
      <section className="border-b border-(--brc-border) bg-white">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-end justify-between gap-8 px-4 pb-8 pt-10 sm:px-6 lg:px-[var(--brc-space-10,40px)]">
          <div className="max-w-[580px]">
            <span className="text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              Moderation · Review desk
            </span>
            <h1 className="mt-3 text-[clamp(32px,5vw,44px)] font-extrabold leading-tight tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
              Listing Approvals
            </h1>
            <p className="mt-2.5 text-base leading-relaxed text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              Review car listings submitted by owners before they go live.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              <span className="size-[7px] rounded-full bg-(--brc-success)" />
              Auto-sync on
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-[var(--brc-space-10,40px)]">
        {/* KPI Cards */}
        <div className="flex flex-wrap gap-[18px]">
          <KpiCard icon="clock" label="Pending Review" value={counts.draft} accent="#C8870B" share={counts.draft / Math.max(1, totalCars)}
            sub={<TrendPill tone={counts.draft > 0 ? "warn" : "up"}>{counts.draft > 0 ? `${counts.draft} awaiting` : "all clear"}</TrendPill>} />
          <KpiCard icon="clock" label="Inspection Pipeline" value={counts.inspection_pending + counts.inspection_in_progress} accent="#4338ca" share={(counts.inspection_pending + counts.inspection_in_progress) / Math.max(1, totalCars)}
            sub={<TrendPill tone="neutral">{counts.needs_clearance} need clearance</TrendPill>} />
          <KpiCard icon="check" label="Published" value={counts.published} accent="var(--brc-success)" share={counts.published / Math.max(1, totalCars)}
            sub={<TrendPill tone="up">{approvalRate}% approval</TrendPill>} />
          <KpiCard icon="plus" label="Suspended" value={counts.suspended} accent="var(--brc-danger)" share={counts.suspended / Math.max(1, totalCars)}
            sub={<TrendPill tone="neutral">{Math.round((counts.suspended / Math.max(1, totalCars)) * 100)}% of all</TrendPill>} />
        </div>

        {/* Table card */}
        <div className="flex flex-col gap-4 rounded-2xl border border-(--brc-border) bg-white p-4 shadow-[var(--brc-shadow-xs)] sm:p-6">
          {/* Card header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="m-0 text-xl font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">Review queue</h2>
              <p className="mt-1 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Owner submissions awaiting moderation</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-(--brc-primary-tint) px-3.5 py-1.5 text-[13px] font-bold text-(--brc-primary) [font-family:var(--brc-font-ui)]">
              <span className="size-[7px] rounded-full bg-(--brc-primary)" />
              {counts[tab]} in queue
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto border-b border-(--brc-border)">
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <button key={t.key} type="button" onClick={() => { setTab(t.key); setPage(1); }}
                  className={cn("relative flex cursor-pointer items-center gap-2 whitespace-nowrap border-none bg-transparent px-3.5 pb-3 pt-2.5 text-sm transition-colors [font-family:var(--brc-font-ui)]", active ? "font-bold text-(--brc-primary)" : "font-medium text-(--brc-text-muted) hover:text-(--brc-text)")}>
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search car, owner or location"
              className="flex-1 border-none bg-transparent text-sm text-(--brc-text) outline-none placeholder:text-(--brc-text-muted) [font-family:var(--brc-font-ui)]" />
          </div>

          {/* Loading bar for refetches */}
          {isFetching && !showSkeleton && (
            <div className="h-0.5 w-full overflow-hidden rounded-full bg-(--brc-bg-muted)">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-(--brc-primary)" />
            </div>
          )}

          {/* Table */}
          {showSkeleton ? (
            <div className="flex flex-col gap-1">
              <Skeleton className="h-12 w-full rounded-lg" />
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : cars.length === 0 ? (
            <div className="py-12 text-center text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">No listings match your filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: 900 }}>
                <thead>
                  <tr className="bg-(--brc-bg-subtle)">
                    <th className="rounded-l-lg px-4 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Car</th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Owner</th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Type</th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Price</th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Location</th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Submitted</th>
                    <th className="px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Status</th>
                    <th className="rounded-r-lg px-3 py-3 text-left text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cars.map((car, i) => (
                    <tr key={car.id} onClick={() => openDrawer(car)} className="group/listing-row relative cursor-pointer transition-[background-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:bg-[rgba(0,0,139,0.035)] hover:shadow-[0_16px_34px_rgba(0,0,139,0.10)]"
                      style={{ borderBottom: i === cars.length - 1 ? "none" : "1px solid var(--brc-border)" }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="relative flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-md border border-transparent bg-(--brc-bg-subtle) transition-all duration-300 group-hover/listing-row:border-(--brc-primary) group-hover/listing-row:bg-(--brc-primary-tint) group-hover/listing-row:shadow-[0_10px_24px_rgba(0,0,139,0.14)]">
                            <span className="pointer-events-none absolute inset-x-1 top-1 h-px bg-white/80 opacity-0 transition-opacity duration-300 group-hover/listing-row:opacity-100" />
                            {car.primary_image ? <Image src={car.primary_image} alt="" width={48} height={36} className="object-contain transition-transform duration-500 ease-out group-hover/listing-row:scale-110" /> : <Icon name="car" size={20} stroke="var(--brc-text-muted)" />}
                          </span>
                          <div className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-(--brc-text) transition-colors duration-300 group-hover/listing-row:text-(--brc-primary) [font-family:var(--brc-font-ui)]">{car.title}</span>
                            <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{car.year} · {car.body_type || "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">{car.owner.first_name} {car.owner.last_name}</td>
                      <td className="px-3 py-3"><TypeChip type={car.listing_type} /></td>
                      <td className="px-3 py-3 text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">{formatPrice(car)}</td>
                      <td className="px-3 py-3 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">{car.state}</td>
                      <td className="px-3 py-3 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{formatDate(car.created_at)}</td>
                      <td className="px-3 py-3"><AdminStatusBadge status={car.status} /></td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => openDrawer(car)}
                          className="group/review inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-lg border border-(--brc-border) bg-white px-3 text-[13px] font-bold text-(--brc-primary) shadow-[0_4px_10px_rgba(18,18,18,0.03)] transition-all duration-250 hover:-translate-y-0.5 hover:border-(--brc-primary) hover:bg-(--brc-primary) hover:text-white hover:shadow-[0_10px_18px_rgba(0,0,139,0.16)] [font-family:var(--brc-font-ui)]">
                          <span>Review</span>
                          <Icon name="chevright" size={13} stroke="currentColor" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!showSkeleton && totalPages > 1 && (
            <div className="flex items-center justify-center gap-[7px] pt-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex size-[34px] cursor-pointer items-center justify-center rounded-md border border-(--brc-border) bg-white text-sm font-semibold transition-colors disabled:cursor-default disabled:opacity-60 [font-family:var(--brc-font-ui)]"
              >
                <Icon name="chevleft" size={16} stroke={page === 1 ? "var(--brc-border)" : "var(--brc-text)"} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className="flex size-[34px] cursor-pointer items-center justify-center rounded-md border text-sm font-semibold transition-colors [font-family:var(--brc-font-ui)]"
                  style={{
                    background: n === page ? "var(--brc-primary)" : "#fff",
                    color: n === page ? "#fff" : "var(--brc-text)",
                    borderColor: "var(--brc-border)",
                  }}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex size-[34px] cursor-pointer items-center justify-center rounded-md border border-(--brc-border) bg-white text-sm font-semibold transition-colors disabled:cursor-default disabled:opacity-60 [font-family:var(--brc-font-ui)]"
              >
                <Icon name="chevright" size={16} stroke={page === totalPages ? "var(--brc-border)" : "var(--brc-text)"} />
              </button>
            </div>
          )}

          {!showSkeleton && cars.length > 0 && (
            <span className="text-center text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} listings
            </span>
          )}
        </div>
      </div>

      <ReviewDrawer key={`${drawerCarId ?? "empty"}-${drawerOpen ? "open" : "closed"}`} carId={drawerCarId} open={drawerOpen} onClose={() => setDrawerOpen(false)} onAction={handleAction} isActing={adminStatus.isPending} />
    </>
  );
}
