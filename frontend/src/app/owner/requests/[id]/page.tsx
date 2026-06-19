"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDownIcon, MessageSquareIcon, ClockIcon } from "lucide-react";
import { Breadcrumb } from "@/shared/components";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/features/auth/components/icon";
import { StatusBadge } from "@/features/requests/components/status-badge";
import {
  RequestDetailCard,
  ActionButton,
  type RequestDetailStatus,
} from "@/features/requests/components/request-detail-card";
import { OwnerStats } from "@/features/requests";
import { useOwnerRequestDetail, useRequestAction } from "@/features/requests/api";
import { useMe } from "@/features/auth/api";
import type { RequestAction } from "@/features/requests/api";
import { WriteReviewSection } from "@/features/reviews";

function toDetailStatus(s: string): RequestDetailStatus {
  const map: Record<string, RequestDetailStatus> = {
    pending: "new",
    approved: "awaiting-payment",
    rejected: "rejected",
    cancelled: "cancelled",
    payment_submitted: "awaiting-payment",
    paid: "paid",
    active: "accepted",
    completed: "accepted",
  };
  return map[s] ?? "new";
}

function formatPrice(amount: string, currency: string): string {
  const symbol = currency === "NGN" ? "₦" : currency === "USD" ? "$" : currency;
  return `${symbol}${Number(amount).toLocaleString("en-NG")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  payment_submitted: "Payment Submitted",
  paid: "Paid",
  active: "Active",
  completed: "Completed",
};

function humanizeToken(value: string): string {
  return value.replaceAll("_", " ");
}

function formatStatusLabel(status: string): string {
  return REQUEST_STATUS_LABELS[status] ?? humanizeToken(status);
}

function formatTimelineNote(note: string): string {
  return note.replace(/\b(payment_submitted|mark_active)\b/g, humanizeToken);
}

const ACTION_LABELS: Record<RequestAction, string> = {
  approve: "Approved",
  reject: "Rejected",
  mark_active: "Marked active",
  complete: "Completed",
};

export default function OwnerRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params?.id as string;

  const { data: request, isLoading } = useOwnerRequestDetail(requestId);
  const { data: me } = useMe();
  const requestAction = useRequestAction();
  const myFullName = me ? `${me.first_name} ${me.last_name}` : "";

  async function handleAction(action: RequestAction, note?: string) {
    try {
      await requestAction.mutateAsync({ requestId, action, note });
      toast.success(ACTION_LABELS[action]);
    } catch {
      toast.error(`Failed to ${action} request`);
    }
  }

  if (isLoading || !request) {
    return (
      <>
        <Breadcrumb items={[{ label: "Incoming Requests", href: "/owner/requests" }, { label: "View Request" }]} />
        <div style={{ background: "var(--brc-bg-subtle)", minHeight: "80vh" }}>
          <div style={{ maxWidth: 1232, margin: "0 auto", padding: "clamp(24px, 5vw, 40px) clamp(20px, 8vw, 104px) 64px", display: "flex", flexDirection: "column", gap: 28 }}>
            <Skeleton className="h-10 w-48" />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        </div>
      </>
    );
  }

  const car = request.car;
  const customerName = `${request.customer.first_name} ${request.customer.last_name}`;
  const status = toDetailStatus(request.status);
  const primaryImage = car.images.find((img) => img.is_primary)?.image ?? car.images[0]?.image ?? "/car-lexus.png";

  const specRows: [string, string][][] = [
    [
      ["Request Type", request.request_type === "rent" ? "Rent" : "Buy"],
      ["Duration", request.duration_days ? `${request.duration_days} days` : "—"],
      ["Offered Price", formatPrice(request.price_offered, request.currency)],
      ["Start Date", request.start_date ? formatDate(request.start_date) : "—"],
      ["Requested On", formatDate(request.created_at)],
    ],
    [
      ["Year", String(car.year)],
      ["Transmission", car.transmission || "—"],
      ["Fuel Type", car.fuel_type || "—"],
      ["Seats", String(car.seats)],
      ["Color", car.color || "—"],
    ],
  ];

  const actions = (() => {
    switch (request.status) {
      case "pending":
        return (
          <>
            <ActionButton kind="success" onClick={() => handleAction("approve")}>
              <Icon name="check" size={17} stroke="#fff" />
              Approve
            </ActionButton>
            <ActionButton kind="secondary" onClick={() => handleAction("reject")}>
              Reject
            </ActionButton>
          </>
        );
      case "approved":
        return (
          <ActionButton kind="secondary" onClick={() => router.push("/owner/requests")}>
            Awaiting Customer Payment
          </ActionButton>
        );
      case "payment_submitted":
        return (
          <ActionButton kind="secondary" onClick={() => router.push("/owner/requests")}>
            Payment Under Review by Staff
          </ActionButton>
        );
      case "paid":
        return (
          <ActionButton kind="dark" onClick={() => handleAction("mark_active")}>
            {request.request_type === "buy" ? "Confirm Ownership Transfer" : "Mark as Active (Handover)"}
          </ActionButton>
        );
      case "active":
        return (
          <ActionButton kind="success" onClick={() => handleAction("complete")}>
            <Icon name="check" size={17} stroke="#fff" />
            {request.request_type === "buy" ? "Complete Sale" : "Mark Complete"}
          </ActionButton>
        );
      case "completed":
        return (
          <ActionButton kind="secondary" onClick={() => router.push("/owner/requests")}>
            Back to Requests
          </ActionButton>
        );
      default:
        return (
          <ActionButton kind="secondary" onClick={() => router.push("/owner/requests")}>
            Back to Requests
          </ActionButton>
        );
    }
  })();

  return (
    <>
      <Breadcrumb items={[{ label: "Incoming Requests", href: "/owner/requests" }, { label: "View Request" }]} />

      <div style={{ background: "var(--brc-bg-subtle)", minHeight: "80vh" }}>
        <div style={{ maxWidth: 1232, margin: "0 auto", width: "100%", padding: "clamp(24px, 5vw, 40px) clamp(20px, 8vw, 104px) 64px", display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h1 style={{ fontFamily: "var(--brc-font-display)", fontWeight: 800, fontSize: "clamp(28px, 6vw, 40px)", color: "var(--brc-text)", margin: 0 }}>
              Request Details
            </h1>
            <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, color: "var(--brc-text-muted)", margin: 0 }}>
              Review and manage this request
            </p>
          </div>

          <OwnerStats />

          <RequestDetailCard
            carName={car.title}
            partyLabel="Customer"
            partyName={customerName}
            status={status}
            specRows={specRows}
            actions={actions}
            imageSrc={primaryImage}
          />

          {/* Customer message */}
          {request.message && (
            <section className="overflow-hidden rounded-[var(--brc-radius-lg)] border border-(--brc-border) bg-white">
              <div className="flex items-start gap-4 p-5 sm:p-6">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--brc-accent-bg)">
                  <MessageSquareIcon size={18} className="text-(--brc-accent)" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="m-0 text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                      Customer&apos;s Message
                    </h3>
                    <span className="rounded-full bg-(--brc-bg-muted) px-2 py-0.5 text-[10px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      {request.customer.first_name} {request.customer.last_name}
                    </span>
                  </div>
                  <div className="mt-3 rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) p-4">
                    <p className="m-0 text-sm leading-relaxed text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                      &ldquo;{request.message}&rdquo;
                    </p>
                  </div>
                  <span className="mt-2 block text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                    Sent {formatDate(request.created_at)}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Write / view review — only for completed requests */}
          {request.status === "completed" && (
            <WriteReviewSection carId={car.id} requestId={requestId} />
          )}

          {/* Status history — collapsible */}
          <StatusTimeline events={request.status_events} currentUserName={myFullName} />
        </div>
      </div>
    </>
  );
}

// ── Collapsible status timeline ──
function StatusTimeline({ events, currentUserName }: { events: { id: string; from_status: string; to_status: string; actor_name: string; note: string; created_at: string }[]; currentUserName?: string }) {
  const [open, setOpen] = useState(false);

  if (events.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-(--brc-radius-lg) border border-(--brc-border) bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center justify-between border-none bg-white p-5 text-left transition-colors hover:bg-(--brc-bg-subtle) sm:p-6"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--brc-bg-muted)">
            <ClockIcon size={18} className="text-(--brc-text-secondary)" />
          </span>
          <div>
            <h3 className="m-0 text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
              Status History
            </h3>
            <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              {events.length} update{events.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <ChevronDownIcon
          size={18}
          className="text-(--brc-text-muted) transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <div className="border-t border-(--brc-border) px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          <div className="relative ml-5 border-l-2 border-(--brc-border) pl-6">
            {events.map((event, i) => {
              const isMe = currentUserName && event.actor_name.trim().toLowerCase() === currentUserName.trim().toLowerCase();
              return (
              <div key={event.id} className="relative pb-5 last:pb-0">
                <span
                  className="absolute -left-[31px] top-0.5 size-3 rounded-full border-2 border-white"
                  style={{ background: i === events.length - 1 ? "var(--brc-primary)" : "var(--brc-border)" }}
                />
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={event.to_status} />
                    {event.from_status && (
                      <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                        from {formatStatusLabel(event.from_status)}
                      </span>
                    )}
                  </div>
                  {event.note && (
                    <p className="m-0 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                      {isMe
                        ? formatTimelineNote(event.note).replace(/by owner/gi, "by you")
                        : formatTimelineNote(event.note)}
                    </p>
                  )}
                  <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                    {isMe ? "You" : event.actor_name} · {formatDate(event.created_at)}
                  </span>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
