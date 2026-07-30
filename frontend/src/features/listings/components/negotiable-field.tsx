"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type NegotiableFieldProps = {
  isNegotiable: boolean;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Buy-only negotiable toggle. When on, buyers can make an offer of any positive
 * amount; the owner accepts, counters, or declines each one.
 */
export function NegotiableField({
  isNegotiable,
  onToggle,
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
              ? "Buyers can make an offer. You accept, counter, or decline each one."
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
    </div>
  );
}
