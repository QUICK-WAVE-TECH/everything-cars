"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  Building2Icon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  Loader2Icon,
  MapPinIcon,
  ShieldCheckIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  useAvailableSlots,
  useCentersByCity,
  useCreateBooking,
  useLocations,
  useRescheduleBooking,
} from "@/features/inspections/api/inspections-api";
import type { AvailableSlot, InspectionCenter } from "@/features/inspections/api/types";
import { ApiError } from "@/lib/api-client";

// ── Helpers ──

function formatTime(time: string) {
  // "09:00:00" → "9:00 AM"
  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr ?? "0", 10);
  const minute = minuteStr ?? "00";
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${minute} ${period}`;
}

function toDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Never call `new Date("YYYY-MM-DD")` — parse the parts manually to avoid
// timezone off-by-one bugs.
function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function formatDateLabel(dateStr: string) {
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

// ── Step indicator ──

const STEP_LABELS = ["Location", "Center", "Date & time", "Confirm"] as const;

function StepDot({ step, current, label }: { step: number; current: number; label: string }) {
  const done = current > step;
  const active = current === step;
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-full border px-3 py-2 transition-colors",
        active
          ? "border-(--brc-primary) bg-white text-(--brc-primary)"
          : done
          ? "border-(--brc-success)/30 bg-(--brc-success-bg) text-(--brc-success)"
          : "border-white/20 bg-white/10 text-white/70",
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold [font-family:var(--brc-font-ui)]",
          active
            ? "bg-(--brc-primary) text-white"
            : done
            ? "bg-(--brc-success) text-white"
            : "bg-white/15 text-white/75",
        )}
      >
        {done ? <CheckCircle2Icon size={14} /> : step}
      </span>
      <span className="truncate text-sm font-bold [font-family:var(--brc-font-ui)]">
        {label}
      </span>
    </div>
  );
}

// ── Center card ──

function CenterCard({
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
        "group flex min-w-0 flex-col gap-2 rounded-lg border p-4 text-left transition-all duration-200 [font-family:var(--brc-font-ui)]",
        selected
          ? "border-(--brc-primary) bg-(--brc-primary) text-white shadow-[0_14px_34px_rgba(0,0,139,0.24)]"
          : "border-(--brc-border) bg-white text-(--brc-text) hover:-translate-y-0.5 hover:border-(--brc-primary) hover:shadow-[0_12px_28px_rgba(18,18,18,0.08)]",
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            selected ? "bg-white/15 text-white" : "bg-(--brc-primary-tint) text-(--brc-primary)",
          )}
        >
          <Building2Icon size={16} />
        </span>
        <span className="min-w-0 truncate text-sm font-extrabold">
          {center.company_name}
        </span>
      </span>
      <span
        className={cn(
          "text-xs leading-5",
          selected ? "text-white/80" : "text-(--brc-text-muted)",
        )}
      >
        {center.address}
      </span>
      <span
        className={cn(
          "mt-1 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
          selected ? "bg-white/15 text-white" : "bg-(--brc-bg-muted) text-(--brc-text-muted)",
        )}
      >
        <MapPinIcon size={11} />
        {center.city}
      </span>
    </button>
  );
}

// ── Slot button ──

function SlotButton({
  slot,
  selected,
  onSelect,
}: {
  slot: AvailableSlot;
  selected: boolean;
  onSelect: () => void;
}) {
  const isFull = slot.spots_remaining === 0;
  const label = isFull ? "Full" : `${slot.spots_remaining} spot${slot.spots_remaining === 1 ? "" : "s"} left`;
  const timeLabel = `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`;

  return (
    <button
      type="button"
      disabled={isFull}
      onClick={onSelect}
      className={cn(
        "group flex min-h-[96px] min-w-0 flex-col justify-between rounded-lg border p-3 text-left transition-all duration-200 [font-family:var(--brc-font-ui)] disabled:cursor-not-allowed disabled:opacity-45",
        selected
          ? "border-(--brc-primary) bg-(--brc-primary) text-white shadow-[0_14px_34px_rgba(0,0,139,0.24)]"
          : "border-(--brc-border) bg-white text-(--brc-text) hover:-translate-y-0.5 hover:border-(--brc-primary) hover:shadow-[0_12px_28px_rgba(18,18,18,0.08)]",
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            selected ? "bg-white/15 text-white" : "bg-(--brc-primary-tint) text-(--brc-primary)",
          )}
        >
          <ClockIcon size={16} />
        </span>
        <span className="min-w-0 truncate text-sm font-extrabold">
          {timeLabel}
        </span>
      </span>
      <span
        className={cn(
          "mt-3 inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-bold",
          selected
            ? "bg-white/15 text-white"
            : isFull
            ? "bg-(--brc-bg-muted) text-(--brc-text-muted)"
            : "bg-(--brc-success-bg) text-(--brc-success)",
        )}
      >
        {label}
      </span>
    </button>
  );
}

// ── Props ──

export interface BookingModalProps {
  carId: string;
  carTitle?: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** When rescheduling an existing booking instead of creating a new one. */
  mode?: "book" | "reschedule";
  bookingId?: string;
}

// ── Component ──

export function BookingModal({
  carId,
  carTitle,
  open,
  onClose,
  onSuccess,
  mode = "book",
  bookingId,
}: BookingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: location
  const [country, setCountry] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [city, setCity] = useState<string>("");

  // Step 2: center
  const [selectedCenter, setSelectedCenter] = useState<InspectionCenter | null>(null);

  // Step 3: date & time
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  const { data: locations, isLoading: isLoadingLocations } = useLocations();
  const { data: centers, isLoading: isLoadingCenters } = useCentersByCity({
    country: country || undefined,
    state: state || undefined,
    city: city || undefined,
  });

  const dateStr = selectedDate ? toDateString(selectedDate) : undefined;
  const { data: allCenterSlots, isLoading: isLoadingAllSlots } = useAvailableSlots(
    selectedCenter?.id,
  );
  const { data: daySlots, isLoading: isLoadingDaySlots } = useAvailableSlots(
    selectedCenter?.id,
    dateStr,
  );

  const createBooking = useCreateBooking();
  const rescheduleBooking = useRescheduleBooking();
  const isReschedule = mode === "reschedule";

  const states = useMemo(
    () => locations?.find((l) => l.country === country)?.states ?? [],
    [locations, country],
  );
  const cities = useMemo(
    () => states.find((s) => s.state === state)?.cities ?? [],
    [states, state],
  );

  // Build set of dates that have at least one slot with spots remaining
  const availableDates = useMemo(() => {
    if (!allCenterSlots) return new Set<string>();
    return new Set(
      allCenterSlots.filter((s) => s.spots_remaining > 0).map((s) => s.date),
    );
  }, [allCenterSlots]);

  const todayDate = today();

  function isDisabled(date: Date) {
    if (date < todayDate) return true;
    const ds = toDateString(date);
    return !availableDates.has(ds);
  }

  function handleCountryChange(value: string | null) {
    setCountry(value ?? "");
    setState("");
    setCity("");
  }

  function handleStateChange(value: string | null) {
    setState(value ?? "");
    setCity("");
  }

  function handleCityChange(value: string | null) {
    setCity(value ?? "");
  }

  function goToStep2() {
    if (!city) return;
    setSelectedCenter(null);
    setStep(2);
  }

  function handleSelectCenter(center: InspectionCenter) {
    setSelectedCenter(center);
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setStep(3);
  }

  function handleDateSelect(date: Date | undefined) {
    setSelectedDate(date);
    setSelectedSlot(null);
  }

  function handleSlotSelect(slot: AvailableSlot) {
    setSelectedSlot(slot);
  }

  function goToStep4() {
    if (!selectedSlot) return;
    setStep(4);
  }

  function handleBack() {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else if (step === 4) setStep(3);
  }

  async function handleConfirm() {
    if (!selectedSlot) return;
    try {
      if (isReschedule && bookingId) {
        await rescheduleBooking.mutateAsync({ bookingId, slot_id: selectedSlot.id });
        toast.success("Inspection rescheduled. Attend your inspection at the selected center.");
      } else {
        await createBooking.mutateAsync({ car_id: carId, slot_id: selectedSlot.id });
        toast.success("Inspection booked! Attend your inspection at the selected center.");
      }
      onSuccess();
      handleReset();
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    }
  }

  function handleReset() {
    setStep(1);
    setCountry("");
    setState("");
    setCity("");
    setSelectedCenter(null);
    setSelectedDate(undefined);
    setSelectedSlot(null);
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      handleReset();
      onClose();
    }
  }

  // Reset the flow whenever the dialog is closed
  useEffect(() => {
    if (!open) handleReset();
  }, [open]);

  const isConfirming = createBooking.isPending || rescheduleBooking.isPending;
  const canProceedStep1 = !!city;
  const canProceedStep3 = !!selectedSlot;
  const canConfirm = !!selectedSlot && !isConfirming;

  const selectedDateLabel = dateStr ? formatDateLabel(dateStr) : undefined;
  const availableDateCount = availableDates.size;

  const isLoadingSlots = isLoadingAllSlots || isLoadingDaySlots;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[calc(100vh-2rem)] gap-0 overflow-hidden rounded-2xl border border-white/70 bg-white p-0 shadow-[0_28px_80px_rgba(18,18,18,0.22)] sm:max-w-[900px]"
        showCloseButton={!isConfirming}
      >
        <DialogHeader className="relative overflow-hidden bg-(--brc-surface-inverse) px-5 py-5 text-white sm:px-7">
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
          <div className="flex flex-col gap-4 pr-10">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-lg bg-white text-(--brc-primary)">
                <ShieldCheckIcon size={22} />
              </span>
              <div className="min-w-0">
                <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/55 [font-family:var(--brc-font-ui)]">
                  Vehicle inspection
                </span>
                <DialogTitle className="mt-1 text-2xl font-black leading-tight text-white [font-family:var(--brc-font-display)]">
                  {isReschedule ? "Reschedule inspection" : "Book an inspection"}
                </DialogTitle>
                <p className="mt-1 max-w-[620px] text-sm leading-6 text-white/68 [font-family:var(--brc-font-ui)]">
                  Choose a center and an available visit window. Attend your inspection at the selected center — no further confirmation needed.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {STEP_LABELS.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <StepDot step={i + 1} current={step} label={label} />
                  {i < STEP_LABELS.length - 1 && (
                    <span className="hidden h-px w-6 bg-white/20 sm:block" />
                  )}
                </div>
              ))}
              {step === 3 && (
                <span className="ml-auto hidden rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white/72 [font-family:var(--brc-font-ui)] sm:inline-flex">
                  {availableDateCount} available date{availableDateCount === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid max-h-[calc(100vh-250px)] min-h-[430px] overflow-y-auto bg-(--brc-bg-subtle) lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 p-4 sm:p-6">
            <div className="rounded-xl border border-(--brc-border) bg-white p-4 shadow-[0_16px_40px_rgba(18,18,18,0.06)] sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-(--brc-text) [font-family:var(--brc-font-display)]">
                    {step === 1 && "Select a location"}
                    {step === 2 && "Select an inspection center"}
                    {step === 3 && "Select a visit date and time"}
                    {step === 4 && "Confirm your appointment"}
                  </h3>
                  <p className="mt-1 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                    {step === 1 && "Pick the country, state, and city closest to you."}
                    {step === 2 && "These centers serve your selected city."}
                    {step === 3 &&
                      (selectedDateLabel ?? "Only dates with staff-created openings are selectable.")}
                    {step === 4 && "Review the details below, then confirm."}
                  </p>
                </div>

                {step > 1 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-(--brc-border) bg-white px-3 text-sm font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
                  >
                    <ArrowLeftIcon size={15} />
                    Back
                  </button>
                )}
              </div>

              {/* Step 1: Location */}
              {step === 1 && (
                <div className="flex flex-col gap-4">
                  {isLoadingLocations ? (
                    <div className="flex h-[220px] w-full items-center justify-center">
                      <Loader2Icon size={26} className="animate-spin text-(--brc-primary)" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                          Country
                        </span>
                        <Select value={country} onValueChange={handleCountryChange}>
                          <SelectTrigger className="h-11 w-full">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            {(locations ?? []).map((l) => (
                              <SelectItem key={l.country} value={l.country}>
                                {l.country}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>

                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                          State
                        </span>
                        <Select value={state} onValueChange={handleStateChange} disabled={!country}>
                          <SelectTrigger className="h-11 w-full">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {states.map((s) => (
                              <SelectItem key={s.state} value={s.state}>
                                {s.state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>

                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                          City
                        </span>
                        <Select value={city} onValueChange={handleCityChange} disabled={!state}>
                          <SelectTrigger className="h-11 w-full">
                            <SelectValue placeholder="Select city" />
                          </SelectTrigger>
                          <SelectContent>
                            {cities.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Center */}
              {step === 2 && (
                <div className="flex flex-col gap-4">
                  {isLoadingCenters ? (
                    <div className="flex h-[220px] items-center justify-center rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle)">
                      <Loader2Icon size={24} className="animate-spin text-(--brc-primary)" />
                    </div>
                  ) : !centers || centers.length === 0 ? (
                    <div className="flex h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-(--brc-border-strong) bg-(--brc-bg-subtle) px-6 text-center">
                      <span className="flex size-12 items-center justify-center rounded-full bg-white text-(--brc-text-muted)">
                        <Building2Icon size={22} />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                          No centers in this city
                        </p>
                        <p className="mt-1 text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                          Go back and pick another location.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {centers.map((center) => (
                        <CenterCard
                          key={center.id}
                          center={center}
                          selected={selectedCenter?.id === center.id}
                          onSelect={() => handleSelectCenter(center)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Date & time */}
              {step === 3 && (
                <div className="flex flex-col gap-4 lg:flex-row">
                  <div className="rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-2 sm:p-4 lg:w-[380px] lg:shrink-0">
                    {isLoadingAllSlots ? (
                      <div className="flex h-[330px] w-full items-center justify-center">
                        <Loader2Icon size={26} className="animate-spin text-(--brc-primary)" />
                      </div>
                    ) : (
                      <div className="mx-auto flex w-full max-w-[380px] flex-col gap-3 rounded-xl bg-white p-3 shadow-[0_14px_34px_rgba(18,18,18,0.08)] sm:p-4">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          disabled={isDisabled}
                          startMonth={todayDate}
                          modifiers={{
                            available: (date) => availableDates.has(toDateString(date)),
                          }}
                          modifiersClassNames={{
                            available:
                              "bg-(--brc-primary-tint) text-(--brc-primary) font-extrabold hover:bg-(--brc-primary) hover:text-white",
                          }}
                          className="w-full bg-transparent p-0 [--cell-radius:10px] [--cell-size:2.35rem]"
                          classNames={{
                            root: "w-full",
                            months: "relative flex w-full flex-col gap-3",
                            month: "flex w-full flex-col gap-3",
                            nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between",
                            month_caption:
                              "flex h-10 w-full items-center justify-center px-11",
                            caption_label:
                              "truncate text-[18px] font-black leading-none text-(--brc-text) [font-family:var(--brc-font-display)] sm:text-[20px]",
                            button_previous:
                              "size-9 rounded-full border border-(--brc-border) bg-white text-(--brc-text) shadow-sm transition hover:-translate-x-0.5 hover:border-(--brc-primary) hover:bg-(--brc-primary) hover:text-white",
                            button_next:
                              "size-9 rounded-full border border-(--brc-border) bg-white text-(--brc-text) shadow-sm transition hover:translate-x-0.5 hover:border-(--brc-primary) hover:bg-(--brc-primary) hover:text-white",
                            weekdays: "grid grid-cols-7 gap-1",
                            weekday:
                              "flex h-7 items-center justify-center rounded-md text-[11px] font-black uppercase tracking-[0.08em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]",
                            week: "grid grid-cols-7 gap-1.5",
                            day:
                              "relative aspect-square rounded-[10px] text-center transition",
                            day_button:
                              "relative z-10 size-[var(--cell-size)] min-w-0 rounded-[10px] text-sm font-bold text-(--brc-text) transition-all duration-150 hover:bg-(--brc-primary-tint) hover:text-(--brc-primary) data-[selected-single=true]:bg-(--brc-primary) data-[selected-single=true]:text-white data-[selected-single=true]:shadow-[0_10px_20px_rgba(0,0,139,0.24)] [font-family:var(--brc-font-ui)]",
                            today:
                              "rounded-[10px] ring-1 ring-(--brc-warning)",
                            disabled:
                              "pointer-events-none text-(--brc-text-muted) opacity-20 grayscale",
                            outside: "text-(--brc-text-muted) opacity-20",
                          }}
                        />

                        <div className="grid grid-cols-2 gap-2 border-t border-(--brc-border) pt-3 text-[11px] font-bold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                          <span className="flex items-center gap-1.5">
                            <span className="size-2.5 rounded-full bg-(--brc-primary)" />
                            Available
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="size-2.5 rounded-full bg-(--brc-bg-muted) ring-1 ring-(--brc-border)" />
                            Unavailable
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {!selectedDate ? (
                      <div className="flex h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-(--brc-border-strong) bg-(--brc-bg-subtle) px-6 text-center">
                        <span className="flex size-12 items-center justify-center rounded-full bg-white text-(--brc-text-muted)">
                          <CalendarIcon size={22} />
                        </span>
                        <p className="text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                          Pick a date to see time windows
                        </p>
                      </div>
                    ) : isLoadingSlots ? (
                      <div className="flex h-[240px] items-center justify-center rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle)">
                        <Loader2Icon size={24} className="animate-spin text-(--brc-primary)" />
                      </div>
                    ) : !daySlots || daySlots.length === 0 ? (
                      <div className="flex h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-(--brc-border-strong) bg-(--brc-bg-subtle) px-6 text-center">
                        <span className="flex size-12 items-center justify-center rounded-full bg-white text-(--brc-text-muted)">
                          <ClockIcon size={22} />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                            No openings on this date
                          </p>
                          <p className="mt-1 text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                            Pick another available day to continue.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {daySlots.map((slot) => (
                          <SlotButton
                            key={slot.id}
                            slot={slot}
                            selected={selectedSlot?.id === slot.id}
                            onSelect={() => handleSlotSelect(slot)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Confirm */}
              {step === 4 && selectedSlot && selectedCenter && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-5">
                    {carTitle && (
                      <div className="mb-4 border-b border-(--brc-border) pb-4">
                        <span className="block text-[11px] font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                          Vehicle
                        </span>
                        <span className="block text-sm font-extrabold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                          {carTitle}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-(--brc-success)">
                          <MapPinIcon size={18} />
                        </span>
                        <div className="min-w-0">
                          <span className="block text-[11px] font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                            Center
                          </span>
                          <span className="block text-sm font-extrabold leading-5 text-(--brc-text) [font-family:var(--brc-font-ui)]">
                            {selectedCenter.company_name}
                          </span>
                          <span className="block text-xs leading-5 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                            {selectedCenter.address}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-(--brc-primary)">
                          <CalendarIcon size={18} />
                        </span>
                        <div className="min-w-0">
                          <span className="block text-[11px] font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                            Date
                          </span>
                          <span className="block text-sm font-extrabold leading-5 text-(--brc-text) [font-family:var(--brc-font-ui)]">
                            {formatDateLabel(selectedSlot.date)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-(--brc-accent)">
                          <ClockIcon size={18} />
                        </span>
                        <div className="min-w-0">
                          <span className="block text-[11px] font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                            Time
                          </span>
                          <span className="block text-sm font-extrabold leading-5 text-(--brc-text) [font-family:var(--brc-font-ui)]">
                            {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-(--brc-accent)/25 bg-(--brc-accent-bg) p-4">
                    <p className="text-sm font-extrabold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                      What happens next
                    </p>
                    <p className="mt-1 text-xs leading-5 text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                      Your appointment is confirmed immediately. Attend your inspection at the selected center on the date and time above.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="border-t border-(--brc-border) bg-white p-4 sm:p-6 lg:border-l lg:border-t-0">
            <div className="sticky top-0 flex flex-col gap-4">
              <div className="rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-4">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  Appointment summary
                </span>

                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-(--brc-success)">
                      <MapPinIcon size={18} />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                        Center
                      </span>
                      <span className="block truncate text-sm font-extrabold leading-5 text-(--brc-text) [font-family:var(--brc-font-ui)]">
                        {selectedCenter?.company_name ?? "Choose a center"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-(--brc-primary)">
                      <CalendarIcon size={18} />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                        Date
                      </span>
                      <span className="block text-sm font-extrabold leading-5 text-(--brc-text) [font-family:var(--brc-font-ui)]">
                        {selectedDateLabel ?? "Choose a date"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-(--brc-accent)">
                      <ClockIcon size={18} />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                        Time
                      </span>
                      <span className="block text-sm font-extrabold leading-5 text-(--brc-text) [font-family:var(--brc-font-ui)]">
                        {selectedSlot
                          ? `${formatTime(selectedSlot.start_time)} - ${formatTime(selectedSlot.end_time)}`
                          : "Choose a time"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-(--brc-accent)/25 bg-(--brc-accent-bg) p-4">
                <p className="text-sm font-extrabold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                  What happens next
                </p>
                <p className="mt-1 text-xs leading-5 text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                  Your appointment is confirmed immediately. Attend your inspection at the selected center.
                </p>
              </div>

              <button
                type="button"
                disabled={step === 4 ? !canConfirm : true}
                onClick={handleConfirm}
                className={cn(
                  "hidden h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-(--brc-primary) px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(0,0,139,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-(--brc-primary-hover) disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 [font-family:var(--brc-font-ui)]",
                  step === 4 && "lg:flex",
                )}
              >
                {isConfirming ? (
                  <>
                    <Loader2Icon size={16} className="animate-spin" />
                    {isReschedule ? "Rescheduling..." : "Booking..."}
                  </>
                ) : (
                  <>
                    <CheckCircle2Icon size={17} />
                    {isReschedule ? "Confirm reschedule" : "Book appointment"}
                  </>
                )}
              </button>
            </div>
          </aside>
        </div>

        <DialogFooter className="mx-0 mb-0 rounded-none border-t border-(--brc-border) bg-white px-5 py-4 sm:px-7">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={isConfirming}
              className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-(--brc-border) bg-white px-4 text-sm font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) disabled:cursor-not-allowed disabled:opacity-60 [font-family:var(--brc-font-ui)]"
            >
              <ArrowLeftIcon size={15} />
              Back
            </button>
          )}

          {step === 1 && (
            <button
              type="button"
              disabled={!canProceedStep1}
              onClick={goToStep2}
              className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-(--brc-primary) px-5 text-sm font-black text-white transition-all duration-200 hover:bg-(--brc-primary-hover) disabled:cursor-not-allowed disabled:opacity-50 [font-family:var(--brc-font-ui)]"
            >
              Choose center
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              disabled={!canProceedStep3}
              onClick={goToStep4}
              className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-(--brc-primary) px-5 text-sm font-black text-white transition-all duration-200 hover:bg-(--brc-primary-hover) disabled:cursor-not-allowed disabled:opacity-50 [font-family:var(--brc-font-ui)]"
            >
              <ClockIcon size={15} />
              Review appointment
            </button>
          )}

          {step === 4 && (
            <button
              type="button"
              disabled={!canConfirm}
              onClick={handleConfirm}
              className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-(--brc-primary) px-5 text-sm font-black text-white transition-all duration-200 hover:bg-(--brc-primary-hover) disabled:cursor-not-allowed disabled:opacity-50 [font-family:var(--brc-font-ui)]"
            >
              {isConfirming && <Loader2Icon size={15} className="animate-spin" />}
              {isConfirming
                ? isReschedule
                  ? "Rescheduling..."
                  : "Booking..."
                : isReschedule
                ? "Confirm reschedule"
                : "Book appointment"}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
