"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, CarIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useWithdrawOffer } from "@/features/offers/api";
import type { Offer } from "@/features/offers/api";
import { formatOfferAmount } from "@/features/offers/lib/offer-format";
import { OfferStatusBadge } from "@/features/offers/components/offer-status-badge";
import { OfferCountdown } from "@/features/offers/components/offer-countdown";
import { CounterResponseCard } from "@/features/offers/components/counter-response-card";
import { cn } from "@/lib/utils";

/** A muted explanation line shown on closed cards, beyond what the badge already says. */
function closedExplanation(offer: Offer): string | null {
  switch (offer.status) {
    case "standby":
      return "Another sale is in progress. Your offer is on standby — if that deal falls through it comes back automatically.";
    case "superseded":
      return "Another buyer's offer was accepted.";
    case "rejected":
      return "The owner declined this offer.";
    case "withdrawn":
      return "You withdrew this offer.";
    case "expired":
      return "This offer expired before the owner responded.";
    default:
      return null;
  }
}

export function CustomerOfferCard({ offer }: { offer: Offer }) {
  const withdraw = useWithdrawOffer(offer.id);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  const isCountered = offer.status === "countered";
  const isClosed =
    offer.status !== "pending" && offer.status !== "countered";
  const yourOfferFmt = formatOfferAmount(offer.amount, offer.currency);

  function handleWithdraw() {
    withdraw.mutate(undefined, {
      onSuccess: () => {
        toast.success("Offer withdrawn.");
        setConfirmWithdraw(false);
      },
      onError: () => {
        toast.error("Couldn't withdraw the offer. Please try again.");
      },
    });
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-(--brc-radius-lg) border border-(--brc-border) bg-white",
        isCountered && "border-l-4 border-l-(--brc-warning)",
        isClosed && "bg-(--brc-bg-subtle) opacity-85",
      )}
    >
      <div className="flex flex-wrap gap-4.5 p-4.5">
        <div className="relative aspect-video w-full max-w-full flex-[0_0_220px] overflow-hidden rounded-(--brc-radius-lg) border border-(--brc-border) bg-(--brc-bg-subtle)">
          {offer.car.primary_image ? (
            <Image
              src={offer.car.primary_image}
              alt={offer.car.title}
              fill
              sizes="(max-width: 640px) 100vw, 220px"
              className="object-contain p-3"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-(--brc-text-muted)">
              <CarIcon className="size-8" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="flex min-w-[200px] flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-1 text-base font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                {offer.car.title}
              </div>
              {!isClosed && (
                <OfferCountdown
                  expiresAt={offer.expires_at}
                  isExpired={offer.is_expired}
                />
              )}
            </div>
            <OfferStatusBadge status={offer.status} className="shrink-0" />
          </div>

          {isCountered ? (
            <CounterResponseCard offer={offer} />
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="mb-0.5 text-[11px] font-semibold tracking-wide text-(--brc-text-muted) uppercase [font-family:var(--brc-font-ui)]">
                    Your offer
                  </div>
                  <div
                    className={cn(
                      "text-xl font-bold tabular-nums [font-family:var(--brc-font-ui)]",
                      isClosed ? "text-(--brc-text-muted)" : "text-(--brc-text)",
                    )}
                  >
                    {yourOfferFmt}
                  </div>
                </div>
                {offer.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => setConfirmWithdraw(true)}
                    className="rounded-(--brc-radius-sm) p-1 text-sm font-semibold text-(--brc-text-muted) underline underline-offset-2 hover:text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]"
                  >
                    Withdraw offer
                  </button>
                )}
              </div>

              {isClosed && (
                <p className="m-0 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  {closedExplanation(offer)}
                </p>
              )}

              {offer.status === "superseded" && (
                <Link
                  href="/cars"
                  className="inline-flex w-max items-center gap-1.5 text-sm font-semibold text-(--brc-text-muted) no-underline hover:text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]"
                >
                  <SearchIcon className="size-3.5" aria-hidden="true" />
                  Browse similar vehicles
                </Link>
              )}

              {offer.status === "accepted" && offer.resulting_deal && (
                <Link
                  href={`/deals/${offer.resulting_deal}`}
                  className="group inline-flex w-max items-center gap-1.5 text-sm font-bold text-(--brc-primary) no-underline [font-family:var(--brc-font-ui)]"
                >
                  View the deal &amp; contacts
                  <ArrowRightIcon
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmWithdraw}
        onOpenChange={setConfirmWithdraw}
        title="Withdraw this offer?"
        description="The owner will no longer be able to respond to it. This can't be undone."
        confirmLabel="Withdraw offer"
        destructive
        isPending={withdraw.isPending}
        onConfirm={handleWithdraw}
      />
    </div>
  );
}
