"use client";

import { useState } from "react";
import { SlidersHorizontalIcon, XIcon } from "lucide-react";

import type { OfferStatus } from "@/features/offers/api";
import { OFFER_STATUS_META } from "@/features/offers/lib/offer-format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type OwnerOfferSort = "newest" | "highest" | "expiring";

export type OwnerCarOption = { id: string; title: string };

/** All 7 offer statuses, in the order an owner cares about them. */
const STATUS_ORDER: OfferStatus[] = [
  "pending",
  "countered",
  "accepted",
  "rejected",
  "withdrawn",
  "expired",
  "superseded",
];

const SORT_OPTIONS: { value: OwnerOfferSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "highest", label: "Highest amount" },
  { value: "expiring", label: "Expiring soonest" },
];

export type OwnerOfferFilterState = {
  carId: string | null;
  status: OfferStatus | null;
  sort: OwnerOfferSort;
};

type OwnerOfferFilterHandlers = {
  onCarChange: (carId: string | null) => void;
  onStatusChange: (status: OfferStatus | null) => void;
  onSortChange: (sort: OwnerOfferSort) => void;
  onClearAll: () => void;
};

type SharedProps = OwnerOfferFilterState &
  OwnerOfferFilterHandlers & { cars: OwnerCarOption[] };

function StatusChip({
  status,
  active,
  onClick,
}: {
  status: OfferStatus;
  active: boolean;
  onClick: () => void;
}) {
  const meta = OFFER_STATUS_META[status];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-8 shrink-0 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition-colors [font-family:var(--brc-font-ui)]",
        active
          ? "border-(--brc-primary) bg-(--brc-primary) text-white"
          : "border-(--brc-border) bg-white text-(--brc-text-secondary) hover:bg-(--brc-bg-subtle)",
      )}
    >
      {meta.label}
    </button>
  );
}

function CarSelect({
  cars,
  carId,
  onCarChange,
  className,
}: {
  cars: OwnerCarOption[];
  carId: string | null;
  onCarChange: (carId: string | null) => void;
  className?: string;
}) {
  return (
    <Select value={carId ?? "all"} onValueChange={(v) => onCarChange(v === "all" ? null : v)}>
      <SelectTrigger
        className={cn(
          "h-10 w-full min-w-0 justify-between rounded-lg border-(--brc-border) px-3.5 text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]",
          className,
        )}
        aria-label="Filter by car"
      >
        <SelectValue placeholder="All cars" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All cars</SelectItem>
        {cars.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SortSelect({
  sort,
  onSortChange,
  className,
}: {
  sort: OwnerOfferSort;
  onSortChange: (sort: OwnerOfferSort) => void;
  className?: string;
}) {
  return (
    <Select value={sort} onValueChange={(v) => onSortChange(v as OwnerOfferSort)}>
      <SelectTrigger
        className={cn(
          "h-10 w-full min-w-0 justify-between rounded-lg border-(--brc-border) px-3.5 text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]",
          className,
        )}
        aria-label="Sort offers"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-(--brc-primary-tint) py-1 pr-1.5 pl-3 text-xs font-semibold text-(--brc-primary) [font-family:var(--brc-font-ui)]">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="inline-flex size-4 items-center justify-center rounded-full text-(--brc-primary) hover:bg-white/60"
      >
        <XIcon className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}

/** Sticky desktop filter bar: car select, status chips, sort, and active-filter pills. */
export function OwnerOfferFilterBar({
  cars,
  carId,
  status,
  sort,
  onCarChange,
  onStatusChange,
  onSortChange,
  onClearAll,
}: SharedProps) {
  const activeCar = carId ? (cars.find((c) => c.id === carId) ?? null) : null;
  const hasFilters = Boolean(carId || status);

  return (
    <div className="sticky top-[85px] z-20 hidden bg-(--brc-bg-subtle) py-3 md:block">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-(--brc-border) bg-white p-3.5">
        <CarSelect cars={cars} carId={carId} onCarChange={onCarChange} className="sm:w-56" />
        <div className="flex flex-1 flex-wrap gap-1.5">
          {STATUS_ORDER.map((s) => (
            <StatusChip
              key={s}
              status={s}
              active={status === s}
              onClick={() => onStatusChange(status === s ? null : s)}
            />
          ))}
        </div>
        <SortSelect sort={sort} onSortChange={onSortChange} className="sm:w-48" />
      </div>
      {hasFilters ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {activeCar ? <FilterPill label={activeCar.title} onRemove={() => onCarChange(null)} /> : null}
          {status ? (
            <FilterPill label={OFFER_STATUS_META[status].label} onRemove={() => onStatusChange(null)} />
          ) : null}
          <button
            type="button"
            onClick={onClearAll}
            className="px-2 text-xs font-semibold text-(--brc-text-secondary) hover:text-(--brc-text) [font-family:var(--brc-font-ui)]"
          >
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Mobile: a single "Filters" trigger that opens a bottom sheet (MOBILE FILTERS SHEET). */
export function OwnerOfferMobileFilters(props: SharedProps) {
  const { cars, carId, status, sort, onCarChange, onStatusChange, onSortChange, onClearAll } = props;
  const [open, setOpen] = useState(false);
  const activeCount = (carId ? 1 : 0) + (status ? 1 : 0);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-(--brc-border) bg-white text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]"
      >
        <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
        Filters{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-6">
          <SheetHeader className="flex-row items-center justify-between px-0">
            <SheetTitle className="text-lg font-extrabold [font-family:var(--brc-font-display)]">
              Filters
            </SheetTitle>
            <button
              type="button"
              onClick={onClearAll}
              className="text-sm font-semibold text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]"
            >
              Clear all
            </button>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-0">
            <div>
              <div className="mb-2 text-sm font-semibold text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                Car
              </div>
              <CarSelect cars={cars} carId={carId} onCarChange={onCarChange} className="w-full" />
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                Status
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS_ORDER.map((s) => (
                  <StatusChip
                    key={s}
                    status={s}
                    active={status === s}
                    onClick={() => onStatusChange(status === s ? null : s)}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                Sort
              </div>
              <SortSelect sort={sort} onSortChange={onSortChange} className="w-full" />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 h-12 w-full rounded-lg border-none bg-(--brc-primary) text-[15px] font-bold text-white [font-family:var(--brc-font-ui)]"
            >
              Show results
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
