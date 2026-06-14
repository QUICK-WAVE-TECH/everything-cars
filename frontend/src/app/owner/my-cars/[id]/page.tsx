"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  PencilIcon,
  XIcon,
  UploadIcon,
  Trash2Icon,
  ImageIcon,
} from "lucide-react";
import { Icon } from "@/features/auth/components/icon";
import {
  CountrySelect,
  StateSelect,
  CityCombobox,
} from "@/features/auth/components";
import { COUNTRIES } from "@/features/auth/data/countries";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useMyCarDetail,
  useUpdateCar,
  useDeleteCar,
  useUploadCarImages,
  useCarStatus,
} from "@/features/listings/api";
import type { CarDetail } from "@/features/listings/api";
import {
  createCarSchema,
  type CreateCarFormValues,
  type CreateCarInput,
} from "@/features/listings/schemas";
import { ApiError } from "@/lib/api-client";

// ---------- Shared form fields (same as new page) ----------

function stripNonDigits(v: string) {
  return v.replace(/[^\d]/g, "");
}
function stripNonDecimal(v: string) {
  return v.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
}

function TextField({
  label,
  placeholder,
  value,
  onChange,
  prefix,
  className,
  disabled,
  inputMode,
  filter,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  className?: string;
  disabled?: boolean;
  inputMode?: "numeric" | "decimal" | "text";
  filter?: "digits" | "decimal";
}) {
  function handleChange(raw: string) {
    if (filter === "digits") return onChange(stripNonDigits(raw));
    if (filter === "decimal") return onChange(stripNonDecimal(raw));
    onChange(raw);
  }

  return (
    <label className={cn("flex min-w-0 flex-col gap-2", className)}>
      <span className="text-sm text-(--brc-text) [font-family:var(--brc-font-ui)] sm:text-base">
        {label}
      </span>
      <div
        className={cn(
          "flex h-12 items-center gap-2 rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-4 sm:h-14 sm:px-5",
          disabled && "opacity-60",
        )}
      >
        {prefix && (
          <span className="text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            {prefix}
          </span>
        )}
        <input
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          inputMode={inputMode}
          onChange={(e) => handleChange(e.target.value)}
          className="min-w-0 flex-1 border-none bg-transparent text-sm text-(--brc-text) outline-none placeholder:text-(--brc-text-muted) disabled:cursor-not-allowed [font-family:var(--brc-font-ui)]"
        />
      </div>
    </label>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

function SelectField({
  label,
  placeholder,
  value,
  options,
  onPick,
  className,
  disabled,
}: {
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  onPick: (v: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className={cn("flex min-w-0 flex-col gap-2", className)}>
      <span className="text-sm text-(--brc-text) [font-family:var(--brc-font-ui)] sm:text-base">
        {label}
      </span>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(!open)}
          className={cn(
            "flex h-12 w-full cursor-pointer items-center justify-between rounded-lg bg-(--brc-bg-subtle) px-4 text-left text-sm transition-all duration-200 [font-family:var(--brc-font-ui)] sm:h-14 sm:px-5",
            open
              ? "border-2 border-(--brc-primary) shadow-[0_0_0_3px_rgba(0,0,139,0.08)]"
              : "border border-(--brc-border) hover:border-(--brc-text-muted)",
            disabled && "cursor-not-allowed opacity-60",
          )}
          style={{ color: value ? "var(--brc-text)" : "var(--brc-text-muted)" }}
        >
          {value ? capitalize(value) : placeholder}
          <Icon
            name={open ? "chevup" : "chevdown"}
            size={16}
            stroke="var(--brc-text-muted)"
          />
        </button>
        {open && (
          <div className="absolute left-0 right-0 top-[54px] z-40 max-h-[min(50vh,240px)] overflow-y-auto rounded-xl border border-(--brc-border) bg-white p-1 shadow-lg sm:top-[62px]">
            {options.map((o) => {
              const selected = o === value;
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => {
                    onPick(o);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between rounded-lg border-none px-4 py-2.5 text-left text-sm transition-colors duration-150 [font-family:var(--brc-font-ui)]",
                    selected
                      ? "bg-(--brc-primary-tint) font-semibold text-(--brc-primary)"
                      : "bg-transparent text-(--brc-text) hover:bg-(--brc-bg-subtle)",
                  )}
                >
                  {capitalize(o)}
                  {selected && (
                    <Icon name="check" size={16} stroke="var(--brc-primary)" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FeaturesField({
  features,
  onChange,
}: {
  features: { name: string; value?: string }[];
  onChange: (features: { name: string; value?: string }[]) => void;
}) {
  function addFeature() {
    onChange([...features, { name: "", value: "" }]);
  }

  function removeFeature(index: number) {
    onChange(features.filter((_, i) => i !== index));
  }

  function updateFeature(index: number, field: "name" | "value", val: string) {
    const updated = features.map((f, i) =>
      i === index ? { ...f, [field]: val } : f,
    );
    onChange(updated);
  }

  return (
    <div className="col-span-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-(--brc-text) [font-family:var(--brc-font-ui)] sm:text-base">
          Features
        </span>
        <button
          type="button"
          onClick={addFeature}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-(--brc-border) bg-white px-3 py-1.5 text-xs font-semibold text-(--brc-primary) transition-colors hover:bg-(--brc-primary-tint) [font-family:var(--brc-font-ui)]"
        >
          <Icon name="plus" size={14} stroke="currentColor" />
          Add Feature
        </button>
      </div>
      {features.length === 0 ? (
        <div className="rounded-lg border border-dashed border-(--brc-border) px-4 py-6 text-center text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          No features added yet. Click &quot;Add Feature&quot; to add GPS,
          Bluetooth, etc.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-3 py-2 sm:px-4 sm:py-2.5">
                <input
                  value={f.name}
                  placeholder="Feature name (e.g. GPS)"
                  onChange={(e) => updateFeature(i, "name", e.target.value)}
                  className="min-w-0 flex-1 border-none bg-transparent text-sm text-(--brc-text) outline-none placeholder:text-(--brc-text-muted) [font-family:var(--brc-font-ui)]"
                />
                <span className="hidden text-xs text-(--brc-border) sm:block">
                  |
                </span>
                <input
                  value={f.value ?? ""}
                  placeholder="Value (optional)"
                  onChange={(e) => updateFeature(i, "value", e.target.value)}
                  className="hidden min-w-0 flex-1 border-none bg-transparent text-sm text-(--brc-text) outline-none placeholder:text-(--brc-text-muted) [font-family:var(--brc-font-ui)] sm:block"
                />
              </div>
              <button
                type="button"
                onClick={() => removeFeature(i)}
                className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-(--brc-border) bg-white text-(--brc-danger) transition-colors hover:bg-(--brc-danger-bg)"
              >
                <XIcon size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TextAreaField({
  label,
  placeholder,
  value,
  onChange,
  disabled,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="col-span-full flex flex-col gap-2">
      <span className="text-sm text-(--brc-text) [font-family:var(--brc-font-ui)] sm:text-base">
        {label}
      </span>
      <textarea
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className={cn(
          "min-h-28 resize-y rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) p-4 text-sm leading-relaxed text-(--brc-text) outline-none placeholder:text-(--brc-text-muted) focus:border-(--brc-primary) [font-family:var(--brc-font-ui)] sm:p-5",
          disabled && "cursor-not-allowed opacity-60",
        )}
      />
    </label>
  );
}

// ---------- Status badge ----------
const STATUS_STYLES: Record<
  string,
  { bg: string; fg: string; dot: string; label: string }
> = {
  draft: {
    bg: "var(--brc-bg-muted)",
    fg: "var(--brc-text-muted)",
    dot: "var(--brc-text-muted)",
    label: "Draft",
  },
  pending_review: {
    bg: "var(--brc-warning-bg)",
    fg: "#9a7400",
    dot: "var(--brc-warning)",
    label: "In Review",
  },
  published: {
    bg: "var(--brc-success-bg)",
    fg: "var(--brc-success)",
    dot: "var(--brc-success)",
    label: "Published",
  },
  paused: {
    bg: "var(--brc-accent-bg)",
    fg: "var(--brc-accent)",
    dot: "var(--brc-accent)",
    label: "Paused",
  },
  suspended: {
    bg: "var(--brc-danger-bg)",
    fg: "var(--brc-danger)",
    dot: "var(--brc-danger)",
    label: "Suspended",
  },
  archived: {
    bg: "var(--brc-bg-muted)",
    fg: "var(--brc-text-secondary)",
    dot: "var(--brc-text-secondary)",
    label: "Archived",
  },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.draft!;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold [font-family:var(--brc-font-ui)]"
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="size-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

// ---------- Helpers ----------
function formatPrice(val: string | null, currency: string): string {
  if (!val) return "—";
  const symbol = currency === "NGN" ? "₦" : currency === "USD" ? "$" : currency;
  return `${symbol}${Number(val).toLocaleString("en-NG")}`;
}

function populateForm(car: CarDetail): CreateCarFormValues {
  return {
    title: car.title,
    listing_type: car.listing_type,
    rent_price_per_day: car.rent_price_per_day ?? "",
    sale_price: car.sale_price ?? "",
    currency: car.currency || "NGN",
    brand: car.brand,
    model: car.model,
    color: car.color ?? "",
    year: String(car.year),
    body_type: car.body_type ?? "",
    transmission: car.transmission ?? "",
    fuel_type: car.fuel_type ?? "",
    seats: car.seats ?? 5,
    mileage: car.mileage ? String(car.mileage) : "",
    country: car.country ?? "",
    state: car.state,
    city: car.city ?? "",
    description: car.description ?? "",
    features:
      car.features?.map((f) => ({ name: f.name, value: f.value ?? "" })) ?? [],
  };
}

// ---------- Page ----------
export default function CarDetailPage() {
  const params = useParams();
  const router = useRouter();
  const carId = params.id as string;

  const { data: car, isLoading } = useMyCarDetail(carId);
  const updateCar = useUpdateCar(carId);
  const deleteCar = useDeleteCar();
  const uploadImages = useUploadCarImages();
  const carStatus = useCarStatus();

  const [editing, setEditing] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const form = useForm<CreateCarFormValues, unknown, CreateCarInput>({
    resolver: zodResolver(createCarSchema),
    defaultValues: car ? populateForm(car) : undefined,
  });

  const w = useWatch({ control: form.control });
  const listingType = w.listing_type;
  const showRentPrice =
    !listingType || listingType === "rent" || listingType === "both";
  const showSalePrice =
    !listingType || listingType === "buy" || listingType === "both";
  const countryName =
    COUNTRIES.find((c) => c.iso === (w.country ?? "").toLowerCase())?.name ??
    "";

  // Reset form when car data loads or editing starts
  useEffect(() => {
    if (car && !editing) {
      form.reset(populateForm(car));
    }
  }, [car, editing, form]);

  function startEditing() {
    if (car) form.reset(populateForm(car));
    setEditing(true);
  }

  function cancelEditing() {
    if (car) form.reset(populateForm(car));
    setNewFiles([]);
    setEditing(false);
  }

  async function handleSave(values: CreateCarInput) {
    try {
      const payload: Record<string, unknown> = {
        ...values,
        year: parseInt(values.year, 10),
        seats: values.seats,
      };
      if (!values.mileage) delete payload.mileage;
      else payload.mileage = parseInt(values.mileage, 10);
      if (!values.rent_price_per_day) delete payload.rent_price_per_day;
      if (!values.sale_price) delete payload.sale_price;

      await updateCar.mutateAsync(payload);

      if (newFiles.length > 0) {
        await uploadImages.mutateAsync({ carId, files: newFiles });
        setNewFiles([]);
      }

      setEditing(false);
      toast.success("Listing updated");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Failed to update listing",
      );
    }
  }

  async function handleStatusChange(newStatus: string, successMessage: string) {
    try {
      await carStatus.mutateAsync({ carId, status: newStatus });
      toast.success(successMessage);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Failed to update status",
      );
    }
  }

  async function handleArchive() {
    try {
      await deleteCar.mutateAsync(carId);
      toast.success("Listing archived");
      router.push("/owner/my-cars");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Failed to archive listing",
      );
    }
  }

  const isPending = updateCar.isPending || uploadImages.isPending;

  if (isLoading || !car) {
    return (
      <div className="bg-(--brc-bg-subtle)">
        <div className="mx-auto flex w-full max-w-[1024px] flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10 lg:px-[var(--brc-space-10,40px)] lg:py-14">
          <Skeleton className="h-5 w-32" />
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-20 rounded-lg" />
              <Skeleton className="h-10 w-24 rounded-lg" />
            </div>
          </div>
          <Card className="rounded-2xl border border-(--brc-border) p-5 shadow-none sm:p-6">
            <CardContent className="flex flex-col gap-4 p-0">
              <Skeleton className="h-6 w-20" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <Skeleton className="aspect-[4/3] rounded-lg" />
                <Skeleton className="aspect-[4/3] rounded-lg" />
                <Skeleton className="aspect-[4/3] rounded-lg" />
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-(--brc-border) p-5 shadow-none sm:p-8">
            <CardContent className="flex flex-col gap-6 p-0">
              <Skeleton className="h-6 w-36" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-(--brc-bg-subtle)">
      <div className="mx-auto flex w-full max-w-[1024px] flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10 lg:px-[var(--brc-space-10,40px)] lg:py-14">
        {/* Back arrow */}
        <Link
          href="/owner/my-cars"
          className="group inline-flex w-fit items-center gap-2 text-sm font-semibold text-(--brc-text-muted) no-underline transition-colors hover:text-(--brc-text) [font-family:var(--brc-font-ui)]"
        >
          <ArrowLeftIcon
            size={18}
            className="transition-transform duration-200 group-hover:-translate-x-1"
          />
          Back to Listings
        </Link>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="m-0 text-2xl font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)] sm:text-[32px]">
                {car.title}
              </h1>
              <StatusBadge status={car.status} />
            </div>
            <p className="mt-1 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              {car.year} {car.brand} {car.model} · {car.state}
              {car.city ? `, ${car.city}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            {!editing ? (
              <>
                {car.status === "draft" && (
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange(
                        "pending_review",
                        "Submitted for review",
                      )
                    }
                    disabled={carStatus.isPending}
                    className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border-none bg-(--brc-primary) px-4 text-sm font-semibold text-(--brc-text-on-primary) transition-colors hover:bg-(--brc-primary-hover) disabled:opacity-60 [font-family:var(--brc-font-ui)]"
                  >
                    <Icon name="arrow" size={15} stroke="currentColor" />
                    Submit for Review
                  </button>
                )}
                {car.status === "published" && (
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange("paused", "Listing paused")
                    }
                    disabled={carStatus.isPending}
                    className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-(--brc-warning)/40 bg-white px-4 text-sm font-semibold text-[#9a7400] transition-colors hover:bg-(--brc-warning-bg) disabled:opacity-60 [font-family:var(--brc-font-ui)]"
                  >
                    <Icon name="clock" size={15} stroke="currentColor" />
                    Pause
                  </button>
                )}
                {car.status === "paused" && (
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange("published", "Listing republished")
                    }
                    disabled={carStatus.isPending}
                    className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border-none bg-(--brc-success) px-4 text-sm font-semibold text-white transition-colors hover:brightness-95 disabled:opacity-60 [font-family:var(--brc-font-ui)]"
                  >
                    <Icon name="check" size={15} stroke="currentColor" />
                    Republish
                  </button>
                )}
                {car.status === "needs_changes" && (
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange("pending_review", "Resubmitted for review")
                    }
                    disabled={carStatus.isPending}
                    className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border-none bg-(--brc-primary) px-4 text-sm font-semibold text-(--brc-text-on-primary) transition-colors hover:bg-(--brc-primary-hover) disabled:opacity-60 [font-family:var(--brc-font-ui)]"
                  >
                    <Icon name="arrow" size={15} stroke="currentColor" />
                    Resubmit for Review
                  </button>
                )}
                <button
                  type="button"
                  onClick={startEditing}
                  className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-(--brc-border) bg-white px-4 text-sm font-semibold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
                >
                  <PencilIcon size={15} />
                  Edit
                </button>
                {car.status !== "archived" && (
                  <button
                    type="button"
                    onClick={handleArchive}
                    disabled={deleteCar.isPending}
                    className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-(--brc-danger)/30 bg-white px-4 text-sm font-semibold text-(--brc-danger) transition-colors hover:bg-(--brc-danger-bg) disabled:opacity-60 [font-family:var(--brc-font-ui)]"
                  >
                    <Trash2Icon size={15} />
                    Archive
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={cancelEditing}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-(--brc-border) bg-white px-4 text-sm font-semibold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
              >
                <XIcon size={15} />
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Admin note — shown when status is needs_changes */}
        {car.status === "needs_changes" && car.admin_note && (
          <div className="flex gap-4 rounded-xl border border-(--brc-warning)/30 bg-(--brc-warning-bg) p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--brc-warning)/20">
              <Icon name="clock" size={20} stroke="#9a7400" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="m-0 text-sm font-bold text-[#9a7400] [font-family:var(--brc-font-ui)]">
                Changes Requested by Admin
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#9a7400]/90 [font-family:var(--brc-font-ui)]">
                {car.admin_note}
              </p>
              <span className="mt-2 block text-xs text-[#9a7400]/60 [font-family:var(--brc-font-ui)]">
                Please make the requested changes and click &quot;Resubmit for Review&quot; above.
              </span>
            </div>
          </div>
        )}

        {/* Image Gallery */}
        <Card className="rounded-2xl border border-(--brc-border) p-5 shadow-none sm:p-6">
          <CardContent className="flex flex-col gap-4 p-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                Images
              </h2>
              {editing && (
                <div className="flex items-center gap-3">
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length)
                        setNewFiles(Array.from(e.target.files));
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-(--brc-border) bg-white px-3 text-xs font-semibold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
                  >
                    <UploadIcon size={14} />
                    Add Images
                  </button>
                  {newFiles.length > 0 && (
                    <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      +{newFiles.length} new
                    </span>
                  )}
                </div>
              )}
            </div>

            {car.images.length === 0 && newFiles.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-(--brc-border) py-10 text-(--brc-text-muted)">
                <ImageIcon size={32} strokeWidth={1.5} />
                <span className="text-sm [font-family:var(--brc-font-ui)]">
                  No images yet
                </span>
              </div>
            ) : (
              <section aria-label="Car gallery">
                {/* Main image with nav arrows */}
                <div
                  className="relative overflow-hidden rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle)"
                  style={{ height: "clamp(260px, 50vw, 420px)" }}
                >
                  <Image
                    src={car.images[activeImage]?.image ?? ""}
                    alt={car.title}
                    fill
                    className="object-cover"
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 600px"
                  />

                  {car.images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImage((i) =>
                            i === 0 ? car.images.length - 1 : i - 1,
                          )
                        }
                        aria-label="Previous image"
                        className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-(--brc-border) bg-white shadow-md transition-transform hover:scale-105"
                      >
                        <Icon
                          name="chevleft"
                          size={18}
                          stroke="var(--brc-text)"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImage((i) =>
                            i === car.images.length - 1 ? 0 : i + 1,
                          )
                        }
                        aria-label="Next image"
                        className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-(--brc-border) bg-white shadow-md transition-transform hover:scale-105"
                      >
                        <Icon
                          name="chevright"
                          size={18}
                          stroke="var(--brc-text)"
                        />
                      </button>
                    </>
                  )}

                  {car.images[activeImage]?.is_primary && (
                    <span className="absolute left-3 top-3 rounded-full bg-(--brc-primary) px-2.5 py-1 text-[10px] font-bold text-white">
                      Primary
                    </span>
                  )}
                </div>

                {/* Thumbnail strip */}
                {car.images.length > 1 && (
                  <div
                    className="mt-3 flex gap-2.5 overflow-x-auto pb-1"
                    role="list"
                    aria-label="Image thumbnails"
                  >
                    {car.images.map((img, i) => (
                      <button
                        key={img.id}
                        type="button"
                        role="listitem"
                        onClick={() => setActiveImage(i)}
                        aria-label={`View image ${i + 1}`}
                        aria-current={activeImage === i}
                        className={cn(
                          "relative h-[80px] flex-[0_0_120px] cursor-pointer overflow-hidden rounded-lg border-2 bg-(--brc-bg-subtle) p-0 transition-all duration-200",
                          activeImage === i
                            ? "border-(--brc-primary) shadow-[0_0_0_2px_rgba(0,0,139,0.12)]"
                            : "border-(--brc-border) hover:border-(--brc-text-muted)",
                        )}
                      >
                        <Image
                          src={img.image}
                          alt={`${car.title} ${i + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                          sizes="120px"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}
          </CardContent>
        </Card>

        {/* Details / Edit form */}
        <Card className="rounded-2xl border border-(--brc-border) p-5 shadow-none sm:p-8 lg:p-10">
          <CardContent className="p-0">
            {!editing ? (
              /* Read-only view */
              <div className="flex flex-col gap-6">
                <h2 className="text-lg font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                  Listing Details
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <ReadonlyDetail label="Title" value={car.title} />
                  <ReadonlyDetail
                    label="Listing Type"
                    value={car.listing_type}
                  />
                  <ReadonlyDetail label="Currency" value={car.currency} />
                  {(car.listing_type === "rent" ||
                    car.listing_type === "both") && (
                    <ReadonlyDetail
                      label="Rent Price / Day"
                      value={formatPrice(car.rent_price_per_day, car.currency)}
                    />
                  )}
                  {(car.listing_type === "buy" ||
                    car.listing_type === "both") && (
                    <ReadonlyDetail
                      label="Sale Price"
                      value={formatPrice(car.sale_price, car.currency)}
                    />
                  )}
                  <ReadonlyDetail label="Brand" value={car.brand} />
                  <ReadonlyDetail label="Model" value={car.model} />
                  <ReadonlyDetail label="Color" value={car.color || "—"} />
                  <ReadonlyDetail label="Year" value={String(car.year)} />
                  <ReadonlyDetail
                    label="Body Type"
                    value={car.body_type || "—"}
                  />
                  <ReadonlyDetail
                    label="Transmission"
                    value={car.transmission || "—"}
                  />
                  <ReadonlyDetail
                    label="Fuel Type"
                    value={car.fuel_type || "—"}
                  />
                  <ReadonlyDetail label="Seats" value={String(car.seats)} />
                  <ReadonlyDetail
                    label="Mileage"
                    value={
                      car.mileage ? `${car.mileage.toLocaleString()} km` : "—"
                    }
                  />
                  <ReadonlyDetail label="State" value={car.state} />
                  <ReadonlyDetail label="City" value={car.city || "—"} />
                  <ReadonlyDetail
                    label="Country"
                    value={
                      COUNTRIES.find(
                        (c) => c.iso === car.country?.toLowerCase(),
                      )?.name ||
                      car.country ||
                      "—"
                    }
                  />
                </div>
                {car.description && (
                  <div>
                    <span className="text-sm font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      Description
                    </span>
                    <p className="mt-1 text-sm leading-relaxed text-(--brc-text) [font-family:var(--brc-font-ui)]">
                      {car.description}
                    </p>
                  </div>
                )}
                {car.features.length > 0 && (
                  <div>
                    <span className="text-sm font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      Features
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {car.features.map((f) => (
                        <span
                          key={f.id}
                          className="rounded-full bg-(--brc-bg-subtle) px-3 py-1.5 text-xs font-medium text-(--brc-text) [font-family:var(--brc-font-ui)]"
                        >
                          {f.name}
                          {f.value ? `: ${f.value}` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Edit form */
              <form
                onSubmit={form.handleSubmit(handleSave)}
                className="flex flex-col gap-6 sm:gap-8"
              >
                <h2 className="text-lg font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                  Edit Listing
                </h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                  <TextField
                    label="Car Title"
                    placeholder="Enter car title"
                    value={w.title ?? ""}
                    onChange={(v) =>
                      form.setValue(
                        "title",
                        v.replace(/\b\w/g, (c) => c.toUpperCase()),
                      )
                    }
                  />
                  <SelectField
                    label="Listing Type"
                    placeholder="Select listing type"
                    value={w.listing_type ?? ""}
                    options={["rent", "buy", "both"]}
                    onPick={(v) =>
                      form.setValue(
                        "listing_type",
                        v as "rent" | "buy" | "both",
                      )
                    }
                  />
                  <SelectField
                    label="Currency"
                    placeholder="Select currency"
                    value={w.currency ?? "NGN"}
                    options={["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR"]}
                    onPick={(v) => form.setValue("currency", v)}
                  />

                  {showRentPrice && (
                    <TextField
                      label="Rent Price / Day"
                      placeholder="e.g. 35000.00"
                      value={w.rent_price_per_day ?? ""}
                      onChange={(v) => form.setValue("rent_price_per_day", v)}
                      prefix="₦"
                      inputMode="decimal"
                      filter="decimal"
                    />
                  )}
                  {showSalePrice && (
                    <TextField
                      label="Sale Price"
                      placeholder="e.g. 24000000.00"
                      value={w.sale_price ?? ""}
                      onChange={(v) => form.setValue("sale_price", v)}
                      prefix="₦"
                      inputMode="decimal"
                      filter="decimal"
                    />
                  )}

                  <TextField
                    label="Brand"
                    placeholder="Brand"
                    value={w.brand ?? ""}
                    onChange={(v) => form.setValue("brand", v)}
                  />
                  <TextField
                    label="Model"
                    placeholder="Model"
                    value={w.model ?? ""}
                    onChange={(v) => form.setValue("model", v)}
                  />
                  <TextField
                    label="Color"
                    placeholder="Color"
                    value={w.color ?? ""}
                    onChange={(v) => form.setValue("color", v)}
                  />

                  <TextField
                    label="Year"
                    placeholder="e.g. 2024"
                    value={w.year ?? ""}
                    onChange={(v) => form.setValue("year", v)}
                    inputMode="numeric"
                    filter="digits"
                  />
                  <SelectField
                    label="Body Type"
                    placeholder="Select body type"
                    value={w.body_type ?? ""}
                    options={[
                      "sedan",
                      "suv",
                      "hatchback",
                      "coupe",
                      "truck",
                      "van",
                      "wagon",
                      "convertible",
                      "minivan",
                      "crossover",
                    ]}
                    onPick={(v) => form.setValue("body_type", v)}
                  />
                  <SelectField
                    label="Transmission"
                    placeholder="Select"
                    value={w.transmission ?? ""}
                    options={["automatic", "manual"]}
                    onPick={(v) => form.setValue("transmission", v)}
                  />

                  <SelectField
                    label="Fuel Type"
                    placeholder="Select"
                    value={w.fuel_type ?? ""}
                    options={["petrol", "diesel", "hybrid", "electric"]}
                    onPick={(v) => form.setValue("fuel_type", v)}
                  />
                  <TextField
                    label="Seats"
                    placeholder="Number of seats"
                    value={w.seats != null ? String(w.seats) : ""}
                    onChange={(v) =>
                      form.setValue(
                        "seats",
                        v === "" ? (0 as unknown as number) : parseInt(v, 10),
                      )
                    }
                    inputMode="numeric"
                    filter="digits"
                  />
                  <TextField
                    label="Mileage (km)"
                    placeholder="e.g. 45000"
                    value={w.mileage ?? ""}
                    onChange={(v) => form.setValue("mileage", v)}
                    inputMode="numeric"
                    filter="digits"
                  />

                  <div className="sm:col-span-2 lg:col-span-3">
                    <CountrySelect
                      label="Country"
                      value={w.country ?? ""}
                      onChange={(iso) => {
                        form.setValue("country", iso);
                        form.setValue("state", "");
                        form.setValue("city", "");
                      }}
                    />
                  </div>
                  <div className="sm:col-span-1 lg:col-span-2">
                    <StateSelect
                      country={countryName}
                      value={w.state ?? ""}
                      onChange={(val) => {
                        form.setValue("state", val);
                        form.setValue("city", "");
                      }}
                    />
                  </div>
                  <CityCombobox
                    country={countryName}
                    state={w.state ?? ""}
                    value={w.city ?? ""}
                    onChange={(val) => form.setValue("city", val)}
                  />

                  <TextAreaField
                    label="Description"
                    placeholder="Describe your car"
                    value={w.description ?? ""}
                    onChange={(v) => form.setValue("description", v)}
                  />

                  <FeaturesField
                    features={
                      (w.features ?? []) as { name: string; value?: string }[]
                    }
                    onChange={(features) => form.setValue("features", features)}
                  />
                </div>

                {Object.keys(form.formState.errors).length > 0 && (
                  <div className="flex flex-col gap-1.5 rounded-lg border border-(--brc-danger)/30 bg-(--brc-danger-bg) px-4 py-3">
                    {Object.entries(form.formState.errors).map(
                      ([key, error]) => (
                        <div key={key} className="flex items-center gap-2.5">
                          <span className="size-[7px] shrink-0 rounded-full bg-(--brc-danger)" />
                          <span className="text-sm text-(--brc-danger) [font-family:var(--brc-font-ui)]">
                            {error?.message as string}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="h-12 cursor-pointer rounded-lg border-none bg-(--brc-primary) px-8 text-sm font-bold text-(--brc-text-on-primary) transition duration-200 hover:-translate-y-0.5 hover:bg-(--brc-primary-hover) hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 [font-family:var(--brc-font-ui)]"
                  >
                    {isPending ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="h-12 cursor-pointer rounded-lg border border-(--brc-border) bg-white px-8 text-sm font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------- Read-only detail field ----------
function ReadonlyDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
        {label}
      </span>
      <span className="text-sm font-medium text-(--brc-text) [font-family:var(--brc-font-ui)]">
        {value}
      </span>
    </div>
  );
}
