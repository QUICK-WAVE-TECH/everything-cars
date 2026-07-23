"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRightIcon, CheckCircle2Icon, CheckIcon, LockIcon, TriangleAlertIcon } from "lucide-react";

import { ApiError } from "@/lib/api-client";
import { useCarRange, useRespondToOffer, type OwnerOffer } from "@/features/offers/api";
import { agreedAmount, formatOfferAmount } from "@/features/offers/lib/offer-format";
import { OfferStatusBadge } from "@/features/offers/components/offer-status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatRelativeDate } from "@/shared/utils";
import { cn } from "@/lib/utils";

/**
 * How the agreed amount (counter if there is one, else the offer) compares to
 * the car's asking price. Shared between the respond sheet and the offer list
 * rows so the two never disagree on wording.
 */
export function offerAmountDelta(offer: OwnerOffer): { text: string; tone: "muted" | "success" } {
  const agreed = Number(agreedAmount(offer));
  const asking = Number(offer.car.sale_price);
  const diff = asking - agreed;
  if (diff <= 0) {
    return diff === 0
      ? { text: "at asking price", tone: "success" }
      : { text: `${formatOfferAmount(Math.abs(diff), offer.currency)} above asking`, tone: "success" };
  }
  return { text: `${formatOfferAmount(diff, offer.currency)} below asking`, tone: "muted" };
}

export function offerInitials(offer: OwnerOffer): string {
  const { first_name, last_name } = offer.customer;
  return `${first_name?.[0] ?? ""}${last_name?.[0] ?? ""}`.toUpperCase() || "?";
}

function midpoint(offer: OwnerOffer): number {
  const agreed = Number(agreedAmount(offer));
  const asking = Number(offer.car.sale_price);
  return Math.round((agreed + asking) / 2);
}

type OwnerRespondSheetProps = {
  offer: OwnerOffer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Right-side sheet where the owner accepts, counters, or declines a single
 * offer. The owner's private range is fetched lazily from a dedicated
 * owner-only endpoint (never part of the offer list payload) and shown only here.
 */
export function OwnerRespondSheet({ offer, open, onOpenChange }: OwnerRespondSheetProps) {
  const respond = useRespondToOffer(offer?.id ?? "");
  // Lazily fetch the owner's private range only while the sheet is open.
  const { data: range } = useCarRange(offer?.car.id ?? "", {
    enabled: open && !!offer,
  });

  const [mode, setMode] = useState<"form" | "success">("form");
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");
  const [confirmAction, setConfirmAction] = useState<"accept" | "decline" | null>(null);

  // Reset local state each time a new offer is opened in the sheet.
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

  const delta = offerAmountDelta(offer);
  const isAwaitingBuyer = offer.status === "countered";
  const canAct = offer.status === "pending" && !offer.is_expired;

  function errorMessage(error: unknown, fallback: string) {
    if (error instanceof ApiError) {
      const data = error.data as { detail?: string } | undefined;
      return data?.detail ?? error.message ?? fallback;
    }
    return fallback;
  }

  async function handleAccept() {
    try {
      await respond.mutateAsync({ action: "accept" });
      setMode("success");
      toast.success("Offer accepted");
      setTimeout(() => onOpenChange(false), 1600);
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
          className="w-full gap-0 p-0 sm:max-w-[440px]"
          aria-label="Respond to offer"
        >
          {mode === "success" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <span className="flex size-[68px] items-center justify-center rounded-full bg-(--brc-success-bg) text-(--brc-success)">
                <CheckCircle2Icon className="size-10" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-1.5">
                <span className="text-xl font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">
                  Vehicle reserved
                </span>
                <span className="max-w-[280px] text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                  The offer is accepted and a purchase request has been created. The other offers were
                  declined automatically.
                </span>
              </div>
            </div>
          ) : (
            <>
              <SheetHeader className="border-b border-(--brc-border) px-5 py-4">
                <SheetTitle className="text-xl font-extrabold [font-family:var(--brc-font-display)]">
                  Respond to offer
                </SheetTitle>
                <SheetDescription className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  {offer.car.title} &middot; Asking {formatOfferAmount(offer.car.sale_price, offer.currency)}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
                <div className="flex flex-col gap-3.5 rounded-2xl border border-(--brc-border) p-4.5">
                  <div className="flex items-center gap-3">
                    <Avatar size="lg">
                      <AvatarFallback className="bg-(--brc-primary-tint) font-bold text-(--brc-primary)">
                        {offerInitials(offer)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                        {offer.customer.first_name} {offer.customer.last_name}
                      </div>
                      <div className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                        {formatRelativeDate(offer.created_at)}
                      </div>
                    </div>
                    <OfferStatusBadge status={offer.status} className="ml-auto" />
                  </div>
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <span className="text-[28px] font-extrabold tabular-nums text-(--brc-text) [font-family:var(--brc-font-ui)]">
                      {formatOfferAmount(agreedAmount(offer), offer.currency)}
                    </span>
                    <span
                      className={cn(
                        "text-[13px] [font-family:var(--brc-font-ui)]",
                        delta.tone === "success" ? "text-(--brc-success)" : "text-(--brc-text-muted)",
                      )}
                    >
                      {delta.text}
                    </span>
                  </div>
                  {offer.message ? (
                    <div className="rounded-xl bg-(--brc-bg-subtle) p-3.5 text-sm leading-relaxed text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                      &ldquo;{offer.message}&rdquo;
                    </div>
                  ) : null}
                </div>

                {/* The owner's private range — only ever shown here, to the owner. */}
                {range && (range.min_price || range.max_price) ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-(--brc-primary)/20 bg-(--brc-primary-tint) p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-(--brc-primary) [font-family:var(--brc-font-ui)]">
                      <LockIcon className="size-3.5" aria-hidden="true" />
                      Your acceptable range · only visible to you
                    </div>
                    <div className="flex items-baseline gap-2 tabular-nums [font-family:var(--brc-font-ui)]">
                      <span className="text-lg font-extrabold text-(--brc-text)">
                        {formatOfferAmount(range.min_price, range.currency)}
                      </span>
                      <span className="text-(--brc-text-muted)">–</span>
                      <span className="text-lg font-extrabold text-(--brc-text)">
                        {formatOfferAmount(range.max_price, range.currency)}
                      </span>
                    </div>
                  </div>
                ) : null}

                {isAwaitingBuyer ? (
                  <div className="rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-4 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                    You&apos;ve sent a counter-offer. Waiting on the buyer to respond — the ball is in their
                    court.
                  </div>
                ) : !canAct ? (
                  <div className="rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-4 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                    This offer can no longer be responded to.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => setConfirmAction("accept")}
                      disabled={respond.isPending}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border-none bg-(--brc-primary) text-sm font-bold text-white disabled:opacity-50 [font-family:var(--brc-font-ui)]"
                    >
                      <CheckIcon className="size-4" aria-hidden="true" />
                      Accept offer
                    </button>

                    <button
                      type="button"
                      onClick={() => setCounterOpen((v) => !v)}
                      disabled={respond.isPending}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-(--brc-primary) bg-transparent text-sm font-bold text-(--brc-primary) disabled:opacity-50 [font-family:var(--brc-font-ui)]"
                    >
                      <ArrowLeftRightIcon className="size-4" aria-hidden="true" />
                      {counterOpen ? "Cancel counter-offer" : "Counter offer"}
                    </button>

                    <div
                      className={cn(
                        "grid motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out",
                        counterOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                      )}
                      aria-hidden={!counterOpen}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="mt-0.5 flex flex-col gap-3 rounded-xl border border-(--brc-border) p-4">
                          <label className="flex flex-col gap-2">
                            <span className="text-[13px] font-semibold text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                              Your counter-offer
                            </span>
                            <div className="flex h-[52px] items-center gap-2 rounded-lg border border-(--brc-border) bg-white px-4">
                              <span className="text-lg font-bold text-(--brc-text-muted)">₦</span>
                              <input
                                value={counterAmount}
                                onChange={(e) => setCounterAmount(e.target.value.replace(/[^\d]/g, ""))}
                                inputMode="numeric"
                                aria-label="Counter-offer amount"
                                className="min-w-0 flex-1 border-none bg-transparent text-lg font-bold tabular-nums text-(--brc-text) outline-none [font-family:var(--brc-font-ui)]"
                              />
                            </div>
                          </label>
                          <div className="flex items-start gap-1.5 text-xs leading-relaxed text-(--brc-warning-ink,#B38601) [font-family:var(--brc-font-ui)]">
                            <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                            You get one counter-offer. If they decline, this negotiation closes.
                          </div>
                          <button
                            type="button"
                            onClick={handleSendCounter}
                            disabled={respond.isPending}
                            className="h-11 w-full rounded-lg border-none bg-(--brc-primary) text-sm font-bold text-white disabled:opacity-50 [font-family:var(--brc-font-ui)]"
                          >
                            Send counter-offer
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setConfirmAction("decline")}
                      disabled={respond.isPending}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border-none bg-transparent text-sm font-bold text-(--brc-danger) disabled:opacity-50 [font-family:var(--brc-font-ui)]"
                    >
                      Decline offer
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmAction === "accept"}
        onOpenChange={(v) => !v && setConfirmAction(null)}
        title="Accept this offer?"
        description="This reserves the vehicle and declines the other offers."
        confirmLabel="Accept offer"
        isPending={respond.isPending}
        onConfirm={handleAccept}
      />
      <ConfirmDialog
        open={confirmAction === "decline"}
        onOpenChange={(v) => !v && setConfirmAction(null)}
        title="Decline this offer?"
        description="The buyer will be notified that their offer was declined."
        confirmLabel="Decline offer"
        destructive
        isPending={respond.isPending}
        onConfirm={handleDecline}
      />
    </>
  );
}
