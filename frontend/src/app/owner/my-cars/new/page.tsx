"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeftIcon, CheckCircle2Icon, XIcon, UploadIcon, FileIcon } from "lucide-react";
import { Icon } from "@/features/auth/components/icon";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ---------- Form field components ----------

function TextField({ label, placeholder, value, onChange, prefix, className }: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-2", className)}>
      <span className="text-sm text-(--brc-text) [font-family:var(--brc-font-ui)] sm:text-base">{label}</span>
      <div className="flex h-12 items-center gap-2 rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-4 sm:h-14 sm:px-5">
        {prefix && <span className="text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{prefix}</span>}
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 border-none bg-transparent text-sm text-(--brc-text) outline-none placeholder:text-(--brc-text-muted) [font-family:var(--brc-font-ui)]"
        />
      </div>
    </label>
  );
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
          className="flex h-12 w-full cursor-pointer items-center justify-between rounded-lg bg-(--brc-bg-subtle) px-4 text-left text-sm [font-family:var(--brc-font-ui)] sm:h-14 sm:px-5"
          style={{
            border: open ? "1px solid var(--brc-primary)" : "1px solid var(--brc-border)",
            color: value ? "var(--brc-text)" : "var(--brc-text-muted)",
          }}
        >
          {value || placeholder}
          <Icon name={open ? "chevup" : "chevdown"} size={18} stroke="var(--brc-text-muted)" />
        </button>
        {open && (
          <div className="absolute left-0 right-0 top-[52px] z-40 max-h-[min(50vh,220px)] overflow-y-auto rounded-lg border border-(--brc-border) bg-white shadow-md sm:top-[60px]">
            {options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => { onPick(o); setOpen(false); }}
                className="w-full cursor-pointer border-none px-5 py-3 text-left text-sm text-(--brc-text) [font-family:var(--brc-font-ui)]"
                style={{ background: o === value ? "var(--brc-bg-subtle)" : "#fff" }}
              >
                {o}
              </button>
            ))}
          </div>
        )}
      </div>
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

function FileField({ label, files, onChoose, onClear }: {
  label: string;
  files: File[];
  onChoose: (files: File[]) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="col-span-full flex flex-col gap-2">
      <span className="text-sm text-(--brc-text) [font-family:var(--brc-font-ui)] sm:text-base">{label}</span>
      <div className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-4 py-3 sm:min-h-14 sm:px-5">
        <span className="flex min-w-0 items-center gap-2.5">
          {files.length > 0 && <FileIcon size={18} className="shrink-0 text-(--brc-primary)" />}
          <span className="truncate text-sm [font-family:var(--brc-font-ui)]" style={{ color: files.length ? "var(--brc-text)" : "var(--brc-text-muted)" }}>
            {files.length ? `${files.length} image${files.length > 1 ? "s" : ""} selected` : "No file selected"}
          </span>
        </span>
        {files.length > 0 && (
          <button type="button" onClick={onClear} className="flex shrink-0 cursor-pointer border-none bg-transparent p-1.5">
            <XIcon size={16} className="text-(--brc-text-muted)" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            onChoose(Array.from(e.target.files));
          }
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-1 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-(--brc-border) bg-white px-4 text-sm font-semibold text-(--brc-text) transition duration-200 hover:-translate-y-0.5 hover:bg-(--brc-bg-subtle) hover:shadow-sm [font-family:var(--brc-font-ui)] sm:w-fit sm:self-start"
      >
        <UploadIcon size={16} />
        Choose files
      </button>
    </div>
  );
}

// ---------- Types ----------
type FormData = {
  title: string;
  listingType: string;
  price: string;
  brand: string;
  model: string;
  color: string;
  year: string;
  transmission: string;
  fuelType: string;
  state: string;
  city: string;
  description: string;
  features: string;
};

const BLANK: FormData = {
  title: "", listingType: "", price: "", brand: "", model: "", color: "",
  year: "", transmission: "", fuelType: "", state: "", city: "", description: "", features: "",
};

const MODELS = ["NX 300h", "RAV4", "C300", "Accord", "X5", "Sportage", "Camry", "Civic"];
const STATES = ["Lagos", "Abuja (FCT)", "Rivers", "Oyo", "Kano", "Enugu"];
const CITIES = ["Ikeja", "Lekki", "Victoria Island", "Yaba", "Surulere", "Ikoyi"];
const REQUIRED: (keyof FormData)[] = ["title", "listingType", "price", "brand", "model", "year", "state"];

// ---------- Page ----------
export default function ListCarPage() {
  const [f, setF] = useState(BLANK);
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: keyof FormData) => (value: string) => setF((prev) => ({ ...prev, [key]: value }));
  const isBuy = f.listingType === "Buy";
  const priceLabel = isBuy ? "Sale Price (₦)" : "Rental Price per Day (₦)";
  const missing = REQUIRED.filter((k) => !f[k]);

  function handleSubmit() {
    setSubmitted(true);
    if (missing.length) {
      toast.error(`${missing.length} required field${missing.length > 1 ? "s" : ""} left`);
      return;
    }
    // TODO: call API to create listing
    setDone(true);
    toast.success("Car listed successfully");
  }

  function handleReset() {
    setF(BLANK);
    setFiles([]);
    setSubmitted(false);
    setDone(false);
  }

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
                  <strong className="text-(--brc-text)">{f.title || f.brand}</strong> is now {isBuy ? "up for sale" : "available to rent"}. We&apos;ll notify you when a request comes in.
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

            {/* Form grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              <TextField label="Car Title" placeholder="Enter car title" value={f.title} onChange={set("title")} />
              <SelectField label="Listing Type" placeholder="Select listing type" value={f.listingType} options={["Rent", "Buy"]} onPick={set("listingType")} />
              <TextField label={priceLabel} placeholder="Enter amount" value={f.price} onChange={set("price")} prefix="₦" />

              <TextField label="Brand" placeholder="Enter brand name" value={f.brand} onChange={set("brand")} />
              <SelectField label="Model" placeholder="Enter model" value={f.model} options={MODELS} onPick={set("model")} />
              <TextField label="Color" placeholder="Enter color" value={f.color} onChange={set("color")} />

              <TextField label="Year" placeholder="Enter year" value={f.year} onChange={set("year")} />
              <SelectField label="Transmission" placeholder="Select transmission type" value={f.transmission} options={["Automatic", "Manual"]} onPick={set("transmission")} />
              <SelectField label="Fuel Type" placeholder="Select fuel type" value={f.fuelType} options={["Petrol", "Diesel", "Hybrid", "Electric"]} onPick={set("fuelType")} />

              <SelectField label="State" placeholder="Select state" value={f.state} options={STATES} onPick={set("state")} className="sm:col-span-2" />
              <SelectField label="City" placeholder="Select city" value={f.city} options={CITIES} onPick={set("city")} />

              <FileField
                label="Car Image(s)"
                files={files}
                onChoose={setFiles}
                onClear={() => setFiles([])}
              />
              <TextAreaField label="Description" placeholder="Describe your car, its condition, and any special features" value={f.description} onChange={set("description")} />
              <TextField label="Features" placeholder="GPS, Bluetooth, ....." value={f.features} onChange={set("features")} className="sm:col-span-2 lg:col-span-3" />
            </div>

            {/* Validation error */}
            {submitted && missing.length > 0 && (
              <div className="flex items-center gap-2.5 rounded-lg border border-(--brc-danger)/30 bg-(--brc-danger-bg) px-4 py-3">
                <span className="size-[7px] shrink-0 rounded-full bg-(--brc-danger)" />
                <span className="text-sm text-(--brc-danger) [font-family:var(--brc-font-ui)]">
                  Please complete the required fields before listing.
                </span>
              </div>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              className="h-12 w-full cursor-pointer rounded-lg border-none bg-(--brc-primary) text-sm font-bold text-(--brc-text-on-primary) transition duration-200 hover:-translate-y-0.5 hover:bg-(--brc-primary-hover) hover:shadow-md [font-family:var(--brc-font-ui)] sm:h-14 sm:text-base"
            >
              List Car
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
