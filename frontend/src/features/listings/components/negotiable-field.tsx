"use client";

import { AlertCircleIcon, EyeOffIcon, LockIcon } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import {
  formatDecimalInput,
  normalizeDecimalInput,
} from "@/features/listings/lib/decimal-input";
import { cn } from "@/lib/utils";

function MoneyInput({
  label,
  value,
  onChange,
  invalid,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="text-sm text-(--brc-text-secondary)">{label}</span>
      <div
        className={cn(
          "flex h-11 items-center gap-2 rounded-lg border bg-(--brc-bg) px-3",
          invalid ? "border-(--brc-danger)" : "border-(--brc-border)",
        )}
      >
        <span className="text-sm font-bold text-(--brc-text-secondary)">₦</span>
        <input
          value={formatDecimalInput(value)}
          placeholder="0"
          inputMode="decimal"
          disabled={disabled}
          aria-invalid={invalid ? true : undefined}
          onChange={(e) => onChange(normalizeDecimalInput(e.target.value))}
          className="min-w-0 flex-1 border-none bg-transparent text-sm text-(--brc-text) outline-none placeholder:text-(--brc-text-muted) [font-family:var(--brc-font-ui)]"
        />
      </div>
    </label>
  );
}

type NegotiableFieldProps = {
  isNegotiable: boolean;
  onToggle: (next: boolean) => void;
  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  /** Range validation message, shown under the two inputs. */
  error?: string | null;
  disabled?: boolean;
  className?: string;
};

/**
 * Buy-only negotiable toggle. When on, the owner sets a private acceptable
 * range; customers never see these numbers — an offer below the minimum is
 * rejected with a neutral message that doesn't reveal the threshold.
 */
export function NegotiableField({
  isNegotiable,
  onToggle,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  error,
  disabled,
  className,
}: NegotiableFieldProps) {
  return (
    <div
      className={cn(
        "col-span-full rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-(--brc-text) sm:text-base">
            {isNegotiable ? "Negotiable" : "Non-negotiable"}
          </span>
          <span className="text-xs text-(--brc-text-muted) sm:text-sm">
            {isNegotiable
              ? "Buyers can make an offer within your private range."
              : "The sale price is fixed. Buyers cannot make offers."}
          </span>
        </div>
        <Switch
          checked={isNegotiable}
          disabled={disabled}
          onCheckedChange={onToggle}
          aria-label="Negotiable"
          className="data-checked:bg-blue-600 focus-visible:border-blue-600 focus-visible:ring-blue-600/30 [&_[data-slot=switch-thumb]]:bg-white"
        />
      </div>

      {/* Collapse via grid-rows so the reveal animates without a fixed height. */}
      <div
        className={cn(
          "grid motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out",
          isNegotiable
            ? "mt-4 grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
        aria-hidden={!isNegotiable}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-3.5 rounded-2xl border border-(--brc-primary-tint) bg-(--brc-primary-tint) p-4.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-(--brc-text)">
                <LockIcon
                  className="size-4.5 text-(--brc-primary)"
                  aria-hidden="true"
                />
                Acceptable price range
              </span>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-(--brc-primary) bg-(--brc-bg) px-3 py-1 text-xs font-semibold text-(--brc-primary)">
                <EyeOffIcon className="size-3" aria-hidden="true" />
                Private — only you can see this
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MoneyInput
                label="Minimum you'll accept"
                value={minPrice}
                onChange={onMinPriceChange}
                invalid={Boolean(error)}
                disabled={disabled || !isNegotiable}
              />
              <MoneyInput
                label="Maximum you're asking"
                value={maxPrice}
                onChange={onMaxPriceChange}
                invalid={Boolean(error)}
                disabled={disabled || !isNegotiable}
              />
            </div>
            {error ? (
              <span
                className="inline-flex items-center gap-1.5 text-xs text-(--brc-danger)"
                role="alert"
              >
                <AlertCircleIcon
                  className="size-3.5 shrink-0"
                  aria-hidden="true"
                />
                {error}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
