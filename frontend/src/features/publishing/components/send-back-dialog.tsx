"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";
import { MorphingLabel } from "@/components/ui/loading-button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MIN_NOTE = 15;

/** Publisher sends a listing back to the owner with a required note. */
export function SendBackDialog({
  open,
  onOpenChange,
  carTitle,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carTitle: string;
  onConfirm: (note: string) => void;
  isPending: boolean;
}) {
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const valid = note.trim().length >= MIN_NOTE;

  function submit() {
    setTouched(true);
    if (!valid) return;
    onConfirm(note.trim());
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (isPending) return;
        if (!o) {
          setNote("");
          setTouched(false);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent
        showCloseButton={!isPending}
        className="max-w-[496px] rounded-2xl [font-family:var(--brc-font-ui)]"
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold">
            Send back for changes?
          </DialogTitle>
          <DialogDescription>
            The owner will be asked to make changes before this can be published.
            <span className="mt-1.5 block font-bold text-(--brc-text-secondary)">
              {carTitle}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label
              htmlFor="sendback-note"
              className="text-[13.5px] font-semibold text-(--brc-text)"
            >
              What needs to change? <span className="text-(--brc-danger)">*</span>
            </label>
            <span className="text-xs font-semibold tabular-nums text-(--brc-text-muted)">
              {note.trim().length}/{MIN_NOTE}
            </span>
          </div>
          <textarea
            id="sendback-note"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setTouched(true);
            }}
            rows={4}
            placeholder="e.g. Replace the blurred interior photos and confirm the asking price."
            className={`min-h-24 resize-y rounded-lg border bg-(--brc-bg-subtle) px-3.5 py-3 text-sm leading-relaxed text-(--brc-text) outline-none transition focus:bg-(--brc-bg) focus:shadow-[0_0_0_3px_rgba(0,0,139,0.12)] ${
              touched && !valid
                ? "border-(--brc-danger)"
                : "border-(--brc-border) focus:border-(--brc-primary)"
            }`}
          />
          {touched && !valid ? (
            <span className="text-xs font-semibold text-(--brc-danger)">
              Add at least {MIN_NOTE} characters so the owner knows what to fix.
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5">
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
            onClick={submit}
            disabled={isPending}
            aria-busy={isPending || undefined}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-(--brc-danger) px-5 text-sm font-bold text-white transition-colors hover:brightness-95 disabled:cursor-wait disabled:opacity-70"
          >
            <MorphingLabel
              status={isPending ? "pending" : "idle"}
              idle={<><Undo2 size={16} /> Send back</>}
              pendingLabel="Sending back…"
            />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
