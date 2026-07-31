"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  CalendarDaysIcon,
  ClockIcon,
  UserRoundIcon,
  CarFrontIcon,
  MapPinIcon,
  ArrowRightIcon,
  CalendarX2Icon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useStaffBookings } from "@/features/inspections/api/inspections-api";
import type { InspectionBooking } from "@/features/inspections/api/types";

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = Number(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function formatLongDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(iso);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Status → chip colours. Keeps parity with the rest of the admin UI.
const STATUS_STYLE: Record<
  InspectionBooking["status"],
  { label: string; bg: string; color: string }
> = {
  awaiting_payment: { label: "Awaiting payment", bg: "var(--brc-warning-bg, #fff3cd)", color: "var(--brc-accent)" },
  pending: { label: "Awaiting inspection", bg: "var(--brc-warning-bg, #fff3cd)", color: "#9a7400" },
  approved: { label: "Approved", bg: "var(--brc-primary-tint, #e8f0ff)", color: "var(--brc-primary)" },
  completed: { label: "Completed", bg: "var(--brc-success-bg, #d4edda)", color: "var(--brc-success)" },
  rejected: { label: "Rejected", bg: "var(--brc-danger-bg, #fde8e8)", color: "var(--brc-danger)" },
  no_show: { label: "No-show", bg: "var(--brc-danger-bg, #fde8e8)", color: "var(--brc-danger)" },
  cancelled: { label: "Cancelled", bg: "var(--brc-bg-muted)", color: "var(--brc-text-muted)" },
};

function StatusChip({ status }: { status: InspectionBooking["status"] }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold [font-family:var(--brc-font-ui)]"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="size-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

function AttendeeRow({ booking }: { booking: InspectionBooking }) {
  const isRep = booking.attendee_type === "representative";
  const attendee = isRep ? booking.rep_name || "Representative" : booking.booked_by_name;

  return (
    <div className="rounded-2xl border border-(--brc-border) bg-white p-4 shadow-[0_10px_28px_rgba(18,18,18,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-black text-(--brc-text) [font-family:var(--brc-font-ui)]">
          <ClockIcon size={15} className="text-(--brc-primary)" />
          {formatTime(booking.slot.start_time)} – {formatTime(booking.slot.end_time)}
        </div>
        <StatusChip status={booking.status} />
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-(--brc-text) [font-family:var(--brc-font-ui)]">
          <UserRoundIcon size={15} className="shrink-0 text-(--brc-text-muted)" />
          <span className="font-bold">{attendee}</span>
          {isRep && (
            <span className="text-xs text-(--brc-text-muted)">
              for {booking.booked_by_name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
          <CarFrontIcon size={15} className="shrink-0 text-(--brc-text-muted)" />
          <span className="truncate">{booking.car_title}</span>
        </div>
        {booking.slot.center_name && (
          <div className="flex items-center gap-2 text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            <MapPinIcon size={14} className="shrink-0" />
            <span className="truncate">
              {booking.slot.center_name}
              {booking.slot.center_city ? ` · ${booking.slot.center_city}` : ""}
            </span>
          </div>
        )}
      </div>

      {booking.status === "pending" && (
        <Link
          href={`/admin/inspections/${booking.id}/inspect`}
          className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-(--brc-primary) text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(0,0,139,0.18)] transition-all hover:brightness-95 [font-family:var(--brc-font-ui)]"
        >
          Start inspection <ArrowRightIcon size={14} />
        </Link>
      )}

      {booking.status === "awaiting_payment" && (
        <p className="mt-3 text-center text-[12px] font-semibold text-(--brc-accent) [font-family:var(--brc-font-ui)]">
          Payment verification pending — review it on the Payments desk.
        </p>
      )}
    </div>
  );
}

/**
 * A slide-over showing every attendee booked on a given day — opened by
 * clicking a date in the schedule calendar.
 */
export function DayActivitySheet({
  date,
  onClose,
}: {
  date: string | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useStaffBookings(
    date ? { date } : undefined,
    { enabled: !!date },
  );

  // Active attendance only — cancelled/rejected bookings no longer occupy the day.
  const bookings = useMemo(() => {
    const all = data?.results ?? [];
    return all
      .filter((b) => b.status !== "cancelled" && b.status !== "rejected")
      .sort((a, b) => a.slot.start_time.localeCompare(b.slot.start_time));
  }, [data?.results]);

  return (
    <Sheet open={!!date} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-l border-(--brc-border) bg-(--brc-bg-subtle) p-0 data-[side=right]:sm:max-w-[440px]"
      >
        <SheetHeader className="border-b border-(--brc-border) bg-white px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-(--brc-primary-tint) text-(--brc-primary)">
              <CalendarDaysIcon size={20} />
            </span>
            <div className="min-w-0">
              <SheetTitle className="truncate text-lg font-black text-(--brc-text) [font-family:var(--brc-font-display)]">
                {date ? formatLongDate(date) : "Day activity"}
              </SheetTitle>
              <SheetDescription className="text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                {isLoading
                  ? "Loading attendees…"
                  : `${bookings.length} ${bookings.length === 1 ? "attendee" : "attendees"} scheduled`}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <>
              <Skeleton className="h-36 w-full rounded-2xl" />
              <Skeleton className="h-36 w-full rounded-2xl" />
            </>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-(--brc-border) bg-white px-6 py-14 text-center">
              <CalendarX2Icon size={26} className="text-(--brc-text-muted)" />
              <span className="text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                No one is attending this day
              </span>
              <p className="m-0 max-w-[240px] text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                Bookings made against this date&apos;s slots will appear here.
              </p>
            </div>
          ) : (
            bookings.map((b) => <AttendeeRow key={b.id} booking={b} />)
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
