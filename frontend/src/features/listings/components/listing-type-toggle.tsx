"use client";

import { CarFrontIcon, TagIcon } from "lucide-react";

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
 * Rent / Buy segmented control. A car is listed for one or the other — never
 * both — so this is a two-option radiogroup with a sliding active pill.
 */
export function ListingTypeToggle({
  value,
  onChange,
  disabled = false,
  className,
}: ListingTypeToggleProps) {
  const activeIndex = OPTIONS.findIndex((option) => option.value === value);

  return (
    <div
      role="radiogroup"
      aria-label="Listing type"
      className={cn(
        "relative grid w-full max-w-sm grid-cols-2 gap-1 rounded-xl border bg-muted p-1",
        disabled && "opacity-60",
        className,
      )}
    >
      {/* Sliding pill sits behind the labels; motion-safe so reduced-motion
          users get an instant swap. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-background shadow-sm motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors",
              "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              disabled && "cursor-not-allowed",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
