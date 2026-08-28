"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon, XIcon, BuildingIcon } from "lucide-react";
import { MorphingLabel } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import {
  useAdminCenters,
  useCreateSlots,
} from "@/features/inspections/api/inspections-api";
import type { InspectionCenter } from "@/features/inspections/api/types";

// ── Date helpers ──

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Mirror the server-side batch caps so the form can't offer a submit the API
// will reject (300-day range, 20 time rows).
const MAX_RANGE_DAYS = 300;
const MAX_TIME_ROWS = 20;

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

function countPreviewSlots(
  dateFrom: string,
  dateTo: string,
  days: number[],
  timeSlots: TimeSlotRow[],
): number {
  if (!dateFrom || !dateTo || days.length === 0 || timeSlots.length === 0) return 0;
  const from = new Date(dateFrom + "T00:00:00");
  const to = new Date(dateTo + "T00:00:00");
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) return 0;

  // Our day values: 0=Mon…6=Sun → JS getDay: Mon=1…Sat=6, Sun=0
  const jsGetDayForValue = (v: number) => (v === 6 ? 0 : v + 1);
  const jsDays = new Set(days.map(jsGetDayForValue));

  let count = 0;
  const cursor = new Date(from);
  while (cursor <= to) {
    if (jsDays.has(cursor.getDay())) count += timeSlots.length;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

const fieldClass =
  "h-11 w-full rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) px-3.5 text-sm text-(--brc-text) outline-none transition-colors focus:border-(--brc-primary) focus:bg-white [font-family:var(--brc-font-ui)]";
const labelClass =
  "mb-2 block text-[11px] font-black uppercase tracking-[0.1em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]";

/**
 * Bulk slot creation. When `lockedCenter` is supplied the center is fixed
 * (shown read-only) so slots are always created against that center —
 * this is how "Add slots" from a center card scopes the modal.
 */
export function CreateSlotsModal({
  open,
  onClose,
  lockedCenter = null,
}: {
  open: boolean;
  onClose: () => void;
  lockedCenter?: InspectionCenter | null;
}) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5]);
  const [timeSlots, setTimeSlots] = useState<TimeSlotRow[]>([
    { start_time: "09:00", end_time: "10:00" },
  ]);
  const [capacity, setCapacity] = useState(1);
  const [centerId, setCenterId] = useState("");

  const createSlots = useCreateSlots();
  const { data: centersData, isLoading: centersLoading } = useAdminCenters({
    is_active: "true",
    page_size: 100,
  });
  const centers = useMemo(() => centersData?.results ?? [], [centersData?.results]);
  const todayIso = toIsoDate(new Date());

  // Re-seed the center when the modal opens (state-adjustment-during-render —
  // avoids an effect). A locked center always wins.
  const openKey = open ? (lockedCenter?.id ?? "open") : "closed";
  const [prevOpenKey, setPrevOpenKey] = useState(openKey);
  if (prevOpenKey !== openKey) {
    setPrevOpenKey(openKey);
    if (open) setCenterId(lockedCenter?.id ?? "");
  }

  // Base UI's Select renders the raw value unless given an items map.
  const centerItems = useMemo(
    () =>
      Object.fromEntries(centers.map((c) => [c.id, `${c.company_name} — ${c.city}`])),
    [centers],
  );

  const previewCount = useMemo(
    () => countPreviewSlots(dateFrom, dateTo, selectedDays, timeSlots),
    [dateFrom, dateTo, selectedDays, timeSlots],
  );

  // Latest allowed end date for the chosen start (MAX_RANGE_DAYS inclusive).
  const maxDateTo = useMemo(() => {
    if (!dateFrom) return undefined;
    const d = new Date(dateFrom + "T00:00:00");
    if (isNaN(d.getTime())) return undefined;
    d.setDate(d.getDate() + MAX_RANGE_DAYS - 1);
    return toIsoDate(d);
  }, [dateFrom]);
  // ISO strings compare lexicographically, so string > works for dates.
  const rangeTooLong = !!(dateFrom && dateTo && maxDateTo && dateTo > maxDateTo);

  function toggleDay(value: number) {
    setSelectedDays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value],
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
    if (dateTo && value) {
      if (dateTo < value) {
        setDateTo(value);
      } else {
        // Keep the range within the cap when the start moves.
        const d = new Date(value + "T00:00:00");
        d.setDate(d.getDate() + MAX_RANGE_DAYS - 1);
        const cap = toIsoDate(d);
        if (dateTo > cap) setDateTo(cap);
      }
    }
  }

  function resetForm() {
    setDateFrom("");
    setDateTo("");
    setSelectedDays([0, 1, 2, 3, 4, 5]);
    setTimeSlots([{ start_time: "09:00", end_time: "10:00" }]);
    setCapacity(1);
    setCenterId(lockedCenter?.id ?? "");
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
      toast.success(
        `${result.created_count} slot${result.created_count !== 1 ? "s" : ""} created successfully`,
      );
      resetForm();
      onClose();
    } catch (error) {
      // Fixed id so a rapid double-submit shows one toast, not a stack.
      toast.error(
        error instanceof ApiError ? error.message : "Failed to create slots. Please try again.",
        { id: "create-slots-error" },
      );
    }
  }

  const disabled =
    createSlots.isPending || previewCount === 0 || !centerId || rangeTooLong;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden rounded-3xl border border-(--brc-border) bg-white p-0 shadow-[0_28px_70px_rgba(18,18,18,0.22)] sm:max-w-[580px]"
      >
        {/* Header */}
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-(--brc-border) px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-(--brc-primary-tint) text-(--brc-primary)">
              <PlusIcon size={20} />
            </span>
            <div>
              <DialogTitle className="text-lg font-black leading-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
                Create Inspection Slots
              </DialogTitle>
              <p className="mt-0.5 text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                {lockedCenter
                  ? `For ${lockedCenter.company_name} · ${lockedCenter.city}`
                  : "Bulk-generate time slots across a date range."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-(--brc-bg-subtle) text-(--brc-text) transition-colors hover:bg-(--brc-bg-muted)"
          >
            <XIcon size={17} />
          </button>
        </DialogHeader>

        {/* Body */}
        <form
          id="create-slots-form"
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6"
        >
          {/* Date range */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Date from</label>
              <input
                type="date"
                required
                min={todayIso}
                value={dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Date to</label>
              <input
                type="date"
                required
                value={dateTo}
                min={dateFrom || todayIso}
                max={maxDateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={fieldClass}
              />
              <p className="mt-1 text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                Up to {MAX_RANGE_DAYS} days per batch.
              </p>
            </div>
          </div>

          {/* Days of week */}
          <div>
            <label className={labelClass}>Days of week</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_DAYS.map((day) => {
                const active = selectedDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      "h-9 min-w-12 cursor-pointer rounded-lg border px-3 text-[13px] font-bold transition-all [font-family:var(--brc-font-ui)]",
                      active
                        ? "border-(--brc-primary) bg-(--brc-primary) text-white shadow-[0_8px_18px_rgba(0,0,139,0.18)]"
                        : "border-(--brc-border) bg-white text-(--brc-text) hover:border-(--brc-primary)/40 hover:bg-(--brc-primary-tint)",
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time slot rows */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className={cn(labelClass, "mb-0")}>Time slots</label>
              <button
                type="button"
                onClick={addTimeSlot}
                disabled={timeSlots.length >= MAX_TIME_ROWS}
                title={
                  timeSlots.length >= MAX_TIME_ROWS
                    ? `Up to ${MAX_TIME_ROWS} time rows per batch`
                    : undefined
                }
                className="flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-(--brc-border) bg-white px-2.5 text-xs font-bold text-(--brc-primary) transition-colors hover:bg-(--brc-primary-tint) disabled:cursor-not-allowed disabled:opacity-40 [font-family:var(--brc-font-ui)]"
              >
                <PlusIcon size={12} /> Add row
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {timeSlots.map((slot, i) => (
                <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      type="time"
                      required
                      value={slot.start_time}
                      onChange={(e) => updateTimeSlot(i, "start_time", e.target.value)}
                      className={cn(fieldClass, "flex-1")}
                    />
                    <span className="shrink-0 text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      to
                    </span>
                    <input
                      type="time"
                      required
                      value={slot.end_time}
                      onChange={(e) => updateTimeSlot(i, "end_time", e.target.value)}
                      className={cn(fieldClass, "flex-1")}
                    />
                    <input
                      type="number"
                      min={1}
                      value={slot.capacity ?? ""}
                      onChange={(e) => updateTimeSlotCapacity(i, e.target.value)}
                      placeholder={`${capacity}`}
                      title="Capacity for this time slot (defaults to the value below)"
                      aria-label="Slot capacity"
                      className={cn(fieldClass, "w-[72px] shrink-0 px-2 text-center")}
                    />
                  </div>
                  {timeSlots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(i)}
                      aria-label="Remove time slot"
                      className="flex size-9 shrink-0 cursor-pointer items-center justify-center self-end rounded-lg border border-(--brc-border) bg-white text-(--brc-text-muted) transition-colors hover:border-(--brc-danger) hover:text-(--brc-danger) sm:self-auto"
                    >
                      <XIcon size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              Leave a row&apos;s capacity blank to use the default below.
            </p>
          </div>

          {/* Capacity + Center */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr]">
            <div>
              <label className={labelClass}>Default capacity</label>
              <input
                type="number"
                required
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Center</label>
              {lockedCenter ? (
                <div className={cn(fieldClass, "flex items-center gap-2 font-bold")}>
                  <BuildingIcon size={15} className="shrink-0 text-(--brc-primary)" />
                  <span className="truncate">
                    {lockedCenter.company_name} — {lockedCenter.city}
                  </span>
                </div>
              ) : centers.length === 0 && !centersLoading ? (
                <div className={cn(fieldClass, "flex items-center text-(--brc-text-muted)")}>
                  No active centers found
                </div>
              ) : (
                <Select items={centerItems} value={centerId || null} onValueChange={(v) => setCenterId(v ?? "")}>
                  <SelectTrigger className={cn(fieldClass, "flex items-center")}>
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

          {/* Preview / range warning */}
          {rangeTooLong ? (
            <div className="rounded-xl border border-[#ffd970] bg-(--brc-warning-bg,#fff3cd) px-4 py-3 text-[13px] font-bold text-[#9a7400] [font-family:var(--brc-font-ui)]">
              Date range cannot exceed {MAX_RANGE_DAYS} days — shorten the range
              or create a second batch.
            </div>
          ) : previewCount > 0 ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-[#c5d5ff] bg-(--brc-primary-tint) px-4 py-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-(--brc-primary) text-[11px] font-bold text-white">
                {previewCount}
              </span>
              <span className="text-[13px] font-bold text-(--brc-primary) [font-family:var(--brc-font-ui)]">
                {previewCount} slot{previewCount !== 1 ? "s" : ""} will be created
              </span>
            </div>
          ) : null}
        </form>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-2.5 border-t border-(--brc-border) bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 cursor-pointer rounded-xl border border-(--brc-border) bg-white px-5 text-sm font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-slots-form"
            disabled={disabled}
            aria-busy={createSlots.isPending || undefined}
            className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border-none bg-(--brc-primary) px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(0,0,139,0.22)] transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none [font-family:var(--brc-font-ui)]"
          >
            <MorphingLabel
              status={createSlots.isPending ? "pending" : "idle"}
              idle="Create Slots"
              pendingLabel="Creating…"
            />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
