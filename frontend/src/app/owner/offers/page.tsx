"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  BadgeCheckIcon,
  CarIcon,
  HandshakeIcon,
  HourglassIcon,
  InboxIcon,
  MessageSquareTextIcon,
  RefreshCwIcon,
  WalletIcon,
} from "lucide-react";

import { useOwnerOffers } from "@/features/offers/api";
import type { OfferStatus, OwnerOffer } from "@/features/offers/api";
import { agreedAmount, formatOfferAmount, isActiveOfferStatus } from "@/features/offers/lib/offer-format";
import { OfferStatusBadge } from "@/features/offers/components/offer-status-badge";
import { OfferCountdown } from "@/features/offers/components/offer-countdown";
import {
  OwnerRespondSheet,
  offerAmountDelta,
  offerInitials,
} from "@/features/offers/components/owner-respond-sheet";
import {
  OwnerOfferFilterBar,
  OwnerOfferMobileFilters,
  type OwnerCarOption,
  type OwnerOfferSort,
} from "@/features/offers/components/owner-offer-filters";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/shared/components";
import { formatRelativeDate } from "@/shared/utils";
import { cn } from "@/lib/utils";

type OwnerOfferGroup = {
  car: OwnerOffer["car"];
  offers: OwnerOffer[];
  bestOfferId: string | null;
};

function sortOffers(offers: OwnerOffer[], sort: OwnerOfferSort): OwnerOffer[] {
  const copy = [...offers];
  switch (sort) {
    case "highest":
      copy.sort((a, b) => Number(agreedAmount(b)) - Number(agreedAmount(a)));
      break;
    case "expiring":
      copy.sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
      break;
    default:
      copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  return copy;
}

/** Owners think per vehicle, so offers are grouped by car rather than a flat list. */
function groupByCar(offers: OwnerOffer[], sort: OwnerOfferSort): OwnerOfferGroup[] {
  const map = new Map<string, OwnerOffer[]>();
  for (const offer of offers) {
    const list = map.get(offer.car.id) ?? [];
    list.push(offer);
    map.set(offer.car.id, list);
  }

  const groups: OwnerOfferGroup[] = [];
  for (const carOffers of map.values()) {
    if (carOffers.length === 0) continue;
    const car = carOffers[0]!.car;
    const activeOffers = carOffers.filter((o) => isActiveOfferStatus(o.status));
    let bestOfferId: string | null = null;
    let bestAmount = -Infinity;
    for (const o of activeOffers) {
      const amount = Number(agreedAmount(o));
      if (amount > bestAmount) {
        bestAmount = amount;
        bestOfferId = o.id;
      }
    }
    groups.push({ car, offers: sortOffers(carOffers, sort), bestOfferId });
  }

  groups.sort((a, b) => {
    const aMax = Math.max(...a.offers.map((o) => new Date(o.created_at).getTime()));
    const bMax = Math.max(...b.offers.map((o) => new Date(o.created_at).getTime()));
    return bMax - aMax;
  });
  return groups;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);
  return reduced;
}

/** Eases a number up from 0 to `target` once, then tracks target directly. */
function useCountUp(target: number, reducedMotion: boolean): number {
  const [value, setValue] = useState(reducedMotion ? target : 0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (reducedMotion || hasAnimated.current) {
      const id = window.setTimeout(() => setValue(target), 0);
      return () => window.clearTimeout(id);
    }
    hasAnimated.current = true;
    const start = performance.now();
    const duration = 700;
    let raf = 0;
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reducedMotion]);

  return value;
}

type StatTone = "primary" | "warning" | "success" | "accent";

const STAT_TONE_CLASSES: Record<StatTone, { border: string; iconBg: string; iconText: string }> = {
  primary: { border: "border-(--brc-primary)", iconBg: "bg-(--brc-primary-tint)", iconText: "text-(--brc-primary)" },
  warning: { border: "border-(--brc-warning)", iconBg: "bg-(--brc-warning-bg)", iconText: "text-(--brc-warning-ink,#B38601)" },
  success: { border: "border-(--brc-success)", iconBg: "bg-(--brc-success-bg)", iconText: "text-(--brc-success)" },
  accent: { border: "border-(--brc-accent-bright)", iconBg: "bg-(--brc-accent-bright)/10", iconText: "text-(--brc-accent-bright)" },
};

function StatCard({
  label,
  value,
  sub,
  tone,
  icon: IconCmp,
  reducedMotion,
  isMoney,
}: {
  label: string;
  value: number;
  sub: string;
  tone: StatTone;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  reducedMotion: boolean;
  isMoney?: boolean;
}) {
  const displayValue = useCountUp(value, reducedMotion);
  const classes = STAT_TONE_CLASSES[tone];
  return (
    <div className={cn("flex flex-col gap-2.5 rounded-2xl border bg-white p-4.5", classes.border)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
          {label}
        </span>
        <span className={cn("flex size-[30px] items-center justify-center rounded-lg", classes.iconBg, classes.iconText)}>
          <IconCmp className="size-4" aria-hidden />
        </span>
      </div>
      <div className="text-[28px] font-extrabold tabular-nums text-(--brc-text) [font-family:var(--brc-font-display)] sm:text-[30px]">
        {isMoney ? formatOfferAmount(displayValue) : displayValue.toLocaleString("en-NG")}
      </div>
      <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{sub}</span>
    </div>
  );
}

function BestOfferBadge() {
  return (
    <span className="relative inline-flex shrink-0 items-center gap-1 overflow-hidden rounded-full bg-(--brc-accent-bright) px-2.5 py-1 text-[11px] font-bold text-white [font-family:var(--brc-font-ui)]">
      <BadgeCheckIcon className="size-3" aria-hidden="true" />
      Best offer
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-[45%] bg-gradient-to-r from-transparent via-white/60 to-transparent motion-safe:animate-[owner-best-sheen_1.3s_ease_.3s_1]"
      />
    </span>
  );
}

function OfferActionSlot({ offer, onRespond }: { offer: OwnerOffer; onRespond: () => void }) {
  if (offer.status === "countered") {
    return (
      <span
        title="The buyer is reviewing your counter — the ball is in their court."
        className="inline-flex h-10 shrink-0 cursor-default items-center gap-1.5 rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-3.5 text-[13px] font-bold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]"
      >
        <HourglassIcon className="size-3.5" aria-hidden="true" />
        Awaiting buyer
      </span>
    );
  }
  if (offer.status === "pending" && !offer.is_expired) {
    return (
      <button
        type="button"
        onClick={onRespond}
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border-none bg-(--brc-primary) px-4 text-[13px] font-bold text-white [font-family:var(--brc-font-ui)]"
      >
        <MessageSquareTextIcon className="size-3.5" aria-hidden="true" />
        Respond
      </button>
    );
  }
  return null;
}

function DesktopOfferRow({
  offer,
  isBest,
  onRespond,
}: {
  offer: OwnerOffer;
  isBest: boolean;
  onRespond: () => void;
}) {
  const delta = offerAmountDelta(offer);
  return (
    <div className="grid grid-cols-[1.4fr_1.3fr_auto] items-center gap-5 border-t border-(--brc-border) p-4.5">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar size="lg" className="shrink-0">
          <AvatarFallback className="bg-(--brc-primary-tint) font-bold text-(--brc-primary)">
            {offerInitials(offer)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
            {offer.customer.first_name} {offer.customer.last_name}
          </div>
          <div className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            {formatRelativeDate(offer.created_at)}
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xl font-bold tabular-nums text-(--brc-text) [font-family:var(--brc-font-ui)]">
            {formatOfferAmount(agreedAmount(offer), offer.currency)}
          </span>
          {isBest ? <BestOfferBadge /> : null}
        </div>
        <div
          className={cn(
            "mt-0.5 text-xs [font-family:var(--brc-font-ui)]",
            delta.tone === "success" ? "text-(--brc-success)" : "text-(--brc-text-muted)",
          )}
        >
          {delta.text}
        </div>
      </div>

      <div className="flex items-center gap-4 justify-self-end">
        <OfferCountdown expiresAt={offer.expires_at} isExpired={offer.is_expired} />
        <OfferStatusBadge status={offer.status} />
        <OfferActionSlot offer={offer} onRespond={onRespond} />
      </div>
    </div>
  );
}

function MobileOfferCard({
  offer,
  isBest,
  onRespond,
}: {
  offer: OwnerOffer;
  isBest: boolean;
  onRespond: () => void;
}) {
  const delta = offerAmountDelta(offer);
  return (
    <div className="rounded-2xl border border-(--brc-border) bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[22px] font-bold tabular-nums text-(--brc-text) [font-family:var(--brc-font-ui)]">
              {formatOfferAmount(agreedAmount(offer), offer.currency)}
            </span>
            {isBest ? <BestOfferBadge /> : null}
          </div>
          <div
            className={cn(
              "mt-0.5 text-xs [font-family:var(--brc-font-ui)]",
              delta.tone === "success" ? "text-(--brc-success)" : "text-(--brc-text-muted)",
            )}
          >
            {delta.text}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <OfferCountdown expiresAt={offer.expires_at} isExpired={offer.is_expired} />
          <OfferStatusBadge status={offer.status} />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2.5 border-t border-(--brc-border) pt-3">
        <Avatar size="default" className="shrink-0">
          <AvatarFallback className="bg-(--brc-primary-tint) text-xs font-bold text-(--brc-primary)">
            {offerInitials(offer)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
            {offer.customer.first_name} {offer.customer.last_name}
          </div>
          <div className="text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            {formatRelativeDate(offer.created_at)}
          </div>
        </div>
      </div>

      <div className="mt-3">
        {offer.status === "countered" ? (
          <div className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) text-[13px] font-bold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            <HourglassIcon className="size-3.5" aria-hidden="true" />
            Awaiting buyer
          </div>
        ) : offer.status === "pending" && !offer.is_expired ? (
          <button
            type="button"
            onClick={onRespond}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border-none bg-(--brc-primary) text-[13px] font-bold text-white [font-family:var(--brc-font-ui)]"
          >
            <MessageSquareTextIcon className="size-3.5" aria-hidden="true" />
            Respond
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CarGroupHeader({ car, count }: { car: OwnerOffer["car"]; count: number }) {
  return (
    <div className="flex items-center gap-3.5">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-(--brc-border) bg-white">
        {car.primary_image ? (
          <Image src={car.primary_image} alt={car.title} fill sizes="48px" className="object-contain p-1" />
        ) : (
          <div className="flex size-full items-center justify-center text-(--brc-text-muted)">
            <CarIcon className="size-5" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
          {car.title}
        </div>
        <div className="text-[13px] tabular-nums text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
          Asking {formatOfferAmount(car.sale_price)}
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-(--brc-primary-tint) px-3 py-1 text-xs font-bold text-(--brc-primary) [font-family:var(--brc-font-ui)]">
        {count} offer{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function StatStripSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[110px] w-full rounded-2xl" />
      ))}
    </div>
  );
}

function OffersSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-9 w-44 rounded-lg" />
      <StatStripSkeleton />
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="flex flex-col gap-5">
        {Array.from({ length: 2 }).map((_, gi) => (
          <div key={gi} className="overflow-hidden rounded-2xl border border-(--brc-border)">
            <div className="h-[76px] border-b border-(--brc-border) bg-(--brc-bg-subtle)" />
            {Array.from({ length: 3 }).map((_, ri) => (
              <div key={ri} className="grid grid-cols-[1.4fr_1.3fr_auto] items-center gap-5 border-t border-(--brc-border) p-4.5">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
                <Skeleton className="h-10 w-[120px] justify-self-end rounded-lg" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function OwnerOffersContent() {
  const searchParams = useSearchParams();
  const initialCar = searchParams.get("car");

  const { data, isLoading, isError, refetch } = useOwnerOffers();
  const offers = useMemo(() => data?.results ?? [], [data?.results]);

  const [carId, setCarId] = useState<string | null>(initialCar);
  const [status, setStatus] = useState<OfferStatus | null>(null);
  const [sort, setSort] = useState<OwnerOfferSort>("newest");
  const [activeOffer, setActiveOffer] = useState<OwnerOffer | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const reducedMotion = usePrefersReducedMotion();

  const cars: OwnerCarOption[] = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of offers) map.set(o.car.id, o.car.title);
    return Array.from(map, ([id, title]) => ({ id, title })).sort((a, b) =>
      a.title.localeCompare(b.title),
    );
  }, [offers]);

  const pendingActionable = useMemo(
    () => offers.filter((o) => o.status === "pending" && !o.is_expired).length,
    [offers],
  );
  const counteredCount = useMemo(() => offers.filter((o) => o.status === "countered").length, [offers]);
  const acceptedCount = useMemo(() => offers.filter((o) => o.status === "accepted").length, [offers]);
  const totalLiveValue = useMemo(
    () =>
      offers
        .filter((o) => isActiveOfferStatus(o.status))
        .reduce((sum, o) => sum + Number(agreedAmount(o)), 0),
    [offers],
  );

  const filteredOffers = useMemo(() => {
    return offers.filter((o) => {
      if (carId && o.car.id !== carId) return false;
      if (status && o.status !== status) return false;
      return true;
    });
  }, [offers, carId, status]);

  const groups = useMemo(() => groupByCar(filteredOffers, sort), [filteredOffers, sort]);
  const hasFilters = Boolean(carId || status);

  function openRespond(offer: OwnerOffer) {
    setActiveOffer(offer);
    setSheetOpen(true);
  }

  function clearAll() {
    setCarId(null);
    setStatus(null);
  }

  return (
    <div style={{ background: "var(--brc-bg-subtle)" }}>
      <style>{`
        @keyframes owner-best-sheen { from { transform: translateX(-130%); } to { transform: translateX(260%); } }
      `}</style>
      <div
        style={{
          maxWidth: 1232,
          margin: "0 auto",
          width: "100%",
          padding: "clamp(24px, 5vw, 40px) clamp(20px, 8vw, 104px) 64px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {isLoading ? (
          <OffersSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-(--brc-border) bg-white py-16 text-center">
            <span className="text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
              Couldn&apos;t load offers.
            </span>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-(--brc-border) bg-white px-4 py-2 text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]"
            >
              <RefreshCwIcon className="size-3.5" aria-hidden="true" />
              Retry
            </button>
          </div>
        ) : (
          <>
            <div>
              <h1
                style={{
                  fontFamily: "var(--brc-font-display)",
                  fontWeight: 800,
                  fontSize: "clamp(28px, 6vw, 32px)",
                  color: "var(--brc-text)",
                  margin: "0 0 4px",
                }}
              >
                Offers
              </h1>
              <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 15, color: "var(--brc-text-secondary)", margin: 0 }}>
                {pendingActionable > 0
                  ? `${pendingActionable} offer${pendingActionable === 1 ? "" : "s"} awaiting your response.`
                  : "You're all caught up."}
              </p>
            </div>

            <div className="hidden grid-cols-4 gap-4 sm:grid">
              <StatCard label="Pending" value={pendingActionable} sub="Need your response" tone="primary" icon={HourglassIcon} reducedMotion={reducedMotion} />
              <StatCard label="Countered" value={counteredCount} sub="Waiting on buyer" tone="warning" icon={MessageSquareTextIcon} reducedMotion={reducedMotion} />
              <StatCard label="Accepted" value={acceptedCount} sub="Reserved vehicles" tone="success" icon={HandshakeIcon} reducedMotion={reducedMotion} />
              <StatCard label="Live offer value" value={totalLiveValue} sub="Pending + countered" tone="accent" icon={WalletIcon} reducedMotion={reducedMotion} isMoney />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 sm:hidden">
              <div className="min-w-[130px] flex-none">
                <StatCard label="Pending" value={pendingActionable} sub="Need your response" tone="primary" icon={HourglassIcon} reducedMotion={reducedMotion} />
              </div>
              <div className="min-w-[130px] flex-none">
                <StatCard label="Countered" value={counteredCount} sub="Waiting on buyer" tone="warning" icon={MessageSquareTextIcon} reducedMotion={reducedMotion} />
              </div>
              <div className="min-w-[130px] flex-none">
                <StatCard label="Accepted" value={acceptedCount} sub="Reserved vehicles" tone="success" icon={HandshakeIcon} reducedMotion={reducedMotion} />
              </div>
              <div className="min-w-[150px] flex-none">
                <StatCard label="Live offer value" value={totalLiveValue} sub="Pending + countered" tone="accent" icon={WalletIcon} reducedMotion={reducedMotion} isMoney />
              </div>
            </div>

            <OwnerOfferMobileFilters
              cars={cars}
              carId={carId}
              status={status}
              sort={sort}
              onCarChange={setCarId}
              onStatusChange={setStatus}
              onSortChange={setSort}
              onClearAll={clearAll}
            />
            <OwnerOfferFilterBar
              cars={cars}
              carId={carId}
              status={status}
              sort={sort}
              onCarChange={setCarId}
              onStatusChange={setStatus}
              onSortChange={setSort}
              onClearAll={clearAll}
            />

            {groups.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-(--brc-border) bg-white py-16 text-center">
                <span className="flex size-[52px] items-center justify-center rounded-full bg-(--brc-bg-subtle) text-(--brc-text-muted)">
                  <InboxIcon className="size-6" aria-hidden="true" />
                </span>
                <div className="text-base font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                  {hasFilters ? "No offers match these filters" : "No offers yet"}
                </div>
                <p className="max-w-[360px] text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                  {hasFilters
                    ? "Try a different car or status."
                    : "Offers appear here when buyers bid on your negotiable listings."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {groups.map((group) => (
                  <div key={group.car.id}>
                    {/* Desktop grouped card */}
                    <div className="hidden overflow-hidden rounded-2xl border border-(--brc-border) bg-white md:block">
                      <div className="border-b border-(--brc-border) bg-(--brc-bg-subtle) p-4.5">
                        <CarGroupHeader car={group.car} count={group.offers.length} />
                      </div>
                      <div className="flex flex-col">
                        {group.offers.map((offer) => (
                          <DesktopOfferRow
                            key={offer.id}
                            offer={offer}
                            isBest={offer.id === group.bestOfferId}
                            onRespond={() => openRespond(offer)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Mobile grouped list */}
                    <div className="md:hidden">
                      <div className="mb-2.5">
                        <CarGroupHeader car={group.car} count={group.offers.length} />
                      </div>
                      <div className="flex flex-col gap-3">
                        {group.offers.map((offer) => (
                          <MobileOfferCard
                            key={offer.id}
                            offer={offer}
                            isBest={offer.id === group.bestOfferId}
                            onRespond={() => openRespond(offer)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <OwnerRespondSheet offer={activeOffer} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}

export default function OwnerOffersPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard", href: "/owner/dashboard" }, { label: "Offers" }]} />
      <Suspense fallback={<div style={{ background: "var(--brc-bg-subtle)", minHeight: "60vh" }} />}>
        <OwnerOffersContent />
      </Suspense>
    </>
  );
}
