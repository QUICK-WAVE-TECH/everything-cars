import { toast } from "sonner";

type ConfirmToastOptions = {
  /** The question, e.g. "Delete this review?" */
  message: string;
  /** Optional consequence line — say what can't be undone. */
  description?: string;
  /** Label on the affirmative button. Name the action ("Delete"), not "OK". */
  actionLabel?: string;
  onConfirm: () => void | Promise<void>;
};

/**
 * Non-blocking replacement for `window.confirm`. Keeps the affirmative step —
 * the user still has to click the named action — but renders in the app's own
 * toast surface instead of a native browser dialog.
 *
 * Only for reversible-ish, low-stakes confirmations. Anything genuinely
 * dangerous or multi-field belongs in a Dialog where it can't be dismissed by
 * a stray click.
 */
export function confirmToast({
  message,
  description,
  actionLabel = "Confirm",
  onConfirm,
}: ConfirmToastOptions) {
  toast.warning(message, {
    description,
    // Long enough to read and decide; a confirmation that vanishes is a bug.
    duration: 10_000,
    action: {
      label: actionLabel,
      onClick: () => {
        void onConfirm();
      },
    },
    cancel: {
      label: "Cancel",
      onClick: () => {},
    },
  });
}
