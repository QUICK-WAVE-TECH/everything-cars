"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  CarDeletionFeedback,
  DeletionOutcome,
} from "@/features/listings/api/listings-api";

const OPTIONS: { value: DeletionOutcome; label: string }[] = [
  { value: "sold_platform", label: "Yes — sold on EverythingCars" },
  { value: "sold_elsewhere", label: "Yes — sold somewhere else" },
  { value: "not_sold", label: "No — removing for another reason" },
];

export function DeleteListingDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** feedback is undefined when the survey is skipped (no outcome picked). */
  onConfirm: (feedback?: CarDeletionFeedback) => void;
  isPending: boolean;
}) {
  const [outcome, setOutcome] = useState<DeletionOutcome | "">("");
  const [amount, setAmount] = useState("");
  const [hidden, setHidden] = useState(false);

  function handleConfirm() {
    if (!outcome) {
      onConfirm(undefined);
      return;
    }
    const feedback: CarDeletionFeedback = { outcome };
    if (outcome === "sold_platform" && !hidden && amount.trim()) {
      feedback.sale_amount = amount.trim();
    }
    if (outcome === "sold_platform" && hidden) {
      feedback.amount_hidden = true;
    }
    onConfirm(feedback);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
      <DialogContent className="max-w-[480px] [font-family:var(--brc-font-ui)]">
        <DialogHeader>
          <DialogTitle>Delete this listing?</DialogTitle>
          <DialogDescription>
            It&apos;ll be removed from the marketplace and can no longer receive
            requests. You can still see it in your listings.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1">
          <span className="text-[13px] font-bold text-(--brc-text)">
            Was this vehicle sold?{" "}
            <span className="font-medium text-(--brc-text-muted)">(optional)</span>
          </span>

          <div className="flex flex-col gap-1.5">
            {OPTIONS.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-(--brc-border) px-3 py-2.5 text-sm text-(--brc-text) transition-colors has-[:checked]:border-(--brc-primary) has-[:checked]:bg-(--brc-primary-tint)"
              >
                <input
                  type="radio"
                  name="deletion-outcome"
                  value={o.value}
                  checked={outcome === o.value}
                  onChange={() => setOutcome(o.value)}
                  className="size-4 accent-(--brc-primary)"
                />
                {o.label}
              </label>
            ))}
          </div>

          {outcome === "sold_platform" && (
            <div className="flex flex-col gap-2 rounded-lg bg-(--brc-bg-subtle) p-3">
              <label className="text-[13px] font-semibold text-(--brc-text)">
                What was the final sale price?
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-(--brc-text-muted)">₦</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={hidden ? "" : amount}
                  disabled={hidden}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 4500000"
                  className="h-10 w-full rounded-lg border border-(--brc-border) bg-(--brc-bg) px-3 text-sm text-(--brc-text) outline-none focus:border-(--brc-primary) disabled:opacity-50"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-(--brc-text-secondary)">
                <input
                  type="checkbox"
                  checked={hidden}
                  onChange={(e) => setHidden(e.target.checked)}
                  className="size-4 accent-(--brc-primary)"
                />
                Prefer not to say
              </label>
            </div>
          )}

          {outcome === "sold_elsewhere" && (
            <p className="rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) p-3 text-[13px] leading-relaxed text-(--brc-text-secondary)">
              Sorry to see it go — we&apos;ll take this on board and work on
              helping you market your cars better next time.
            </p>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="h-11 rounded-lg border border-(--brc-border) bg-(--brc-bg) px-5 text-sm font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-(--brc-danger) px-5 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            Delete listing
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
