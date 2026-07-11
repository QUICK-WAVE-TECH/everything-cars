"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { ArrowLeftIcon, Loader2Icon, PlusIcon, XIcon, UploadIcon } from "lucide-react";
import { Icon } from "@/features/auth/components/icon";
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

// ── Section wrapper ──
function FormSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-(--brc-border) bg-white p-5 shadow-[var(--brc-shadow-xs)] sm:p-6">
      <div>
        <h2 className="m-0 text-base font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{title}</h2>
        {subtitle && <p className="mt-1 text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-[13px] font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">{children}</label>;
}

// ── Condition level picker ──
function ConditionPicker({ value, onChange }: { value: ConditionLevel | ""; onChange: (v: ConditionLevel) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {CONDITION_LEVELS.map((c) => {
        const active = value === c.value;
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={cn(
              "flex h-10 cursor-pointer items-center justify-center rounded-lg border text-[13px] font-semibold transition-colors [font-family:var(--brc-font-ui)]",
              active ? "border-(--brc-primary) bg-(--brc-primary-tint) text-(--brc-primary)" : "border-(--brc-border) bg-white text-(--brc-text-secondary) hover:bg-(--brc-bg-subtle)"
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

  // ── Result section ──
  const [result, setResult] = useState<PhysicalInspectionPayload["result"] | "">("");
  const [staffNotes, setStaffNotes] = useState("");

  const needsDocuments = !!booking?.car.sale_price;
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
    (!documentsRequired || documentsComplete);

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
      <section className="border-b border-(--brc-border) bg-white">
        <div className="mx-auto flex max-w-[900px] flex-col gap-5 px-4 pb-7 pt-8 sm:px-6">
          <button
            type="button"
            onClick={() => router.push("/admin/approvals")}
            className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border-none bg-transparent p-0 text-[13px] font-semibold text-(--brc-text-muted) transition-colors hover:text-(--brc-text) [font-family:var(--brc-font-ui)]"
          >
            <ArrowLeftIcon size={15} /> Back to approvals
          </button>

          <div className="flex flex-wrap items-center gap-4">
            <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle)">
              {primaryImage ? (
                <Image src={primaryImage} alt={car.title} fill className="object-cover" />
              ) : (
                <Icon name="car" size={24} stroke="var(--brc-text-muted)" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="m-0 truncate text-xl font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">{car.title}</h1>
                {car.tracking_id && (
                  <span className="rounded-full bg-(--brc-primary-tint) px-2.5 py-1 text-[11px] font-bold text-(--brc-primary) [font-family:var(--brc-font-ui)]">
                    #{car.tracking_id}
                  </span>
                )}
              </div>
              <span className="text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                {car.year} · {car.body_type || car.brand} · Owner: {booking.booked_by_name}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="flex flex-col gap-[3px] rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-3 py-2.5">
              <span className="text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Date</span>
              <span className="text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">{formatDate(booking.slot.date)}</span>
            </div>
            <div className="flex flex-col gap-[3px] rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-3 py-2.5">
              <span className="text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Time</span>
              <span className="text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                {formatTime(booking.slot.start_time)} – {formatTime(booking.slot.end_time)}
              </span>
            </div>
            <div className="col-span-2 flex flex-col gap-[3px] rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-3 py-2.5">
              <span className="text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Center</span>
              <span className="truncate text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                {booking.slot.center.company_name} · {booking.slot.center.city}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5 px-4 py-8 sm:px-6">
        {/* Vehicle */}
        <FormSection title="Vehicle" subtitle="Confirm the vehicle's core attributes as physically inspected.">
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
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="petrol">Petrol</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
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
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select car type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="foreign_used">Foreign Used</SelectItem>
                  <SelectItem value="brand_new">Brand New</SelectItem>
                  <SelectItem value="local_used">Local Used</SelectItem>
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
        <FormSection title="Condition assessment" subtitle="Rate the physical condition of each component.">
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
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fully_paid">Fully Paid</SelectItem>
                    <SelectItem value="partly_paid">Partly Paid</SelectItem>
                    <SelectItem value="not_available">Not Available</SelectItem>
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
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="dealership">Dealership</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
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

        {/* Result */}
        <FormSection title="Inspection result" subtitle="Choose the outcome of this physical inspection.">
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
        <div className="flex items-center justify-end gap-3 pb-4">
          <button
            type="button"
            onClick={() => router.push("/admin/approvals")}
            className="flex h-[46px] cursor-pointer items-center rounded-lg border border-(--brc-border) bg-white px-5 text-sm font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isFormValid || isSubmitting}
            onClick={handleSubmit}
            className="flex h-[46px] cursor-pointer items-center gap-2 rounded-lg border-none bg-(--brc-primary) px-6 text-sm font-bold text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 [font-family:var(--brc-font-ui)]"
          >
            {isSubmitting ? <Loader2Icon size={16} className="animate-spin" /> : null}
            Submit Inspection
          </button>
        </div>
      </div>
    </>
  );
}
