"use client";

import { Suspense, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BellRingIcon,
  CarFrontIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  CircleIcon,
  CrownIcon,
  HourglassIcon,
  InboxIcon,
  LockKeyholeIcon,
  MessageSquareTextIcon,
  RefreshCwIcon,
  SearchIcon,
  TimerIcon,
} from "lucide-react";

import { useCarRange, useOwnerOffers } from "@/features/offers/api";
import type { OfferStatus, OwnerOffer } from "@/features/offers/api";
import { agreedAmount, formatOfferAmount } from "@/features/offers/lib/offer-format";
import { OfferStatusBadge } from "@/features/offers/components/offer-status-badge";
import { OfferCountdown } from "@/features/offers/components/offer-countdown";
import {
  OwnerRespondSheet,
  offerAmountDelta,
  offerInitials,
} from "@/features/offers/components/owner-respond-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/shared/components";
import { formatRelativeDate } from "@/shared/utils";
import { cn } from "@/lib/utils";

type OfferStage = "needs" | "waiting" | "accepted" | "closed";
type OfferSort = "newest" | "highest" | "expiring";

type VehicleGroup = {
  car: OwnerOffer["car"];
  offers: OwnerOffer[];
  activeOffers: OwnerOffer[];
  pendingCount: number;
  highestActive: number;
  bestOfferId: string | null;
};

const STAGES: { key: OfferStage; label: string }[] = [
  { key: "needs", label: "Needs attention" },
  { key: "waiting", label: "Waiting on buyer" },
  { key: "accepted", label: "Accepted" },
  { key: "closed", label: "Closed" },
];

function effectiveStatus(offer: OwnerOffer): OfferStatus {
  if (offer.is_expired && (offer.status === "pending" || offer.status === "countered")) {
    return "expired";
  }
  return offer.status;
}

function offerStage(offer: OwnerOffer): OfferStage {
  const status = effectiveStatus(offer);
  if (status === "pending") return "needs";
  if (status === "countered") return "waiting";
  if (status === "accepted") return "accepted";
  return "closed";
}

function isActive(offer: OwnerOffer) {
  const status = effectiveStatus(offer);
  return status === "pending" || status === "countered";
}

function sortOffers(offers: OwnerOffer[], sort: OfferSort) {
  return [...offers].sort((a, b) => {
    if (sort === "highest") {
      return Number(agreedAmount(b)) - Number(agreedAmount(a));
    }
    if (sort === "expiring") {
      return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function buildVehicleGroups(offers: OwnerOffer[]): VehicleGroup[] {
  const grouped = new Map<string, OwnerOffer[]>();
  for (const offer of offers) {
    grouped.set(offer.car.id, [...(grouped.get(offer.car.id) ?? []), offer]);
  }

  return Array.from(grouped.values())
    .map((carOffers) => {
      const activeOffers = carOffers.filter(isActive);
      const best = activeOffers.reduce<OwnerOffer | null>((current, offer) => {
        if (!current || Number(agreedAmount(offer)) > Number(agreedAmount(current))) return offer;
        return current;
      }, null);
      return {
        car: carOffers[0]!.car,
        offers: carOffers,
        activeOffers,
        pendingCount: carOffers.filter((offer) => effectiveStatus(offer) === "pending").length,
        highestActive: best ? Number(agreedAmount(best)) : 0,
        bestOfferId: best?.id ?? null,
      };
    })
    .sort((a, b) => {
      const aLatest = Math.max(...a.offers.map((offer) => new Date(offer.created_at).getTime()));
      const bLatest = Math.max(...b.offers.map((offer) => new Date(offer.created_at).getTime()));
      return bLatest - aLatest;
    });
}

function priceDelta(amount: number, asking: number) {
  const difference = amount - asking;
  if (difference === 0) return { text: "At asking price", positive: true };
  return {
    text: `${formatOfferAmount(Math.abs(difference))} ${difference > 0 ? "above" : "below"} asking`,
    positive: difference > 0,
  };
}

function VehicleImage({
  car,
  size,
  className,
}: {
  car: OwnerOffer["car"];
  size: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border border-(--brc-border) bg-(--brc-bg-muted)",
        className,
      )}
    >
      {car.primary_image ? (
        <Image src={car.primary_image} alt={car.title} fill sizes={size} className="object-contain p-2" />
      ) : (
        <div className="flex size-full items-center justify-center text-(--brc-text-muted)">
          <CarFrontIcon className="size-6" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

function Overview({
  offers,
  activeStage,
  onStageChange,
}: {
  offers: OwnerOffer[];
  activeStage: OfferStage;
  onStageChange: (stage: OfferStage) => void;
}) {
  const [currentTime] = useState(() => Date.now());
  const pending = offers.filter((offer) => effectiveStatus(offer) === "pending").length;
  const waiting = offers.filter((offer) => effectiveStatus(offer) === "countered").length;
  const accepted = offers.filter((offer) => effectiveStatus(offer) === "accepted").length;
  const activeOffers = offers.filter(isActive);
  const activeValue = activeOffers.reduce((sum, offer) => sum + Number(agreedAmount(offer)), 0);
  const highest = activeOffers.reduce(
    (highestAmount, offer) => Math.max(highestAmount, Number(agreedAmount(offer))),
    0,
  );
  const expiringSoon = offers.filter((offer) => {
    if (effectiveStatus(offer) !== "pending") return false;
    const remaining = new Date(offer.expires_at).getTime() - currentTime;
    return remaining > 0 && remaining <= 6 * 60 * 60 * 1000;
  }).length;

  const attention =
    expiringSoon > 0
      ? {
          icon: TimerIcon,
          title: `${expiringSoon} offer${expiringSoon === 1 ? " expires" : "s expire"} soon`,
          body: "Review these offers before their response window closes.",
        }
      : pending > 0
        ? {
            icon: BellRingIcon,
            title: `${pending} offer${pending === 1 ? "" : "s"} require your response`,
            body: "Review and respond while these offers are still active.",
          }
        : waiting > 0
          ? {
              icon: HourglassIcon,
              title: "Waiting for buyers to respond",
              body: "Your counter-offers have been sent to the buyers.",
            }
          : {
              icon: CheckCircle2Icon,
              title: "You're all caught up",
              body: accepted
                ? `${accepted} accepted offer${accepted === 1 ? " has" : "s have"} reserved a vehicle.`
                : "No active offers require action right now.",
            };

  const AttentionIcon = attention.icon;
  const metrics: { key: OfferStage; label: string; value: number; hint: string; tone: string }[] = [
    { key: "needs", label: "Pending", value: pending, hint: "awaiting your reply", tone: "text-(--brc-primary)" },
    {
      key: "waiting",
      label: "Waiting on buyer",
      value: waiting,
      hint: "counter-offers out",
      tone: "text-(--brc-warning-ink,#9A7100)",
    },
    { key: "accepted", label: "Accepted", value: accepted, hint: "reserved", tone: "text-(--brc-success)" },
  ];
  const pipelineTotal = pending + waiting + accepted;

  return (
    <section
      aria-label="Negotiation overview"
      className="overflow-hidden rounded-xl border border-(--brc-border) bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <div className="grid lg:grid-cols-[1.05fr_1.1fr_.72fr]">
        <div className="p-5 sm:p-6">
          <div className="mb-3.5 text-[11px] font-extrabold uppercase tracking-[0.09em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            Negotiation overview
          </div>
          <div className="flex items-start gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-(--brc-primary-tint) text-(--brc-primary)">
              <AttentionIcon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold leading-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
                {attention.title}
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                {attention.body}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onStageChange(pending ? "needs" : accepted ? "accepted" : "waiting")}
            className={cn(
              "mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-[13px] font-bold [font-family:var(--brc-font-ui)]",
              pending
                ? "bg-(--brc-primary) text-white hover:bg-(--brc-primary-hover)"
                : "bg-transparent px-1 text-(--brc-primary)",
            )}
          >
            {pending ? "Review pending offers" : accepted ? "View accepted offers" : "View active offers"}
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div
          role="group"
          aria-label="Filter offers by stage"
          className="grid grid-cols-3 border-t border-(--brc-border) lg:border-l lg:border-t-0"
        >
          {metrics.map((metric, index) => (
            <button
              key={metric.key}
              type="button"
              aria-pressed={activeStage === metric.key}
              onClick={() => onStageChange(metric.key)}
              className={cn(
                "min-w-0 px-3 py-5 text-left transition-colors hover:bg-(--brc-bg-muted) sm:px-4 lg:py-6",
                index > 0 && "border-l border-(--brc-border)",
                activeStage === metric.key && "bg-(--brc-primary-tint)",
              )}
            >
              <div
                className={cn(
                  "text-[28px] font-extrabold tabular-nums leading-none [font-family:var(--brc-font-display)] sm:text-3xl",
                  metric.tone,
                )}
              >
                {metric.value}
              </div>
              <div className="mt-2 text-xs font-bold text-(--brc-text) [font-family:var(--brc-font-ui)] sm:text-[13px]">
                {metric.label}
              </div>
              <div className="mt-0.5 hidden text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)] sm:block">
                {metric.hint}
              </div>
            </button>
          ))}
        </div>

        <div className="border-t border-(--brc-border) p-5 sm:p-6 lg:border-l lg:border-t-0">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.09em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            Active offer value
          </div>
          <div className="mt-2 text-[26px] font-extrabold tabular-nums leading-none text-(--brc-text) [font-family:var(--brc-font-display)]">
            {formatOfferAmount(activeValue)}
          </div>
          <div className="mt-1.5 text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            {activeOffers.length
              ? `Across ${activeOffers.length} active negotiation${activeOffers.length === 1 ? "" : "s"}`
              : "No active negotiations"}
          </div>
          {highest > 0 ? (
            <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-(--brc-border) pt-3">
              <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Highest active</span>
              <span className="text-[13px] font-extrabold tabular-nums text-(--brc-text) [font-family:var(--brc-font-ui)]">
                {formatOfferAmount(highest)}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-(--brc-border) px-5 py-4 sm:px-6">
        {pipelineTotal > 0 ? (
          <>
            <div className="flex h-1.5 gap-1 overflow-hidden rounded-full bg-(--brc-bg-muted)">
              {pending > 0 ? <span style={{ flex: pending }} className="rounded-full bg-(--brc-primary)" /> : null}
              {waiting > 0 ? <span style={{ flex: waiting }} className="rounded-full bg-(--brc-warning)" /> : null}
              {accepted > 0 ? <span style={{ flex: accepted }} className="rounded-full bg-(--brc-success)" /> : null}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
              <span className="inline-flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-(--brc-primary)" />
                <b className="text-(--brc-text)">{pending}</b> New offers
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-(--brc-warning)" />
                <b className="text-(--brc-text)">{waiting}</b> Countered
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-(--brc-success)" />
                <b className="text-(--brc-text)">{accepted}</b> Accepted
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <span className="h-1.5 flex-1 rounded-full bg-(--brc-bg-muted)" />
            <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              No offers in the pipeline yet
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function VehicleRail({
  groups,
  selectedId,
  onSelect,
}: {
  groups: VehicleGroup[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="min-w-0 lg:sticky lg:top-24">
      <div className="mb-2 hidden px-1 text-[11px] font-bold uppercase tracking-[0.05em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)] lg:block">
        Your vehicles
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {groups.map((group) => {
          const selected = group.car.id === selectedId;
          return (
            <button
              key={group.car.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(group.car.id)}
              className={cn(
                "relative flex w-[232px] shrink-0 items-center gap-2.5 overflow-hidden rounded-[14px] border bg-white p-3 text-left transition-colors lg:w-full",
                selected
                  ? "border-(--brc-primary) bg-(--brc-primary-tint)"
                  : "border-(--brc-border) hover:border-(--brc-border-strong)",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-y-3.5 left-0 w-[3px] rounded-r",
                  selected ? "bg-(--brc-primary)" : "bg-transparent",
                )}
              />
              <VehicleImage car={group.car} size="52px" className="size-[52px] rounded-[10px]" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                    {group.car.title}
                  </span>
                  {group.pendingCount > 0 ? (
                    <i className="size-2 shrink-0 rounded-full bg-(--brc-accent)" title="Needs your response" />
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  Asking {formatOfferAmount(group.car.sale_price)}
                </span>
                <span className="mt-1.5 flex items-center gap-1.5 text-[11px] [font-family:var(--brc-font-ui)]">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 font-bold",
                      group.pendingCount ? "text-(--brc-primary)" : "text-(--brc-text-muted)",
                    )}
                  >
                    <CircleIcon className="size-1.5 fill-current" aria-hidden="true" />
                    {group.activeOffers.length} active
                  </span>
                  {group.highestActive > 0 ? (
                    <>
                      <span className="text-(--brc-text-muted)">·</span>
                      <span className="font-semibold text-(--brc-text-secondary)">
                        high {formatOfferAmount(group.highestActive)}
                      </span>
                    </>
                  ) : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function VehicleSummary({ group }: { group: VehicleGroup }) {
  const { data: range } = useCarRange(group.car.id, { enabled: Boolean(group.car.id) });
  const asking = Number(group.car.sale_price);
  const delta = group.highestActive ? priceDelta(group.highestActive, asking) : null;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-(--brc-border) bg-white p-4 sm:flex-row sm:p-[18px]">
      <VehicleImage car={group.car} size="168px" className="aspect-[16/10] w-full rounded-xl sm:w-[168px]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold leading-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
              {group.car.title}
            </h2>
            <p className="mt-1 text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              Negotiable sale listing
            </p>
          </div>
          <Link
            href={`/owner/my-cars/${group.car.id}`}
            className="inline-flex shrink-0 items-center gap-1.5 pt-0.5 text-xs font-bold text-(--brc-primary) [font-family:var(--brc-font-ui)]"
          >
            <span className="hidden sm:inline">Open car page</span>
            <ArrowUpRightIcon className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-7">
          <SummaryMetric label="Asking" value={formatOfferAmount(group.car.sale_price)} />
          <SummaryMetric
            label="Highest offer"
            value={group.highestActive ? formatOfferAmount(group.highestActive) : "—"}
          />
          <SummaryMetric
            label="Vs asking"
            value={delta?.text ?? "No active offers"}
            className={delta?.positive ? "text-(--brc-success)" : "text-(--brc-text-secondary)"}
            compact
          />
          <SummaryMetric label="Active offers" value={String(group.activeOffers.length)} />
        </div>

        {range && (range.min_price || range.max_price) ? (
          <div className="mt-4 inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-[10px] border border-(--brc-primary)/15 bg-(--brc-primary-tint) px-3 py-2 text-(--brc-primary)">
            <LockKeyholeIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="text-xs font-bold tabular-nums [font-family:var(--brc-font-ui)]">
              {formatOfferAmount(range.min_price, range.currency)} –{" "}
              {formatOfferAmount(range.max_price, range.currency)}
            </span>
            <span className="text-[11px] [font-family:var(--brc-font-ui)]">Private range, visible only to you</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SummaryMetric({
  label,
  value,
  className,
  compact,
}: {
  label: string;
  value: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.04em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-extrabold tabular-nums text-(--brc-text) [font-family:var(--brc-font-ui)]",
          compact ? "text-xs sm:text-sm" : "text-base",
          className,
        )}
      >
        {value}
      </div>
    </div>
  );
}

function OfferRow({
  offer,
  highest,
  onOpen,
}: {
  offer: OwnerOffer;
  highest: boolean;
  onOpen: () => void;
}) {
  const status = effectiveStatus(offer);
  const delta = offerAmountDelta(offer);
  const closed = offerStage(offer) === "closed";
  const pending = status === "pending";
  const countered = status === "countered";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] border bg-white p-3.5 text-left transition-[border-color,box-shadow] hover:shadow-[0_6px_18px_rgba(0,0,0,.05)] sm:grid-cols-[auto_minmax(150px,1fr)_minmax(150px,auto)_minmax(110px,auto)_auto] sm:p-4",
        highest ? "border-(--brc-accent)" : "border-(--brc-border)",
        closed && "opacity-70",
      )}
    >
      <span
        className={cn(
          "flex size-11 items-center justify-center rounded-full text-sm font-extrabold [font-family:var(--brc-font-ui)]",
          closed
            ? "bg-(--brc-bg-muted) text-(--brc-text-muted)"
            : "bg-(--brc-primary-tint) text-(--brc-primary)",
        )}
      >
        {offerInitials(offer)}
      </span>

      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)] sm:text-[15px]">
            {offer.customer.first_name} {offer.customer.last_name}
          </span>
          {highest ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-(--brc-accent-bg) px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-(--brc-accent) sm:px-2">
              <CrownIcon className="size-2.5 fill-current" aria-hidden="true" />
              <span className="hidden sm:inline">Highest</span>
            </span>
          ) : null}
          {offer.message ? (
            <MessageSquareTextIcon
              className="size-3.5 shrink-0 fill-(--brc-text-muted) text-(--brc-text-muted)"
              aria-label="Buyer left a message"
            />
          ) : null}
        </span>
        <span className="mt-0.5 block text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          {formatRelativeDate(offer.created_at)}
        </span>
      </span>

      <span className="text-right">
        <span className="block text-base font-extrabold tabular-nums text-(--brc-text) [font-family:var(--brc-font-display)] sm:text-lg">
          {formatOfferAmount(agreedAmount(offer), offer.currency)}
        </span>
        <span
          className={cn(
            "mt-0.5 hidden text-[11px] font-semibold [font-family:var(--brc-font-ui)] sm:block",
            delta.tone === "success" ? "text-(--brc-success)" : "text-(--brc-text-muted)",
          )}
        >
          {delta.text}
        </span>
      </span>

      <span className="col-span-2 flex items-center gap-3 border-t border-(--brc-border) pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
        <OfferStatusBadge status={status} />
        {pending ? <OfferCountdown expiresAt={offer.expires_at} isExpired={offer.is_expired} /> : null}
      </span>

      <span className="flex justify-end border-t border-(--brc-border) pt-3 sm:border-0 sm:pt-0">
        {countered ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-(--brc-warning-ink,#9A7100) [font-family:var(--brc-font-ui)]">
            <HourglassIcon className="size-3.5" aria-hidden="true" />
            Awaiting buyer
          </span>
        ) : (
          <span
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold [font-family:var(--brc-font-ui)]",
              pending
                ? "border-(--brc-primary) bg-(--brc-primary) text-white"
                : "border-(--brc-border) bg-white text-(--brc-text-secondary)",
            )}
          >
            {pending ? "Review" : "View"}
            <ArrowRightIcon className="size-3.5" aria-hidden="true" />
          </span>
        )}
      </span>
    </button>
  );
}

function OffersWorkspaceSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-full max-w-sm rounded-lg" />
      <Skeleton className="h-[230px] w-full rounded-xl lg:h-[190px]" />
      <div className="grid gap-6 lg:grid-cols-[272px_minmax(0,1fr)]">
        <div className="flex gap-3 overflow-hidden lg:flex-col">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[78px] w-[232px] shrink-0 rounded-[14px] lg:w-full" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-[180px] w-full rounded-2xl" />
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[86px] w-full rounded-[14px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

function OwnerOffersContent() {
  const searchParams = useSearchParams();
  const requestedCarId = searchParams.get("car");
  const { data, isLoading, isError, refetch } = useOwnerOffers();
  const offers = useMemo(() => data?.results ?? [], [data?.results]);
  const groups = useMemo(() => buildVehicleGroups(offers), [offers]);

  const [selectedCarId, setSelectedCarId] = useState<string | null>(requestedCarId);
  const [stage, setStage] = useState<OfferStage>("needs");
  const [sort, setSort] = useState<OfferSort>("newest");
  const [search, setSearch] = useState("");
  const [activeOffer, setActiveOffer] = useState<OwnerOffer | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const resolvedCarId =
    groups.find((group) => group.car.id === selectedCarId)?.car.id ??
    groups.find((group) => group.car.id === requestedCarId)?.car.id ??
    groups.find((group) => group.offers.some((offer) => offerStage(offer) === stage))?.car.id ??
    groups[0]?.car.id ??
    "";
  const selectedGroup = groups.find((group) => group.car.id === resolvedCarId);

  const visibleOffers = useMemo(() => {
    if (!selectedGroup) return [];
    const query = search.trim().toLowerCase();
    return sortOffers(
      selectedGroup.offers.filter((offer) => {
        if (offerStage(offer) !== stage) return false;
        if (!query) return true;
        return `${offer.customer.first_name} ${offer.customer.last_name}`.toLowerCase().includes(query);
      }),
      sort,
    );
  }, [search, selectedGroup, sort, stage]);

  const stageCounts = useMemo(() => {
    const counts: Record<OfferStage, number> = { needs: 0, waiting: 0, accepted: 0, closed: 0 };
    for (const offer of selectedGroup?.offers ?? []) counts[offerStage(offer)] += 1;
    return counts;
  }, [selectedGroup]);

  function openOffer(offer: OwnerOffer) {
    setActiveOffer(offer);
    setSheetOpen(true);
  }

  function changeStage(nextStage: OfferStage) {
    setStage(nextStage);
    const currentGroup = groups.find((group) => group.car.id === resolvedCarId);
    if (currentGroup?.offers.some((offer) => offerStage(offer) === nextStage)) return;
    const relevantGroup = groups.find((group) =>
      group.offers.some((offer) => offerStage(offer) === nextStage),
    );
    if (relevantGroup) setSelectedCarId(relevantGroup.car.id);
  }

  return (
    <div className="min-h-[calc(100vh-84px)] bg-(--brc-bg-subtle)">
      <div className="mx-auto w-full max-w-[1408px] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        {isLoading ? (
          <OffersWorkspaceSkeleton />
        ) : isError ? (
          <div className="mx-auto mt-12 flex max-w-md flex-col items-center rounded-2xl border border-(--brc-border) bg-white px-8 py-12 text-center">
            <RefreshCwIcon className="size-9 text-(--brc-danger)" aria-hidden="true" />
            <h1 className="mt-4 text-xl font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">
              Couldn&apos;t load your offers
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
              Something went wrong reaching the offers service. Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-(--brc-primary) px-5 text-sm font-bold text-white [font-family:var(--brc-font-ui)]"
            >
              <RefreshCwIcon className="size-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        ) : offers.length === 0 ? (
          <div className="mx-auto mt-12 flex max-w-lg flex-col items-center rounded-2xl border border-(--brc-border) bg-white px-8 py-14 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-(--brc-primary-tint) text-(--brc-primary)">
              <InboxIcon className="size-8" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-2xl font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">
              No offers yet
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
              Buyer offers will appear here when someone bids on one of your negotiable listings.
            </p>
            <Link
              href="/owner/my-cars"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-(--brc-primary) px-5 text-sm font-bold text-white [font-family:var(--brc-font-ui)]"
            >
              <CarFrontIcon className="size-4" aria-hidden="true" />
              View your listings
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-[30px] font-extrabold leading-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
                  Offers
                </h1>
                <p
                  className={cn(
                    "mt-1 text-sm font-semibold [font-family:var(--brc-font-ui)]",
                    offers.some((offer) => effectiveStatus(offer) === "pending")
                      ? "text-(--brc-accent)"
                      : "text-(--brc-text-muted)",
                  )}
                >
                  {offers.filter((offer) => effectiveStatus(offer) === "pending").length > 0
                    ? `${offers.filter((offer) => effectiveStatus(offer) === "pending").length} offer${
                        offers.filter((offer) => effectiveStatus(offer) === "pending").length === 1 ? "" : "s"
                      } require your decision.`
                    : "You're all caught up."}
                </p>
              </div>
              <div className="flex gap-2.5">
                <label className="relative min-w-0 flex-1 sm:w-[190px] sm:flex-none">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-(--brc-text-muted)" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search buyers"
                    aria-label="Search buyers"
                    className="h-10 w-full rounded-lg border border-(--brc-border) bg-white pl-9 pr-3 text-[13px] text-(--brc-text) outline-none focus:border-(--brc-primary) focus:ring-2 focus:ring-(--brc-primary)/15 [font-family:var(--brc-font-ui)]"
                  />
                </label>
                <label className="relative shrink-0">
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as OfferSort)}
                    aria-label="Sort offers"
                    className="h-10 appearance-none rounded-lg border border-(--brc-border) bg-white pl-3 pr-9 text-[13px] font-semibold text-(--brc-text) outline-none focus:border-(--brc-primary) [font-family:var(--brc-font-ui)]"
                  >
                    <option value="newest">Newest first</option>
                    <option value="highest">Highest amount</option>
                    <option value="expiring">Expiring soonest</option>
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-(--brc-text-muted)" />
                </label>
              </div>
            </header>

            <Overview offers={offers} activeStage={stage} onStageChange={changeStage} />

            {selectedGroup ? (
              <div className="grid items-start gap-6 lg:grid-cols-[272px_minmax(0,1fr)]">
                <VehicleRail groups={groups} selectedId={resolvedCarId} onSelect={setSelectedCarId} />
                <main className="min-w-0">
                  <VehicleSummary group={selectedGroup} />

                  <div className="mt-5 overflow-x-auto border-b border-(--brc-border)">
                    <div className="flex min-w-max gap-1">
                      {STAGES.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          aria-pressed={stage === item.key}
                          onClick={() => changeStage(item.key)}
                          className={cn(
                            "-mb-px inline-flex h-11 items-center gap-2 border-b-2 px-3 text-[13px] font-bold [font-family:var(--brc-font-ui)]",
                            stage === item.key
                              ? "border-(--brc-primary) text-(--brc-primary)"
                              : "border-transparent text-(--brc-text-muted)",
                          )}
                        >
                          {item.label}
                          <span
                            className={cn(
                              "flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-extrabold",
                              stage === item.key
                                ? "bg-(--brc-primary) text-white"
                                : "bg-(--brc-bg-muted) text-(--brc-text-muted)",
                            )}
                          >
                            {stageCounts[item.key]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="my-3.5 flex items-center justify-between gap-3">
                    <label className="relative lg:hidden">
                      <select
                        value={resolvedCarId}
                        onChange={(event) => setSelectedCarId(event.target.value)}
                        aria-label="Filter by vehicle"
                        className="h-9 max-w-[220px] appearance-none rounded-lg border border-(--brc-border) bg-white pl-3 pr-8 text-xs font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]"
                      >
                        {groups.map((group) => (
                          <option key={group.car.id} value={group.car.id}>
                            {group.car.title}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-(--brc-text-muted)" />
                    </label>
                    <span className="ml-auto text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      {visibleOffers.length} offer{visibleOffers.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {visibleOffers.length ? (
                    <div className="space-y-2.5">
                      {visibleOffers.map((offer) => (
                        <OfferRow
                          key={offer.id}
                          offer={offer}
                          highest={offer.id === selectedGroup.bestOfferId && isActive(offer)}
                          onOpen={() => openOffer(offer)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-(--brc-border) bg-white px-6 py-12 text-center">
                      <InboxIcon className="mx-auto size-7 text-(--brc-text-muted)" aria-hidden="true" />
                      <h3 className="mt-3 text-base font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                        {search ? "No matching buyers" : `No ${STAGES.find((item) => item.key === stage)?.label.toLowerCase()} offers`}
                      </h3>
                      <p className="mx-auto mt-1 max-w-sm text-[13px] text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                        {search
                          ? `No offers match "${search}". Try another buyer name.`
                          : "Offers will appear here as this negotiation progresses."}
                      </p>
                    </div>
                  )}
                </main>
              </div>
            ) : null}
          </div>
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
      <Suspense fallback={<div className="min-h-[70vh] bg-(--brc-bg-subtle)" />}>
        <OwnerOffersContent />
      </Suspense>
    </>
  );
}
