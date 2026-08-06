"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Loader2Icon,
  XIcon,
  CheckIcon,
  ExternalLinkIcon,
  DownloadIcon,
  ZoomInIcon,
  ShieldCheckIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  StoreIcon,
  LandmarkIcon,
  CreditCardIcon,
} from "lucide-react";
import { Icon } from "@/features/auth/components/icon";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatusBadge } from "@/features/requests/components/status-badge";
import { cn } from "@/lib/utils";
import { useAdminRequestDetail } from "@/features/listings/api/admin-api";
import { useStaffConfirmPayment } from "@/features/payments/api";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtMoney(amount: string | number, currency: string) {
  const sym: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };
  return `${sym[currency] ?? currency}${Number(amount).toLocaleString("en-NG")}`;
}

type ReceiptKind = "image" | "pdf" | "other" | "none";

function receiptKind(url: string | null): ReceiptKind {
  if (!url) return "none";
  const path = url.split(/[?#]/, 1)[0] ?? url;
  if (/\.(jpe?g|png|webp|gif|avif)$/i.test(path)) return "image";
  if (/\.pdf$/i.test(path)) return "pdf";
  return "other";
}

function receiptFileName(url: string) {
  try {
    const last = url.split("/").pop() ?? "receipt";
    return decodeURIComponent(last.split("?")[0] ?? last);
  } catch {
    return "receipt";
  }
}

const METHOD_META: Record<string, { label: string; icon: React.ReactNode }> = {
  transfer: { label: "Bank Transfer", icon: <LandmarkIcon size={13} /> },
  card: { label: "Card", icon: <CreditCardIcon size={13} /> },
};

/** The receipt viewer: image (zoomable + downloadable), PDF (file card with
 * an open link), and missing (warning placeholder) — the three shapes
 * `payment_receipt` can take. */
function ReceiptViewer({
  url,
  onZoom,
}: {
  url: string | null;
  onZoom: () => void;
}) {
  const kind = receiptKind(url);

  if (kind === "none") {
    return (
      <div className="flex items-start gap-3.5 rounded-xl border border-(--brc-warning) bg-(--brc-warning-bg) p-5">
        <AlertTriangleIcon size={22} className="mt-0.5 shrink-0 text-(--brc-accent-deep)" aria-hidden="true" />
        <div>
          <span className="block text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">No receipt was submitted</span>
          <span className="mt-0.5 block text-[13px] leading-relaxed text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
            This payment has no evidence attached. Confirmation is disabled until the customer uploads a valid receipt.
          </span>
        </div>
      </div>
    );
  }

  if (kind === "image" && url) {
    return (
      <div className="overflow-hidden rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle)">
        <button
          type="button"
          onClick={onZoom}
          aria-label="Zoom into receipt image"
          className="flex w-full cursor-zoom-in items-center justify-center border-none bg-transparent p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- external, variable-dimension receipt image */}
          <img src={url} alt="Uploaded payment receipt" className="max-h-[320px] w-full rounded-lg object-contain" />
        </button>
        <div className="flex items-center justify-end gap-2 border-t border-(--brc-border) bg-(--brc-bg) px-3 py-2">
          <button
            type="button"
            onClick={onZoom}
            aria-label="Zoom receipt"
            title="Zoom"
            className="flex size-8 cursor-pointer items-center justify-center rounded-md border border-(--brc-border) bg-(--brc-bg) text-(--brc-text-secondary) transition-colors hover:bg-(--brc-bg-subtle)"
          >
            <ZoomInIcon size={15} />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open original receipt"
            title="Open original"
            className="flex size-8 items-center justify-center rounded-md border border-(--brc-border) bg-(--brc-bg) text-(--brc-text-secondary) transition-colors hover:bg-(--brc-bg-subtle)"
          >
            <ExternalLinkIcon size={15} />
          </a>
          <a
            href={url}
            download
            aria-label="Download receipt"
            title="Download"
            className="flex size-8 items-center justify-center rounded-md border border-(--brc-border) bg-(--brc-bg) text-(--brc-text-secondary) transition-colors hover:bg-(--brc-bg-subtle)"
          >
            <DownloadIcon size={15} />
          </a>
        </div>
      </div>
    );
  }

  if (url) {
    // "pdf" or an unrecognized extension — both render as a generic file card.
    const isPdf = kind === "pdf";
    return (
      <div className="flex items-center gap-4 rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-5">
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-lg border border-(--brc-border) bg-(--brc-bg)",
            isPdf ? "text-(--brc-danger)" : "text-(--brc-text-muted)",
          )}
        >
          <Icon name="file" size={22} stroke="currentColor" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{receiptFileName(url)}</span>
          <span className="text-[12.5px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{isPdf ? "PDF document" : "Receipt file"}</span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-(--brc-primary) px-4 text-[13px] font-bold text-white no-underline [font-family:var(--brc-font-ui)]"
        >
          <ExternalLinkIcon size={14} /> Open {isPdf ? "PDF" : "file"}
        </a>
      </div>
    );
  }

  return null;
}

export function PaymentDrawer({
  requestId,
  open,
  onClose,
}: {
  requestId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const {
    data: req,
    isLoading,
    isError,
    refetch,
  } = useAdminRequestDetail(open ? requestId : null);
  const confirmPayment = useStaffConfirmPayment();
  const [confirmedRequestId, setConfirmedRequestId] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const justConfirmed = confirmedRequestId === requestId;

  async function handleConfirm() {
    if (!requestId) return;
    try {
      await confirmPayment.mutateAsync(requestId);
      toast.success("Payment confirmed — transaction created");
      setConfirmedRequestId(requestId);
      setConfirmOpen(false);
    } catch {
      toast.error("Failed to confirm payment");
    }
  }

  const car = req?.car;
  const primaryImage = car?.images?.find((img) => img.is_primary)?.image ?? car?.images?.[0]?.image;
  const ownerName = car ? `${car.owner.first_name} ${car.owner.last_name}` : "";
  const customerName = req ? `${req.customer.first_name} ${req.customer.last_name}` : "";
  const canConfirm = req?.status === "payment_submitted" && !justConfirmed;
  const receiptMissing = req ? !req.payment_receipt : false;
  const confirmDisabled = confirmPayment.isPending || receiptMissing;
  const methodMeta = req?.payment_method_choice ? METHOD_META[req.payment_method_choice] : undefined;
  const showVerifiedFooter = justConfirmed || (req && req.status !== "payment_submitted");

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setLightboxOpen(false);
            setConfirmOpen(false);
            onClose();
          }
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          className="z-[100] w-full gap-0 overflow-hidden bg-(--brc-bg) p-0 shadow-[var(--brc-shadow-lg)] data-[side=right]:sm:max-w-[min(600px,92vw)]"
        >
          <SheetTitle className="sr-only">Payment review</SheetTitle>
          <SheetDescription className="sr-only">
            Review the submitted payment evidence and request details.
          </SheetDescription>
          {isError ? (
            <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-(--brc-warning-bg) text-(--brc-accent-deep)">
                <AlertTriangleIcon size={22} aria-hidden="true" />
              </span>
              <div>
                <p className="m-0 text-base font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                  Payment details could not be loaded
                </p>
                <p className="mt-1 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                  Check your connection and try again.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void refetch()}
                className="h-10 rounded-lg bg-(--brc-primary) px-4 text-sm font-bold text-white [font-family:var(--brc-font-ui)]"
              >
                Retry
              </button>
            </div>
          ) : isLoading || !req ? (
            <div className="flex flex-1 flex-col gap-4 p-6">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-[140px] w-full rounded-xl" />
              <Skeleton className="h-[220px] w-full rounded-xl" />
              <Skeleton className="h-36 w-full rounded-xl" />
            </div>
          ) : (
            <>
              {/* Sticky header */}
              <div className="flex shrink-0 items-center gap-3 border-b border-(--brc-border) px-5 py-4 sm:px-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="truncate text-[15.5px] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{car?.title}</span>
                    <StatusBadge status={justConfirmed ? "paid" : req.status} />
                  </div>
                  <span className="mt-0.5 block text-[12.5px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                    {req.request_type === "rent" ? "Rental" : "Purchase"} request · submitted {formatDate(req.created_at)} at {formatTime(req.created_at)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close payment review"
                  className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-(--brc-border) bg-(--brc-bg) text-(--brc-text-secondary) transition-colors hover:bg-(--brc-bg-subtle)"
                >
                  <XIcon size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5 sm:p-6">
                {/* Success banner */}
                {justConfirmed && (
                  <div className="flex items-center gap-3.5 rounded-xl bg-(--brc-success-bg) p-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-(--brc-success) text-white">
                      <CheckCircle2Icon size={22} />
                    </span>
                    <div>
                      <span className="block text-sm font-extrabold text-(--brc-text) [font-family:var(--brc-font-ui)]">Payment confirmed</span>
                      <span className="text-[13px] text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                        A transaction was created and this request is now marked paid.
                      </span>
                    </div>
                  </div>
                )}

                {/* Car info */}
                <section className="flex items-center gap-4 rounded-xl border border-(--brc-border) p-4">
                  {primaryImage ? (
                    <Image src={primaryImage} alt={car?.title ?? ""} width={80} height={60} className="rounded-lg object-cover" />
                  ) : (
                    <span className="flex size-[60px] items-center justify-center rounded-lg bg-(--brc-bg-subtle)">
                      <Icon name="car" size={24} stroke="var(--brc-text-muted)" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{car?.title}</span>
                    <span className="text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      {car?.year} · {car?.brand} {car?.model}
                    </span>
                  </div>
                </section>

                {/* Payment summary */}
                <section className="rounded-xl border border-(--brc-border) p-[18px]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <span className="text-[11.5px] font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                        Submitted amount
                      </span>
                      <span className="mt-1 block text-[32px] font-extrabold leading-none tracking-tight tabular-nums text-(--brc-text) [font-family:var(--brc-font-display)]">
                        {fmtMoney(req.price_offered, req.currency)}
                      </span>
                      {methodMeta && (
                        <span className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                          <span className="text-(--brc-text-muted)">{methodMeta.icon}</span>
                          via {methodMeta.label}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[11.5px] font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                        Request type
                      </span>
                      <span className="mt-1.5 block text-[15px] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                        {req.request_type === "rent" ? "Rental" : "Purchase"}
                      </span>
                      {req.request_type === "rent" && req.duration_days && (
                        <span className="mt-1 block text-[12.5px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                          {req.duration_days} days{req.start_date ? ` · from ${formatDate(req.start_date)}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </section>

                {/* Receipt */}
                <section className="flex flex-col gap-2.5">
                  <h3 className="m-0 text-[12.5px] font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                    Payment receipt
                  </h3>
                  <ReceiptViewer url={req.payment_receipt} onZoom={() => setLightboxOpen(true)} />
                </section>

                {/* Parties */}
                <section className="flex flex-col gap-2.5">
                  <h3 className="m-0 text-[12.5px] font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Parties</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="min-w-0 rounded-lg border border-(--brc-border) p-3.5">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                        <Icon name="user" size={13} stroke="currentColor" /> Customer · payer
                      </span>
                      <span className="mt-1.5 block truncate text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{customerName}</span>
                    </div>
                    <div className="min-w-0 rounded-lg border border-(--brc-border) p-3.5">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                        <StoreIcon size={13} /> Owner · receiver
                      </span>
                      <span className="mt-1.5 block truncate text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{ownerName}</span>
                      {car && (
                        <span className="mt-0.5 block truncate text-[12.5px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{car.owner.email}</span>
                      )}
                    </div>
                  </div>
                </section>

                {/* Request details */}
                <section className="flex flex-col gap-2.5">
                  <h3 className="m-0 text-[12.5px] font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                    Vehicle &amp; request
                  </h3>
                  <div className="overflow-hidden rounded-lg border border-(--brc-border)">
                    {[
                      ["Request ID", `#${req.id.slice(0, 8).toUpperCase()}`],
                      ["Type", req.request_type === "rent" ? "Rental" : "Purchase"],
                      ...(req.request_type === "rent"
                        ? ([
                            ["Duration", req.duration_days ? `${req.duration_days} days` : "—"],
                            ["Start date", req.start_date ? formatDate(req.start_date) : "—"],
                          ] as const)
                        : []),
                      ["Submitted", `${formatDate(req.created_at)} · ${formatTime(req.created_at)}`],
                    ].map(([label, value], i) => (
                      <div
                        key={label}
                        className={cn(
                          "flex items-center justify-between gap-3 px-3.5 py-2.5",
                          i > 0 && "border-t border-(--brc-border)",
                        )}
                      >
                        <span className="text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{label}</span>
                        <span className="text-right text-[13.5px] font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">{value}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Message */}
                {req.message && (
                  <section className="flex flex-col gap-2.5">
                    <h3 className="m-0 text-[12.5px] font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      Customer message
                    </h3>
                    <p className="m-0 rounded-lg bg-(--brc-bg-subtle) p-3.5 text-sm leading-relaxed text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                      {req.message}
                    </p>
                  </section>
                )}

                {/* Status events */}
                {req.status_events.length > 0 && (
                  <section className="flex flex-col gap-3">
                    <h3 className="m-0 text-[12.5px] font-bold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      Activity timeline
                    </h3>
                    <div className="flex flex-col">
                      {req.status_events.map((event, i) => {
                        const last = i === req.status_events.length - 1;
                        return (
                          <div key={event.id} className="flex gap-3">
                            <div className="flex shrink-0 flex-col items-center">
                              <span className="flex size-7 items-center justify-center rounded-full bg-(--brc-bg-subtle) text-(--brc-text-muted)">
                                <CheckIcon size={13} />
                              </span>
                              {!last && <span className="my-0.5 min-h-[10px] w-0.5 flex-1 bg-(--brc-border)" />}
                            </div>
                            <div className={cn("min-w-0", !last && "pb-3.5")}>
                              <StatusBadge status={event.to_status} />
                              {event.note && (
                                <p className="m-0 mt-1 text-[12.5px] text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">{event.note}</p>
                              )}
                              <span className="mt-0.5 block text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                                {event.actor_name} · {formatDate(event.created_at)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>

              {/* Sticky footer */}
              <div className="shrink-0 border-t border-(--brc-border) bg-(--brc-bg) px-5 py-3.5 sm:px-6">
                {canConfirm ? (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border border-(--brc-border) bg-(--brc-bg) text-sm font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        disabled={confirmDisabled}
                        onClick={() => setConfirmOpen(true)}
                        className="flex h-12 flex-[2] cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-(--brc-success) text-sm font-bold text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 [font-family:var(--brc-font-ui)]"
                      >
                        {confirmPayment.isPending ? (
                          <Loader2Icon size={16} className="animate-spin motion-reduce:animate-none" />
                        ) : (
                          <ShieldCheckIcon size={16} />
                        )}
                        Confirm Payment
                      </button>
                    </div>
                    <span className="text-center text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      {receiptMissing
                        ? "A valid receipt is required before this payment can be confirmed."
                        : "Confirming creates a transaction and marks the request as paid."}
                    </span>
                  </div>
                ) : showVerifiedFooter ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-(--brc-success) [font-family:var(--brc-font-ui)]">
                      <CheckCircle2Icon size={17} />
                      {justConfirmed ? "Payment verified" : "Payment already verified"}
                    </span>
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-(--brc-border) bg-(--brc-bg) px-4 text-sm font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
                    >
                      Close
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Receipt lightbox */}
      {req?.payment_receipt && receiptKind(req.payment_receipt) === "image" && (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent
            overlayClassName="z-[110] bg-black/80 backdrop-blur-none"
            className="z-[120] flex max-h-[92vh] max-w-[calc(100%-2rem)] items-center justify-center bg-black p-4 text-white sm:max-w-5xl"
          >
            <DialogTitle className="sr-only">Payment receipt preview</DialogTitle>
            <DialogDescription className="sr-only">
              Enlarged preview of the customer&apos;s uploaded payment receipt.
            </DialogDescription>
            {/* eslint-disable-next-line @next/next/no-img-element -- lightbox needs the raw external URL */}
            <img
              src={req.payment_receipt}
              alt="Uploaded payment receipt, enlarged"
              className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-[var(--brc-shadow-lg)]"
            />
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm this payment?"
        description="This creates a transaction and marks the request as paid. Verify the submitted amount and receipt before continuing."
        confirmLabel="Confirm payment"
        isPending={confirmPayment.isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
