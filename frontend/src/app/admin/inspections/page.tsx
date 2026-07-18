"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, XIcon, Loader2Icon, BuildingIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useStaffSlots,
  useCreateSlots,
  useAdminCenters,
  useDeactivateSlot,
} from "@/features/inspections/api/inspections-api";
import type { InspectionSlot } from "@/features/inspections/api/types";
import { AssistanceQueue } from "@/features/inspections/components/assistance-queue";

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
  if (sm === em) {
    return `${sm} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
  }
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
  // Two-click confirm: first click arms the button, second click deactivates.
  const [arming, setArming] = useState(false);

  async function handleDeactivate() {
    if (!arming) {
      setArming(true);
      return;
    }
    try {
      await deactivateSlot.mutateAsync(slot.id);
      toast.success("Slot deactivated");
    } catch (error) {
      // Backend returns 409 when the slot has an active booking
      toast.error(
        error instanceof ApiError ? error.message : "Failed to deactivate slot",
      );
    } finally {
      setArming(false);
    }
  }

  return (
    <div
      className="relative rounded-lg py-2 pl-2.5 pr-8 text-left"
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
          <span
            className="inline-block size-3 rounded-sm border"
            style={{ background: item.bg, borderColor: item.border }}
          />
          <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

// ── Create Slots Modal ──

const ALL_DAYS = [
  { label: "Mon", value: 0 },
  { label: "Tue", value: 1 },
  { label: "Wed", value: 2 },
  { label: "Thu", value: 3 },
  { label: "Fri", value: 4 },
  { label: "Sat", value: 5 },
  { label: "Sun", value: 6 },
];

type TimeSlotRow = { start_time: string; end_time: string; capacity?: number };

function countPreviewSlots(dateFrom: string, dateTo: string, days: number[], timeSlots: TimeSlotRow[]): number {
  if (!dateFrom || !dateTo || days.length === 0 || timeSlots.length === 0) return 0;
  const from = new Date(dateFrom + "T00:00:00");
  const to = new Date(dateTo + "T00:00:00");
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) return 0;

  // Count days in range that match selected days (JS getDay: 0=Sun,1=Mon...6=Sat)
  // Our day values: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  // Map to JS getDay: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0
  const jsGetDayForValue = (v: number) => (v === 6 ? 0 : v + 1);
  const jsDays = new Set(days.map(jsGetDayForValue));

  let count = 0;
  const cursor = new Date(from);
  while (cursor <= to) {
    if (jsDays.has(cursor.getDay())) {
      count += timeSlots.length;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function CreateSlotsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5]); // Mon–Sat default
  const [timeSlots, setTimeSlots] = useState<TimeSlotRow[]>([{ start_time: "09:00", end_time: "10:00" }]);
  const [capacity, setCapacity] = useState(1);
  const [centerId, setCenterId] = useState("");

  const createSlots = useCreateSlots();
  const { data: centersData, isLoading: centersLoading } = useAdminCenters({ is_active: "true", page_size: 100 });
  const centers = useMemo(() => centersData?.results ?? [], [centersData?.results]);
  const todayIso = toIsoDate(new Date());

  // Base UI's Select.Value renders the raw value (the center id) unless the
  // Root is given an items map to resolve display labels from.
  const centerItems = useMemo(
    () =>
      Object.fromEntries(
        centers.map((c) => [c.id, `${c.company_name} — ${c.city}`]),
      ),
    [centers],
  );

  const previewCount = useMemo(
    () => countPreviewSlots(dateFrom, dateTo, selectedDays, timeSlots),
    [dateFrom, dateTo, selectedDays, timeSlots]
  );

  function toggleDay(value: number) {
    setSelectedDays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  }

  function addTimeSlot() {
    setTimeSlots((prev) => [...prev, { start_time: "09:00", end_time: "10:00" }]);
  }

  function removeTimeSlot(i: number) {
    setTimeSlots((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateTimeSlot(i: number, field: "start_time" | "end_time", value: string) {
    setTimeSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  function updateTimeSlotCapacity(i: number, value: string) {
    const n = value === "" ? undefined : Math.max(1, parseInt(value, 10) || 1);
    setTimeSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, capacity: n } : s)));
  }

  function handleDateFromChange(value: string) {
    setDateFrom(value);
    if (dateTo && value && dateTo < value) {
      setDateTo(value);
    }
  }

  function resetForm() {
    setDateFrom("");
    setDateTo("");
    setSelectedDays([0, 1, 2, 3, 4, 5]);
    setTimeSlots([{ start_time: "09:00", end_time: "10:00" }]);
    setCapacity(1);
    setCenterId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dateFrom || !dateTo || selectedDays.length === 0 || timeSlots.length === 0 || !centerId) {
      toast.error("Please fill in all required fields.");
      return;
    }
    try {
      const result = await createSlots.mutateAsync({
        date_from: dateFrom,
        date_to: dateTo,
        days: selectedDays,
        time_slots: timeSlots,
        capacity,
        center: centerId,
      });
      toast.success(`${result.created_count} slot${result.created_count !== 1 ? "s" : ""} created successfully`);
      resetForm();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Failed to create slots. Please try again.",
      );
    }
  }

  const inputStyle: React.CSSProperties = {
    height: 40,
    width: "100%",
    borderRadius: 8,
    border: "1px solid var(--brc-border)",
    background: "var(--brc-bg-subtle)",
    padding: "0 12px",
    fontSize: 14,
    color: "var(--brc-text)",
    fontFamily: "var(--brc-font-ui)",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--brc-text-muted)",
    fontFamily: "var(--brc-font-ui)",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 overflow-hidden"
        style={{
          maxWidth: 560,
          width: "calc(100vw - 2rem)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 16,
          border: "1px solid var(--brc-border)",
          background: "white",
          boxShadow: "0 24px 64px rgba(0,0,0,0.14)",
        }}
      >
        {/* Modal header */}
        <DialogHeader
          style={{
            flexShrink: 0,
            borderBottom: "1px solid var(--brc-border)",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <DialogTitle
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--brc-text)",
                fontFamily: "var(--brc-font-ui)",
                lineHeight: 1.2,
              }}
            >
              Create Inspection Slots
            </DialogTitle>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--brc-text-muted)", fontFamily: "var(--brc-font-ui)" }}>
              Bulk-generate time slots across a date range.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: 8,
              border: "none",
              background: "var(--brc-bg-subtle)",
              cursor: "pointer",
            }}
          >
            <XIcon size={17} style={{ color: "var(--brc-text)" }} />
          </button>
        </DialogHeader>

        {/* Scrollable body */}
        <form
          id="create-slots-form"
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Date range */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3">
            <div>
              <label style={labelStyle}>Date from</label>
              <input
                type="date"
                required
                min={todayIso}
                value={dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Date to</label>
              <input
                type="date"
                required
                value={dateTo}
                min={dateFrom || todayIso}
                onChange={(e) => setDateTo(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Day-of-week toggles */}
          <div>
            <label style={labelStyle}>Days of week</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ALL_DAYS.map((day) => {
                const active = selectedDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    style={{
                      height: 36,
                      minWidth: 48,
                      padding: "0 12px",
                      borderRadius: 8,
                      border: active ? "1px solid var(--brc-primary)" : "1px solid var(--brc-border)",
                      background: active ? "var(--brc-primary)" : "white",
                      color: active ? "white" : "var(--brc-text)",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "var(--brc-font-ui)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time slot rows */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Time slots</label>
              <button
                type="button"
                onClick={addTimeSlot}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  height: 30,
                  padding: "0 10px",
                  borderRadius: 6,
                  border: "1px solid var(--brc-border)",
                  background: "white",
                  color: "var(--brc-primary)",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "var(--brc-font-ui)",
                  cursor: "pointer",
                }}
              >
                <PlusIcon size={12} />
                Add row
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {timeSlots.map((slot, i) => (
                <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      type="time"
                      required
                      value={slot.start_time}
                      onChange={(e) => updateTimeSlot(i, "start_time", e.target.value)}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <span style={{ fontSize: 13, color: "var(--brc-text-muted)", fontFamily: "var(--brc-font-ui)", flexShrink: 0 }}>to</span>
                    <input
                      type="time"
                      required
                      value={slot.end_time}
                      onChange={(e) => updateTimeSlot(i, "end_time", e.target.value)}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <input
                      type="number"
                      min={1}
                      value={slot.capacity ?? ""}
                      onChange={(e) => updateTimeSlotCapacity(i, e.target.value)}
                      placeholder={`${capacity}`}
                      title="Capacity for this time slot (defaults to the value above)"
                      aria-label="Slot capacity"
                      style={{ ...inputStyle, width: 72, flexShrink: 0 }}
                    />
                  </div>
                  {timeSlots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(i)}
                      aria-label="Remove time slot"
                      className="self-end sm:self-auto"
                      style={{
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        border: "1px solid var(--brc-border)",
                        background: "white",
                        cursor: "pointer",
                        color: "var(--brc-text-muted)",
                      }}
                    >
                      <XIcon size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Capacity + Location */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr] sm:gap-3">
            <div>
              <label style={labelStyle}>Capacity</label>
              <input
                type="number"
                required
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Center</label>
              {centers.length === 0 && !centersLoading ? (
                <div
                  style={{
                    ...inputStyle,
                    display: "flex",
                    alignItems: "center",
                    color: "var(--brc-text-muted)",
                  }}
                >
                  No active centers found
                </div>
              ) : (
                <Select items={centerItems} value={centerId} onValueChange={(value) => setCenterId(value ?? "")}>
                  <SelectTrigger
                    className="w-full"
                    style={{
                      height: 40,
                      borderRadius: 8,
                      border: "1px solid var(--brc-border)",
                      background: "var(--brc-bg-subtle)",
                      padding: "0 12px",
                      fontSize: 14,
                      color: "var(--brc-text)",
                      fontFamily: "var(--brc-font-ui)",
                    }}
                  >
                    <SelectValue placeholder={centersLoading ? "Loading centers..." : "Select a center"} />
                  </SelectTrigger>
                  <SelectContent>
                    {centers.map((center) => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.company_name} — {center.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Preview count */}
          {previewCount > 0 && (
            <div
              style={{
                background: "var(--brc-primary-tint, #e8f0ff)",
                border: "1px solid #c5d5ff",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "var(--brc-primary)",
                  color: "white",
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {previewCount}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--brc-primary)", fontFamily: "var(--brc-font-ui)" }}>
                {previewCount} slot{previewCount !== 1 ? "s" : ""} will be created
              </span>
            </div>
          )}
        </form>

        {/* Footer */}
        <div
          style={{
            flexShrink: 0,
            borderTop: "1px solid var(--brc-border)",
            padding: "16px 24px",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            background: "white",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 42,
              padding: "0 20px",
              borderRadius: 8,
              border: "1px solid var(--brc-border)",
              background: "white",
              color: "var(--brc-text)",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "var(--brc-font-ui)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-slots-form"
            disabled={createSlots.isPending || previewCount === 0 || !centerId}
            style={{
              height: 42,
              padding: "0 20px",
              borderRadius: 8,
              border: "none",
              background: "var(--brc-primary)",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "var(--brc-font-ui)",
              cursor: createSlots.isPending || previewCount === 0 || !centerId ? "not-allowed" : "pointer",
              opacity: createSlots.isPending || previewCount === 0 || !centerId ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {createSlots.isPending && <Loader2Icon size={14} style={{ animation: "spin 1s linear infinite" }} />}
            Create Slots
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Weekly Calendar ──

function WeeklyCalendar({ slots, isLoading, days }: {
  slots: InspectionSlot[];
  isLoading: boolean;
  days: Date[];
}) {
  // Group slots by date string
  const slotsByDate = useMemo(() => {
    const map: Record<string, InspectionSlot[]> = {};
    slots.forEach((slot) => {
      if (!map[slot.date]) map[slot.date] = [];
      map[slot.date]!.push(slot);
    });
    // Sort each day's slots by start_time
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => a.start_time.localeCompare(b.start_time))
    );
    return map;
  }, [slots]);

  return (
    // Scroll fallback for narrow screens; on desktop all six columns fit.
    <div className="overflow-x-auto">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 1,
          background: "var(--brc-border)",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid var(--brc-border)",
          minWidth: 720,
        }}
      >
      {days.map((day, i) => {
        const iso = toIsoDate(day);
        const daySlots = slotsByDate[iso] ?? [];
        const isToday = toIsoDate(new Date()) === iso;

        return (
          <div
            key={iso}
            style={{
              background: "white",
              minHeight: 200,
              display: "flex",
              flexDirection: "column",
              // Allow the column to shrink below its content's natural width —
              // without this, nowrap chip text forces the grid past the viewport.
              minWidth: 0,
            }}
          >
            {/* Day header */}
            <div
              style={{
                padding: "10px 10px 8px",
                borderBottom: "1px solid var(--brc-border)",
                background: isToday ? "var(--brc-primary-tint, #e8f0ff)" : "var(--brc-bg-subtle)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: isToday ? "var(--brc-primary)" : "var(--brc-text-muted)",
                  fontFamily: "var(--brc-font-ui)",
                }}
              >
                {DAY_LABELS[i]}
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: isToday ? "var(--brc-primary)" : "var(--brc-text)",
                  fontFamily: "var(--brc-font-display, var(--brc-font-ui))",
                  lineHeight: 1.1,
                  marginTop: 2,
                }}
              >
                {day.getDate()}
              </div>
            </div>

            {/* Slot chips */}
            <div style={{ flex: 1, padding: "8px", display: "flex", flexDirection: "column", gap: 6 }}>
              {isLoading ? (
                <>
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                </>
              ) : daySlots.length === 0 ? (
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--brc-text-muted)",
                    fontFamily: "var(--brc-font-ui)",
                    textAlign: "center",
                    paddingTop: 16,
                    display: "block",
                  }}
                >
                  No slots
                </span>
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

// ── Page ──

export default function AdminInspectionsPage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [modalOpen, setModalOpen] = useState(false);

  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const dateFrom = toIsoDate(days[0]!);
  const dateTo = toIsoDate(days[days.length - 1]!);

  const { data, isLoading, isFetching } = useStaffSlots({
    date_from: dateFrom,
    date_to: dateTo,
    is_active: "true",
    // A busy week easily exceeds the default page size of 20
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
    <>
      {/* Hero band */}
      <section style={{ borderBottom: "1px solid var(--brc-border)", background: "white" }}>
        <div
          className="flex flex-col gap-5 px-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-5 sm:px-6 lg:px-[var(--brc-space-10,40px)]"
          style={{
            maxWidth: 1320,
            margin: "0 auto",
            paddingTop: 40,
            paddingBottom: 32,
          }}
        >
          <div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--brc-text-muted)",
                fontFamily: "var(--brc-font-ui)",
              }}
            >
              Admin · Slot Management
            </span>
            <h1
              style={{
                margin: "12px 0 0",
                fontSize: "clamp(32px, 5vw, 44px)",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "var(--brc-text)",
                fontFamily: "var(--brc-font-display, var(--brc-font-ui))",
              }}
            >
              Inspection Slots
            </h1>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 15,
                lineHeight: 1.6,
                color: "var(--brc-text-muted)",
                fontFamily: "var(--brc-font-ui)",
              }}
            >
              Create and manage inspection time slots for car owners to book.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center sm:gap-2.5">
            <Link
              href="/admin/inspections/centers"
              className="w-full sm:w-auto"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                height: 46,
                padding: "0 20px",
                borderRadius: 10,
                border: "1px solid var(--brc-border)",
                background: "white",
                color: "var(--brc-text)",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "var(--brc-font-ui)",
                textDecoration: "none",
              }}
            >
              <BuildingIcon size={16} />
              Manage Centers
            </Link>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="w-full sm:w-auto"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                height: 46,
                padding: "0 22px",
                borderRadius: 10,
                border: "none",
                background: "var(--brc-primary)",
                color: "white",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "var(--brc-font-ui)",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(0,0,139,0.20)",
              }}
            >
              <PlusIcon size={16} />
              Create Slots
            </button>
          </div>
        </div>
      </section>

      <div style={{ paddingTop: 24 }}>
        <AssistanceQueue />
      </div>

      <div
        className="px-4 sm:px-6 lg:px-[var(--brc-space-10,40px)]"
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          paddingTop: 32,
          paddingBottom: 32,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Calendar toolbar */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* Week navigation */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={prevWeek}
              aria-label="Previous week"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: 8,
                border: "1px solid var(--brc-border)",
                background: "white",
                cursor: "pointer",
              }}
            >
              <ChevronLeftIcon size={18} style={{ color: "var(--brc-text)" }} />
            </button>

            <div
              className="sm:min-w-[220px]"
              style={{
                textAlign: "center",
                fontSize: 15,
                fontWeight: 700,
                color: "var(--brc-text)",
                fontFamily: "var(--brc-font-ui)",
              }}
            >
              {weekLabel}
            </div>

            <button
              type="button"
              onClick={nextWeek}
              aria-label="Next week"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: 8,
                border: "1px solid var(--brc-border)",
                background: "white",
                cursor: "pointer",
              }}
            >
              <ChevronRightIcon size={18} style={{ color: "var(--brc-text)" }} />
            </button>

            {!isCurrentWeek && (
              <button
                type="button"
                onClick={goToToday}
                style={{
                  height: 34,
                  padding: "0 14px",
                  borderRadius: 7,
                  border: "1px solid var(--brc-border)",
                  background: "white",
                  color: "var(--brc-text-muted)",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "var(--brc-font-ui)",
                  cursor: "pointer",
                }}
              >
                Today
              </button>
            )}

            {isFetching && !isLoading && (
              <Loader2Icon size={16} style={{ color: "var(--brc-text-muted)", animation: "spin 1s linear infinite" }} />
            )}
          </div>

          <Legend />
        </div>

        {/* Slot summary */}
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
                className="min-w-0 sm:min-w-[90px]"
                style={{
                  background: "white",
                  border: "1px solid var(--brc-border)",
                  borderRadius: 10,
                  padding: "10px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "var(--brc-text)",
                    fontFamily: "var(--brc-font-display, var(--brc-font-ui))",
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--brc-text-muted)",
                    fontFamily: "var(--brc-font-ui)",
                  }}
                >
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Weekly calendar grid */}
        <WeeklyCalendar slots={slots} isLoading={isLoading} days={days} />
      </div>

      {/* Create Slots Modal */}
      <CreateSlotsModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
