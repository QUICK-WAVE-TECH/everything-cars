"use client";

import { useMemo } from "react";
import { CalendarDaysIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useStaffBookings } from "@/features/inspections/api/inspections-api";
import type { InspectionBooking, InspectionSlot } from "@/features/inspections/api/types";
import {
  STATUS_META,
  formatDayHeading,
  formatTime,
  initials,
  slotStatus,
} from "./schedule-helpers";

function StatusPill({ status }: { status: ReturnType<typeof slotStatus> }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10.5px] font-black uppercase tracking-wide [font-family:var(--brc-font-ui)]"
      style={{ background: meta.pillBg, color: meta.pillText }}
    >
      {meta.label}
    </span>
  );
}

function BookingRow({ booking }: { booking: InspectionBooking }) {
  const name =
    booking.attendee_type === "representative"
      ? booking.rep_name || "Representative"
      : booking.booked_by_name;
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--brc-primary-tint) text-[11px] font-black text-(--brc-primary) ring-1 ring-(--brc-border) [font-family:var(--brc-font-ui)]">
        {initials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
          {name}
        </div>
        <div className="truncate text-[11.5px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          {booking.car_title}
        </div>
      </div>
      {booking.car_plate && (
        <span className="shrink-0 rounded-md border border-(--brc-border) bg-(--brc-bg-subtle) px-1.5 py-0.5 text-[10.5px] font-bold tracking-wide text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
          {booking.car_plate}
        </span>
      )}
    </div>
  );
}

/** The right-hand day detail: the selected day's slots, each with its status
 * and the people booked into it. Reads the day's bookings and groups them by
 * slot. */
export function DayPanel({
  iso,
  daySlots,
  onViewDay,
}: {
  iso: string | null;
  daySlots: InspectionSlot[];
  onViewDay: () => void;
}) {
  const { data, isLoading } = useStaffBookings({ date: iso ?? undefined }, { enabled: !!iso });

  const bySlot = useMemo(() => {
    const map: Record<string, InspectionBooking[]> = {};
    for (const b of data?.results ?? []) {
      if (b.status === "cancelled" || b.status === "rejected") continue;
      (map[b.slot.id] ??= []).push(b);
    }
    return map;
  }, [data]);

  const totalBookings = useMemo(
    () =>
      (data?.results ?? []).filter(
        (b) => b.status !== "cancelled" && b.status !== "rejected",
      ).length,
    [data],
  );

  if (!iso) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-(--brc-border) bg-white p-8 text-center">
        <CalendarDaysIcon size={26} className="text-(--brc-text-muted)" />
        <p className="text-[13px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          Select a day to see its bookings.
        </p>
      </div>
    );
  }

  const sorted = [...daySlots].sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-(--brc-border) bg-white">
      <div className="border-b border-(--brc-border) px-4 py-3.5">
        <h3 className="text-[15px] font-black text-(--brc-text) [font-family:var(--brc-font-display)]">
          {formatDayHeading(iso)}
        </h3>
        <p className="mt-0.5 text-[12px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          {daySlots.length} {daySlots.length === 1 ? "slot" : "slots"} · {totalBookings}{" "}
          {totalBookings === 1 ? "booking" : "bookings"}
        </p>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {sorted.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            No slots on this day.
          </p>
        ) : (
          sorted.map((slot) => {
            const bookings = bySlot[slot.id] ?? [];
            return (
              <div key={slot.id} className="rounded-xl border border-(--brc-border) p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-black text-(--brc-text) [font-family:var(--brc-font-ui)]">
                    {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                  </span>
                  <StatusPill status={slotStatus(slot)} />
                </div>
                {isLoading ? (
                  <div className="mt-2.5 flex flex-col gap-2">
                    <Skeleton className="h-8 w-full rounded-lg" />
                  </div>
                ) : bookings.length === 0 ? (
                  <p className="mt-2 text-[11.5px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                    No bookings yet.
                  </p>
                ) : (
                  <div className="mt-2.5 flex flex-col gap-2.5">
                    {bookings.map((b) => (
                      <BookingRow key={b.id} booking={b} />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-auto border-t border-(--brc-border) p-3">
        <button
          type="button"
          onClick={onViewDay}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-(--brc-border) bg-white py-2.5 text-[13px] font-bold text-(--brc-primary) transition-colors hover:bg-(--brc-primary-tint)/60 [font-family:var(--brc-font-ui)]"
        >
          <CalendarDaysIcon size={15} /> View day
        </button>
      </div>
    </div>
  );
}
