"use client";

import { Radio } from "@base-ui/react/radio";
import { CarFrontIcon, TagIcon } from "lucide-react";

import { RadioGroup } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { ListingType } from "@/features/listings/api/types";

const OPTIONS: { value: ListingType; label: string; icon: typeof TagIcon }[] = [
  { value: "rent", label: "Rent", icon: CarFrontIcon },
  { value: "buy", label: "Buy", icon: TagIcon },
];

type ListingTypeToggleProps = {
  value: ListingType;
  onChange: (value: ListingType) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Rent / Buy segmented control.
 *
 * Built on RadioGroup rather than Tabs on purpose: the listing type is a form
 * *value* that gets submitted and validated, not a way to navigate between
 * panels. RadioGroup gives us the right semantics (announced as a radio
 * choice) and arrow-key navigation for free; the segmented look is styling
 * over those primitives.
 */
export function ListingTypeToggle({
  value,
  onChange,
  disabled = false,
  className,
}: ListingTypeToggleProps) {
  const activeIndex = OPTIONS.findIndex((option) => option.value === value);

  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onChange(next as ListingType)}
      disabled={disabled}
      aria-label="Listing type"
      className={cn(
        "relative w-full max-w-sm grid-cols-2 gap-1 rounded-xl border bg-muted p-1",
        disabled && "opacity-60",
        className,
      )}
    >
      {/* Sliding pill sits behind the options; motion-safe so reduced-motion
          users get an instant swap instead of a slide. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-background shadow-sm motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        return (
          <Radio.Root
            key={option.value}
            value={option.value}
            className={cn(
              "relative z-10 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-transparent text-sm font-medium transition-colors outline-none",
              "text-muted-foreground hover:text-foreground data-checked:text-foreground",
              "focus-visible:ring-[3px] focus-visible:ring-ring/50",
              disabled && "cursor-not-allowed",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {option.label}
          </Radio.Root>
        );
      })}
    </RadioGroup>
  );
}
