"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Building2Icon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  Loader2Icon,
  LifeBuoyIcon,
  MapPinIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserRoundIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  availabilityWindow,
  useAdminCenters,
  useAssistanceRequests,
  useAvailableSlots,
  useBookForOwner,
  useHandleAssistance,
} from "@/features/inspections/api/inspections-api";
import type { AssistanceRequest, AvailableSlot, InspectionCenter } from "@/features/inspections/api/types";
import { ApiError } from "@/lib/api-client";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function fmtTime(t: string) {
  const [h = "0", m = "0"] = t.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${suffix}`;
}

function toDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function fmtDate(dateStr: string) {
  return parseDateString(dateStr).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function fmtLongDate(dateStr: string) {
  return parseDateString(dateStr).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function CenterOption({
  center,
  selected,
  onSelect,
}: {
  center: InspectionCenter;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex min-w-0 cursor-pointer flex-col gap-3 rounded-2xl border p-4 text-left transition-all duration-200 [font-family:var(--brc-font-ui)]",
        selected
          ? "border-(--brc-primary) bg-(--brc-primary-tint) shadow-[0_18px_38px_rgba(0,0,139,0.14)]"
          : "border-(--brc-border) bg-white shadow-[var(--brc-shadow-xs)] hover:-translate-y-0.5 hover:border-(--brc-primary)/45 hover:shadow-[0_18px_38px_rgba(18,18,18,0.10)]",
      )}
    >
      <span className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            selected ? "bg-(--brc-primary) text-white" : "bg-(--brc-primary-tint) text-(--brc-primary)",
          )}
        >
          <Building2Icon size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-(--brc-text)">
            {center.company_name}
          </span>
          <span className="mt-1 block text-xs leading-5 text-(--brc-text-secondary)">
            {center.address}
          </span>
        </span>
      </span>
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-(--brc-text-muted)">
        <MapPinIcon size={12} />
        {center.city}, {center.state}
      </span>
    </button>
  );
}

function SlotOption({
  slot,
  selected,
  onSelect,
}: {
  slot: AvailableSlot;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex min-w-0 cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-all duration-200 [font-family:var(--brc-font-ui)]",
        selected
          ? "border-(--brc-primary) bg-(--brc-primary) text-white shadow-[0_18px_38px_rgba(0,0,139,0.24)]"
          : "border-(--brc-border) bg-white text-(--brc-text) shadow-[var(--brc-shadow-xs)] hover:-translate-y-0.5 hover:border-(--brc-primary)/45 hover:bg-(--brc-primary-tint)",
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            selected ? "bg-white/18 text-white" : "bg-(--brc-primary-tint) text-(--brc-primary)",
          )}
        >
          <ClockIcon size={19} />
        </span>
        <span className="min-w-0">
          <span className="block text-base font-black">
            {fmtTime(slot.start_time)} - {fmtTime(slot.end_time)}
          </span>
          <span className={cn("mt-1 block text-xs font-semibold", selected ? "text-white/78" : "text-(--brc-text-muted)")}>
            {fmtDate(slot.date)} · {slot.center.company_name}
          </span>
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 rounded-full px-3 py-1 text-xs font-black",
          selected ? "bg-white text-(--brc-primary)" : "bg-(--brc-success-bg) text-(--brc-success)",
        )}
      >
        {slot.spots_remaining} left
      </span>
    </button>
  );
}

/** Staff dialog to book an inspection on an owner's behalf. */
function BookForOwnerDialog({
  request,
  open,
  onClose,
}: {
  request: AssistanceRequest;
  open: boolean;
  onClose: () => void;
}) {
  const [stateFilter, setStateFilter] = useState<string>(request.state || "");
  const [centerId, setCenterId] = useState<string>("");
  const [slotId, setSlotId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const bookForOwner = useBookForOwner();

  // Staff pick a state, then a center within that state.
  const { data: centersPage } = useAdminCenters({
    is_active: "true",
    page_size: 100,
  });
  const allCenters = useMemo(() => centersPage?.results ?? [], [centersPage]);
  const states = useMemo(
    () =>
      Array.from(new Set(allCenters.map((c) => c.state).filter(Boolean))).sort(),
    [allCenters],
  );
  const centers = useMemo(
    () => allCenters.filter((c) => !stateFilter || c.state === stateFilter),
    [allCenters, stateFilter],
  );
  // Bound the read to a rolling window instead of every future slot.
  const slotWindow = useMemo(() => availabilityWindow(), []);
  const { data: slots, isLoading: slotsLoading } = useAvailableSlots(
    centerId || undefined,
    undefined,
    slotWindow,
  );
  const openSlots = useMemo(
    () => (slots ?? []).filter((s) => s.spots_remaining > 0),
    [slots],
  );
  const selectedCenter = useMemo(
    () => allCenters.find((c) => c.id === centerId),
    [allCenters, centerId],
  );
  const selectedSlot = useMemo(
    () => openSlots.find((s) => s.id === slotId),
    [openSlots, slotId],
  );
  const availableDates = useMemo(
    () => new Set(openSlots.map((s) => s.date)),
    [openSlots],
  );
  const firstAvailableMonth = useMemo(
    () => (openSlots[0] ? parseDateString(openSlots[0].date) : today()),
    [openSlots],
  );
  const daySlots = useMemo(() => {
    if (!selectedDate) return [];
    const iso = toDateString(selectedDate);
    return openSlots.filter((s) => s.date === iso);
  }, [openSlots, selectedDate]);

  function handleCenterSelect(id: string) {
    setCenterId(id);
    setSlotId("");
    setSelectedDate(undefined);
  }

  function handleDateSelect(date?: Date) {
    setSelectedDate(date);
    setSlotId("");
  }

  async function handleBook() {
    if (!request.car || !slotId) return;
    try {
      await bookForOwner.mutateAsync({
        car_id: request.car,
        slot_id: slotId,
        attendee_type: "self",
      });
      toast.success(`Inspection booked for ${request.owner_name}.`);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not book inspection.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden rounded-[28px] border border-white/40 bg-white p-0 shadow-[0_32px_90px_rgba(18,18,18,0.28)] sm:max-w-[1120px]">
        <DialogHeader className="relative shrink-0 overflow-hidden border-b border-(--brc-border) bg-white px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-4">
              <span className="flex size-13 shrink-0 items-center justify-center rounded-2xl border border-(--brc-border) bg-(--brc-primary-tint) text-(--brc-primary) shadow-[var(--brc-shadow-xs)]">
                <ShieldCheckIcon size={25} />
              </span>
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-(--brc-border) bg-(--brc-bg-subtle) px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                    Staff assisted booking
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-(--brc-primary-tint) px-3 py-1 text-xs font-bold text-(--brc-primary) [font-family:var(--brc-font-ui)]">
                    <SparklesIcon size={13} />
                    Concierge flow
                  </span>
                </div>
                <DialogTitle className="text-2xl font-black leading-tight text-(--brc-text) [font-family:var(--brc-font-display)] sm:text-[32px]">
                  Book for {request.owner_name}
                </DialogTitle>
                <DialogDescription className="mt-2 max-w-2xl text-sm leading-6 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  Choose the best inspection center and appointment window for{" "}
                  {request.car_title || "this owner's vehicle"}. The owner receives the confirmed booking details immediately.
                </DialogDescription>
              </div>
            </div>

            <div className="relative rounded-2xl border border-(--brc-border) bg-(--brc-bg-subtle) p-3 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)] sm:min-w-[240px]">
              <div className="flex items-center gap-2 font-black text-(--brc-text)">
                <UserRoundIcon size={16} />
                {request.owner_name}
              </div>
              <div className="mt-2 truncate text-xs text-(--brc-text-muted)">{request.owner_email}</div>
              {request.owner_phone && <div className="mt-1 text-xs text-(--brc-text-muted)">{request.owner_phone}</div>}
            </div>
          </div>
        </DialogHeader>

        {!request.car ? (
          <p className="m-6 rounded-2xl border border-[#ffd970] bg-(--brc-warning-bg) p-4 text-sm font-semibold text-[#9a7400] [font-family:var(--brc-font-ui)]">
            This request isn&apos;t linked to a specific car, so it can&apos;t be
            booked automatically. Contact the owner to proceed.
          </p>
        ) : (
          <div className="grid min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_100%)] lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-w-0 flex-col gap-6 p-5 sm:p-7">
              <section className="flex flex-col gap-3">
                <div>
                  <h3 className="text-base font-black text-(--brc-text) [font-family:var(--brc-font-display)]">
                    Choose state
                  </h3>
                  <p className="mt-1 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                    Start with the owner&apos;s requested area, or switch to another service state.
                  </p>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {states.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setStateFilter(s);
                        setCenterId("");
                        setSlotId("");
                        setSelectedDate(undefined);
                      }}
                      className={cn(
                        "h-10 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-black transition-all [font-family:var(--brc-font-ui)]",
                        stateFilter === s
                          ? "border-(--brc-primary) bg-(--brc-primary) text-white shadow-[0_10px_24px_rgba(0,0,139,0.20)]"
                          : "border-(--brc-border) bg-white text-(--brc-text) hover:border-(--brc-primary)/45 hover:bg-(--brc-primary-tint)",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </section>

              <section className="flex flex-col gap-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-(--brc-text) [font-family:var(--brc-font-display)]">
                      Select inspection center
                    </h3>
                    <p className="mt-1 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      {centers.length} active center{centers.length === 1 ? "" : "s"} available in {stateFilter || "all states"}.
                    </p>
                  </div>
                </div>
                {centers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-(--brc-border) bg-white p-6 text-sm font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                    No active centers found for this state.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {centers.map((center) => (
                      <CenterOption
                        key={center.id}
                        center={center}
                        selected={center.id === centerId}
                        onSelect={() => handleCenterSelect(center.id)}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
                <div className="rounded-3xl border border-(--brc-border) bg-white p-4 shadow-[0_18px_48px_rgba(18,18,18,0.08)]">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-(--brc-text) [font-family:var(--brc-font-display)]">
                        Date
                      </h3>
                      <p className="text-xs font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                        Blue days have open slots
                      </p>
                    </div>
                    {slotsLoading && <Loader2Icon size={18} className="animate-spin text-(--brc-primary)" />}
                  </div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => !centerId || !availableDates.has(toDateString(date))}
                    startMonth={today()}
                    defaultMonth={firstAvailableMonth}
                    modifiers={{
                      available: (date) => availableDates.has(toDateString(date)),
                    }}
                    modifiersClassNames={{
                      available:
                        "rounded-[12px] bg-(--brc-primary-tint) text-(--brc-primary) font-extrabold",
                    }}
                    className="w-full bg-transparent p-0 [--cell-radius:12px] [--cell-size:2.4rem]"
                    classNames={{
                      root: "w-full",
                      months: "relative flex w-full flex-col gap-3",
                      month: "flex w-full flex-col gap-3",
                      nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between",
                      month_caption: "flex h-10 w-full items-center justify-center px-11",
                      caption_label:
                        "truncate text-[18px] font-black leading-none text-(--brc-text) [font-family:var(--brc-font-display)]",
                      button_previous:
                        "size-9 rounded-full border border-(--brc-border) bg-white text-(--brc-text) shadow-sm transition hover:-translate-x-0.5 hover:border-(--brc-primary)/40 hover:bg-(--brc-primary-tint) hover:text-(--brc-primary)",
                      button_next:
                        "size-9 rounded-full border border-(--brc-border) bg-white text-(--brc-text) shadow-sm transition hover:translate-x-0.5 hover:border-(--brc-primary)/40 hover:bg-(--brc-primary-tint) hover:text-(--brc-primary)",
                      weekdays: "grid grid-cols-7 gap-1",
                      weekday:
                        "flex h-7 items-center justify-center rounded-md text-[11px] font-black uppercase tracking-[0.08em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]",
                      week: "grid grid-cols-7 gap-1.5",
                      day: "relative aspect-square rounded-[12px] text-center",
                      day_button:
                        "relative z-10 flex size-full min-w-0 cursor-pointer items-center justify-center rounded-[12px] text-sm font-bold text-inherit transition-[background-color,color,transform,box-shadow] duration-200 ease-out hover:scale-[1.06] hover:bg-(--brc-primary) hover:text-white hover:shadow-[0_10px_24px_rgba(0,0,139,0.22)] active:scale-95 data-[selected-single=true]:bg-(--brc-primary) data-[selected-single=true]:text-white data-[selected-single=true]:shadow-[0_10px_24px_rgba(0,0,139,0.22)] [font-family:var(--brc-font-ui)]",
                      today: "rounded-[12px] ring-1 ring-(--brc-primary)/40",
                      disabled: "pointer-events-none text-(--brc-text-muted) opacity-35",
                      outside: "text-(--brc-text-muted) opacity-35",
                    }}
                  />
                </div>

                <div className="rounded-3xl border border-(--brc-border) bg-white p-4 shadow-[0_18px_48px_rgba(18,18,18,0.08)]">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-(--brc-text) [font-family:var(--brc-font-display)]">
                        Available times
                      </h3>
                      <p className="text-xs font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                        {selectedDate ? fmtLongDate(toDateString(selectedDate)) : "Pick a highlighted date"}
                      </p>
                    </div>
                    <ClockIcon size={18} className="text-(--brc-primary)" />
                  </div>

                  {!centerId ? (
                    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-(--brc-border) bg-(--brc-bg-subtle) px-6 text-center">
                      <Building2Icon size={28} className="text-(--brc-text-muted)" />
                      <p className="text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                        Select a center first
                      </p>
                    </div>
                  ) : slotsLoading ? (
                    <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-(--brc-border) bg-(--brc-bg-subtle)">
                      <Loader2Icon size={24} className="animate-spin text-(--brc-primary)" />
                    </div>
                  ) : openSlots.length === 0 ? (
                    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-(--brc-border) bg-(--brc-bg-subtle) px-6 text-center">
                      <CalendarIcon size={28} className="text-(--brc-text-muted)" />
                      <div>
                        <p className="text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                          No open slots at this center
                        </p>
                        <p className="mt-1 text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                          Create slots for this center, then return to book.
                        </p>
                      </div>
                    </div>
                  ) : !selectedDate ? (
                    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-(--brc-border) bg-(--brc-bg-subtle) px-6 text-center">
                      <CalendarIcon size={28} className="text-(--brc-text-muted)" />
                      <p className="text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                        Choose an available date
                      </p>
                    </div>
                  ) : daySlots.length === 0 ? (
                    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-(--brc-border) bg-(--brc-bg-subtle) px-6 text-center">
                      <ClockIcon size={28} className="text-(--brc-text-muted)" />
                      <p className="text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                        No openings on this date
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {daySlots.map((slot) => (
                        <SlotOption
                          key={slot.id}
                          slot={slot}
                          selected={slot.id === slotId}
                          onSelect={() => setSlotId(slot.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <aside className="border-t border-(--brc-border) bg-white p-5 lg:border-l lg:border-t-0 sm:p-7">
              <div className="sticky top-0 flex flex-col gap-4">
                <div className="rounded-3xl border border-(--brc-border) bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_100%)] p-5 shadow-[0_18px_48px_rgba(18,18,18,0.08)]">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                    Booking summary
                  </h3>
                  <div className="mt-5 flex flex-col gap-4 [font-family:var(--brc-font-ui)]">
                    <div className="flex gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--brc-primary-tint) text-(--brc-primary)">
                        <Building2Icon size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-(--brc-text-muted)">
                          Center
                        </p>
                        <p className="mt-1 text-sm font-black text-(--brc-text)">
                          {selectedCenter?.company_name ?? "Choose a center"}
                        </p>
                        {selectedCenter && (
                          <p className="mt-1 text-xs leading-5 text-(--brc-text-secondary)">
                            {selectedCenter.address}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--brc-primary-tint) text-(--brc-primary)">
                        <CalendarIcon size={18} />
                      </span>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-(--brc-text-muted)">
                          Date
                        </p>
                        <p className="mt-1 text-sm font-black text-(--brc-text)">
                          {selectedSlot ? fmtLongDate(selectedSlot.date) : "Choose a date"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--brc-primary-tint) text-(--brc-primary)">
                        <ClockIcon size={18} />
                      </span>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-(--brc-text-muted)">
                          Time
                        </p>
                        <p className="mt-1 text-sm font-black text-(--brc-text)">
                          {selectedSlot ? `${fmtTime(selectedSlot.start_time)} - ${fmtTime(selectedSlot.end_time)}` : "Choose a time"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-(--brc-border) bg-(--brc-primary-tint) p-5 [font-family:var(--brc-font-ui)]">
                  <p className="text-sm font-black text-(--brc-primary)">
                    What happens next
                  </p>
                  <p className="mt-2 text-sm leading-6 text-(--brc-text-secondary)">
                    The owner gets an appointment confirmation and the vehicle moves into inspection pending for the selected slot.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        )}

        <DialogFooter className="sticky bottom-0 z-20 shrink-0 border-t border-(--brc-border) bg-white/95 px-6 py-4 shadow-[0_-18px_40px_rgba(18,18,18,0.08)] backdrop-blur sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-lg border border-(--brc-border) bg-white px-4 text-sm font-bold text-(--brc-text) hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
          >
            Close
          </button>
          {request.car && (
            <button
              type="button"
              onClick={handleBook}
              disabled={!slotId || bookForOwner.isPending}
              className="inline-flex h-12 min-w-[220px] cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-(--brc-primary) px-6 text-sm font-black text-(--brc-text-on-primary) shadow-[0_14px_30px_rgba(0,0,139,0.24)] hover:bg-(--brc-primary-hover) disabled:cursor-not-allowed disabled:opacity-60 [font-family:var(--brc-font-ui)]"
            >
              {bookForOwner.isPending && (
                <Loader2Icon size={15} className="animate-spin" />
              )}
              {slotId ? "Book inspection for owner" : "Select a slot to book"}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AssistanceQueue() {
  const { data, isLoading } = useAssistanceRequests({ status: "open", page_size: 100 });
  const handle = useHandleAssistance();
  const [bookingFor, setBookingFor] = useState<AssistanceRequest | null>(null);

  const requests = useMemo(() => data?.results ?? [], [data]);

  async function markHandled(id: string) {
    try {
      await handle.mutateAsync(id);
      toast.success("Marked as handled.");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not update request.",
      );
    }
  }

  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-[var(--brc-space-10,40px)]">
        <div className="flex items-center gap-2.5 rounded-2xl border border-(--brc-border) bg-white px-5 py-4 shadow-[var(--brc-shadow-xs)] [font-family:var(--brc-font-ui)]">
          <Loader2Icon size={16} className="animate-spin text-(--brc-primary)" />
          <span className="text-[13px] font-semibold text-(--brc-text-muted)">
            Checking booking assistance requests…
          </span>
        </div>
      </section>
    );
  }
  if (requests.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-[var(--brc-space-10,40px)]">
      <div className="rounded-2xl border border-(--brc-border) bg-white p-5 shadow-[var(--brc-shadow-xs)] sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-(--brc-primary-tint) text-(--brc-primary)">
            <LifeBuoyIcon size={18} />
          </span>
          <div>
            <h2 className="text-base font-black text-(--brc-text) [font-family:var(--brc-font-display)]">
              Booking assistance ({requests.length})
            </h2>
            <p className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              Owners with no inspection center in their area.
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-3">
          {requests.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-3 rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-4 sm:flex-row sm:items-center sm:justify-between [font-family:var(--brc-font-ui)]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-extrabold text-(--brc-text)">
                    {r.owner_name}
                  </span>
                  <span className="text-xs text-(--brc-text-muted)">
                    {r.state || "—"} · {timeAgo(r.created_at)}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-(--brc-text-secondary)">
                  {r.car_title || "No car linked"} · {r.owner_email}
                  {r.owner_phone ? ` · ${r.owner_phone}` : ""}
                </div>
                {r.message && (
                  <p className="mt-2 rounded-lg border border-(--brc-border) bg-white p-2.5 text-xs text-(--brc-text-secondary)">
                    {r.message}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setBookingFor(r)}
                  className={cn(
                    "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-(--brc-primary) px-4 text-sm font-bold text-(--brc-text-on-primary) hover:bg-(--brc-primary-hover)",
                  )}
                >
                  Book for owner
                </button>
                <button
                  type="button"
                  onClick={() => markHandled(r.id)}
                  disabled={handle.isPending}
                  className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-(--brc-border) bg-white px-4 text-sm font-bold text-(--brc-text) hover:bg-white/60 disabled:opacity-60"
                >
                  <CheckCircle2Icon size={15} />
                  Mark handled
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {bookingFor && (
        <BookForOwnerDialog
          request={bookingFor}
          open={!!bookingFor}
          onClose={() => setBookingFor(null)}
        />
      )}
    </section>
  );
}
