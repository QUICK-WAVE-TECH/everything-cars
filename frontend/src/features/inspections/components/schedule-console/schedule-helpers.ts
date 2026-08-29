import type { InspectionSlot } from "@/features/inspections/api/types";

// ── Dates ──

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday of the week containing `d`. */
export function getWeekStart(d: Date): Date {
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** Mon–Sun (7 days) from `weekStart`. */
export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

export const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatWeekRange(start: Date, end: Date): string {
  const sm = MONTH_NAMES[start.getMonth()];
  const em = MONTH_NAMES[end.getMonth()];
  if (sm === em) return `${sm} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
  return `${sm} ${start.getDate()} – ${em} ${end.getDate()}, ${start.getFullYear()}`;
}

/** "Friday, Aug 28" from an ISO date. */
export function formatDayHeading(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${WEEKDAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = Number(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

// ── Slot status ──

export type SlotStatus = "open" | "partial" | "full";

export function slotStatus(slot: InspectionSlot): SlotStatus {
  if (slot.bookings_count === 0) return "open";
  if (slot.bookings_count >= slot.capacity) return "full";
  return "partial";
}

/** Palette per status — brand tokens only. `bar` is the capacity-bar fill. */
export const STATUS_META: Record<
  SlotStatus,
  { label: string; bar: string; text: string; pillBg: string; pillText: string }
> = {
  open: {
    label: "Open",
    bar: "var(--brc-primary)",
    text: "var(--brc-primary)",
    pillBg: "var(--brc-primary-tint)",
    pillText: "var(--brc-primary)",
  },
  partial: {
    label: "Partial",
    bar: "var(--brc-warning)",
    text: "#9a7400",
    pillBg: "var(--brc-warning-bg)",
    pillText: "#9a7400",
  },
  full: {
    label: "Full",
    bar: "var(--brc-success)",
    text: "var(--brc-success)",
    pillBg: "var(--brc-success-bg)",
    pillText: "var(--brc-success)",
  },
};

/** Capacity-bar fill %. Open slots show a short stub so the bar reads as "has
 * room" rather than empty. */
export function capacityPct(slot: InspectionSlot): number {
  const status = slotStatus(slot);
  if (status === "open") return 22;
  return Math.min(100, Math.round((slot.bookings_count / Math.max(1, slot.capacity)) * 100));
}

// ── Week KPIs ──

export function weekKpis(slots: InspectionSlot[]) {
  let open = 0;
  let partial = 0;
  let full = 0;
  let bookings = 0;
  for (const s of slots) {
    bookings += s.bookings_count;
    const st = slotStatus(s);
    if (st === "open") open += 1;
    else if (st === "partial") partial += 1;
    else full += 1;
  }
  return { total: slots.length, open, partial, full, bookings };
}

/** Initials for an avatar chip from a person's display name. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}
