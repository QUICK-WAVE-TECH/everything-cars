"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  XIcon,
  Loader2Icon,
} from "lucide-react";
import { Icon } from "@/features/auth/components/icon";
import { CountrySelect, StateSelect, CityCombobox } from "@/features/auth/components";
import { COUNTRIES } from "@/features/auth/data/countries";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useCreateCar, useUploadCarImages } from "@/features/listings/api";
import type { CarImageFiles, CarImageType } from "@/features/listings/api/types";
import {
  CarPhotoSlotsField,
  findOversizedCarImage,
} from "@/features/listings/components/car-photo-slots-field";
import { ListingTypeToggle } from "@/features/listings/components/listing-type-toggle";
import { NegotiableField } from "@/features/listings/components/negotiable-field";
import { VehicleIdentityFields } from "@/features/listings/components/vehicle-identity-fields";
import { useRouter } from "next/navigation";
import {
  createCarSchema,
  type CreateCarFormValues,
  type CreateCarInput,
} from "@/features/listings/schemas";
import {
  formatDecimalInput,
  normalizeDecimalInput,
} from "@/features/listings/lib/decimal-input";
import { capitalizeFirstLetter } from "@/features/listings/lib/text-input";
import { ApiError } from "@/lib/api-client";

// ---------- Form field components ----------

function stripNonDigits(v: string) { return v.replace(/[^\d]/g, ""); }

function TextField({ label, placeholder, value, onChange, prefix, className, inputMode, filter }: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  className?: string;
  inputMode?: "numeric" | "decimal" | "text";
  filter?: "digits" | "decimal";
}) {
  function handleChange(raw: string) {
    if (filter === "digits") return onChange(stripNonDigits(raw));
    if (filter === "decimal") return onChange(normalizeDecimalInput(raw));
    onChange(raw);
  }

  return (
    <label className={cn("flex min-w-0 flex-col gap-2", className)}>
      <span className="text-sm text-(--brc-text) [font-family:var(--brc-font-ui)] sm:text-base">{label}</span>
      <div className="flex h-12 items-center gap-2 rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-4 sm:h-14 sm:px-5">
        {prefix && <span className="text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{prefix}</span>}
        <input
          value={filter === "decimal" ? formatDecimalInput(value) : value}
          placeholder={placeholder}
          inputMode={inputMode}
          onChange={(e) => handleChange(e.target.value)}
          className="min-w-0 flex-1 border-none bg-transparent text-sm text-(--brc-text) outline-none placeholder:text-(--brc-text-muted) [font-family:var(--brc-font-ui)]"
        />
      </div>
    </label>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

/**
 * Pull a VIN/plate message out of a DRF field-error body
 * (`{"vin": ["This vehicle is already registered on the platform."]}`).
 * Returns null when the failure was about something else.
 */
function extractVehicleFieldError(error: ApiError): string | null {
  const data = error.data;
  if (!data || typeof data !== "object") return null;
  for (const field of ["vin", "plate_number"] as const) {
    const value = (data as Record<string, unknown>)[field];
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    if (typeof value === "string") return value;
  }
  return null;
}

function SelectField({ label, placeholder, value, options, onPick, className }: {
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  onPick: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className={cn("flex min-w-0 flex-col gap-2", className)}>
      <span className="text-sm text-(--brc-text) [font-family:var(--brc-font-ui)] sm:text-base">{label}</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            "flex h-12 w-full cursor-pointer items-center justify-between rounded-lg bg-(--brc-bg-subtle) px-4 text-left text-sm transition-all duration-200 [font-family:var(--brc-font-ui)] sm:h-14 sm:px-5",
            open ? "border-2 border-(--brc-primary) shadow-[0_0_0_3px_rgba(0,0,139,0.08)]" : "border border-(--brc-border) hover:border-(--brc-text-muted)",
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
                  onClick={() => { onPick(o); setOpen(false); }}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between rounded-lg border-none px-4 py-2.5 text-left text-sm transition-colors duration-150 [font-family:var(--brc-font-ui)]",
                    selected
                      ? "bg-(--brc-primary-tint) font-semibold text-(--brc-primary)"
                      : "bg-transparent text-(--brc-text) hover:bg-(--brc-bg-subtle)",
                  )}
                >
                  {capitalize(o)}
                  {selected && <Icon name="check" size={16} stroke="var(--brc-primary)" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FeaturesField({ features, onChange }: {
  features: { name: string; description?: string }[];
  onChange: (features: { name: string; description?: string }[]) => void;
}) {
  function addFeature() {
    onChange([...features, { name: "", description: "" }]);
  }

  function removeFeature(index: number) {
    onChange(features.filter((_, i) => i !== index));
  }

  function updateFeature(index: number, field: "name" | "description", val: string) {
    const updated = features.map((f, i) => (i === index ? { ...f, [field]: val } : f));
    onChange(updated);
  }

  return (
    <div className="col-span-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-(--brc-text) [font-family:var(--brc-font-ui)] sm:text-base">Features</span>
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
          No features added yet. Click &quot;Add Feature&quot; to add GPS, Bluetooth, etc.
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
                <span className="hidden text-xs text-(--brc-border) sm:block">|</span>
                <input
                  value={f.description ?? ""}
                  placeholder="Description (optional)"
                  onChange={(e) => updateFeature(i, "description", e.target.value)}
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

function TextAreaField({ label, placeholder, value, onChange }: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="col-span-full flex flex-col gap-2">
      <span className="text-sm text-(--brc-text) [font-family:var(--brc-font-ui)] sm:text-base">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="min-h-28 resize-y rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) p-4 text-sm leading-relaxed text-(--brc-text) outline-none placeholder:text-(--brc-text-muted) focus:border-(--brc-primary) [font-family:var(--brc-font-ui)] sm:p-5"
      />
    </label>
  );
}

// ---------- Page ----------
const REQUIRED_IMAGE_TYPES: CarImageType[] = [
  "front",
  "back",
  "left_side",
  "right_side",
];

export default function ListCarPage() {
  const router = useRouter();
  const createCar = useCreateCar();
  const uploadImages = useUploadCarImages();
  const [files, setFiles] = useState<CarImageFiles>({});
  const [done, setDone] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [vehicleServerError, setVehicleServerError] = useState<string | null>(null);
  const [pendingValues, setPendingValues] = useState<CreateCarInput | null>(null);
  const submitInFlightRef = useRef(false);

  const form = useForm<CreateCarFormValues, unknown, CreateCarInput>({
    resolver: zodResolver(createCarSchema),
    defaultValues: {
      title: "",
      listing_type: "rent",
      rent_price_per_day: "",
      sale_price: "",
      is_negotiable: true,
      vin: "",
      plate_number: "",
      currency: "NGN",
      brand: "",
      model: "",
      color: "",
      year: "",
      body_type: "",
      transmission: "",
      fuel_type: "",
      seats: 5,
      mileage: "",
      country: "",
      state: "",
      city: "",
      description: "",
      features: [],
    },
  });

  const w = useWatch({ control: form.control });
  const listingType = w.listing_type;
  const countryName = COUNTRIES.find((c) => c.iso === (w.country ?? "").toLowerCase())?.name ?? "";
  const isBuy = listingType === "buy";
  // Pricing is strictly exclusive: a car is listed to rent OR to buy.
  const showRentPrice = !isBuy;
  const showSalePrice = isBuy;

  async function handleSubmit(values: CreateCarInput) {
    try {
      // Validate photos BEFORE creating the car — otherwise a failed upload
      // leaves an orphaned photo-less draft (and retries create duplicates).
      const missingImages = REQUIRED_IMAGE_TYPES.filter((type) => !files[type]);
      if (missingImages.length > 0) {
        toast.error("Please add front, back, left side, and right side photos.");
        return;
      }
      const oversized = findOversizedCarImage(files);
      if (oversized) {
        toast.error(`${oversized.name} is over 5 MB — please use a smaller photo.`);
        return;
      }

      const payload: Record<string, unknown> = {
        ...values,
        year: parseInt(values.year, 10),
        seats: values.seats,
      };
      if (!values.mileage) delete payload.mileage;
      else payload.mileage = parseInt(values.mileage, 10);
      if (!values.rent_price_per_day) delete payload.rent_price_per_day;
      if (!values.sale_price) delete payload.sale_price;

      // Mirror the server's XOR rules so we never send a field it would reject
      // or silently null out.
      if (values.listing_type === "rent") {
        delete payload.sale_price;
        delete payload.is_negotiable;
      } else {
        delete payload.rent_price_per_day;
      }

      const car = await createCar.mutateAsync(payload);

      try {
        await uploadImages.mutateAsync({ carId: car.id, files });
      } catch (uploadError) {
        // The car exists but has no photos — send the owner to the listing
        // to retry instead of leaving a mystery draft (or duplicating it).
        const message =
          uploadError instanceof ApiError
            ? uploadError.message
            : "Photo upload failed.";
        toast.error(
          `Your listing was saved as a draft, but the photos didn't upload: ${message} Add photos from the listing page.`,
        );
        router.push(`/owner/my-cars/${car.id}`);
        return;
      }

      setDone(true);
      toast.success("Car listed successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        // A duplicate VIN/plate comes back on those fields with a deliberately
        // generic message — surface it beside the inputs, not just as a toast.
        const fieldMessage = extractVehicleFieldError(error);
        if (fieldMessage) {
          setVehicleServerError(fieldMessage);
          setConfirmOpen(false);
        }
        toast.error(fieldMessage ?? error.message);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      submitInFlightRef.current = false;
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Validate the form, then open a confirmation modal instead of submitting
    // straight away — the owner reviews everything, because after submission the
    // listing locks until staff requests changes.
    void form.handleSubmit((values) => {
      const missingImages = REQUIRED_IMAGE_TYPES.filter((type) => !files[type]);
      if (missingImages.length > 0) {
        toast.error("Please add front, back, left side, and right side photos.");
        return;
      }
      const oversized = findOversizedCarImage(files);
      if (oversized) {
        toast.error(`${oversized.name} is over 5 MB — please use a smaller photo.`);
        return;
      }
      setPendingValues(values);
      setConfirmOpen(true);
    })(event);
  }

  async function handleConfirmedSubmit() {
    if (!pendingValues || submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setConfirmOpen(false);
    await handleSubmit(pendingValues);
  }

  function handleReset() {
    form.reset();
    setFiles({});
    setDone(false);
    submitInFlightRef.current = false;
  }

  const title = w.title ?? "";
  const brand = w.brand ?? "";
  const isSubmitting =
    form.formState.isSubmitting || createCar.isPending || uploadImages.isPending;

  // Success state
  if (done) {
    return (
      <div className="bg-(--brc-bg-subtle)">
        <div className="mx-auto flex w-full max-w-[1024px] flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10 lg:px-[var(--brc-space-10,40px)] lg:py-14">
          <Card className="rounded-2xl border border-(--brc-border) p-5 shadow-lg sm:p-8 lg:p-12">
            <CardContent className="flex flex-col items-center gap-5 p-0 py-8 text-center sm:py-12">
              <div className="flex size-[72px] items-center justify-center rounded-full bg-(--brc-success-bg) sm:size-[84px]">
                <CheckCircle2Icon size={36} strokeWidth={1.5} className="text-(--brc-success) sm:size-10" />
              </div>
              <div>
                <h2 className="m-0 text-2xl font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)] sm:text-[32px]">
                  Car Listed Successfully
                </h2>
                <p className="mx-auto mt-3 max-w-[460px] text-base text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  <strong className="text-(--brc-text)">{title || brand}</strong> is now {isBuy ? "up for sale" : "available to rent"}. Head to your listings to book an inspection date.
                </p>
              </div>
              <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={handleReset}
                  className="h-12 w-full cursor-pointer rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-[22px] text-sm font-bold text-(--brc-text) transition duration-200 hover:-translate-y-0.5 hover:brightness-95 [font-family:var(--brc-font-ui)] sm:w-auto"
                >
                  List Another
                </button>
                <Link
                  href="/owner/my-cars"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-(--brc-primary) px-[22px] text-sm font-bold text-(--brc-text-on-primary) no-underline transition duration-200 hover:-translate-y-0.5 hover:bg-(--brc-primary-hover) hover:shadow-md [font-family:var(--brc-font-ui)] sm:w-auto"
                >
                  View Listings
                  <Icon name="arrow" size={18} stroke="currentColor" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="bg-(--brc-bg-subtle)">
      <div className="mx-auto flex w-full max-w-[1024px] flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10 lg:px-[var(--brc-space-10,40px)] lg:py-14">
        {/* Back arrow */}
        <Link
          href="/owner/my-cars"
          className="group inline-flex w-fit items-center gap-2 text-sm font-semibold text-(--brc-text-muted) no-underline transition-colors hover:text-(--brc-text) [font-family:var(--brc-font-ui)]"
        >
          <ArrowLeftIcon size={18} className="transition-transform duration-200 group-hover:-translate-x-1" />
          Back to Listings
        </Link>

        <Card className="relative rounded-2xl border border-(--brc-border) p-5 shadow-lg sm:p-8 lg:p-12">
          <CardContent className="flex flex-col gap-6 p-0 sm:gap-8">
            {/* Header */}
            <div>
              <h1 className="m-0 text-[28px] font-extrabold tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)] sm:text-[32px]">
                List a Car
              </h1>
              <p className="mt-2 text-base text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                Add a vehicle to your listings for rent or sale
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-6 sm:gap-8">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                <TextField label="Car Title" placeholder="Enter car title" value={w.title ?? ""} onChange={(v) => form.setValue("title", v.replace(/\b\w/g, (c) => c.toUpperCase()))} />
                <div className="flex min-w-0 flex-col gap-2 sm:col-span-2 lg:col-span-1">
                  <span className="text-sm text-(--brc-text) [font-family:var(--brc-font-ui)] sm:text-base">
                    Listing Type
                  </span>
                  <ListingTypeToggle
                    value={listingType ?? "rent"}
                    onChange={(next) => form.setValue("listing_type", next)}
                  />
                </div>

                {showRentPrice && (
                  <TextField label="Rental Price per Day" placeholder="e.g. 35000.00" value={w.rent_price_per_day ?? ""} onChange={(v) => form.setValue("rent_price_per_day", v)} prefix="₦" inputMode="decimal" filter="decimal" />
                )}
                {showSalePrice && (
                  <TextField label="Sale Price" placeholder="e.g. 24000000.00" value={w.sale_price ?? ""} onChange={(v) => form.setValue("sale_price", v)} prefix="₦" inputMode="decimal" filter="decimal" />
                )}

                {isBuy && (
                  <NegotiableField
                    isNegotiable={w.is_negotiable === true}
                    onToggle={(next) => form.setValue("is_negotiable", next)}
                  />
                )}

                <VehicleIdentityFields
                  vin={w.vin ?? ""}
                  plate={w.plate_number ?? ""}
                  onVinChange={(v) => {
                    setVehicleServerError(null);
                    form.setValue("vin", v);
                  }}
                  onPlateChange={(v) => {
                    setVehicleServerError(null);
                    form.setValue("plate_number", v);
                  }}
                  serverError={vehicleServerError}
                />

                <TextField label="Brand" placeholder="Enter brand name" value={w.brand ?? ""} onChange={(v) => form.setValue("brand", capitalizeFirstLetter(v))} />
                <TextField label="Model" placeholder="Enter model" value={w.model ?? ""} onChange={(v) => form.setValue("model", capitalizeFirstLetter(v))} />
                <TextField label="Color" placeholder="Enter color" value={w.color ?? ""} onChange={(v) => form.setValue("color", capitalizeFirstLetter(v))} />

                <TextField label="Year" placeholder="e.g. 2024" value={w.year ?? ""} onChange={(v) => form.setValue("year", v)} inputMode="numeric" filter="digits" />
                <SelectField label="Body Type" placeholder="Select body type" value={w.body_type ?? ""} options={["sedan", "suv", "hatchback", "coupe", "truck", "van", "wagon", "convertible", "minivan", "crossover"]} onPick={(v) => form.setValue("body_type", v)} />
                <SelectField label="Transmission" placeholder="Select transmission" value={w.transmission ?? ""} options={["automatic", "manual"]} onPick={(v) => form.setValue("transmission", v)} />

                <SelectField label="Fuel Type" placeholder="Select fuel type" value={w.fuel_type ?? ""} options={["petrol", "diesel", "hybrid", "electric"]} onPick={(v) => form.setValue("fuel_type", v)} />
                <TextField label="Seats" placeholder="Number of seats" value={w.seats != null ? String(w.seats) : ""} onChange={(v) => form.setValue("seats", v === "" ? (0 as unknown as number) : parseInt(v, 10))} inputMode="numeric" filter="digits" />
                <TextField label="Mileage (km)" placeholder="e.g. 45000" value={w.mileage ?? ""} onChange={(v) => form.setValue("mileage", v)} inputMode="numeric" filter="digits" />

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

                <CarPhotoSlotsField value={files} onChange={setFiles} />
                <TextAreaField label="Description" placeholder="Describe your car, its condition, and any special features" value={w.description ?? ""} onChange={(v) => form.setValue("description", v)} />

                <FeaturesField
                  features={(w.features ?? []) as { name: string; description?: string }[]}
                  onChange={(features) => form.setValue("features", features)}
                />
              </div>

              {/* Validation errors */}
              {Object.keys(form.formState.errors).length > 0 && (
                <div className="flex flex-col gap-1.5 rounded-lg border border-(--brc-danger)/30 bg-(--brc-danger-bg) px-4 py-3">
                  {Object.entries(form.formState.errors).map(([key, error]) => (
                    <div key={key} className="flex items-center gap-2.5">
                      <span className="size-[7px] shrink-0 rounded-full bg-(--brc-danger)" />
                      <span className="text-sm text-(--brc-danger) [font-family:var(--brc-font-ui)]">
                        {error?.message as string}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-(--brc-primary) text-sm font-bold text-(--brc-text-on-primary) transition duration-200 hover:-translate-y-0.5 hover:bg-(--brc-primary-hover) hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none [font-family:var(--brc-font-ui)] sm:h-14 sm:text-base"
              >
                {isSubmitting && <Loader2Icon size={18} className="animate-spin" />}
                {isSubmitting ? "Listing..." : "List Car"}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="[font-family:var(--brc-font-display)]">
              Confirm your listing
            </DialogTitle>
            <DialogDescription className="[font-family:var(--brc-font-ui)]">
              Review the details below. After you submit, the listing locks for
              review — you won&apos;t be able to edit it unless our team requests
              changes.
            </DialogDescription>
          </DialogHeader>

          <dl className="max-h-[50vh] divide-y divide-(--brc-border) overflow-y-auto rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) px-4 text-sm [font-family:var(--brc-font-ui)]">
            {[
              { label: "Title", value: w.title },
              { label: "Vehicle", value: [w.brand, w.model, w.year].filter(Boolean).join(" ") },
              { label: "Listing type", value: w.listing_type },
              isBuy && w.sale_price ? { label: "Sale price", value: `${w.currency} ${w.sale_price}` } : null,
              !isBuy && w.rent_price_per_day ? { label: "Rent / day", value: `${w.currency} ${w.rent_price_per_day}` } : null,
              isBuy ? { label: "Pricing", value: w.is_negotiable ? "Negotiable" : "Non-negotiable" } : null,
              { label: "VIN", value: w.vin },
              { label: "Plate", value: w.plate_number },
              { label: "Location", value: [w.city, w.state].filter(Boolean).join(", ") },
              w.mileage ? { label: "Mileage", value: w.mileage } : null,
              { label: "Photos", value: `${Object.values(files).filter(Boolean).length} uploaded` },
            ]
              .filter((row): row is { label: string; value: string } => !!row && !!row.value)
              .map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-4 py-2.5">
                  <dt className="text-(--brc-text-muted)">{row.label}</dt>
                  <dd className="text-right font-bold text-(--brc-text)">{row.value}</dd>
                </div>
              ))}
          </dl>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-(--brc-border) bg-white px-4 text-sm font-bold text-(--brc-text) transition hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirmedSubmit}
              disabled={isSubmitting}
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-(--brc-primary) px-5 text-sm font-black text-(--brc-text-on-primary) transition hover:bg-(--brc-primary-hover) disabled:cursor-not-allowed disabled:opacity-60 [font-family:var(--brc-font-ui)]"
            >
              {isSubmitting && <Loader2Icon size={16} className="animate-spin" />}
              {isSubmitting ? "Listing..." : "Confirm & submit"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
