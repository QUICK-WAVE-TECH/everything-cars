"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  Building2Icon,
  CalendarIcon,
  CheckIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ClockIcon,
  LifeBuoyIcon,
  Loader2Icon,
  LockIcon,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  availabilityWindow,
  useAvailabilitySummary,
  useAvailableSlots,
  useCentersByCity,
  useCreateAssistanceRequest,
  useMyAssistanceRequests,
  useCreateBooking,
  useFeeQuote,
  useLocations,
  useRescheduleBooking,
} from "@/features/inspections/api/inspections-api";
import type { AvailableSlot, InspectionCenter } from "@/features/inspections/api/types";
import { useMe } from "@/features/auth/api";
import { useMyCarDetail } from "@/features/listings/api/listings-api";
import { IdTypeSelect } from "@/features/auth/components";
import { UploadField } from "@/features/auth/components/upload-field";
import { formatOfferAmount } from "@/features/offers/lib/offer-format";
import { ApiError } from "@/lib/api-client";

// Placeholder authorization text — replace with legal-approved copy.
const CONSENT_TEXT =
  "I authorize the named representative to attend the vehicle inspection on my " +
  "behalf, present the declared means of identification, and act for me during " +
  "the inspection. I accept responsibility for their conduct and confirm the " +
  "details above are accurate.";

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

// Solid surfaces on the brc token system — matches the admin drawer,
// my-cars cards, and the staff inspection form.
const inputClass =
  "border border-(--brc-border) bg-white text-(--brc-text) shadow-[var(--brc-shadow-xs)] transition-colors hover:border-(--brc-primary)/40 focus:outline-none focus:ring-2 focus:ring-(--brc-primary)/25";
const selectContentClass =
  "border border-(--brc-border) bg-white text-(--brc-text) shadow-[0_16px_42px_rgba(18,18,18,0.12)]";
const selectItemClass =
  "cursor-pointer text-(--brc-text) hover:bg-(--brc-primary-tint) focus:bg-(--brc-primary-tint) focus:text-(--brc-primary) data-highlighted:bg-(--brc-primary-tint) data-highlighted:text-(--brc-primary)";
const primaryButtonClass =
  "border-none bg-(--brc-primary) text-white shadow-sm hover:bg-(--brc-primary-hover) hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "border border-(--brc-border) bg-white text-(--brc-text) hover:bg-(--brc-bg-subtle) disabled:cursor-not-allowed disabled:opacity-50";

type DropdownOption = { value: string; label: string };

function LocationDropdown({
  value,
  placeholder,
  options,
  disabled,
  onChange,
}: {
  value: string;
  placeholder: string;
  options: DropdownOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          "flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 text-left text-sm font-semibold outline-none transition-all duration-200 [font-family:var(--brc-font-ui)]",
          inputClass,
          disabled &&
            "cursor-not-allowed bg-(--brc-bg-subtle) text-(--brc-text-muted) hover:border-(--brc-border)",
        )}
      >
        <span className={cn("min-w-0 truncate", !value && "text-(--brc-text-muted)")}>
          {value ? selectedLabel : placeholder}
        </span>
        <ChevronDownIcon size={16} className="shrink-0 text-(--brc-text-muted)" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className={cn("max-h-64 overflow-y-auto p-1", selectContentClass)}
      >
        {options.length === 0 ? (
          <div className="px-2.5 py-2 text-sm font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            No options available
          </div>
        ) : (
          options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-2 px-2.5 py-2 font-semibold [font-family:var(--brc-font-ui)]",
                selectItemClass,
              )}
            >
              <span className="min-w-0 truncate">{option.label}</span>
              {value === option.value && <CheckIcon size={15} className="shrink-0 text-(--brc-primary)" />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StepDot({ step, current, label }: { step: number; current: number; label: string }) {
  const done = current > step;
  const active = current === step;
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-full border px-3 py-2 transition-all duration-200",
        active
          ? "border-(--brc-primary)/35 bg-(--brc-primary-tint) text-(--brc-primary)"
          : done
          ? "border-transparent bg-(--brc-success-bg) text-(--brc-success)"
          : "border-(--brc-border) bg-(--brc-bg-subtle) text-(--brc-text-muted)",
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold [font-family:var(--brc-font-ui)]",
          active
            ? "bg-(--brc-primary) text-white"
            : done
            ? "bg-(--brc-success) text-white"
            : "bg-(--brc-bg-muted) text-(--brc-text-muted)",
        )}
      >
        {done ? <CheckCircle2Icon size={14} /> : step}
      </span>
      <span
        className={cn(
          "truncate text-sm font-bold [font-family:var(--brc-font-ui)]",
          // On phones only the active step shows its label so the stepper
          // stays on one compact row; all labels show from sm up.
          active ? "inline" : "hidden sm:inline",
        )}
      >
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
        "group flex min-w-0 cursor-pointer flex-col gap-2 rounded-xl border p-4 text-left transition-all duration-200 [font-family:var(--brc-font-ui)]",
        selected
          ? "border-(--brc-primary) bg-(--brc-primary-tint) shadow-[0_10px_26px_rgba(0,0,139,0.10)]"
          : "border-(--brc-border) bg-white shadow-[var(--brc-shadow-xs)] hover:-translate-y-0.5 hover:border-(--brc-primary)/40 hover:shadow-[0_14px_32px_rgba(18,18,18,0.10)]",
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            selected
              ? "bg-(--brc-primary) text-white"
              : "bg-(--brc-primary-tint) text-(--brc-primary)",
          )}
        >
          <Building2Icon size={16} />
        </span>
        <span
          className={cn(
            "min-w-0 truncate text-sm font-extrabold",
            selected ? "text-(--brc-primary)" : "text-(--brc-text)",
          )}
        >
          {center.company_name}
        </span>
      </span>
      <span className="text-xs leading-5 text-(--brc-text-secondary)">
        {center.address}
      </span>
      <span
        className={cn(
          "mt-1 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
          selected
            ? "bg-(--brc-primary) text-white"
            : "bg-(--brc-bg-muted) text-(--brc-text-secondary)",
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
        "group relative flex min-h-[56px] min-w-0 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 [font-family:var(--brc-font-ui)] disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-(--brc-primary) bg-(--brc-primary-tint) shadow-[0_10px_26px_rgba(0,0,139,0.10)]"
          : "border-(--brc-border) bg-white shadow-[var(--brc-shadow-xs)] hover:-translate-y-0.5 hover:border-(--brc-primary)/40 hover:shadow-[0_14px_32px_rgba(18,18,18,0.10)]",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          selected
            ? "bg-(--brc-primary) text-white"
            : "bg-(--brc-primary-tint) text-(--brc-primary)",
        )}
      >
        <ClockIcon size={15} />
      </span>
      <span
        className={cn(
          "whitespace-nowrap text-[13px] font-extrabold",
          selected ? "text-(--brc-primary)" : "text-(--brc-text)",
        )}
      >
        {timeLabel}
      </span>
      {/* Floating spots badge on the top-right corner so it never covers the time */}
      <span
        className={cn(
          "absolute -top-2 right-2 inline-flex shrink-0 whitespace-nowrap rounded-full border border-white px-2 py-0.5 text-[10px] font-bold shadow-sm",
          selected
            ? "bg-(--brc-primary) text-white"
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
  /** Attendee type of the booking being rescheduled — a representative booking
   * requires the owner to re-accept consent for the new date. */
  rescheduleAttendeeType?: "self" | "representative";
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
  rescheduleAttendeeType,
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

  // Step 4: attendee declaration
  const [attendeeType, setAttendeeType] = useState<"self" | "representative">("self");
  const [repName, setRepName] = useState("");
  const [repIdType, setRepIdType] = useState("");
  const [repIdNumber, setRepIdNumber] = useState("");
  const [consent, setConsent] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);

  // Assistance (no centers in state)
  const [assistanceMessage, setAssistanceMessage] = useState("");
  const [assistanceSent, setAssistanceSent] = useState(false);
  const createAssistance = useCreateAssistanceRequest();

  // An already-open request for this car (from the server) — so closing and
  // reopening the modal still shows "sent" instead of letting them re-request.
  const { data: openAssistance } = useMyAssistanceRequests(
    { car: carId, status: "open" },
    { enabled: open && mode !== "reschedule" },
  );
  const hasOpenAssistance = (openAssistance?.length ?? 0) > 0;
  const alreadyRequested = assistanceSent || hasOpenAssistance;

  const { data: me } = useMe();
  const ownerProfile = me?.owner_profile;
  // Team members have no owner_profile, so their locked country/state can't come
  // from a personal profile. Source it from the car itself instead — a fleet
  // car's country/state/city are inherited from its branch, which is exactly
  // where the inspection should happen.
  const { data: bookingCar } = useMyCarDetail(open ? carId : "");
  const locationSource = ownerProfile
    ? {
        country: ownerProfile.country || "",
        state: ownerProfile.state || "",
      }
    : bookingCar
    ? { country: bookingCar.country || "", state: bookingCar.state || "" }
    : null;
  // The ID-on-file gate is about the *business*, not the logged-in user — a
  // team member books against their business's verified identity and has no
  // owner_profile of their own. The server resolves this into can_book_inspections.
  const hasIdOnFile = !!me?.can_book_inspections;
  const showIdGate = mode !== "reschedule" && !!me && !hasIdOnFile;

  const { data: locations, isLoading: isLoadingLocations } = useLocations();
  const { data: centers, isLoading: isLoadingCenters } = useCentersByCity({
    country: country || undefined,
    state: state || undefined,
    city: city || undefined,
  });

  const dateStr = selectedDate ? toDateString(selectedDate) : undefined;
  // The calendar only needs per-day availability counts (tiny payload); the
  // full slot rows are fetched per selected day below.
  const slotWindow = useMemo(() => availabilityWindow(), []);
  const { data: availabilitySummary, isLoading: isLoadingAllSlots } =
    useAvailabilitySummary(selectedCenter?.id, slotWindow);
  const { data: daySlots, isLoading: isLoadingDaySlots } = useAvailableSlots(
    selectedCenter?.id,
    dateStr,
  );

  const createBooking = useCreateBooking();
  const rescheduleBooking = useRescheduleBooking();
  const isReschedule = mode === "reschedule";
  const feeQuote = useFeeQuote({ enabled: open && mode !== "reschedule" });
  // A representative booking's authorization must be re-accepted for the new date.
  const needsRescheduleConsent =
    isReschedule && rescheduleAttendeeType === "representative";

  const states = useMemo(
    () => locations?.find((l) => l.country === country)?.states ?? [],
    [locations, country],
  );
  const cities = useMemo(
    () => states.find((s) => s.state === state)?.cities ?? [],
    [states, state],
  );
  const countryLabel = useMemo(
    () => locations?.find((l) => l.country === country)?.country_name || country,
    [locations, country],
  );

  // Days with at least one open slot — straight from the summary.
  const availableDates = useMemo(
    () => new Set((availabilitySummary ?? []).map((s) => s.date)),
    [availabilitySummary],
  );

  const todayDate = today();

  // Calendar opens on the month of the earliest available date, not today's
  // month (which may have no openings at all). The summary is date-ordered.
  const firstAvailableMonth = useMemo(() => {
    const first = availabilitySummary?.[0]?.date;
    if (!first) return undefined;
    const [y = 0, m = 1, d = 1] = first.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [availabilitySummary]);

  // Pre-fill country/state from the resolved location source once, when the
  // modal opens (state-adjustment-during-render — avoids a setState-in-effect
  // cascade). For an owner this is their profile; for a team member it's the
  // car's (branch) location. Runs when the source becomes available even if
  // that's after `open` flips true.
  const [prefilledForOpen, setPrefilledForOpen] = useState(false);
  if (open && !prefilledForOpen && mode !== "reschedule" && locationSource) {
    setPrefilledForOpen(true);
    setCountry((prev) => prev || locationSource.country);
    setState((prev) => prev || locationSource.state);
  }
  if (!open && prefilledForOpen) {
    setPrefilledForOpen(false);
  }

  function isDisabled(date: Date) {
    if (date < todayDate) return true;
    const ds = toDateString(date);
    return !availableDates.has(ds);
  }

  // Country + state are locked to the owner's profile; only the city is chosen.
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
        await rescheduleBooking.mutateAsync({
          bookingId,
          slot_id: selectedSlot.id,
          ...(needsRescheduleConsent ? { consent_accepted: consent } : {}),
        });
        toast.success("Inspection rescheduled. Attend your inspection at the selected center.");
      } else {
        if (!receipt) return;
        await createBooking.mutateAsync({
          car_id: carId,
          slot_id: selectedSlot.id,
          attendee_type: attendeeType,
          payment_method: "transfer",
          receipt,
          ...(attendeeType === "representative"
            ? {
                rep_name: repName.trim(),
                rep_id_type: repIdType as never,
                rep_id_number: repIdNumber.trim(),
                consent_accepted: consent,
              }
            : {}),
        });
        toast.success("Payment submitted — we'll confirm your inspection shortly.");
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
    setAttendeeType("self");
    setRepName("");
    setRepIdType("");
    setRepIdNumber("");
    setConsent(false);
    setReceipt(null);
    setAssistanceMessage("");
    setAssistanceSent(false);
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
  const canProceedStep1 = !!city && !showIdGate;
  const canProceedStep3 = !!selectedSlot;
  const attendeeValid = isReschedule
    ? !needsRescheduleConsent || consent
    : attendeeType === "self" ||
      (!!repName.trim() && !!repIdType && !!repIdNumber.trim() && consent);
  const canConfirm =
    !!selectedSlot && !isConfirming && attendeeValid && (isReschedule || !!receipt);

  async function handleRequestAssistance() {
    try {
      await createAssistance.mutateAsync({
        car_id: carId,
        country: country || undefined,
        state: state || undefined,
        message: assistanceMessage.trim() || undefined,
      });
      setAssistanceSent(true);
      toast.success("Request sent — our staff will reach out to help you book.");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not send request.",
      );
    }
  }

  const selectedDateLabel = dateStr ? formatDateLabel(dateStr) : undefined;
  const availableDateCount = availableDates.size;

  const isLoadingSlots = isLoadingAllSlots || isLoadingDaySlots;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="grid max-h-[calc(100vh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl border border-(--brc-border) bg-white p-0 shadow-[0_34px_90px_rgba(18,18,18,0.22)] sm:max-w-[940px]"
        showCloseButton={!isConfirming}
      >
        <DialogHeader className="border-b border-(--brc-border) bg-white px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 pr-10">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl bg-(--brc-primary-tint) text-(--brc-primary)">
                <ShieldCheckIcon size={22} />
              </span>
              <div className="min-w-0">
                <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  Vehicle inspection
                </span>
                <DialogTitle className="mt-1 text-2xl font-black leading-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
                  {isReschedule ? "Reschedule inspection" : "Book an inspection"}
                </DialogTitle>
                <p className="mt-1 max-w-[660px] text-sm leading-6 text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                  Choose a center and an available visit window. Attend your inspection at the selected center — no further confirmation needed.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {STEP_LABELS.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <StepDot step={i + 1} current={step} label={label} />
                  {i < STEP_LABELS.length - 1 && (
                    <span className="hidden h-px w-6 bg-(--brc-border) sm:block" />
                  )}
                </div>
              ))}
              {step === 3 && (
                <span className="ml-auto hidden rounded-full border border-(--brc-border) bg-(--brc-bg-subtle) px-3 py-2 text-xs font-bold text-(--brc-text-secondary) [font-family:var(--brc-font-ui)] sm:inline-flex">
                  {availableDateCount} available date{availableDateCount === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 overflow-y-auto bg-(--brc-bg-subtle) lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 p-4 sm:p-6">
            <div className="rounded-2xl border border-(--brc-border) bg-white p-4 shadow-[var(--brc-shadow-xs)] sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-(--brc-text) [font-family:var(--brc-font-display)]">
                    {step === 1 && "Select a location"}
                    {step === 2 && "Select an inspection center"}
                    {step === 3 && "Select a visit date and time"}
                    {step === 4 && "Confirm your appointment"}
                  </h3>
                  <p className="mt-1 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                    {step === 1 &&
                      (me?.role === "team_member"
                        ? "Country and state come from the car's branch — pick your city, or ask staff to book for you."
                        : "Your country and state are set from your profile — pick your city, or ask staff to book for you.")}
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
                    className={cn("inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-bold transition-all duration-200 [font-family:var(--brc-font-ui)]", secondaryButtonClass)}
                  >
                    <ArrowLeftIcon size={15} />
                    Back
                  </button>
                )}
              </div>

              {/* Step 1: Location (or the ID-verification gate) */}
              {step === 1 && showIdGate && (
                <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-(--brc-border) bg-(--brc-bg-subtle) px-6 py-10 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-(--brc-primary-tint) text-(--brc-primary)">
                    <ShieldCheckIcon size={22} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                      {me?.role === "team_member"
                        ? "Business ID verification needed"
                        : "Complete your ID verification"}
                    </p>
                    <p className="mt-1 max-w-sm text-xs leading-5 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      {me?.role === "team_member"
                        ? "The business account must add its means of identification before you can book an inspection. Please ask your account owner."
                        : "Add your means of identification to your profile before booking an inspection. You only need to do this once."}
                    </p>
                  </div>
                  {me?.role !== "team_member" && (
                    <Link
                      href="/owner/profile"
                      onClick={() => onClose()}
                      className={cn(
                        "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-black no-underline [font-family:var(--brc-font-ui)]",
                        primaryButtonClass,
                      )}
                    >
                      Go to profile
                    </Link>
                  )}
                </div>
              )}

              {step === 1 && !showIdGate && alreadyRequested && (
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-(--brc-border) bg-(--brc-bg-subtle) px-6 py-10 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-(--brc-primary-tint) text-(--brc-primary)">
                    <CheckCircle2Icon size={22} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                      Request sent
                    </p>
                    <p className="mt-1 max-w-sm text-xs leading-5 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      Our staff will book the inspection on your behalf and email
                      you the confirmed details.
                    </p>
                  </div>
                </div>
              )}

              {step === 1 && !showIdGate && !alreadyRequested && (
                <div className="flex flex-col gap-4">
                  {isLoadingLocations ? (
                    <div className="flex h-[220px] w-full items-center justify-center">
                      <Loader2Icon size={26} className="animate-spin text-(--brc-primary)" />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {/* Country — locked to the owner's profile */}
                        <div className="flex flex-col gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                            Country
                          </span>
                          <div className="flex h-11 items-center justify-between gap-2 rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-3 text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                            <span className="truncate">{countryLabel || "—"}</span>
                            <LockIcon size={14} className="shrink-0 text-(--brc-text-muted)" />
                          </div>
                        </div>

                        {/* State — locked to the owner's profile */}
                        <div className="flex flex-col gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                            State
                          </span>
                          <div className="flex h-11 items-center justify-between gap-2 rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-3 text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                            <span className="truncate">{state || "—"}</span>
                            <LockIcon size={14} className="shrink-0 text-(--brc-text-muted)" />
                          </div>
                        </div>

                        {/* City — the only selectable field */}
                        <label className="flex flex-col gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                            City
                          </span>
                          <LocationDropdown
                            value={city}
                            placeholder="Select city"
                            options={cities.map((c) => ({ value: c, label: c }))}
                            disabled={!state}
                            onChange={handleCityChange}
                          />
                        </label>
                      </div>

                      {/* Always-available staff-booking request */}
                      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-(--brc-border) bg-(--brc-bg-subtle) p-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs leading-5 text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                          No center near you, or prefer we handle it? Ask our staff to
                          book the inspection on your behalf.
                        </p>
                        <button
                          type="button"
                          disabled={createAssistance.isPending}
                          onClick={handleRequestAssistance}
                          className={cn(
                            "inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-all duration-200 [font-family:var(--brc-font-ui)]",
                            secondaryButtonClass,
                          )}
                        >
                          {createAssistance.isPending ? (
                            <Loader2Icon size={15} className="animate-spin" />
                          ) : (
                            <LifeBuoyIcon size={15} />
                          )}
                          Request staff to book for you
                        </button>
                      </div>
                    </>
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
                    alreadyRequested ? (
                      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-(--brc-border) bg-(--brc-bg-subtle) px-6 py-10 text-center">
                        <span className="flex size-12 items-center justify-center rounded-full bg-(--brc-primary-tint) text-(--brc-primary)">
                          <CheckCircle2Icon size={22} />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                            Request sent
                          </p>
                          <p className="mt-1 max-w-sm text-xs leading-5 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                            Our staff will contact you to arrange an inspection in your
                            area.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 rounded-xl border border-dashed border-(--brc-border) bg-(--brc-bg-subtle) px-6 py-8">
                        <div className="flex flex-col items-center gap-3 text-center">
                          <span className="flex size-12 items-center justify-center rounded-full bg-(--brc-bg-muted) text-(--brc-text-muted)">
                            <Building2Icon size={22} />
                          </span>
                          <div>
                            <p className="text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                              No centers in this area yet
                            </p>
                            <p className="mt-1 max-w-sm text-xs leading-5 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                              Request staff assistance and we&apos;ll help arrange an
                              inspection for you.
                            </p>
                          </div>
                        </div>
                        <textarea
                          value={assistanceMessage}
                          onChange={(e) => setAssistanceMessage(e.target.value)}
                          placeholder="Anything we should know? (optional)"
                          rows={3}
                          className="w-full resize-none rounded-lg border border-(--brc-border) bg-white p-3 text-sm text-(--brc-text) outline-none focus:border-(--brc-primary) [font-family:var(--brc-font-ui)]"
                        />
                        <button
                          type="button"
                          disabled={createAssistance.isPending}
                          onClick={handleRequestAssistance}
                          className={cn(
                            "mx-auto flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 text-sm font-black transition-all duration-200 [font-family:var(--brc-font-ui)]",
                            primaryButtonClass,
                          )}
                        >
                          {createAssistance.isPending ? (
                            <Loader2Icon size={15} className="animate-spin" />
                          ) : null}
                          Request staff assistance
                        </button>
                      </div>
                    )
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

              {/* Step 3: Date & time — stacked so slot chips always get full
                  panel width (side-by-side crushes them next to the summary
                  sidebar) */}
              {step === 3 && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-2 sm:p-4">
                    {isLoadingAllSlots ? (
                      <div className="flex h-[330px] w-full items-center justify-center">
                        <Loader2Icon size={26} className="animate-spin text-(--brc-primary)" />
                      </div>
                    ) : (
                      <div className="mx-auto flex w-full max-w-[380px] flex-col gap-3 rounded-xl border border-(--brc-border) bg-white p-3 shadow-[var(--brc-shadow-xs)] sm:p-4">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          disabled={isDisabled}
                          startMonth={todayDate}
                          defaultMonth={firstAvailableMonth}
                          modifiers={{
                            available: (date) => availableDates.has(toDateString(date)),
                          }}
                          modifiersClassNames={{
                            // Static tint only — hover is handled on the inner
                            // day button so the two layers never stack colors.
                            available:
                              "rounded-[10px] bg-(--brc-primary-tint) text-(--brc-primary) font-extrabold",
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
                              "size-9 rounded-full border border-(--brc-border) bg-white text-(--brc-text) shadow-sm transition hover:-translate-x-0.5 hover:border-(--brc-primary)/40 hover:bg-(--brc-primary-tint) hover:text-(--brc-primary)",
                            button_next:
                              "size-9 rounded-full border border-(--brc-border) bg-white text-(--brc-text) shadow-sm transition hover:translate-x-0.5 hover:border-(--brc-primary)/40 hover:bg-(--brc-primary-tint) hover:text-(--brc-primary)",
                            weekdays: "grid grid-cols-7 gap-1",
                            weekday:
                              "flex h-7 items-center justify-center rounded-md text-[11px] font-black uppercase tracking-[0.08em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]",
                            week: "grid grid-cols-7 gap-1.5",
                            day:
                              "relative aspect-square rounded-[10px] text-center",
                            day_button:
                              "relative z-10 flex size-full min-w-0 cursor-pointer items-center justify-center rounded-[10px] text-sm font-bold text-inherit transition-[background-color,color,transform,box-shadow] duration-200 ease-out hover:scale-[1.06] hover:bg-(--brc-primary) hover:text-white hover:shadow-[0_10px_24px_rgba(0,0,139,0.22)] active:scale-95 data-[selected-single=true]:bg-(--brc-primary) data-[selected-single=true]:text-white data-[selected-single=true]:shadow-[0_10px_24px_rgba(0,0,139,0.22)] [font-family:var(--brc-font-ui)]",
                            today:
                              "rounded-[10px] ring-1 ring-(--brc-primary)/40",
                            disabled:
                              "pointer-events-none text-(--brc-text-muted) opacity-35",
                            outside: "text-(--brc-text-muted) opacity-35",
                          }}
                        />

                        <div className="grid grid-cols-2 gap-2 border-t border-(--brc-border) pt-3 text-[11px] font-bold text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
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
                      <div className="flex h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-(--brc-border) bg-(--brc-bg-subtle) px-6 text-center">
                        <span className="flex size-12 items-center justify-center rounded-full bg-(--brc-bg-muted) text-(--brc-text-muted)">
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
                      <div className="flex h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-(--brc-border) bg-(--brc-bg-subtle) px-6 text-center">
                        <span className="flex size-12 items-center justify-center rounded-full bg-(--brc-bg-muted) text-(--brc-text-muted)">
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
                      <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
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
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-(--brc-primary-tint) text-(--brc-primary)">
                          <MapPinIcon size={18} />
                        </span>
                        <div className="min-w-0">
                          <span className="block text-[11px] font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                            Center
                          </span>
                          <span className="block text-sm font-extrabold leading-5 text-(--brc-text) [font-family:var(--brc-font-ui)]">
                            {selectedCenter.company_name}
                          </span>
                          <span className="block text-xs leading-5 text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                            {selectedCenter.address}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-(--brc-primary-tint) text-(--brc-primary)">
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
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-(--brc-primary-tint) text-(--brc-primary)">
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

                  {/* Attendee declaration — book mode only. Reschedule keeps the
                      original attendee (server-side); only consent is re-captured. */}
                  {!isReschedule && (
                  <div className="rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-5">
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      Who will attend the inspection?
                    </span>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(["self", "representative"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAttendeeType(opt)}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-left text-sm font-bold transition [font-family:var(--brc-font-ui)]",
                            attendeeType === opt
                              ? "border-(--brc-primary) bg-(--brc-primary-tint) text-(--brc-primary)"
                              : "border-(--brc-border) bg-white text-(--brc-text)",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded-full border",
                              attendeeType === opt
                                ? "border-(--brc-primary)"
                                : "border-(--brc-border)",
                            )}
                          >
                            {attendeeType === opt && (
                              <span className="size-2 rounded-full bg-(--brc-primary)" />
                            )}
                          </span>
                          {opt === "self" ? "I will attend" : "Someone on my behalf"}
                        </button>
                      ))}
                    </div>

                    {attendeeType === "representative" && (
                      <div className="mt-4 flex flex-col gap-3">
                        <input
                          value={repName}
                          onChange={(e) => setRepName(e.target.value)}
                          placeholder="Representative's full name"
                          className="w-full rounded-lg border border-(--brc-border) bg-white p-3 text-sm outline-none focus:border-(--brc-primary) [font-family:var(--brc-font-ui)]"
                        />
                        <IdTypeSelect
                          value={repIdType}
                          onChange={setRepIdType}
                          label="Representative's ID type"
                        />
                        <input
                          value={repIdNumber}
                          onChange={(e) => setRepIdNumber(e.target.value)}
                          placeholder="Representative's ID number"
                          className="w-full rounded-lg border border-(--brc-border) bg-white p-3 text-sm outline-none focus:border-(--brc-primary) [font-family:var(--brc-font-ui)]"
                        />
                        <label className="flex items-start gap-2 text-xs leading-5 text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                          <input
                            type="checkbox"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                            className="mt-0.5 size-4 shrink-0 accent-(--brc-primary)"
                          />
                          <span>{CONSENT_TEXT}</span>
                        </label>
                      </div>
                    )}
                  </div>
                  )}

                  {/* Pay-to-book — owner pays inspection + listing + VAT up front,
                      then uploads the transfer receipt. Book mode only. */}
                  {!isReschedule && (
                    <div className="rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-5">
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                        Pay to book — inspection &amp; listing fee
                      </span>

                      <div className="mt-3 flex flex-col gap-2 rounded-lg border border-(--brc-border) bg-white p-4 text-sm [font-family:var(--brc-font-ui)]">
                        {feeQuote.isLoading ? (
                          <span className="text-(--brc-text-muted)">Loading fees…</span>
                        ) : feeQuote.data ? (
                          <>
                            {(
                              [
                                ["Inspection fee", feeQuote.data.inspection_fee],
                                ["Listing fee", feeQuote.data.listing_fee],
                                ["VAT", feeQuote.data.vat_amount],
                              ] as const
                            ).map(([label, value]) => (
                              <div
                                key={label}
                                className="flex items-center justify-between text-(--brc-text-secondary)"
                              >
                                <span>{label}</span>
                                <span className="tabular-nums text-(--brc-text)">
                                  {formatOfferAmount(value, feeQuote.data!.currency)}
                                </span>
                              </div>
                            ))}
                            <div className="mt-1 flex items-center justify-between border-t border-(--brc-border) pt-2 font-extrabold text-(--brc-text)">
                              <span>Total</span>
                              <span className="tabular-nums">
                                {formatOfferAmount(feeQuote.data.total, feeQuote.data.currency)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <span className="text-(--brc-danger)">
                            Couldn&apos;t load the fees — try reopening this step.
                          </span>
                        )}
                      </div>

                      {feeQuote.data?.bank_account_number && (
                        <div className="mt-3 rounded-lg border border-(--brc-border) bg-white p-4 text-sm [font-family:var(--brc-font-ui)]">
                          <span className="block text-[11px] font-bold uppercase tracking-wide text-(--brc-text-muted)">
                            Transfer to
                          </span>
                          <div className="mt-1 flex flex-col gap-0.5 text-(--brc-text)">
                            <span className="font-bold">
                              {feeQuote.data.bank_account_name || "—"}
                            </span>
                            <span className="tabular-nums">
                              {feeQuote.data.bank_account_number}
                            </span>
                            <span className="text-(--brc-text-muted)">
                              {feeQuote.data.bank_name}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="mt-3">
                        <UploadField
                          label="Upload your payment receipt"
                          hint="PDF, PNG, JPG or WebP — up to 5MB"
                          accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                          value={receipt?.name}
                          onPick={(file) => setReceipt(file)}
                        />
                        <p className="mt-2 text-xs leading-5 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                          We&apos;ll verify your transfer and confirm the appointment.
                          Fees are non-refundable.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Reschedule of a representative booking — re-accept consent. */}
                  {needsRescheduleConsent && (
                    <div className="rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-5">
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                        Confirm authorization
                      </span>
                      <p className="mt-2 text-xs leading-5 text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                        A representative will attend, as originally booked. Please
                        re-accept the authorization for this new appointment.
                      </p>
                      <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                          className="mt-0.5 size-4 shrink-0 accent-(--brc-primary)"
                        />
                        <span>{CONSENT_TEXT}</span>
                      </label>
                    </div>
                  )}
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
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-(--brc-primary-tint) text-(--brc-primary)">
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
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-(--brc-primary-tint) text-(--brc-primary)">
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
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-(--brc-primary-tint) text-(--brc-primary)">
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
                <p className="text-sm font-extrabold text-(--brc-accent) [font-family:var(--brc-font-ui)]">
                  What happens next
                </p>
                <p className="mt-1 text-xs leading-5 text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                  Your appointment is confirmed immediately. Attend your inspection at the selected center.
                </p>
              </div>

            </div>
          </aside>
        </div>

        <DialogFooter className="mx-0 mb-0 rounded-none border-t border-(--brc-border) bg-white px-5 py-4 sm:px-7">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={isConfirming}
              className={cn("flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-all duration-200 [font-family:var(--brc-font-ui)]", secondaryButtonClass)}
            >
              <ArrowLeftIcon size={15} />
              Back
            </button>
          )}

          {step === 1 && !alreadyRequested && (
            <button
              type="button"
              disabled={!canProceedStep1}
              onClick={goToStep2}
              className={cn("flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 text-sm font-black transition-all duration-200 [font-family:var(--brc-font-ui)]", primaryButtonClass)}
            >
              Choose center
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              disabled={!canProceedStep3}
              onClick={goToStep4}
              className={cn("flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 text-sm font-black transition-all duration-200 [font-family:var(--brc-font-ui)]", primaryButtonClass)}
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
              className={cn("flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 text-sm font-black transition-all duration-200 [font-family:var(--brc-font-ui)]", primaryButtonClass)}
            >
              {isConfirming ? (
                <Loader2Icon size={15} className="animate-spin" />
              ) : (
                <CheckCircle2Icon size={16} />
              )}
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
