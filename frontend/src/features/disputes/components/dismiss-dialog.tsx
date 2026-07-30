"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MIN_NOTE = 15;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buyerName: string;
  isPending: boolean;
  onConfirm: (note: string) => void;
};

export function DismissDialog({
  open,
  onOpenChange,
  buyerName,
  isPending,
  onConfirm,
}: Props) {
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const trimmed = note.trim();
  const valid = trimmed.length >= MIN_NOTE;

  function handleOpenChange(next: boolean) {
    if (isPending) return;
    if (!next) {
      setNote("");
      setTouched(false);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!isPending} className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold">
            Dismiss this dispute?
          </DialogTitle>
          <DialogDescription>
            The sale stands and the car stays sold. {buyerName} is notified of the
            outcome, and your note is recorded on the case for audit.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="dismiss-note"
            className="text-[12.5px] font-bold text-(--brc-text-secondary)"
          >
            Reason / internal note <span className="text-(--brc-danger)">*</span>
          </label>
          <Textarea
            id="dismiss-note"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setTouched(true);
            }}
            onBlur={() => setTouched(true)}
            rows={4}
            placeholder="e.g. Buyer confirmed receipt by phone on 28 Jul; payment reference verified against seller statement."
            className="min-h-24 resize-y"
          />
          <div className="flex items-center justify-between gap-3">
            <span
              className={`text-[11.5px] [font-family:var(--font-geist-sans)] ${
                !valid && touched
                  ? "text-(--brc-danger)"
                  : "text-(--brc-text-muted)"
              }`}
            >
              {valid
                ? "Recorded on the case and visible to staff only."
                : `Add at least ${MIN_NOTE} characters explaining the outcome.`}
            </span>
            <span className="text-[11.5px] text-(--brc-text-muted) tabular-nums [font-family:var(--font-geist-sans)]">
              {trimmed.length} / {MIN_NOTE} min
            </span>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2.5">
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={!valid || isPending}
            onClick={() => valid && onConfirm(trimmed)}
          >
            {isPending ? (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            ) : null}
            Dismiss dispute
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
