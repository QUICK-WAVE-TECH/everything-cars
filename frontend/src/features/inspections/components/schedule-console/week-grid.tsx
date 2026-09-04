"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { InspectionSlot } from "@/features/inspections/api/types";
import { SlotCard } from "./slot-card";
import { DAY_LABELS, toIsoDate } from "./schedule-helpers";

/** The calendar grid. `days` is 7 columns in week view or a single column in
 * day view — the same layout serves both. Clicking a column selects that day
 * for the side panel. */
export function WeekGrid({
  slots,
  days,
  isLoading,
  selectedIso,
  onSelectDay,
}: {
  slots: InspectionSlot[];
  days: Date[];
  isLoading: boolean;
  selectedIso: string | null;
  onSelectDay: (iso: string) => void;
}) {
  const slotsByDate = useMemo(() => {
    const map: Record<string, InspectionSlot[]> = {};
    for (const slot of slots) {
      (map[slot.date] ??= []).push(slot);
    }
    for (const arr of Object.values(map)) {
      arr.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return map;
  }, [slots]);

  const todayIso = toIsoDate(new Date());
  const single = days.length === 1;

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-px overflow-hidden rounded-2xl border border-(--brc-border)"
        style={{
          background: "var(--brc-border)",
          gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
          minWidth: single ? undefined : 840,
        }}
      >
        {days.map((day) => {
          const iso = toIsoDate(day);
          const daySlots = slotsByDate[iso] ?? [];
          const isToday = todayIso === iso;
          const isSelected = selectedIso === iso;

          return (
            <div key={iso} className="flex min-w-0 flex-col bg-white" style={{ minHeight: 260 }}>
              <button
                type="button"
                onClick={() => onSelectDay(iso)}
                aria-pressed={isSelected}
                title="View this day"
                className={cn(
                  "flex items-center justify-between border-b px-2.5 py-2 text-left transition-colors",
                  isSelected
                    ? "border-(--brc-primary) bg-(--brc-primary-tint)"
                    : "border-(--brc-border) bg-(--brc-bg-subtle) hover:bg-(--brc-primary-tint)/50",
                )}
              >
                <div>
                  <div
                    className="text-[11px] font-black tracking-[0.06em] [font-family:var(--brc-font-ui)]"
                    style={{ color: isSelected || isToday ? "var(--brc-primary)" : "var(--brc-text-muted)" }}
                  >
                    {DAY_LABELS[day.getDay() === 0 ? 6 : day.getDay() - 1]}
                  </div>
                  <div
                    className="mt-0.5 text-xl font-black leading-none [font-family:var(--brc-font-display)]"
                    style={{ color: isSelected || isToday ? "var(--brc-primary)" : "var(--brc-text)" }}
                  >
                    {day.getDate()}
                  </div>
                </div>
                {isToday && (
                  <span className="rounded-full bg-(--brc-primary) px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white [font-family:var(--brc-font-ui)]">
                    Today
                  </span>
                )}
              </button>

              <div className="flex flex-1 flex-col gap-2 p-2">
                {isLoading ? (
                  <>
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                  </>
                ) : daySlots.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => onSelectDay(iso)}
                    className="block cursor-pointer pt-5 text-center text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)] hover:text-(--brc-primary)"
                  >
                    No slots
                  </button>
                ) : (
                  daySlots.map((slot) => <SlotCard key={slot.id} slot={slot} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
