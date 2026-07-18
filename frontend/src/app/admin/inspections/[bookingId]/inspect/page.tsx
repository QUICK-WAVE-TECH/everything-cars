"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  CalendarCheckIcon,
  CarFrontIcon,
  ClipboardCheckIcon,
  ClockIcon,
  FileCheckIcon,
  FuelIcon,
  GaugeIcon,
  Loader2Icon,
  MapPinIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  WrenchIcon,
  XIcon,
  UploadIcon,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@/features/auth/components/icon";
import { IdTypeSelect } from "@/features/auth/components";
import { idTypeLabel } from "@/features/auth/schemas";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useStaffBookingDetail,
  useSubmitInspection,
} from "@/features/inspections/api/inspections-api";
import type { PhysicalInspectionPayload } from "@/features/inspections/api/types";
import { ApiError } from "@/lib/api-client";

// ── Helpers ──
function formatDate(value: string) {
  // Date-only strings must be parsed by parts — new Date("YYYY-MM-DD") is
  // interpreted as UTC midnight and renders a day early west of Greenwich.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = Number(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

type ConditionLevel = "excellent" | "good" | "fair" | "poor";

const CONDITION_LEVELS: { value: ConditionLevel; label: string }[] = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

const RESULT_OPTIONS: { value: PhysicalInspectionPayload["result"]; label: string; hint: string; color: string }[] = [
  { value: "passed", label: "Pass — publish listing", hint: "Vehicle meets all requirements and can go live.", color: "var(--brc-success)" },
  { value: "needs_clearance", label: "Needs further clearance", hint: "Vehicle needs additional documents or owner action before it can be published.", color: "#b34700" },
  { value: "failed", label: "Fail inspection", hint: "Vehicle does not meet listing requirements.", color: "var(--brc-danger)" },
];

const selectTriggerClass =
  "h-12 w-full rounded-xl border-(--brc-border) bg-white px-4 text-sm font-bold text-(--brc-text) shadow-[var(--brc-shadow-xs)] transition-all duration-200 hover:border-(--brc-primary)/40 hover:bg-(--brc-primary-tint)/35 focus:ring-2 focus:ring-(--brc-primary)/20 [font-family:var(--brc-font-ui)]";
const selectContentClass =
  "rounded-xl border-(--brc-border) bg-white p-1 shadow-[0_18px_48px_rgba(18,18,18,0.14)] [font-family:var(--brc-font-ui)]";
const selectItemClass =
  "cursor-pointer rounded-lg px-3 py-2 text-sm font-bold text-(--brc-text) focus:bg-(--brc-primary-tint) focus:text-(--brc-primary) data-highlighted:bg-(--brc-primary-tint) data-highlighted:text-(--brc-primary)";

// ── Section wrapper ──
function FormSection({
  title,
  subtitle,
  icon: SectionIcon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 rounded-3xl border border-(--brc-border) bg-white p-5 shadow-[0_18px_48px_rgba(18,18,18,0.07)] sm:p-6">
      <div className="flex items-start gap-3">
        {SectionIcon && (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-(--brc-primary-tint) text-(--brc-primary)">
            <SectionIcon size={20} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="m-0 text-lg font-black text-(--brc-text) [font-family:var(--brc-font-display)]">{title}</h2>
          {subtitle && <p className="mt-1 text-sm leading-6 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-[12px] font-black uppercase tracking-[0.12em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{children}</label>;
}

// ── Condition level picker ──
function ConditionPicker({ value, onChange }: { value: ConditionLevel | ""; onChange: (v: ConditionLevel) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {CONDITION_LEVELS.map((c) => {
        const active = value === c.value;
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={cn(
              "flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-2 py-2 text-center text-[13px] font-black leading-tight transition-all duration-200 [font-family:var(--brc-font-ui)]",
              active ? "border-(--brc-primary) bg-(--brc-primary) text-white shadow-[0_12px_26px_rgba(0,0,139,0.18)]" : "border-(--brc-border) bg-white text-(--brc-text-secondary) hover:-translate-y-0.5 hover:border-(--brc-primary)/40 hover:bg-(--brc-primary-tint) hover:text-(--brc-primary)"
            )}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Page ──
export default function StaffInspectionFormPage() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = params.bookingId;
  const router = useRouter();

  const { data: booking, isLoading } = useStaffBookingDetail(bookingId ?? null);
  const submitInspection = useSubmitInspection();

  // ── Vehicle section ──
  const [condition, setCondition] = useState<PhysicalInspectionPayload["condition"] | "">("");
  const [mileage, setMileage] = useState("");
  const [fuelType, setFuelType] = useState<PhysicalInspectionPayload["fuel_type"] | "">("");
  const [carType, setCarType] = useState<PhysicalInspectionPayload["car_type"] | "">("");
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState("");

  // ── Condition section ──
  const [engineCondition, setEngineCondition] = useState<ConditionLevel | "">("");
  const [chassisCondition, setChassisCondition] = useState<ConditionLevel | "">("");
  const [acCondition, setAcCondition] = useState<ConditionLevel | "">("");
  const [isFlooded, setIsFlooded] = useState(false);
  const [hasAccidentHistory, setHasAccidentHistory] = useState(false);

  // ── Documents section ──
  const [carDocuments, setCarDocuments] = useState<File | null>(null);
  const [receiptUpload, setReceiptUpload] = useState<File | null>(null);
  const [customDutyStatus, setCustomDutyStatus] = useState("");
  const [receiptType, setReceiptType] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  // ── Attendee identity section ──
  const [presentedAttendee, setPresentedAttendee] = useState<
    "owner" | "representative" | ""
  >("");
  const [presentedIdType, setPresentedIdType] = useState("");
  const [presentedIdNumber, setPresentedIdNumber] = useState("");
  const [presentedIdDocument, setPresentedIdDocument] = useState<File | null>(null);

  // ── Result section ──
  const [result, setResult] = useState<PhysicalInspectionPayload["result"] | "">("");
  const [staffNotes, setStaffNotes] = useState("");

  const needsDocuments = !!booking?.car.sale_price;
  // A non-failed inspection means someone attended — record who presented.
  const attendeeRequired = result !== "" && result !== "failed";
  // The owner's ID is already on file from sign-up; only capture an ID when a
  // representative attends in their place.
  const presentedIdRequired =
    attendeeRequired && presentedAttendee === "representative";
  const notesRequired = result === "needs_clearance" || result === "failed";
  // Sale-car paperwork is mandatory unless the inspection failed outright —
  // a failed car never publishes, so missing docs can't leak a car live.
  const documentsRequired = needsDocuments && result !== "failed" && result !== "";
  const documentsComplete =
    !!carDocuments && !!receiptUpload && !!customDutyStatus && !!receiptType;

  function addFeature() {
    const trimmed = featureInput.trim();
    if (!trimmed) return;
    if (!features.includes(trimmed)) setFeatures((f) => [...f, trimmed]);
    setFeatureInput("");
  }

  function removeFeature(f: string) {
    setFeatures((prev) => prev.filter((x) => x !== f));
  }

  const isFormValid =
    !!condition &&
    !!mileage &&
    Number(mileage) >= 0 &&
    !!fuelType &&
    !!carType &&
    !!engineCondition &&
    !!chassisCondition &&
    !!acCondition &&
    !!result &&
    (!notesRequired || staffNotes.trim().length > 0) &&
    (!documentsRequired || documentsComplete) &&
    (!attendeeRequired || !!presentedAttendee) &&
    (!presentedIdRequired ||
      (!!presentedIdType && presentedIdNumber.trim().length > 0));

  const isSubmitting = submitInspection.isPending;

  async function handleSubmit() {
    if (!booking || !isFormValid || !condition || !fuelType || !carType || !engineCondition || !chassisCondition || !acCondition || !result) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const formData = new FormData();
    formData.append("condition", condition);
    formData.append("mileage", String(Number(mileage)));
    formData.append("fuel_type", fuelType);
    formData.append("car_type", carType);
    formData.append("features", JSON.stringify(features));
    formData.append("engine_condition", engineCondition);
    formData.append("chassis_condition", chassisCondition);
    formData.append("ac_condition", acCondition);
    formData.append("is_flooded", String(isFlooded));
    formData.append("has_accident_history", String(hasAccidentHistory));
    formData.append("staff_notes", staffNotes.trim());
    formData.append("result", result);

    // Who presented (staff-only). The owner's ID is already on file from
    // sign-up, so only a representative's presented ID is captured here.
    if (presentedAttendee) formData.append("presented_attendee", presentedAttendee);
    if (presentedAttendee === "representative") {
      if (presentedIdType) formData.append("presented_id_type", presentedIdType);
      if (presentedIdNumber.trim())
        formData.append("presented_id_number", presentedIdNumber.trim());
      if (presentedIdDocument)
        formData.append("presented_id_document", presentedIdDocument);
    }

    // Failed inspections don't require documents — and the backend treats ANY
    // document field as "documents provided" and then demands all of them, so
    // partial doc fields on a failed result would trigger an opaque 400.
    if (result !== "failed") {
      if (carDocuments) formData.append("car_documents", carDocuments);
      if (receiptUpload) formData.append("receipt_upload", receiptUpload);
      if (customDutyStatus) formData.append("custom_duty_status", customDutyStatus);
      if (receiptType) formData.append("receipt_type", receiptType);
      if (additionalNotes.trim()) formData.append("additional_notes", additionalNotes.trim());
    }

    try {
      await submitInspection.mutateAsync({ bookingId: booking.id, data: formData });

      const resultLabel = RESULT_OPTIONS.find((r) => r.value === result)?.label ?? result;
      toast.success(`Inspection recorded — ${resultLabel}`);
      router.push("/admin/approvals");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Failed to submit inspection.",
      );
    }
  }

  if (isLoading || !booking) {
    return (
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[140px] w-full rounded-2xl" />
        <Skeleton className="h-[220px] w-full rounded-2xl" />
        <Skeleton className="h-[220px] w-full rounded-2xl" />
      </div>
    );
  }

  const car = booking.car;
  const primaryImage =
    car.primary_image ??
    car.images.find((i) => i.is_primary)?.image ??
    car.images[0]?.image ??
    null;

  return (
    <>
      {/* Hero / header band */}
      <section className="border-b border-(--brc-border) bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_100%)]">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 pb-8 pt-8 sm:px-6">
          <button
            type="button"
            onClick={() => router.push("/admin/approvals")}
            className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border-none bg-transparent p-0 text-[13px] font-semibold text-(--brc-text-muted) transition-colors hover:text-(--brc-text) [font-family:var(--brc-font-ui)]"
          >
            <ArrowLeftIcon size={15} /> Back to approvals
          </button>

          <div className="rounded-[28px] border border-(--brc-border) bg-white p-4 shadow-[0_18px_48px_rgba(18,18,18,0.07)] sm:p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
              <span className="relative flex h-[150px] w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-(--brc-border) bg-(--brc-bg-subtle) lg:size-[132px]">
              {primaryImage ? (
                <Image src={primaryImage} alt={car.title} fill className="object-cover" />
              ) : (
                <Icon name="car" size={32} stroke="var(--brc-text-muted)" />
              )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-(--brc-primary-tint) px-3 py-1 text-xs font-black text-(--brc-primary) [font-family:var(--brc-font-ui)]">
                    <ClipboardCheckIcon size={13} />
                    Physical inspection
                  </span>
                  {car.tracking_id && (
                    <span className="rounded-full border border-(--brc-border) bg-white px-3 py-1 text-xs font-black tabular-nums text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      #{car.tracking_id}
                    </span>
                  )}
                </div>
                <h1 className="m-0 text-2xl font-black leading-tight text-(--brc-text) [font-family:var(--brc-font-display)] sm:text-[34px]">
                  {car.title}
                </h1>
                <p className="mt-2 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  {car.year} · {car.body_type || car.brand} · Owner: {booking.booked_by_name}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-2xl border border-(--brc-border) bg-white px-4 py-3 shadow-[var(--brc-shadow-xs)]">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--brc-primary-tint) text-(--brc-primary)">
                <CalendarCheckIcon size={18} />
              </span>
              <div className="min-w-0">
                <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Date</span>
                <span className="block truncate text-sm font-black text-(--brc-text) [font-family:var(--brc-font-ui)]">{formatDate(booking.slot.date)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-(--brc-border) bg-white px-4 py-3 shadow-[var(--brc-shadow-xs)]">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--brc-primary-tint) text-(--brc-primary)">
                <ClockIcon size={18} />
              </span>
              <div className="min-w-0">
                <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Time</span>
                <span className="block truncate text-sm font-black text-(--brc-text) [font-family:var(--brc-font-ui)]">
                  {formatTime(booking.slot.start_time)} – {formatTime(booking.slot.end_time)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-(--brc-border) bg-white px-4 py-3 shadow-[var(--brc-shadow-xs)]">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--brc-primary-tint) text-(--brc-primary)">
                <MapPinIcon size={18} />
              </span>
              <div className="min-w-0">
                <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Center</span>
                <span className="block truncate text-sm font-black text-(--brc-text) [font-family:var(--brc-font-ui)]">
                  {booking.slot.center.company_name} · {booking.slot.center.city}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
        {/* Vehicle */}
        <FormSection title="Vehicle" icon={CarFrontIcon} subtitle="Confirm the vehicle's core attributes as physically inspected.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Condition</FieldLabel>
              <div className="flex gap-2">
                {(["used", "brand_new"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(c)}
                    className={cn(
                      "flex h-9 flex-1 cursor-pointer items-center justify-center rounded-lg border text-[13px] font-semibold transition-colors [font-family:var(--brc-font-ui)]",
                      condition === c ? "border-(--brc-primary) bg-(--brc-primary-tint) text-(--brc-primary)" : "border-(--brc-border) bg-white text-(--brc-text-secondary) hover:bg-(--brc-bg-subtle)"
                    )}
                  >
                    {c === "used" ? "Used" : "Brand New"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Mileage (km)</FieldLabel>
              <Input
                type="number"
                min={0}
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="e.g. 45000"
              />
            </div>

            <div>
              <FieldLabel>Fuel type</FieldLabel>
              <Select
                items={{ petrol: "Petrol", diesel: "Diesel", hybrid: "Hybrid", electric: "Electric" }}
                value={fuelType}
                onValueChange={(v) => setFuelType((v ?? "") as typeof fuelType)}
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  <SelectItem className={selectItemClass} value="petrol">Petrol</SelectItem>
                  <SelectItem className={selectItemClass} value="diesel">Diesel</SelectItem>
                  <SelectItem className={selectItemClass} value="hybrid">Hybrid</SelectItem>
                  <SelectItem className={selectItemClass} value="electric">Electric</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <FieldLabel>Car type</FieldLabel>
              <Select
                items={{ foreign_used: "Foreign Used", brand_new: "Brand New", local_used: "Local Used" }}
                value={carType}
                onValueChange={(v) => setCarType((v ?? "") as typeof carType)}
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Select car type" />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  <SelectItem className={selectItemClass} value="foreign_used">Foreign Used</SelectItem>
                  <SelectItem className={selectItemClass} value="brand_new">Brand New</SelectItem>
                  <SelectItem className={selectItemClass} value="local_used">Local Used</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <FieldLabel>Features observed</FieldLabel>
            <div className="flex gap-2">
              <Input
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFeature();
                  }
                }}
                placeholder="e.g. Reverse camera"
              />
              <button
                type="button"
                onClick={addFeature}
                className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-3 text-[13px] font-semibold text-(--brc-text) transition-colors hover:bg-(--brc-bg-muted) [font-family:var(--brc-font-ui)]"
              >
                <PlusIcon size={14} /> Add
              </button>
            </div>
            {features.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {features.map((f) => (
                  <span key={f} className="inline-flex items-center gap-1.5 rounded-full bg-(--brc-bg-subtle) py-1 pl-3 pr-1.5 text-xs font-medium text-(--brc-text) [font-family:var(--brc-font-ui)]">
                    {f}
                    <button type="button" onClick={() => removeFeature(f)} className="flex size-4 cursor-pointer items-center justify-center rounded-full border-none bg-(--brc-bg-muted) text-(--brc-text-muted) hover:bg-(--brc-danger-bg) hover:text-(--brc-danger)">
                      <XIcon size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </FormSection>

        {/* Condition */}
        <FormSection title="Condition assessment" icon={WrenchIcon} subtitle="Rate the physical condition of each component.">
          <div>
            <FieldLabel>Engine condition</FieldLabel>
            <ConditionPicker value={engineCondition} onChange={setEngineCondition} />
          </div>
          <div>
            <FieldLabel>Chassis condition</FieldLabel>
            <ConditionPicker value={chassisCondition} onChange={setChassisCondition} />
          </div>
          <div>
            <FieldLabel>A/C condition</FieldLabel>
            <ConditionPicker value={acCondition} onChange={setAcCondition} />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-(--brc-border) px-3.5 py-3">
            <div>
              <span className="block text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">Flood damage</span>
              <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Is there any evidence the vehicle was flooded?</span>
            </div>
            <Switch
              checked={isFlooded}
              onCheckedChange={(v) => setIsFlooded(!!v)}
              className="data-checked:bg-(--brc-primary) data-unchecked:bg-(--brc-bg-muted)"
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-(--brc-border) px-3.5 py-3">
            <div>
              <span className="block text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">Accident history</span>
              <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Is there any evidence of prior accident damage?</span>
            </div>
            <Switch
              checked={hasAccidentHistory}
              onCheckedChange={(v) => setHasAccidentHistory(!!v)}
              className="data-checked:bg-(--brc-primary) data-unchecked:bg-(--brc-bg-muted)"
            />
          </div>
        </FormSection>

        {/* Documents — only when sale_price is set */}
        {needsDocuments && (
          <FormSection
            title="Documents"
            icon={FileCheckIcon}
            subtitle={
              documentsRequired && !documentsComplete
                ? "Required for vehicles listed for sale — uploads, custom duty status and receipt type must be provided before submitting."
                : "Required for vehicles listed for sale."
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Car documents</FieldLabel>
                <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-(--brc-border) bg-(--brc-bg-subtle) px-3 text-[13px] font-medium text-(--brc-text-muted) transition-colors hover:border-(--brc-primary) hover:text-(--brc-text) [font-family:var(--brc-font-ui)]">
                  <UploadIcon size={14} />
                  <span className="truncate">{carDocuments?.name ?? "Upload file"}</span>
                  <input type="file" className="hidden" onChange={(e) => setCarDocuments(e.target.files?.[0] ?? null)} />
                </label>
              </div>

              <div>
                <FieldLabel>Receipt upload</FieldLabel>
                <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-(--brc-border) bg-(--brc-bg-subtle) px-3 text-[13px] font-medium text-(--brc-text-muted) transition-colors hover:border-(--brc-primary) hover:text-(--brc-text) [font-family:var(--brc-font-ui)]">
                  <UploadIcon size={14} />
                  <span className="truncate">{receiptUpload?.name ?? "Upload file"}</span>
                  <input type="file" className="hidden" onChange={(e) => setReceiptUpload(e.target.files?.[0] ?? null)} />
                </label>
              </div>

              <div>
                <FieldLabel>Custom duty status</FieldLabel>
                <Select
                  items={{ fully_paid: "Fully Paid", partly_paid: "Partly Paid", not_available: "Not Available" }}
                  value={customDutyStatus}
                  onValueChange={(v) => setCustomDutyStatus(v ?? "")}
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                    <SelectItem className={selectItemClass} value="fully_paid">Fully Paid</SelectItem>
                    <SelectItem className={selectItemClass} value="partly_paid">Partly Paid</SelectItem>
                    <SelectItem className={selectItemClass} value="not_available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <FieldLabel>Receipt type</FieldLabel>
                <Select
                  items={{ company: "Company", dealership: "Dealership", other: "Other" }}
                  value={receiptType}
                  onValueChange={(v) => setReceiptType(v ?? "")}
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                    <SelectItem className={selectItemClass} value="company">Company</SelectItem>
                    <SelectItem className={selectItemClass} value="dealership">Dealership</SelectItem>
                    <SelectItem className={selectItemClass} value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <FieldLabel>Additional notes</FieldLabel>
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Any further notes about the documentation..."
                rows={3}
              />
            </div>
          </FormSection>
        )}

        {/* Attendee identity — who physically presented for the inspection */}
        <FormSection
          title="Attendee identity"
          icon={UserCheckIcon}
          subtitle="Confirm who showed up against the booking. The owner's ID is already on file — only a representative's ID is captured here. Required unless the inspection failed. Staff-only."
        >
          {/* What the owner declared at booking */}
          <div className="rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) p-4 [font-family:var(--brc-font-ui)]">
            <span className="text-[11px] font-bold uppercase tracking-wide text-(--brc-text-muted)">
              Declared at booking
            </span>
            {booking.attendee_type === "representative" ? (
              <p className="mt-1 text-sm text-(--brc-text)">
                Representative:{" "}
                <strong>{booking.rep_name || "—"}</strong>
                {booking.rep_id_number
                  ? ` · ${idTypeLabel(booking.rep_id_type) || "ID"} ${booking.rep_id_number}`
                  : ""}
              </p>
            ) : (
              <p className="mt-1 text-sm text-(--brc-text)">
                The owner <strong>{booking.booked_by_name}</strong> is expected to
                attend.
              </p>
            )}
          </div>

          {/* Who actually attended */}
          <div className="flex flex-col gap-2">
            <span className="text-base text-(--brc-text) [font-family:var(--brc-font-ui)]">
              Who presented for the inspection?
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(
                [
                  { key: "owner", label: "The owner" },
                  { key: "representative", label: "Declared representative" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setPresentedAttendee(opt.key);
                    // Convenience: pre-fill the declared rep's ID for confirmation.
                    if (
                      opt.key === "representative" &&
                      booking.attendee_type === "representative"
                    ) {
                      if (!presentedIdType && booking.rep_id_type)
                        setPresentedIdType(booking.rep_id_type);
                      if (!presentedIdNumber && booking.rep_id_number)
                        setPresentedIdNumber(booking.rep_id_number);
                    }
                  }}
                  className={cn(
                    "cursor-pointer rounded-lg border p-3 text-left text-sm font-bold transition [font-family:var(--brc-font-ui)]",
                    presentedAttendee === opt.key
                      ? "border-(--brc-primary) bg-(--brc-primary-tint) text-(--brc-primary)"
                      : "border-(--brc-border) bg-white text-(--brc-text)",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {presentedAttendee === "owner" && (
              <p className="rounded-lg bg-(--brc-bg-subtle) px-3 py-2 text-xs font-medium text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                The owner&apos;s identity was verified at sign-up — no ID capture
                needed.
              </p>
            )}
          </div>

          {/* A representative's ID is captured here; the owner's is already on file. */}
          {presentedAttendee === "representative" && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <IdTypeSelect
                  value={presentedIdType}
                  onChange={setPresentedIdType}
                  label="ID type presented"
                />
                <label className="flex flex-col gap-2">
                  <span className="text-base text-(--brc-text) [font-family:var(--brc-font-ui)]">
                    ID number
                  </span>
                  <Input
                    value={presentedIdNumber}
                    onChange={(e) => setPresentedIdNumber(e.target.value)}
                    placeholder="ID number presented"
                  />
                </label>
              </div>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-(--brc-border) bg-white px-4 py-3 text-sm [font-family:var(--brc-font-ui)]">
                <span className="flex items-center gap-2 text-(--brc-text-secondary)">
                  <UploadIcon size={16} />
                  <span className="truncate">
                    {presentedIdDocument?.name ?? "Upload a photo of the ID (optional)"}
                  </span>
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPresentedIdDocument(e.target.files?.[0] ?? null)}
                />
              </label>
            </>
          )}
        </FormSection>

        {/* Result */}
        <FormSection title="Inspection result" icon={ShieldCheckIcon} subtitle="Choose the outcome of this physical inspection.">
          <RadioGroup value={result} onValueChange={(v) => setResult((v ?? "") as typeof result)}>
            {RESULT_OPTIONS.map((opt) => {
              const active = result === opt.value;
              return (
                <label
                  key={opt.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 transition-colors",
                    active ? "border-(--brc-primary) bg-(--brc-primary-tint)" : "border-(--brc-border) bg-white hover:bg-(--brc-bg-subtle)"
                  )}
                >
                  <RadioGroupItem
                    value={opt.value}
                    className="mt-0.5 data-checked:border-(--brc-primary) data-checked:bg-(--brc-primary) data-checked:text-white"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">{opt.label}</span>
                    <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{opt.hint}</span>
                  </div>
                </label>
              );
            })}
          </RadioGroup>

          <div>
            <FieldLabel>
              Staff notes {notesRequired ? <span className="text-(--brc-danger)">*</span> : <span className="font-normal text-(--brc-text-muted)">(optional)</span>}
            </FieldLabel>
            <Textarea
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
              placeholder={notesRequired ? "Explain why this inspection needs clearance or failed..." : "Any notes about this inspection..."}
              rows={4}
            />
            {notesRequired && !staffNotes.trim() && (
              <span className="mt-1 block text-xs text-(--brc-danger) [font-family:var(--brc-font-ui)]">Staff notes are required for this result.</span>
            )}
          </div>
        </FormSection>

        {/* Submit bar */}
        <div className="sticky bottom-4 z-10 flex flex-col-reverse gap-3 rounded-2xl border border-(--brc-border) bg-white/95 p-3 shadow-[0_18px_48px_rgba(18,18,18,0.12)] backdrop-blur sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/admin/approvals")}
            className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-(--brc-border) bg-white px-5 text-sm font-black text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)] sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isFormValid || isSubmitting}
            onClick={handleSubmit}
            className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-(--brc-primary) px-6 text-sm font-black text-white shadow-[0_14px_30px_rgba(0,0,139,0.22)] transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 [font-family:var(--brc-font-ui)] sm:w-auto"
          >
            {isSubmitting ? <Loader2Icon size={16} className="animate-spin" /> : null}
            Submit Inspection
          </button>
        </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="overflow-hidden rounded-3xl border border-(--brc-border) bg-white shadow-[0_18px_48px_rgba(18,18,18,0.08)]">
            <div className="relative h-44 bg-(--brc-bg-subtle)">
              {primaryImage ? (
                <Image src={primaryImage} alt={car.title} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Icon name="car" size={34} stroke="var(--brc-text-muted)" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-5 p-5 [font-family:var(--brc-font-ui)]">
              <div>
                <p className="m-0 text-[11px] font-black uppercase tracking-[0.14em] text-(--brc-text-muted)">
                  Inspection snapshot
                </p>
                <h2 className="m-0 mt-2 text-base font-black leading-6 text-(--brc-text) [font-family:var(--brc-font-display)]">
                  {car.title}
                </h2>
                <p className="m-0 mt-1 text-sm text-(--brc-text-muted)">
                  {booking.booked_by_name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-(--brc-border) bg-(--brc-bg-subtle) p-3">
                  <GaugeIcon size={17} className="mb-2 text-(--brc-primary)" />
                  <p className="m-0 text-[11px] font-black uppercase tracking-[0.1em] text-(--brc-text-muted)">Mileage</p>
                  <p className="m-0 mt-1 text-sm font-black text-(--brc-text)">
                    {mileage ? `${Number(mileage).toLocaleString("en-NG")} km` : "—"}
                  </p>
                </div>
                <div className="rounded-2xl border border-(--brc-border) bg-(--brc-bg-subtle) p-3">
                  <FuelIcon size={17} className="mb-2 text-(--brc-primary)" />
                  <p className="m-0 text-[11px] font-black uppercase tracking-[0.1em] text-(--brc-text-muted)">Fuel</p>
                  <p className="m-0 mt-1 text-sm font-black text-(--brc-text)">
                    {fuelType ? fuelType.replace("_", " ") : "—"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-(--brc-border) bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_100%)] p-4">
                <p className="m-0 text-sm font-black text-(--brc-text)">Completion checklist</p>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  {[
                    ["Vehicle details", !!condition && !!mileage && !!fuelType && !!carType],
                    ["Condition ratings", !!engineCondition && !!chassisCondition && !!acCondition],
                    ["Attendee confirmed", !attendeeRequired || !!presentedAttendee],
                    ["Documents", !documentsRequired || documentsComplete],
                    ["Result selected", !!result && (!notesRequired || staffNotes.trim().length > 0)],
                  ].map(([label, done]) => (
                    <div key={label as string} className="flex items-center justify-between gap-3">
                      <span className="text-(--brc-text-secondary)">{label}</span>
                      <span className={cn("size-2.5 rounded-full", done ? "bg-(--brc-success)" : "bg-(--brc-bg-muted) ring-1 ring-(--brc-border)")} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-(--brc-primary-tint) p-4">
                <p className="m-0 text-sm font-black text-(--brc-primary)">Before submitting</p>
                <p className="m-0 mt-2 text-sm leading-6 text-(--brc-text-secondary)">
                  Confirm every field reflects the physical vehicle. A passed result can publish the listing.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
