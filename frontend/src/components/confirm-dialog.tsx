"use client";

import { Loader2Icon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The question, e.g. "Delete this review?" */
  title: string;
  /** Say what actually happens — especially what can't be undone. */
  description?: React.ReactNode;
  /** Name the action ("Delete", "Deactivate") rather than "OK". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive styles the confirm button red. */
  destructive?: boolean;
  /** Disables the buttons and shows a spinner while the action runs. */
  isPending?: boolean;
  onConfirm: () => void | Promise<void>;
};

/**
 * Confirmation gate for actions the user can't take back.
 *
 * Uses AlertDialog rather than Dialog on purpose: an alert dialog traps focus,
 * has no dismiss-on-outside-click escape hatch, and is announced to assistive
 * tech as requiring a response — which is what a destructive confirmation needs.
 * Reach for a plain Dialog for anything the user is merely *filling in*.
 *
 * The dialog stays open while `isPending` so the result (success or error toast)
 * lands against a stable surface; close it from the caller once the work settles.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  isPending = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            disabled={isPending}
            onClick={() => {
              void onConfirm();
            }}
          >
            {isPending ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
