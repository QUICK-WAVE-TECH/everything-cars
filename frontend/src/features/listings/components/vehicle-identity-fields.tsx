"use client";

import { useState } from "react";
import { CheckCircle2Icon, FingerprintIcon, HashIcon, ShieldCheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  PLATE_MAX,
  VIN_LENGTH,
  normalizePlate,
  normalizeVin,
  validatePlate,
  validateVin,
} from "@/features/listings/lib/vehicle-identity";

type IdentityInputProps = {
  label: string;
  icon: typeof HashIcon;
  value: string;
  placeholder: string;
  count: string;
  error: string | null;
  valid: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
};

function IdentityInput({
  label,
  icon: Icon,
  value,
  placeholder,
  count,
  error,
  valid,
  disabled,
  onChange,
  onBlur,
}: IdentityInputProps) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="flex items-center justify-between">
        <span className="text-sm text-(--brc-text) [font-family:var(--brc-font-ui)] sm:text-base">
          {label} <span className="text-(--brc-danger)">*</span>
        </span>
        <span className="text-xs tabular-nums text-(--brc-text-muted)">{count}</span>
      </span>
      <div
        className={cn(
          "flex h-12 items-center gap-2 rounded-lg border bg-(--brc-bg-subtle) px-4 sm:h-14 sm:px-5",
          error ? "border-(--brc-danger)" : "border-(--brc-border)",
        )}
      >
        <Icon className="size-4 shrink-0 text-(--brc-text-muted)" aria-hidden="true" />
        <input
          value={value}
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="characters"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className="min-w-0 flex-1 border-none bg-transparent text-sm tracking-[0.08em] text-(--brc-text) uppercase outline-none placeholder:tracking-normal placeholder:text-(--brc-text-muted) [font-family:var(--brc-font-ui)]"
        />
        {valid ? (
          <CheckCircle2Icon
            className="size-4.5 shrink-0 text-(--brc-success)"
            aria-hidden="true"
          />
        ) : null}
      </div>
      {error ? (
        <span className="text-xs text-(--brc-danger)" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

type VehicleIdentityFieldsProps = {
  vin: string;
  plate: string;
  onVinChange: (value: string) => void;
  onPlateChange: (value: string) => void;
  /** Server-side error (e.g. the generic duplicate-vehicle message). */
  serverError?: string | null;
  disabled?: boolean;
  className?: string;
};

/**
 * VIN + plate capture. Values are normalized as the owner types (uppercased,
 * spaces/hyphens stripped) so what they see is exactly what gets stored, and
 * format errors surface on blur rather than on every keystroke.
 */
export function VehicleIdentityFields({
  vin,
  plate,
  onVinChange,
  onPlateChange,
  serverError,
  disabled,
  className,
}: VehicleIdentityFieldsProps) {
  const [touched, setTouched] = useState({ vin: false, plate: false });

  const vinError = touched.vin ? validateVin(vin) : null;
  const plateError = touched.plate ? validatePlate(plate) : null;
  const vinValid = vin.length > 0 && validateVin(vin) === null;
  const plateValid = plate.length > 0 && validatePlate(plate) === null;

  return (
    <div className={cn("col-span-full flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-(--brc-text) sm:text-base">
          <ShieldCheckIcon className="size-4.5 text-(--brc-primary)" aria-hidden="true" />
          Vehicle identity
        </h3>
        <p className="text-xs text-(--brc-text-muted) sm:text-sm">
          Required · kept private from the public
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <IdentityInput
          label="VIN"
          icon={FingerprintIcon}
          value={vin}
          placeholder="1HGCM82633A004352"
          count={`${vin.length}/${VIN_LENGTH}`}
          error={vinError}
          valid={vinValid}
          disabled={disabled}
          onChange={(raw) => onVinChange(normalizeVin(raw).slice(0, VIN_LENGTH))}
          onBlur={() => setTouched((t) => ({ ...t, vin: true }))}
        />
        <IdentityInput
          label="Plate number"
          icon={HashIcon}
          value={plate}
          placeholder="LND419KJA"
          count={`${plate.length}/${PLATE_MAX}`}
          error={plateError}
          valid={plateValid}
          disabled={disabled}
          onChange={(raw) => onPlateChange(normalizePlate(raw).slice(0, PLATE_MAX))}
          onBlur={() => setTouched((t) => ({ ...t, plate: true }))}
        />
      </div>

      {serverError ? (
        <p
          className="rounded-lg bg-(--brc-danger-bg) px-4 py-3 text-sm text-(--brc-danger)"
          role="alert"
        >
          {serverError}
        </p>
      ) : null}
    </div>
  );
}
