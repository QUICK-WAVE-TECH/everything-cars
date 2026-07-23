"use client";

import { useState } from "react";
import { CheckIcon, InfoIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useRespondToOffer } from "@/features/offers/api";
import type { Offer } from "@/features/offers/api";
import { formatOfferAmount } from "@/features/offers/lib/offer-format";

/**
 * The hero state for a `countered` offer: a side-by-side comparison of what the
 * buyer offered vs. what the owner countered, with Accept / Decline actions.
 * Both mutations are gated behind a ConfirmDialog since accepting reserves the
 * vehicle and declining closes the offer — neither is undoable.
 */
export function CounterResponseCard({ offer }: { offer: Offer }) {
  const respond = useRespondToOffer(offer.id);
  const [confirmAction, setConfirmAction] = useState<"accept" | "reject" | null>(
    null,
  );

  const counterFmt = formatOfferAmount(offer.counter_amount, offer.currency);
  const yourOfferFmt = formatOfferAmount(offer.amount, offer.currency);

  function handleConfirm() {
    if (!confirmAction) return;
    respond.mutate(
      { action: confirmAction },
      {
        onSuccess: () => {
          toast.success(
            confirmAction === "accept"
              ? "Counter accepted — your purchase request has been created."
              : "Counter declined.",
          );
          setConfirmAction(null);
        },
        onError: () => {
          toast.error("Something went wrong. Please try again.");
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-stretch gap-3">
        <div className="min-w-[130px] flex-1 rounded-(--brc-radius-md) border border-(--brc-border) px-3.5 py-3">
          <div className="mb-1 text-[11px] font-semibold tracking-wide text-(--brc-text-muted) uppercase [font-family:var(--brc-font-ui)]">
            You offered
          </div>
          <div className="text-lg font-bold tabular-nums text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
            {yourOfferFmt}
          </div>
        </div>
        <div className="min-w-[130px] flex-1 rounded-(--brc-radius-md) border border-(--brc-warning) bg-(--brc-warning-bg) px-3.5 py-3">
          <div className="mb-1 text-[11px] font-semibold tracking-wide text-(--brc-warning-ink,#9a7400) uppercase [font-family:var(--brc-font-ui)]">
            Owner countered
          </div>
          <div className="text-2xl leading-tight font-extrabold tabular-nums text-(--brc-text) [font-family:var(--brc-font-display)]">
            {counterFmt}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
        <InfoIcon className="size-3.5 shrink-0" aria-hidden="true" />
        This is the seller&apos;s only counter-offer.
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Button
          type="button"
          className="h-11 min-w-[140px] flex-1 rounded-(--brc-radius-sm) bg-(--brc-primary) text-white hover:bg-(--brc-primary-hover)"
          onClick={() => setConfirmAction("accept")}
        >
          <CheckIcon className="size-4" aria-hidden="true" />
          Accept counter
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-(--brc-radius-sm)"
          onClick={() => setConfirmAction("reject")}
        >
          Decline
        </Button>
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        title={
          confirmAction === "accept"
            ? `Accept ${counterFmt}?`
            : "Decline this counter-offer?"
        }
        description={
          confirmAction === "accept"
            ? "This reserves the vehicle for you."
            : "This closes the offer. You won't be able to respond again."
        }
        confirmLabel={confirmAction === "accept" ? "Accept counter" : "Decline"}
        destructive={confirmAction === "reject"}
        isPending={respond.isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
