"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Loader2Icon, MapPinIcon, CalendarIcon, ClockIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useAvailableSlots, useCreateBooking } from "@/features/inspections/api/inspections-api";
import type { AvailableSlot } from "@/features/inspections/api/types";
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

function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Step indicator ──

function StepDot({ step, current, label }: { step: number; current: number; label: string }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex items-center gap-2">
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold [font-family:var(--brc-font-ui)]"
        style={{
          background: done || active ? "var(--brc-primary)" : "var(--brc-bg-muted)",
          color: done || active ? "var(--brc-text-on-primary)" : "var(--brc-text-muted)",
        }}
      >
        {done ? "✓" : step}
      </span>
      <span
        className="text-sm [font-family:var(--brc-font-ui)]"
        style={{
          color: active ? "var(--brc-text)" : done ? "var(--brc-text-muted)" : "var(--brc-text-muted)",
          fontWeight: active ? 600 : 400,
        }}
      >
        {label}
      </span>
    </div>
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

  return (
    <button
      type="button"
      disabled={isFull}
      onClick={onSelect}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-left transition-all duration-150 [font-family:var(--brc-font-ui)] disabled:cursor-not-allowed disabled:opacity-40",
      )}
      style={{
        background: selected
          ? "var(--brc-primary)"
          : isFull
          ? "var(--brc-bg-muted)"
          : "var(--brc-bg-subtle)",
        borderColor: selected ? "var(--brc-primary)" : "var(--brc-border)",
        color: selected ? "var(--brc-text-on-primary)" : "var(--brc-text)",
      }}
    >
      <span className="text-sm font-semibold">
        {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
      </span>
      <span
        className="text-[11px] font-medium"
        style={{ color: selected ? "rgba(255,255,255,0.8)" : isFull ? "var(--brc-text-muted)" : "var(--brc-text-muted)" }}
      >
        {label}
      </span>
    </button>
  );
}

// ── Props ──

export interface BookingModalProps {
  carId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ── Component ──

export function BookingModal({ carId, open, onClose, onSuccess }: BookingModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  // Fetch all available slots (no date filter) to know which dates have slots
  const { data: allSlots, isLoading: isLoadingAll } = useAvailableSlots();

  // When a date is selected, fetch slots for that date
  const dateStr = selectedDate ? toDateString(selectedDate) : undefined;
  const { data: daySlots, isLoading: isLoadingDay } = useAvailableSlots(dateStr);

  const createBooking = useCreateBooking();

  // Build set of dates that have at least one slot with spots remaining
  const availableDates = useMemo(() => {
    if (!allSlots) return new Set<string>();
    return new Set(
      allSlots
        .filter((s) => s.spots_remaining > 0)
        .map((s) => s.date),
    );
  }, [allSlots]);

  const todayDate = today();

  function isDisabled(date: Date) {
    // Disable past dates
    if (date < todayDate) return true;
    // Disable dates with no available slots
    const ds = toDateString(date);
    return !availableDates.has(ds);
  }

  function handleDateSelect(date: Date | undefined) {
    setSelectedDate(date);
    setSelectedSlot(null);
    if (date) {
      setStep(2);
    }
  }

  function handleSlotSelect(slot: AvailableSlot) {
    setSelectedSlot(slot);
  }

  function handleBack() {
    setStep(1);
    setSelectedSlot(null);
  }

  async function handleConfirm() {
    if (!selectedSlot) return;
    try {
      await createBooking.mutateAsync({ car_id: carId, slot_id: selectedSlot.id });
      toast.success("Inspection booked! We'll see you then.");
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
    setSelectedDate(undefined);
    setSelectedSlot(null);
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      handleReset();
      onClose();
    }
  }

  const isConfirming = createBooking.isPending;
  const canConfirm = !!selectedDate && !!selectedSlot && !isConfirming;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[480px]"
        showCloseButton={!isConfirming}
      >
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
            Book an Inspection
          </DialogTitle>

          {/* Step indicator */}
          <div className="mt-1 flex items-center gap-4">
            <StepDot step={1} current={step} label="Pick a date" />
            <span className="h-px flex-1 bg-(--brc-border)" />
            <StepDot step={2} current={step} label="Pick a time" />
          </div>
        </DialogHeader>

        {/* Step 1 — Calendar */}
        {step === 1 && (
          <div className="flex flex-col items-center gap-3 py-1">
            {isLoadingAll ? (
              <div className="flex h-[280px] items-center justify-center">
                <Loader2Icon size={24} className="animate-spin text-(--brc-text-muted)" />
              </div>
            ) : (
              <>
                <p className="self-start text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  Select an available date for your car inspection.
                </p>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={isDisabled}
                  startMonth={todayDate}
                />
              </>
            )}
          </div>
        )}

        {/* Step 2 — Time slots */}
        {step === 2 && (
          <div className="flex flex-col gap-4 py-1">
            {/* Selected date header */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 text-sm font-semibold text-(--brc-primary) [font-family:var(--brc-font-ui)] hover:underline"
              >
                <CalendarIcon size={14} />
                {selectedDate?.toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </button>
            </div>

            {isLoadingDay ? (
              <div className="flex h-[160px] items-center justify-center">
                <Loader2Icon size={22} className="animate-spin text-(--brc-text-muted)" />
              </div>
            ) : !daySlots || daySlots.length === 0 ? (
              <div className="flex h-[120px] items-center justify-center rounded-xl border border-dashed border-(--brc-border) text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                No slots available for this date.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {daySlots.map((slot) => (
                    <SlotButton
                      key={slot.id}
                      slot={slot}
                      selected={selectedSlot?.id === slot.id}
                      onSelect={() => handleSlotSelect(slot)}
                    />
                  ))}
                </div>

                {/* Location — shown after slot selected */}
                {selectedSlot && (
                  <div className="flex items-start gap-2 rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) px-4 py-3">
                    <MapPinIcon size={15} className="mt-0.5 shrink-0 text-(--brc-accent)" />
                    <div className="min-w-0 flex-1">
                      <span className="block text-[11px] font-semibold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                        Location
                      </span>
                      <span className="block text-sm font-medium text-(--brc-text) [font-family:var(--brc-font-ui)]">
                        {selectedSlot.location}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 2 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={isConfirming}
              className="flex h-[38px] cursor-pointer items-center justify-center rounded-lg border border-(--brc-border) bg-white px-4 text-sm font-semibold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) disabled:cursor-not-allowed disabled:opacity-60 [font-family:var(--brc-font-ui)]"
            >
              Back
            </button>
          )}

          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="flex h-[38px] cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-(--brc-primary) px-5 text-sm font-bold text-(--brc-text-on-primary) transition-all duration-200 hover:-translate-y-0.5 hover:bg-(--brc-primary-hover) hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none [font-family:var(--brc-font-ui)]"
          >
            {isConfirming && <Loader2Icon size={15} className="animate-spin" />}
            {step === 1 ? (
              <>
                <ClockIcon size={15} />
                Select a date first
              </>
            ) : isConfirming ? (
              "Booking..."
            ) : (
              "Confirm Booking"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
