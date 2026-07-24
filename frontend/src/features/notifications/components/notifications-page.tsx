"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/features/auth/components/icon";
import type { IconName } from "@/features/auth/components/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeDate } from "@/shared/utils/format";
import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
} from "@/features/notifications/api";
import type { NotificationItem, NotificationType } from "@/features/notifications/api";
import type { UserRole } from "@/shared/types";

// Admins browse notifications under /admin — not a backend role.
type ViewerRole = UserRole | "admin";

const TYPE_ICON: Record<NotificationType, IconName> = {
  request_received: "car",
  request_approved: "check",
  request_rejected: "car",
  request_cancelled: "car",
  requests_auto_rejected: "car",
  listing_suspended: "file",
  listing_approved: "check",
  listing_submitted: "file",
  changes_requested: "file",
  inspection_started: "clock",
  needs_clearance: "file",
  clearance_response: "bell",
  inspection_booked: "clock",
  inspection_booking_approved: "check",
  inspection_booking_rejected: "file",
  inspection_passed: "check",
  inspection_failed: "file",
  inspection_no_show: "clock",
  inspection_rescheduled: "clock",
  inspection_cancelled: "clock",
  payment_submitted: "banknote",
  payment_confirmed: "banknote",
  rental_active: "car",
  rental_completed: "check",
  offer_submitted: "handshake",
  offer_received: "handshake",
  offer_countered: "handshake",
  offer_accepted: "check",
  offer_rejected: "car",
  counter_accepted: "check",
  counter_rejected: "file",
  offer_expired: "clock",
  car_no_longer_available: "car",
  system: "bell",
};

// ── Semantic tone mapping (additive, visual only) ─────────────────────────────

type Tone = "success" | "danger" | "warning" | "neutral";

const TONE_MAP: Record<NotificationType, Tone> = {
  request_received: "neutral",
  request_approved: "success",
  request_rejected: "danger",
  request_cancelled: "neutral",
  requests_auto_rejected: "danger",
  listing_suspended: "danger",
  listing_approved: "success",
  listing_submitted: "neutral",
  changes_requested: "warning",
  inspection_started: "neutral",
  needs_clearance: "warning",
  clearance_response: "neutral",
  inspection_booked: "neutral",
  inspection_booking_approved: "success",
  inspection_booking_rejected: "danger",
  inspection_passed: "success",
  inspection_failed: "danger",
  inspection_no_show: "danger",
  inspection_rescheduled: "neutral",
  inspection_cancelled: "warning",
  payment_submitted: "neutral",
  payment_confirmed: "success",
  rental_active: "neutral",
  rental_completed: "success",
  offer_submitted: "warning",
  offer_received: "warning",
  offer_countered: "warning",
  offer_accepted: "success",
  offer_rejected: "danger",
  counter_accepted: "success",
  counter_rejected: "danger",
  offer_expired: "warning",
  car_no_longer_available: "danger",
  system: "neutral",
};

const TONE_STYLE: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: "var(--brc-success-bg)", fg: "var(--brc-success)" },
  danger: { bg: "var(--brc-danger-bg)", fg: "var(--brc-danger)" },
  warning: { bg: "var(--brc-warning-bg)", fg: "var(--brc-primary)" },
  neutral: { bg: "var(--brc-primary-tint)", fg: "var(--brc-primary)" },
};

function resolveHref(notification: NotificationItem, role: ViewerRole): string {
  const { notification_type, data } = notification;
  const home = role === "admin" ? "/admin/approvals" : `/${role}/dashboard`;

  switch (notification_type) {
    case "request_received":
    case "request_cancelled":
      return data.request_id ? `/owner/requests/${data.request_id}` : home;
    case "request_approved":
    case "request_rejected":
    case "requests_auto_rejected":
      return data.request_id ? `/customer/requests/${data.request_id}` : home;
    case "payment_submitted":
      return "/admin/payments";
    case "payment_confirmed":
    case "rental_active":
    case "rental_completed":
      return data.request_id ? `/customer/requests/${data.request_id}` : home;
    case "listing_suspended":
    case "listing_approved":
    case "changes_requested":
    case "inspection_started":
    case "needs_clearance":
    case "inspection_booking_approved":
    case "inspection_booking_rejected":
    case "inspection_passed":
    case "inspection_failed":
    case "inspection_no_show":
      return data.car_id ? `/owner/my-cars/${data.car_id}` : `/owner/my-cars`;

    case "inspection_booked":
    case "inspection_rescheduled":
    case "clearance_response":
    case "listing_submitted":
      return `/admin/approvals`;

    case "inspection_cancelled":
      return `/admin/inspections`;

    // ── Offers ──
    case "offer_submitted":
    case "offer_countered":
    case "offer_expired":
      return "/customer/offers";

    case "offer_received":
      return data.car_id ? `/owner/offers?car=${data.car_id}` : "/owner/offers";

    case "counter_accepted":
    case "counter_rejected":
      return "/owner/offers";

    case "offer_accepted":
      return data.request_id
        ? `/customer/requests/${data.request_id}`
        : "/customer/offers";

    case "offer_rejected":
      return data.car_id ? `/cars/${data.car_id}` : "/cars";

    case "car_no_longer_available":
      return "/cars";

    case "system":
    default:
      return home;
  }
}

function NotificationRow({
  n,
  role,
  onRead,
  isLast,
}: {
  n: NotificationItem;
  role: ViewerRole;
  onRead: (id: string, href: string) => void;
  isLast: boolean;
}) {
  const icon = TYPE_ICON[n.notification_type] ?? "bell";
  const tone = TONE_STYLE[TONE_MAP[n.notification_type] ?? "neutral"];
  const href = resolveHref(n, role);
  const unread = !n.is_read;

  return (
    <button
      onClick={() => onRead(n.id, href)}
      aria-label={unread ? `${n.title} — unread` : n.title}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        width: "100%",
        textAlign: "left",
        background: unread ? "var(--brc-bg-subtle)" : "transparent",
        border: "none",
        borderBottom: isLast ? "none" : "1px solid var(--brc-border)",
        padding: "18px 22px",
        cursor: "pointer",
        transition: "background 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--brc-bg-subtle)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = unread
          ? "var(--brc-bg-subtle)"
          : "transparent";
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 40,
          height: 40,
          borderRadius: "var(--brc-radius-pill)",
          background: tone.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={18} stroke={tone.fg} />
      </span>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <span
            style={{
              fontFamily: "var(--brc-font-ui)",
              fontWeight: unread ? 700 : 500,
              fontSize: 15,
              color: "var(--brc-text)",
              minWidth: 0,
              overflowWrap: "anywhere",
            }}
          >
            {n.title}
          </span>
          <span
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--brc-font-ui)",
              fontSize: 12,
              color: "var(--brc-text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            {formatRelativeDate(n.created_at)}
            {unread && (
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "var(--brc-radius-pill)",
                  background: "var(--brc-primary)",
                }}
              />
            )}
          </span>
        </div>
        <p
          style={{
            fontFamily: "var(--brc-font-ui)",
            fontSize: 14,
            color: "var(--brc-text-secondary)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {n.message}
        </p>
      </div>
    </button>
  );
}

export function NotificationsPage({ role }: { role: ViewerRole }) {
  const router = useRouter();
  const { data, isLoading } = useNotifications();
  const { data: unreadData } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const notifications = data?.results ?? [];
  const unreadCount = unreadData?.unread_count ?? 0;

  function handleRead(id: string, href: string) {
    markRead.mutate(id);
    router.push(href);
  }

  return (
    <div style={{ background: "var(--brc-bg-subtle)", minHeight: "80vh" }}>
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          width: "100%",
          padding: "clamp(24px, 5vw, 40px) clamp(20px, 8vw, 28px) 96px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h1
              style={{
                fontFamily: "var(--brc-font-display)",
                fontWeight: 800,
                fontSize: "clamp(26px, 5vw, 30px)",
                lineHeight: 1.1,
                color: "var(--brc-text)",
                margin: 0,
              }}
            >
              Notifications
            </h1>
            <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 14, color: "var(--brc-text-muted)", margin: 0 }}>
              {unreadCount > 0
                ? `${unreadCount} unread ${unreadCount === 1 ? "notification" : "notifications"}`
                : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              className="notif-markall"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--brc-primary)",
                fontFamily: "var(--brc-font-ui)",
                fontSize: 13,
                fontWeight: 700,
                padding: "4px",
                opacity: markAllRead.isPending ? 0.5 : 1,
              }}
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--brc-border)",
              borderRadius: "var(--brc-radius-lg)",
              overflow: "hidden",
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: "18px 22px",
                  borderBottom: i === 5 ? "none" : "1px solid var(--brc-border)",
                }}
              >
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <Skeleton className="h-4 w-2/5 rounded" />
                  <Skeleton className="h-3 w-4/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--brc-border)",
              borderRadius: "var(--brc-radius-lg)",
              padding: "60px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Icon name="bell" size={40} stroke="var(--brc-border)" strokeWidth={1.5} />
            <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, fontWeight: 700, color: "var(--brc-text)" }}>
              You&apos;re all caught up
            </span>
            <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 14, color: "var(--brc-text-muted)" }}>
              No notifications yet.
            </span>
          </div>
        ) : (
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--brc-border)",
              borderRadius: "var(--brc-radius-lg)",
              overflow: "hidden",
            }}
          >
            {notifications.map((n, i) => (
              <NotificationRow
                key={n.id}
                n={n}
                role={role}
                onRead={handleRead}
                isLast={i === notifications.length - 1}
              />
            ))}
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 640px) {
          .notif-markall { width: 100%; text-align: right; }
        }
      `}</style>
    </div>
  );
}
