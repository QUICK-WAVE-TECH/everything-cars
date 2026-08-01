"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CarIcon,
  CheckCircle2Icon,
  FlagIcon,
  HandshakeIcon,
  Loader2Icon,
  MailIcon,
  PhoneIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCancelDeal,
  useCompleteDeal,
  useDeal,
  useDisputeDeal,
} from "@/features/deals/api";
import type { DealParty } from "@/features/deals/api";

const DISPUTE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function initials(p: DealParty) {
  return `${p.first_name?.[0] ?? ""}${p.last_name?.[0] ?? ""}`.toUpperCase() || "?";
}

function money(amount: string, currency: string) {
  const symbol =
    ({ NGN: "₦", USD: "$", GBP: "£", EUR: "€" } as Record<string, string>)[currency] ??
    `${currency} `;
  return `${symbol}${Number(amount).toLocaleString("en-NG")}`;
}

function ContactCard({
  party,
  role,
  isYou,
}: {
  party: DealParty;
  role: "Buyer" | "Seller";
  isYou: boolean;
}) {
  const name = party.business_name || `${party.first_name} ${party.last_name}`;
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-(--brc-radius-md) border border-(--brc-border) bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-(--brc-primary-tint) text-sm font-extrabold text-(--brc-primary) [font-family:var(--brc-font-ui)]">
          {initials(party)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
            {name}
          </div>
          <div className="text-xs font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            {role}
            {isYou ? " · You" : ""}
          </div>
        </div>
      </div>
      {!isYou && (
        <div className="flex flex-col gap-2 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
          <a
            href={`tel:${party.phone}`}
            className="flex items-center gap-2 text-(--brc-text-secondary) no-underline"
          >
            <PhoneIcon className="size-4 text-(--brc-primary)" aria-hidden="true" />
            {party.phone || "—"}
          </a>
          <a
            href={`mailto:${party.email}`}
            className="flex items-center gap-2 text-(--brc-text-secondary) no-underline"
          >
            <MailIcon className="size-4 text-(--brc-primary)" aria-hidden="true" />
            {party.email}
          </a>
        </div>
      )}
    </div>
  );
}

export function DealRevealPage({ dealId }: { dealId: string }) {
  const { data: deal, isLoading } = useDeal(dealId);
  const complete = useCompleteDeal(dealId);
  const cancel = useCancelDeal(dealId);
  const dispute = useDisputeDeal(dealId);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  // Capture "now" once (render must stay pure — no Date.now() in the body).
  const [now] = useState(() => Date.now());

  if (isLoading || !deal) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-10">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="flex gap-4">
          <Skeleton className="h-40 flex-1 rounded-xl" />
          <Skeleton className="h-40 flex-1 rounded-xl" />
        </div>
      </div>
    );
  }

  const isSeller = deal.viewer_role === "seller";
  const you = isSeller ? deal.seller : deal.buyer;
  const other = isSeller ? deal.buyer : deal.seller;
  const isActive = deal.status === "active";
  const isBuyer = deal.viewer_role === "buyer";
  const canDispute =
    deal.status === "completed" &&
    isBuyer &&
    !deal.disputed_at &&
    deal.completed_at != null &&
    now - new Date(deal.completed_at).getTime() < DISPUTE_WINDOW_MS;

  function handleComplete() {
    complete.mutate(undefined, {
      onSuccess: () => {
        toast.success("Marked as sold.");
        setConfirmComplete(false);
      },
      onError: () => toast.error("Couldn't complete the deal. Please try again."),
    });
  }
  function handleCancel() {
    cancel.mutate(undefined, {
      onSuccess: () => {
        toast.success("Deal cancelled.");
        setConfirmCancel(false);
      },
      onError: () => toast.error("Couldn't cancel the deal. Please try again."),
    });
  }
  function handleDispute() {
    dispute.mutate(disputeReason.trim(), {
      onSuccess: () => {
        toast.success("Reported. Our team will review it.");
        setDisputeOpen(false);
      },
      onError: () => toast.error("Couldn't submit the report. Please try again."),
    });
  }

  return (
    <div className="min-h-[80vh] bg-(--brc-bg-subtle)">
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-5 py-10">
        {/* Hero */}
        <div className="flex flex-col items-center gap-3 text-center motion-safe:animate-[scaleIn_0.5s_ease-out]">
          <span className="flex size-16 items-center justify-center rounded-full bg-(--brc-success-bg) text-(--brc-success)">
            <HandshakeIcon className="size-9" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">
            {deal.status === "completed"
              ? "Sale completed"
              : deal.status === "cancelled"
                ? "Deal cancelled"
                : "It's a deal!"}
          </h1>
          <p className="text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
            You agreed on <strong>{money(deal.agreed_amount, deal.currency)}</strong> for the{" "}
            {deal.car.title}.
          </p>
        </div>

        {/* Car strip */}
        <div className="flex items-center gap-3 rounded-(--brc-radius-md) border border-(--brc-border) bg-white p-3">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-(--brc-radius-sm) border border-(--brc-border)">
            {deal.car.primary_image ? (
              <Image
                src={deal.car.primary_image}
                alt={deal.car.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-(--brc-text-muted)">
                <CarIcon className="size-5" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
              {deal.car.title}
            </div>
            <div className="text-sm tabular-nums text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
              {money(deal.agreed_amount, deal.currency)}
            </div>
          </div>
        </div>

        {/* Contact cards */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <ContactCard party={you} role={isSeller ? "Seller" : "Buyer"} isYou />
          <ContactCard party={other} role={isSeller ? "Buyer" : "Seller"} isYou={false} />
        </div>

        {/* Guidance */}
        <div className="flex items-start gap-2 rounded-(--brc-radius-md) bg-(--brc-primary-tint) px-4 py-3 text-sm leading-relaxed text-(--brc-primary) [font-family:var(--brc-font-ui)]">
          <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Reach out to arrange an inspection and complete the purchase — you&apos;re welcome to
          bring your own mechanic. Meet in a safe, public place and inspect the vehicle and its
          papers before paying.
        </div>

        {/* Actions */}
        {isActive && (
          <div className="flex flex-col gap-2">
            {isSeller ? (
              <button
                type="button"
                onClick={() => setConfirmComplete(true)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-(--brc-radius-sm) bg-(--brc-primary) text-[15px] font-bold text-white hover:bg-(--brc-primary-hover)"
              >
                <CheckCircle2Icon className="size-4" aria-hidden="true" /> Mark as sold
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-(--brc-radius-sm) border border-dashed border-(--brc-border) px-4 py-3 text-sm font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                <Loader2Icon className="size-4" aria-hidden="true" /> Waiting for the seller to
                confirm the sale
              </div>
            )}
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              className="mx-auto text-sm font-semibold text-(--brc-text-muted) underline-offset-2 hover:underline [font-family:var(--brc-font-ui)]"
            >
              Deal fell through?
            </button>
          </div>
        )}

        {/* The buyer now owns the vehicle — they can relist it (fresh listing,
            same VIN). Backend authorises via the completed deal. */}
        {deal.status === "completed" && isBuyer && deal.car.vin && (
          <div className="flex justify-center">
            <Link
              href={`/owner/my-cars/new?vin=${encodeURIComponent(deal.car.vin)}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-(--brc-primary) px-5 text-sm font-bold text-white transition-all hover:brightness-95 [font-family:var(--brc-font-ui)]"
            >
              <CarIcon className="size-4" aria-hidden="true" />
              Relist this vehicle
            </Link>
          </div>
        )}

        {/* Buyer safety valve on a completed sale */}
        {deal.status === "completed" && isBuyer && (
          <div className="flex justify-center">
            {deal.disputed_at ? (
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                <FlagIcon className="size-3.5" aria-hidden="true" />
                Reported — our team is reviewing this sale.
              </p>
            ) : canDispute ? (
              <button
                type="button"
                onClick={() => setDisputeOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--brc-text-muted) underline-offset-2 hover:underline [font-family:var(--brc-font-ui)]"
              >
                <FlagIcon className="size-3.5" aria-hidden="true" />
                This didn&apos;t happen — report a problem
              </button>
            ) : null}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmComplete}
        onOpenChange={(o) => !o && setConfirmComplete(false)}
        title="Mark this car as sold?"
        description="This closes the deal and takes the car off the marketplace. Do this once you've completed the sale."
        confirmLabel="Mark as sold"
        isPending={complete.isPending}
        onConfirm={handleComplete}
      />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={(o) => !o && setConfirmCancel(false)}
        title="Did this deal fall through?"
        description="This cancels the deal and puts the car back on the market. Buyers who bid earlier will be notified it's available again."
        confirmLabel="Yes, cancel the deal"
        destructive
        isPending={cancel.isPending}
        onConfirm={handleCancel}
      />

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent
          className="flex w-full max-w-[calc(100%-2rem)] flex-col gap-4 p-5 sm:max-w-105"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold [font-family:var(--brc-font-display)]">
              Report a problem
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
            Tell us what happened — for example, the seller marked this sold but the
            purchase never went through. Our team will review and can put the car back
            on the market.
          </p>
          <textarea
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value.slice(0, 400))}
            rows={3}
            placeholder="What went wrong?"
            className="resize-none rounded-(--brc-radius-md) border border-(--brc-border) bg-white px-3.5 py-2.5 text-sm text-(--brc-text) outline-none [font-family:var(--brc-font-ui)]"
          />
          <Button
            type="button"
            onClick={handleDispute}
            disabled={dispute.isPending}
            className="h-11 bg-(--brc-primary) font-bold text-white hover:bg-(--brc-primary-hover)"
          >
            {dispute.isPending ? "Submitting…" : "Submit report"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
