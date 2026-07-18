"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XIcon,
  Loader2Icon,
  CalendarDaysIcon,
  BuildingIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  useStaffSlots,
  useDeactivateSlot,
} from "@/features/inspections/api/inspections-api";
import type { InspectionCenter, InspectionSlot } from "@/features/inspections/api/types";
import { AssistanceQueue } from "@/features/inspections/components/assistance-queue";
import { CreateSlotsModal } from "@/features/inspections/components/create-slots-modal";
import { CentersPanel } from "@/features/inspections/components/centers-panel";
import { DayActivitySheet } from "@/features/inspections/components/day-activity-sheet";

// ── Date helpers ──

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Returns the Monday of the week containing `d` */
function getWeekStart(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** Returns Mon–Sat (6 days) starting from weekStart */
function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatWeekRange(start: Date, end: Date): string {
  const sm = MONTH_NAMES[start.getMonth()];
  const em = MONTH_NAMES[end.getMonth()];
  if (sm === em) return `${sm} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
  return `${sm} ${start.getDate()} – ${em} ${end.getDate()}, ${start.getFullYear()}`;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = Number(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

// ── Slot colour logic ──

function slotColor(slot: InspectionSlot): { bg: string; border: string; text: string } {
  const { bookings_count, capacity } = slot;
  if (bookings_count === 0) {
    return { bg: "var(--brc-primary-tint, #e8f0ff)", border: "#c5d5ff", text: "var(--brc-primary)" };
  }
  if (bookings_count >= capacity) {
    return { bg: "var(--brc-success-bg, #d4edda)", border: "#a3d9b1", text: "var(--brc-success)" };
  }
  return { bg: "var(--brc-warning-bg, #fff3cd)", border: "#ffd970", text: "#9a7400" };
}

// ── Slot chip ──

function SlotChip({ slot }: { slot: InspectionSlot }) {
  const { bg, border, text } = slotColor(slot);
  const deactivateSlot = useDeactivateSlot();
  // Two-click confirm: first click arms, second deactivates.
  const [arming, setArming] = useState(false);

  async function handleDeactivate(e: React.MouseEvent) {
    e.stopPropagation();
    if (!arming) {
      setArming(true);
      return;
    }
    try {
      await deactivateSlot.mutateAsync(slot.id);
      toast.success("Slot deactivated");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to deactivate slot");
    } finally {
      setArming(false);
    }
  }

  return (
    <div
      className="relative rounded-xl py-2 pl-2.5 pr-8 text-left"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <div className="truncate text-[12px] font-bold [font-family:var(--brc-font-ui)]" style={{ color: text }}>
        {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
      </div>
      <div className="mt-0.5 text-[11px] font-semibold [font-family:var(--brc-font-ui)]" style={{ color: text, opacity: 0.8 }}>
        {slot.bookings_count}/{slot.capacity} booked
      </div>
      {slot.center_name && (
        <div className="mt-0.5 truncate text-[10px] [font-family:var(--brc-font-ui)]" style={{ color: text, opacity: 0.65 }}>
          {slot.center_name}{slot.center_city ? ` · ${slot.center_city}` : ""}
        </div>
      )}
      <button
        type="button"
        onClick={handleDeactivate}
        onMouseLeave={() => setArming(false)}
        onBlur={() => setArming(false)}
        disabled={deactivateSlot.isPending}
        aria-label={arming ? "Click again to confirm deactivation" : "Deactivate slot"}
        title={arming ? "Click again to confirm" : "Deactivate slot"}
        className={cn(
          "absolute right-1.5 top-1.5 flex h-5 cursor-pointer items-center justify-center rounded-full border shadow-sm transition-all duration-150 [font-family:var(--brc-font-ui)] disabled:cursor-not-allowed disabled:opacity-60",
          arming
            ? "px-1.5 border-(--brc-danger) bg-(--brc-danger) text-[9px] font-black text-white"
            : "w-5 border-(--brc-border) bg-white text-(--brc-text-muted) hover:border-(--brc-danger) hover:text-(--brc-danger)",
        )}
      >
        {deactivateSlot.isPending ? (
          <Loader2Icon size={10} className="animate-spin" />
        ) : arming ? (
          "Confirm?"
        ) : (
          <XIcon size={11} />
        )}
      </button>
    </div>
  );
}

// ── Legend ──

function Legend() {
  const items = [
    { label: "Open", bg: "var(--brc-primary-tint, #e8f0ff)", border: "#c5d5ff" },
    { label: "Partial", bg: "var(--brc-warning-bg, #fff3cd)", border: "#ffd970" },
    { label: "Full", bg: "var(--brc-success-bg, #d4edda)", border: "#a3d9b1" },
  ];
  return (
    <div className="flex items-center gap-4">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border" style={{ background: item.bg, borderColor: item.border }} />
          <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

// ── Weekly Calendar ──

function WeeklyCalendar({
  slots,
  isLoading,
  days,
  onDayClick,
}: {
  slots: InspectionSlot[];
  isLoading: boolean;
  days: Date[];
  onDayClick: (iso: string) => void;
}) {
  const slotsByDate = useMemo(() => {
    const map: Record<string, InspectionSlot[]> = {};
    slots.forEach((slot) => {
      if (!map[slot.date]) map[slot.date] = [];
      map[slot.date]!.push(slot);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    return map;
  }, [slots]);

  return (
    <div className="overflow-x-auto">
      <div
        className="grid grid-cols-6 gap-px overflow-hidden rounded-2xl border border-(--brc-border)"
        style={{ background: "var(--brc-border)", minWidth: 720 }}
      >
        {days.map((day, i) => {
          const iso = toIsoDate(day);
          const daySlots = slotsByDate[iso] ?? [];
          const isToday = toIsoDate(new Date()) === iso;

          return (
            <div key={iso} className="flex min-w-0 flex-col bg-white" style={{ minHeight: 220 }}>
              {/* Day header — click to see the day's attendees */}
              <button
                type="button"
                onClick={() => onDayClick(iso)}
                title="View this day's attendees"
                className={cn(
                  "group flex cursor-pointer items-end justify-between border-b border-(--brc-border) px-2.5 py-2 text-left transition-colors",
                  isToday ? "bg-(--brc-primary-tint)" : "bg-(--brc-bg-subtle) hover:bg-(--brc-primary-tint)/50",
                )}
              >
                <div>
                  <div
                    className="text-[11px] font-black uppercase tracking-[0.06em] [font-family:var(--brc-font-ui)]"
                    style={{ color: isToday ? "var(--brc-primary)" : "var(--brc-text-muted)" }}
                  >
                    {DAY_LABELS[i]}
                  </div>
                  <div
                    className="mt-0.5 text-xl font-black leading-none [font-family:var(--brc-font-display)]"
                    style={{ color: isToday ? "var(--brc-primary)" : "var(--brc-text)" }}
                  >
                    {day.getDate()}
                  </div>
                </div>
                <CalendarDaysIcon
                  size={15}
                  className="mb-0.5 text-(--brc-text-muted) opacity-0 transition-opacity group-hover:opacity-100"
                />
              </button>

              {/* Slot chips */}
              <div className="flex flex-1 flex-col gap-1.5 p-2">
                {isLoading ? (
                  <>
                    <Skeleton className="h-14 w-full rounded-lg" />
                    <Skeleton className="h-14 w-full rounded-lg" />
                  </>
                ) : daySlots.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => onDayClick(iso)}
                    className="block cursor-pointer pt-4 text-center text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)] hover:text-(--brc-primary)"
                  >
                    No slots
                  </button>
                ) : (
                  daySlots.map((slot) => <SlotChip key={slot.id} slot={slot} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Schedule tab ──

function ScheduleTab({ onCreateSlots }: { onCreateSlots: () => void }) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [activeDate, setActiveDate] = useState<string | null>(null);

  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const dateFrom = toIsoDate(days[0]!);
  const dateTo = toIsoDate(days[days.length - 1]!);

  const { data, isLoading, isFetching } = useStaffSlots({
    date_from: dateFrom,
    date_to: dateTo,
    is_active: "true",
    page_size: 100,
  });
  const slots = data?.results ?? [];

  function prevWeek() {
    setWeekStart((w) => {
      const d = new Date(w);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }
  function nextWeek() {
    setWeekStart((w) => {
      const d = new Date(w);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }
  function goToToday() {
    setWeekStart(getWeekStart(new Date()));
  }

  const weekLabel = formatWeekRange(days[0]!, days[days.length - 1]!);
  const isCurrentWeek = toIsoDate(weekStart) === toIsoDate(getWeekStart(new Date()));

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={prevWeek}
            aria-label="Previous week"
            className="flex size-9 cursor-pointer items-center justify-center rounded-xl border border-(--brc-border) bg-white text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle)"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <div className="text-center text-[15px] font-black text-(--brc-text) [font-family:var(--brc-font-ui)] sm:min-w-[220px]">
            {weekLabel}
          </div>
          <button
            type="button"
            onClick={nextWeek}
            aria-label="Next week"
            className="flex size-9 cursor-pointer items-center justify-center rounded-xl border border-(--brc-border) bg-white text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle)"
          >
            <ChevronRightIcon size={18} />
          </button>
          {!isCurrentWeek && (
            <button
              type="button"
              onClick={goToToday}
              className="h-9 cursor-pointer rounded-xl border border-(--brc-border) bg-white px-3.5 text-[13px] font-bold text-(--brc-text-muted) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
            >
              Today
            </button>
          )}
          {isFetching && !isLoading && (
            <Loader2Icon size={16} className="animate-spin text-(--brc-text-muted)" />
          )}
        </div>
        <Legend />
      </div>

      {/* Summary */}
      {!isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">
          {[
            { label: "Total slots", value: slots.length },
            { label: "Open", value: slots.filter((s) => s.bookings_count === 0).length },
            { label: "Partial", value: slots.filter((s) => s.bookings_count > 0 && s.bookings_count < s.capacity).length },
            { label: "Full", value: slots.filter((s) => s.bookings_count >= s.capacity).length },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex min-w-0 flex-col gap-1 rounded-2xl border border-(--brc-border) bg-white px-4 py-3 sm:min-w-[100px]"
            >
              <span className="text-[22px] font-black leading-none text-(--brc-text) [font-family:var(--brc-font-display)]">
                {stat.value}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                {stat.label}
              </span>
            </div>
          ))}
          <button
            type="button"
            onClick={onCreateSlots}
            className="col-span-2 flex h-auto cursor-pointer items-center justify-center gap-2 rounded-2xl border-none bg-(--brc-primary) px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(0,0,139,0.2)] transition-all hover:brightness-95 [font-family:var(--brc-font-ui)] sm:col-span-1 sm:ml-auto"
          >
            <PlusIcon size={16} /> Create Slots
          </button>
        </div>
      )}

      <WeeklyCalendar slots={slots} isLoading={isLoading} days={days} onDayClick={setActiveDate} />

      <DayActivitySheet date={activeDate} onClose={() => setActiveDate(null)} />
    </div>
  );
}

// ── Page ──

export default function AdminInspectionsPage() {
  const [slotsModalOpen, setSlotsModalOpen] = useState(false);
  const [lockedCenter, setLockedCenter] = useState<InspectionCenter | null>(null);
  const [tab, setTab] = useState("schedule");

  function openCreateSlots() {
    setLockedCenter(null);
    setSlotsModalOpen(true);
  }

  function openAddSlotsForCenter(center: InspectionCenter) {
    setLockedCenter(center);
    setSlotsModalOpen(true);
  }

  return (
    <>
      {/* Hero band */}
      <section className="border-b border-(--brc-border) bg-white">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-2 px-4 pb-7 pt-9 sm:px-6 lg:px-10">
          <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            Admin · Inspection Scheduling
          </span>
          <h1 className="m-0 text-[clamp(30px,5vw,42px)] font-black leading-[1.1] tracking-[-0.02em] text-(--brc-text) [font-family:var(--brc-font-display)]">
            Slots &amp; Centers
          </h1>
          <p className="m-0 max-w-[640px] text-[15px] leading-6 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            Manage inspection centers and their booking slots in one place, and see who&apos;s
            attending on any day.
          </p>
        </div>
      </section>

      {/* Assistance requests */}
      <div className="pt-6">
        <AssistanceQueue />
      </div>

      <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
        <Tabs value={tab} onValueChange={setTab} className="gap-6">
          <TabsList className="h-11 w-full max-w-[380px] rounded-2xl bg-(--brc-bg-subtle) p-1">
            <TabsTrigger
              value="schedule"
              className="flex-1 gap-1.5 rounded-xl text-[13px] font-bold text-(--brc-text-muted) data-active:bg-white data-active:text-(--brc-primary) data-active:shadow-[0_2px_8px_rgba(18,18,18,0.08)] [font-family:var(--brc-font-ui)]"
            >
              <CalendarDaysIcon size={15} /> Schedule
            </TabsTrigger>
            <TabsTrigger
              value="centers"
              className="flex-1 gap-1.5 rounded-xl text-[13px] font-bold text-(--brc-text-muted) data-active:bg-white data-active:text-(--brc-primary) data-active:shadow-[0_2px_8px_rgba(18,18,18,0.08)] [font-family:var(--brc-font-ui)]"
            >
              <BuildingIcon size={15} /> Centers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule">
            <ScheduleTab onCreateSlots={openCreateSlots} />
          </TabsContent>

          <TabsContent value="centers">
            <CentersPanel onAddSlots={openAddSlotsForCenter} />
          </TabsContent>
        </Tabs>
      </div>

      <CreateSlotsModal
        open={slotsModalOpen}
        onClose={() => setSlotsModalOpen(false)}
        lockedCenter={lockedCenter}
      />
    </>
  );
}
