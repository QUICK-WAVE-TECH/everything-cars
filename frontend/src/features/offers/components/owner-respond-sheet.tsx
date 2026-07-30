"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowLeftRightIcon,
  CarFrontIcon,
  CheckCircle2Icon,
  Clock3Icon,
  FileTextIcon,
  HourglassIcon,
  LockKeyholeIcon,
  MessageSquareTextIcon,
  PhoneIcon,
  SendIcon,
  TriangleAlertIcon,
  UserRoundIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import type { OfferStatus, OwnerOffer } from "@/features/offers/api";
import { useRespondToOffer } from "@/features/offers/api";
import { agreedAmount, formatOfferAmount } from "@/features/offers/lib/offer-format";
import { OfferStatusBadge } from "@/features/offers/components/offer-status-badge";
import { OfferCountdown } from "@/features/offers/components/offer-countdown";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ApiError } from "@/lib/api-client";
import { formatRelativeDate } from "@/shared/utils";
import { cn } from "@/lib/utils";

/** Keeps list rows and the negotiation drawer aligned on price wording. */
export function offerAmountDelta(offer: OwnerOffer): { text: string; tone: "muted" | "success" } {
  const settlement = Number(agreedAmount(offer));
  const asking = Number(offer.car.sale_price);
  const difference = settlement - asking;
  if (difference === 0) return { text: "At asking price", tone: "success" };
  return {
    text: `${formatOfferAmount(Math.abs(difference), offer.currency)} ${
      difference > 0 ? "above" : "below"
    } asking`,
    tone: difference > 0 ? "success" : "muted",
  };
}

export function offerInitials(offer: OwnerOffer): string {
  const { first_name, last_name } = offer.customer;
  return `${first_name?.[0] ?? ""}${last_name?.[0] ?? ""}`.toUpperCase() || "?";
}

function midpoint(offer: OwnerOffer): number {
  return Math.round((Number(offer.amount) + Number(offer.car.sale_price)) / 2);
}

function effectiveStatus(offer: OwnerOffer): OfferStatus {
  if (offer.is_expired && (offer.status === "pending" || offer.status === "countered")) {
    return "expired";
  }
  return offer.status;
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const data = error.data as { detail?: string } | undefined;
    return data?.detail ?? error.message ?? fallback;
  }
  return fallback;
}

function ComparisonRow({
  label,
  value,
  privateValue,
  emphasized,
}: {
  label: string;
  value: string;
  privateValue?: boolean;
  emphasized?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-t border-(--brc-border) px-4 py-3 first:border-t-0",
        emphasized && "border-t-(--brc-border-strong)",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-[13px] font-semibold [font-family:var(--brc-font-ui)]",
          privateValue ? "text-(--brc-primary)" : "text-(--brc-text-secondary)",
          emphasized && "font-bold text-(--brc-text)",
        )}
      >
        {privateValue ? <LockKeyholeIcon className="size-3.5" aria-hidden="true" /> : null}
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-bold tabular-nums text-(--brc-text) [font-family:var(--brc-font-ui)]",
          privateValue && "text-(--brc-primary)",
          emphasized && "font-extrabold",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Timeline({
  offer,
  status,
}: {
  offer: OwnerOffer;
  status: OfferStatus;
}) {
  const entries = useMemo(() => {
    const items = [
      {
        icon: SendIcon,
        title: `${offer.customer.first_name} offered ${formatOfferAmount(offer.amount, offer.currency)}`,
        time: formatRelativeDate(offer.created_at),
        active: true,
      },
    ];

    if (offer.counter_amount && offer.countered_at) {
      items.push({
        icon: ArrowLeftRightIcon,
        title: `You countered at ${formatOfferAmount(offer.counter_amount, offer.currency)}`,
        time: formatRelativeDate(offer.countered_at),
        active: status === "countered",
      });
    }

    if (status === "accepted") {
      items.push({
        icon: CheckCircle2Icon,
        title: "Vehicle reserved for this buyer",
        time: offer.responded_at ? formatRelativeDate(offer.responded_at) : "",
        active: false,
      });
    } else if (status === "rejected") {
      items.push({
        icon: XCircleIcon,
        title: "You declined this offer",
        time: offer.responded_at ? formatRelativeDate(offer.responded_at) : "",
        active: false,
      });
    } else if (status === "expired") {
      items.push({
        icon: Clock3Icon,
        title: "Offer expired before a decision",
        time: "",
        active: false,
      });
    }

    return items;
  }, [offer, status]);

  return (
    <section>
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.05em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
        Negotiation history
      </h3>
      <div>
        {entries.map((entry, index) => {
          const EntryIcon = entry.icon;
          return (
            <div key={`${entry.title}-${index}`} className="flex gap-3">
              <div className="flex shrink-0 flex-col items-center">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full",
                    entry.active
                      ? "bg-(--brc-primary-tint) text-(--brc-primary)"
                      : "bg-(--brc-bg-muted) text-(--brc-text-muted)",
                  )}
                >
                  <EntryIcon className="size-3.5" aria-hidden="true" />
                </span>
                {index < entries.length - 1 ? <span className="my-0.5 h-8 w-px bg-(--brc-border)" /> : null}
              </div>
              <div className="pb-3">
                <div className="text-[13px] font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                  {entry.title}
                </div>
                {entry.time ? (
                  <div className="mt-0.5 text-[11px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                    {entry.time}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type OwnerRespondSheetProps = {
  offer: OwnerOffer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function OwnerRespondSheet({ offer, open, onOpenChange }: OwnerRespondSheetProps) {
  const respond = useRespondToOffer(offer?.id ?? "");

  const [mode, setMode] = useState<"form" | "success">("form");
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");
  const [confirmAction, setConfirmAction] = useState<"accept" | "decline" | null>(null);

  useEffect(() => {
    if (!open || !offer) return;
    const id = window.setTimeout(() => {
      setMode("form");
      setCounterOpen(false);
      setCounterAmount(String(midpoint(offer)));
      setConfirmAction(null);
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, offer]);

  if (!offer) return null;

  const status = effectiveStatus(offer);
  const canAct = status === "pending";
  const awaitingBuyer = status === "countered";
  const delta = offerAmountDelta(offer);
  const asking = Number(offer.car.sale_price);
  const buyerOffer = Number(offer.amount);
  const percentage = asking ? Math.abs(((buyerOffer - asking) / asking) * 100).toFixed(1) : "0";
  const proposedCounter = counterOpen ? Number(counterAmount || midpoint(offer)) : Number(offer.counter_amount ?? 0);
  const settlement = proposedCounter || buyerOffer;
  const buyerName = `${offer.customer.first_name} ${offer.customer.last_name}`.trim();

  async function handleAccept() {
    try {
      await respond.mutateAsync({ action: "accept" });
      setMode("success");
      toast.success("Offer accepted");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't accept this offer"));
    } finally {
      setConfirmAction(null);
    }
  }

  async function handleDecline() {
    try {
      await respond.mutateAsync({ action: "reject" });
      toast.success("Offer declined");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't decline this offer"));
    } finally {
      setConfirmAction(null);
    }
  }

  async function handleSendCounter() {
    const amount = Number(counterAmount);
    if (!counterAmount || Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid counter amount");
      return;
    }
    try {
      await respond.mutateAsync({ action: "counter", counter_amount: String(amount) });
      toast.success("Counter-offer sent");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't send this counter-offer"));
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[600px]"
          aria-label="Negotiation details"
        >
          <SheetHeader className="border-b border-(--brc-border) px-5 py-4 pr-14 text-left">
            <div className="flex items-center gap-3">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-[10px] border border-(--brc-border) bg-(--brc-bg-muted)">
                {offer.car.primary_image ? (
                  <Image
                    src={offer.car.primary_image}
                    alt={offer.car.title}
                    fill
                    sizes="48px"
                    className="object-contain p-1.5"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-(--brc-text-muted)">
                    <CarFrontIcon className="size-5" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <SheetTitle className="truncate text-[15px] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                  {offer.car.title}
                </SheetTitle>
                <SheetDescription className="mt-0.5 text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  Asking {formatOfferAmount(offer.car.sale_price, offer.currency)}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {mode === "success" ? (
            <div className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex flex-1 flex-col items-center justify-center px-8 py-12 text-center">
                <span className="flex size-16 items-center justify-center rounded-full bg-(--brc-success-bg) text-(--brc-success)">
                  <CheckCircle2Icon className="size-9" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-2xl font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">
                  Vehicle reserved
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                  You accepted {buyerName}&apos;s offer. A purchase request has been created and the other
                  active offers on this vehicle were closed automatically.
                </p>
                <div className="mt-6 flex w-full max-w-md items-center justify-between gap-4 rounded-[14px] border border-(--brc-border) bg-(--brc-bg-subtle) p-4 text-left">
                  <div>
                    <div className="text-xs font-bold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      Accepted amount
                    </div>
                    <div className="mt-1 text-xl font-extrabold tabular-nums [font-family:var(--brc-font-display)]">
                      {formatOfferAmount(agreedAmount(offer), offer.currency)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      Buyer
                    </div>
                    <div className="mt-1 text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                      {buyerName}
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-(--brc-border) p-4">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-(--brc-primary) text-sm font-bold text-white [font-family:var(--brc-font-ui)]"
                >
                  <FileTextIcon className="size-4" aria-hidden="true" />
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5 [&>*]:shrink-0">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-(--brc-primary) text-sm font-extrabold text-white [font-family:var(--brc-font-ui)]">
                    {offerInitials(offer)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                      {buyerName}
                    </div>
                    <div className="mt-0.5 text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      Offer placed {formatRelativeDate(offer.created_at)}
                    </div>
                  </div>
                  <OfferStatusBadge status={status} />
                </div>

                <section className="rounded-2xl border border-(--brc-border) p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                    {status === "countered" ? "Current settlement" : "Offer amount"}
                  </div>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[32px] font-extrabold tabular-nums leading-none text-(--brc-text) [font-family:var(--brc-font-display)]">
                      {formatOfferAmount(agreedAmount(offer), offer.currency)}
                    </span>
                    <span
                      className={cn(
                        "text-[13px] font-bold [font-family:var(--brc-font-ui)]",
                        delta.tone === "success" ? "text-(--brc-success)" : "text-(--brc-text-muted)",
                      )}
                    >
                      {delta.text}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                    {percentage}% {buyerOffer >= asking ? "above" : "below"} the asking price
                  </div>
                  {(status === "pending" || status === "countered") && (
                    <div className="mt-3.5 inline-flex rounded-lg bg-(--brc-bg-muted) px-3 py-2">
                      <OfferCountdown expiresAt={offer.expires_at} isExpired={offer.is_expired} />
                    </div>
                  )}
                </section>

                {offer.message ? (
                  <section className="rounded-[14px] border border-(--brc-border) bg-(--brc-bg-subtle) p-4">
                    <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      <MessageSquareTextIcon className="size-3.5" aria-hidden="true" />
                      Message from buyer
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-(--brc-text) [font-family:var(--brc-font-ui)]">
                      {offer.message}
                    </p>
                  </section>
                ) : null}

                <section className="overflow-hidden rounded-[14px] border border-(--brc-border)">
                  <h3 className="bg-(--brc-bg-subtle) px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                    Price comparison
                  </h3>
                  <ComparisonRow
                    label="Asking price"
                    value={formatOfferAmount(offer.car.sale_price, offer.currency)}
                  />
                  <ComparisonRow label="Buyer's offer" value={formatOfferAmount(offer.amount, offer.currency)} />
                  <ComparisonRow
                    label="Proposed counter"
                    value={proposedCounter ? formatOfferAmount(proposedCounter, offer.currency) : "—"}
                  />
                  <ComparisonRow
                    label="Expected settlement"
                    value={formatOfferAmount(settlement, offer.currency)}
                    emphasized
                  />
                </section>

                {status === "accepted" && (offer.customer.email || offer.customer.phone) ? (
                  <section className="rounded-[14px] border border-(--brc-border) p-4">
                    <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.05em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      Buyer contact
                    </h3>
                    <div className="space-y-2 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                      {offer.customer.email ? (
                        <div className="flex items-center gap-2">
                          <UserRoundIcon className="size-4 text-(--brc-primary)" aria-hidden="true" />
                          {offer.customer.email}
                        </div>
                      ) : null}
                      {offer.customer.phone ? (
                        <div className="flex items-center gap-2">
                          <PhoneIcon className="size-4 text-(--brc-primary)" aria-hidden="true" />
                          {offer.customer.phone}
                        </div>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                <Timeline offer={offer} status={status} />
              </div>

              <footer className="border-t border-(--brc-border) bg-white py-4 pl-5 pr-20 sm:px-5">
                {counterOpen && canAct ? (
                  <div>
                    <label className="block">
                      <span className="mb-2 block text-[13px] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                        Your counter-offer
                      </span>
                      <div className="flex h-12 items-center gap-2 rounded-[10px] border border-(--brc-primary) px-4">
                        <span className="text-lg font-extrabold text-(--brc-text-muted)">₦</span>
                        <input
                          value={counterAmount ? Number(counterAmount).toLocaleString("en-NG") : ""}
                          onChange={(event) => setCounterAmount(event.target.value.replace(/\D/g, ""))}
                          inputMode="numeric"
                          aria-label="Counter-offer amount"
                          className="min-w-0 flex-1 border-none bg-transparent text-xl font-extrabold tabular-nums text-(--brc-text) outline-none [font-family:var(--brc-font-display)]"
                        />
                      </div>
                    </label>
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setCounterAmount(String(midpoint(offer)))}
                        className="rounded-full bg-(--brc-primary-tint) px-3 py-1.5 text-xs font-bold text-(--brc-primary) [font-family:var(--brc-font-ui)]"
                      >
                        Suggest {formatOfferAmount(midpoint(offer), offer.currency)}
                      </button>
                    </div>
                    <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-(--brc-warning-bg) px-3 py-2 text-xs font-semibold leading-relaxed text-(--brc-warning-ink,#8A6500) [font-family:var(--brc-font-ui)]">
                      <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      You can send one counter-offer. If the buyer declines it, this negotiation closes.
                    </div>
                    <div className="mt-3 flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => setCounterOpen(false)}
                        className="h-12 rounded-lg border border-(--brc-border) px-5 text-sm font-bold text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSendCounter}
                        disabled={respond.isPending}
                        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-(--brc-primary) text-sm font-bold text-white disabled:opacity-50 [font-family:var(--brc-font-ui)]"
                      >
                        <SendIcon className="size-4" aria-hidden="true" />
                        Send counter-offer
                      </button>
                    </div>
                  </div>
                ) : canAct ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setConfirmAction("accept")}
                      disabled={respond.isPending}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-(--brc-primary) text-sm font-bold text-white disabled:opacity-50 [font-family:var(--brc-font-ui)]"
                    >
                      <CheckCircle2Icon className="size-[18px]" aria-hidden="true" />
                      Accept {formatOfferAmount(offer.amount, offer.currency)}
                    </button>
                    <div className="mt-2.5 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setCounterOpen(true)}
                        disabled={respond.isPending}
                        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-(--brc-primary) text-sm font-bold text-(--brc-primary) disabled:opacity-50 [font-family:var(--brc-font-ui)]"
                      >
                        <ArrowLeftRightIcon className="size-4" aria-hidden="true" />
                        Counter
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAction("decline")}
                        disabled={respond.isPending}
                        className="h-11 flex-1 rounded-lg text-sm font-bold text-(--brc-text-muted) disabled:opacity-50 [font-family:var(--brc-font-ui)]"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ) : awaitingBuyer ? (
                  <div className="flex items-start gap-3 rounded-xl bg-(--brc-warning-bg) p-3.5">
                    <HourglassIcon className="mt-0.5 size-5 shrink-0 text-(--brc-warning-ink,#8A6500)" aria-hidden="true" />
                    <div>
                      <div className="text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                        Counter-offer sent
                      </div>
                      <div className="mt-0.5 text-xs leading-relaxed text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                        Waiting for the buyer&apos;s response. You&apos;ll be notified when they reply.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 rounded-xl bg-(--brc-bg-muted) p-3.5">
                    {status === "accepted" ? (
                      <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-(--brc-success)" aria-hidden="true" />
                    ) : (
                      <XCircleIcon className="mt-0.5 size-5 shrink-0 text-(--brc-text-muted)" aria-hidden="true" />
                    )}
                    <div className="text-[13px] leading-relaxed text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                      {status === "accepted"
                        ? "This offer was accepted and the vehicle is reserved for this buyer."
                        : status === "expired"
                          ? "This offer expired before a decision and can no longer be acted on."
                          : status === "withdrawn"
                            ? "The buyer withdrew this offer."
                            : status === "superseded"
                              ? "This offer closed automatically when another offer was accepted."
                              : "This offer is closed and can no longer be changed."}
                    </div>
                  </div>
                )}
              </footer>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmAction === "accept"}
        onOpenChange={(nextOpen) => !nextOpen && setConfirmAction(null)}
        title={`Accept ${formatOfferAmount(offer.amount, offer.currency)}?`}
        description={`This reserves the vehicle for ${buyerName}, creates a purchase request, and closes every other active offer on this car.`}
        confirmLabel="Accept offer"
        isPending={respond.isPending}
        onConfirm={handleAccept}
      />
      <ConfirmDialog
        open={confirmAction === "decline"}
        onOpenChange={(nextOpen) => !nextOpen && setConfirmAction(null)}
        title="Decline this offer?"
        description="The buyer will be notified that their offer was not accepted. This action cannot be undone."
        confirmLabel="Decline offer"
        destructive
        isPending={respond.isPending}
        onConfirm={handleDecline}
      />
    </>
  );
}
