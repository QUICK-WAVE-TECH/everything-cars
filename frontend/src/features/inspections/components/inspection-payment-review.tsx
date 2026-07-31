"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckIcon, FileTextIcon, Loader2Icon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatOfferAmount } from "@/features/offers/lib/offer-format";
import { ApiError } from "@/lib/api-client";

import {
  useConfirmInspectionPayment,
  useRejectInspectionPayment,
} from "../api/inspections-api";
import type { InspectionBookingDetail } from "../api/types";

const MIN_REASON = 10;

function errorMessage(error: unknown): string {
  return error instanceof ApiError && error.message
    ? error.message
    : "Something went wrong. Please try again.";
}

/** Staff review of an owner's up-front inspection payment: fee breakdown, the
 * uploaded receipt, and confirm / reject actions. Shown while a booking is
 * `awaiting_payment`. */
export function InspectionPaymentReview({
  booking,
  onResolved,
}: {
  booking: InspectionBookingDetail;
  /** Called after a successful confirm/reject — e.g. to close a parent drawer. */
  onResolved?: () => void;
}) {
  const payment = booking.payment;
  const confirm = useConfirmInspectionPayment();
  const reject = useRejectInspectionPayment();
  const [dialog, setDialog] = useState<"confirm" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  if (!payment) return null;

  const money = (v: string) => formatOfferAmount(v, payment.currency);
  const reasonValid = reason.trim().length >= MIN_REASON;

  function doConfirm() {
    confirm.mutate(booking.id, {
      onSuccess: () => {
        toast.success("Payment confirmed — the inspection is now booked.");
        setDialog(null);
        onResolved?.();
      },
      onError: (e) =>
        toast.error("Couldn't confirm the payment", { description: errorMessage(e) }),
    });
  }

  function doReject() {
    if (!reasonValid) return;
    reject.mutate(
      { bookingId: booking.id, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success("Payment rejected — the booking was cancelled.");
          setDialog(null);
          setReason("");
          setTouched(false);
          onResolved?.();
        },
        onError: (e) =>
          toast.error("Couldn't reject the payment", {
            description: errorMessage(e),
          }),
      },
    );
  }

  const rows: [string, string][] = [
    ["Inspection fee", money(payment.inspection_fee)],
    ["Listing fee", money(payment.listing_fee)],
    ["VAT", money(payment.vat_amount)],
  ];

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-(--brc-warning) bg-(--brc-warning-bg) p-5 sm:p-6 [font-family:var(--brc-font-ui)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-extrabold uppercase tracking-wide text-(--brc-accent)">
          Awaiting payment verification
        </span>
        <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-(--brc-accent) ring-1 ring-(--brc-warning)">
          {payment.payment_method === "card" ? "Card" : "Bank transfer"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
        {/* Fee breakdown */}
        <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 text-sm">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between text-(--brc-text-secondary)"
            >
              <span>{label}</span>
              <span className="tabular-nums text-(--brc-text)">{value}</span>
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between border-t border-(--brc-border) pt-2 font-extrabold text-(--brc-text)">
            <span>Total paid</span>
            <span className="tabular-nums">{money(payment.total)}</span>
          </div>
        </div>

        {/* Receipt */}
        <div className="flex flex-col justify-center gap-2 rounded-2xl bg-white p-4">
          <span className="text-[11px] font-bold uppercase tracking-wide text-(--brc-text-muted)">
            Receipt
          </span>
          {payment.receipt_url ? (
            <a
              href={payment.receipt_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm font-bold text-(--brc-primary) hover:underline"
            >
              <FileTextIcon size={16} />
              View receipt
            </a>
          ) : (
            <span className="text-sm text-(--brc-text-muted)">No receipt on file</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          variant="outline"
          className="flex-1 basis-[180px] font-bold"
          disabled={confirm.isPending || reject.isPending}
          onClick={() => setDialog("reject")}
        >
          <XIcon />
          Reject payment
        </Button>
        <Button
          className="flex-1 basis-[180px] font-bold"
          disabled={confirm.isPending || reject.isPending || !payment.receipt_url}
          onClick={() => setDialog("confirm")}
        >
          <CheckIcon />
          Confirm payment
        </Button>
      </div>

      <ConfirmDialog
        open={dialog === "confirm"}
        onOpenChange={(o) => !confirm.isPending && setDialog(o ? "confirm" : null)}
        isPending={confirm.isPending}
        title="Confirm this payment?"
        description={`The booking for ${booking.car.title} becomes active and the owner is emailed their appointment details.`}
        confirmLabel="Confirm payment"
        onConfirm={doConfirm}
      />

      <Dialog
        open={dialog === "reject"}
        onOpenChange={(o) => {
          if (reject.isPending) return;
          if (!o) {
            setReason("");
            setTouched(false);
          }
          setDialog(o ? "reject" : null);
        }}
      >
        <DialogContent showCloseButton={!reject.isPending} className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold">
              Reject this payment?
            </DialogTitle>
            <DialogDescription>
              The booking is cancelled, the car returns to the market, and the owner
              is told why. They can re-book and pay again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="reject-reason"
              className="text-[12.5px] font-bold text-(--brc-text-secondary)"
            >
              Reason <span className="text-(--brc-danger)">*</span>
            </label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setTouched(true);
              }}
              rows={3}
              placeholder="e.g. Receipt is unreadable / amount doesn't match the transfer."
              className="min-h-20 resize-y"
            />
            {!reasonValid && touched && (
              <span className="text-[11.5px] text-(--brc-danger)">
                Add at least {MIN_REASON} characters.
              </span>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button
              variant="outline"
              disabled={reject.isPending}
              onClick={() => setDialog(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!reasonValid || reject.isPending}
              onClick={doReject}
            >
              {reject.isPending ? (
                <Loader2Icon className="animate-spin" aria-hidden="true" />
              ) : null}
              Reject payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
