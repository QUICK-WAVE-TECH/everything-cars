"use client";

import { useState } from "react";
import Image from "next/image";
import { CarIcon, HourglassIcon, InfoIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { usePlaceOffer } from "@/features/offers/api";
import { formatOfferAmount } from "@/features/offers/lib/offer-format";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const MESSAGE_MAX = 400;
const MESSAGE_WARN_AT = 350;

/** Strip everything but digits — the source of truth is a plain digit string. */
function digitsOnly(value: string): string {
  return value.replace(/[^\d]/g, "");
}

function formatDigits(digits: string): string {
  if (!digits) return "";
  return Number(digits).toLocaleString("en-NG");
}

/** Read a server rejection message out of an ApiError without inventing one. */
function offerErrorMessage(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null;
  const data = err.data;
  if (data && typeof data === "object") {
    const amount = (data as Record<string, unknown>).amount;
    if (Array.isArray(amount) && typeof amount[0] === "string") {
      return amount[0];
    }
    const detail = (data as Record<string, unknown>).detail;
    if (typeof detail === "string") return detail;
  }
  return err.message || null;
}

type MakeOfferDialogProps = {
  carId: string;
  carTitle: string;
  salePrice: string;
  currency: string;
  primaryImage?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remainingOffers?: number;
};

export function MakeOfferDialog({
  carId,
  carTitle,
  salePrice,
  currency,
  primaryImage,
  open,
  onOpenChange,
  remainingOffers,
}: MakeOfferDialogProps) {
  const placeOffer = usePlaceOffer(carId);

  const [amountDigits, setAmountDigits] = useState("");
  const [message, setMessage] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [pulseAmount, setPulseAmount] = useState(false);

  // Reset local state whenever the dialog transitions to open, so a reopened
  // dialog always starts from a fresh offer rather than the last attempt.
  // (Adjusting state during render on a prop change, per React's guidance —
  // no effect needed, and it avoids the extra render an effect would cause.)
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setAmountDigits("");
      setMessage("");
      setInlineError(null);
    }
  }

  const askingAmount = Number(salePrice) || 0;
  const quickPicks = [
    { label: "−5%", value: Math.round(askingAmount * 0.95) },
    { label: "−10%", value: Math.round(askingAmount * 0.9) },
    { label: "Asking price", value: askingAmount },
  ];

  function applyQuickPick(value: number) {
    setAmountDigits(String(Math.max(0, value)));
    setInlineError(null);
    setPulseAmount(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amountDigits || placeOffer.isPending) return;
    setInlineError(null);
    placeOffer.mutate(
      { amount: amountDigits, message: message.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Your offer has been sent to the seller.");
          onOpenChange(false);
        },
        onError: (err) => {
          const msg = offerErrorMessage(err);
          if (msg) {
            setInlineError(msg);
          } else {
            toast.error("Couldn't submit your offer. Please try again.");
          }
        },
      },
    );
  }

  const messageCountColor =
    message.length >= MESSAGE_WARN_AT
      ? "text-(--brc-warning-ink,#B38601)"
      : "text-(--brc-text-muted)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Flex column (not the default grid), real side-margins on mobile, and
        // a height cap that only scrolls on genuinely tiny screens — the content
        // is compact enough to fit a normal phone/laptop without a scrollbar.
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-y-auto p-5 sm:max-w-115"
        aria-describedby={undefined}
      >
        <DialogHeader className="mb-3">
          <DialogTitle className="text-xl font-extrabold [font-family:var(--brc-font-display)]">
            Make an offer
          </DialogTitle>
        </DialogHeader>

        {/* Car summary strip */}
        <div className="mb-4 flex items-center gap-3 rounded-(--brc-radius-md) border border-(--brc-border) bg-(--brc-bg-subtle) p-3">
          <div className="relative size-13 shrink-0 overflow-hidden rounded-(--brc-radius-sm) border border-(--brc-border) bg-white">
            {primaryImage ? (
              <Image src={primaryImage} alt={carTitle} fill className="object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-(--brc-text-muted)">
                <CarIcon className="size-5" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
              {carTitle}
            </div>
            <div className="text-sm tabular-nums text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
              Asking {formatOfferAmount(salePrice, currency)}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-1">
          {/* Amount — the hero input */}
          <label className="mb-3 flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
              Your offer
            </span>
            <span
              className={cn(
                "flex h-14 items-center gap-2 rounded-(--brc-radius-md) border bg-white px-4 transition-colors",
                inlineError ? "border-(--brc-danger)" : "border-(--brc-border)",
              )}
            >
              <span className="text-2xl font-bold text-(--brc-text-muted)">
                {formatOfferAmount(0, currency).replace(/[\d,.]/g, "").trim() || currency}
              </span>
              <input
                id="offer-amount"
                inputMode="numeric"
                placeholder="0"
                aria-label="Your offer amount"
                aria-invalid={!!inlineError}
                value={formatDigits(amountDigits)}
                onChange={(e) => {
                  setAmountDigits(digitsOnly(e.target.value));
                  if (inlineError) setInlineError(null);
                }}
                onAnimationEnd={() => setPulseAmount(false)}
                className={cn(
                  "min-w-0 flex-1 border-none bg-transparent text-[28px] font-bold tabular-nums text-(--brc-text) outline-none [font-family:var(--brc-font-ui)]",
                  pulseAmount && "motion-safe:animate-[offer-amount-pop_0.22s_ease-out]",
                )}
              />
            </span>
            {inlineError && (
              <span className="flex items-start gap-1.5 text-sm leading-snug text-(--brc-danger) [font-family:var(--brc-font-ui)]">
                <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {inlineError}
              </span>
            )}
          </label>

          {/* Quick picks */}
          <div className="mb-4 flex gap-2">
            {quickPicks.map((pick) => (
              <button
                key={pick.label}
                type="button"
                onClick={() => applyQuickPick(pick.value)}
                className="h-9 flex-1 rounded-(--brc-radius-sm) border border-(--brc-border) bg-white text-sm font-bold text-(--brc-primary) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
              >
                {pick.label}
              </button>
            ))}
          </div>

          {/* Optional message */}
          <label className="mb-3.5 flex flex-col gap-1.5">
            <span className="flex items-center justify-between">
              <span className="text-sm font-semibold text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                Message <span className="font-normal text-(--brc-text-muted)">(optional)</span>
              </span>
              <span className={cn("text-xs tabular-nums [font-family:var(--brc-font-ui)]", messageCountColor)}>
                {message.length}/{MESSAGE_MAX}
              </span>
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
              rows={2}
              placeholder="Add a note for the owner…"
              className="resize-none rounded-(--brc-radius-md) border border-(--brc-border) bg-white px-3.5 py-2.5 text-sm text-(--brc-text) outline-none [font-family:var(--brc-font-ui)]"
            />
          </label>

          {/* Footer note */}
          <div className="mb-4 flex items-start gap-2 rounded-(--brc-radius-sm) bg-(--brc-bg-subtle) px-3.5 py-2.5">
            <HourglassIcon className="mt-0.5 size-4 shrink-0 text-(--brc-text-muted)" aria-hidden="true" />
            <span className="text-xs leading-snug text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
              Your offer is valid for 48 hours. You can make up to 2 offers on this vehicle.
              {typeof remainingOffers === "number" && (
                <>
                  {" "}
                  <span className="font-bold">{remainingOffers} of 2 remaining.</span>
                </>
              )}
            </span>
          </div>

          <LoadingButton
            type="submit"
            loading={placeOffer.isPending}
            disabled={!amountDigits}
            pendingLabel="Submitting…"
            className={cn(
              "h-12 w-full shrink-0 rounded-(--brc-radius-sm) text-[15px] font-bold transition-colors",
              "bg-(--brc-primary) text-white hover:bg-(--brc-primary-hover)",
              // Clear disabled treatment — a solid muted grey, not faded navy,
              // so it reads as 'enter an amount first' rather than broken.
              "disabled:pointer-events-none disabled:opacity-100 disabled:bg-(--brc-bg-muted) disabled:text-(--brc-text-muted)",
            )}
          >
            <SendIcon className="size-4" aria-hidden="true" />
            Submit offer
          </LoadingButton>
        </form>
      </DialogContent>
      <style>{`
        @keyframes offer-amount-pop {
          0% { transform: scale(1); }
          40% { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
      `}</style>
    </Dialog>
  );
}
