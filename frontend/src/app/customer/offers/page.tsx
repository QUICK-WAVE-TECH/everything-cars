"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Radio } from "@base-ui/react/radio";
import { HandshakeIcon, RotateCcwIcon } from "lucide-react";

import { RadioGroup } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyOffers } from "@/features/offers/api";
import { isActiveOfferStatus } from "@/features/offers/lib/offer-format";
import { CustomerOfferCard } from "@/features/offers/components/customer-offer-card";

type FilterValue = "active" | "closed";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
];

function OfferCardSkeleton() {
  return (
    <div
      className="flex gap-4.5 rounded-(--brc-radius-lg) border border-(--brc-border) bg-white p-4.5"
      aria-hidden="true"
    >
      <Skeleton className="aspect-video w-full max-w-full flex-[0_0_220px] rounded-(--brc-radius-lg)" />
      <div className="flex flex-1 flex-col gap-3 py-1">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="mt-2 h-6 w-1/2" />
      </div>
    </div>
  );
}

export default function MyOffersPage() {
  const [filter, setFilter] = useState<FilterValue>("active");
  const { data, isLoading, isError, refetch, isFetching } = useMyOffers();

  const offers = useMemo(() => data?.results ?? [], [data]);
  const filtered = useMemo(
    () =>
      offers.filter((offer) =>
        filter === "active"
          ? isActiveOfferStatus(offer.status)
          : !isActiveOfferStatus(offer.status),
      ),
    [offers, filter],
  );

  const activeIndex = FILTERS.findIndex((f) => f.value === filter);
  const isEmpty = !isLoading && !isError && offers.length === 0;

  return (
    <div
      style={{ background: "var(--brc-bg-subtle)" }}
      className="min-h-[calc(100vh-84px)]"
    >
      <div className="mx-auto flex w-full max-w-225 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-9 lg:px-0 lg:py-12">
        <div>
          <h1 className="m-0 mb-1.5 text-[clamp(28px,6vw,36px)] leading-[1.1] font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">
            My Offers
          </h1>
          <p className="m-0 text-[15px] text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
            Track your offers and respond to counters. Offers are valid for 48
            hours.
          </p>
        </div>

        {!isLoading && !isError && !isEmpty && (
          <RadioGroup
            value={filter}
            onValueChange={(next) => setFilter(next as FilterValue)}
            aria-label="Offer status"
            className="relative w-70 max-w-full grid-cols-2 gap-0 rounded-xl border border-(--brc-border) bg-(--brc-bg-muted) p-1"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-(--brc-primary) motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out"
              style={{
                transform: `translateX(${activeIndex * 100}%)`,
                boxShadow:
                  "0 2px 6px color-mix(in srgb, var(--brc-primary) 28%, transparent)",
              }}
            />
            {FILTERS.map((f) => (
              <Radio.Root
                key={f.value}
                value={f.value}
                className="relative z-10 flex h-10 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-sm font-bold text-(--brc-text-secondary) outline-none transition-colors data-checked:text-white focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {f.label}
              </Radio.Root>
            ))}
          </RadioGroup>
        )}

        {isLoading ? (
          <div className="flex flex-col gap-4.5" aria-busy="true" aria-label="Loading your offers">
            <OfferCardSkeleton />
            <OfferCardSkeleton />
            <OfferCardSkeleton />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 rounded-(--brc-radius-lg) border border-dashed border-(--brc-border) bg-white px-6 py-12 text-center">
            <p className="m-0 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
              We couldn&apos;t load your offers.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-(--brc-primary) [font-family:var(--brc-font-ui)] disabled:opacity-60"
            >
              <RotateCcwIcon className="size-3.5" aria-hidden="true" />
              {isFetching ? "Retrying…" : "Try again"}
            </button>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-3 rounded-(--brc-radius-lg) border border-dashed border-(--brc-border) bg-white px-6 py-14 text-center">
            <span className="mb-1 flex size-13 items-center justify-center rounded-full bg-(--brc-bg-muted) text-(--brc-text-muted)">
              <HandshakeIcon className="size-6.5" aria-hidden="true" />
            </span>
            <p className="m-0 text-base font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
              You haven&apos;t made any offers yet.
            </p>
            <Link
              href="/cars"
              className="text-sm font-bold text-(--brc-primary) no-underline [font-family:var(--brc-font-ui)]"
            >
              Browse cars
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-(--brc-radius-lg) border border-dashed border-(--brc-border) bg-white px-6 py-12 text-center">
            <p className="m-0 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
              {filter === "active"
                ? "No active offers right now."
                : "No closed offers yet."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4.5">
            {filtered.map((offer) => (
              <CustomerOfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
