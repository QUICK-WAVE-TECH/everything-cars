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

const TYPE_ICON: Record<NotificationType, IconName> = {
  request_received: "car",
  request_approved: "check",
  request_rejected: "car",
  request_cancelled: "car",
  requests_auto_rejected: "car",
  listing_submitted: "file",
  listing_approved: "check",
  listing_rejected: "file",
  listing_needs_changes: "file",
  payment_submitted: "banknote",
  payment_confirmed: "banknote",
  rental_active: "car",
  rental_completed: "check",
  system: "bell",
};

function resolveHref(notification: NotificationItem, role: UserRole): string {
  const { notification_type, data } = notification;

  switch (notification_type) {
    case "request_received":
    case "request_cancelled":
      return data.request_id ? `/owner/requests/${data.request_id}` : `/${role}/dashboard`;
    case "request_approved":
    case "request_rejected":
    case "requests_auto_rejected":
      return data.request_id ? `/customer/requests/${data.request_id}` : `/${role}/dashboard`;
    case "payment_submitted":
      return "/admin/payments";
    case "payment_confirmed":
    case "rental_active":
    case "rental_completed":
      return data.request_id ? `/customer/requests/${data.request_id}` : `/${role}/dashboard`;
    case "listing_submitted":
    case "listing_approved":
    case "listing_rejected":
    case "listing_needs_changes":
      return data.car_id ? `/owner/my-cars/${data.car_id}` : `/${role}/dashboard`;
    case "system":
    default:
      return `/${role}/dashboard`;
  }
}

function NotificationCard({ n, role, onRead }: { n: NotificationItem; role: UserRole; onRead: (id: string, href: string) => void }) {
  const icon = TYPE_ICON[n.notification_type] ?? "bell";
  const href = resolveHref(n, role);

  return (
    <button
      onClick={() => onRead(n.id, href)}
      style={{
        display: "flex",
        gap: 14,
        width: "100%",
        textAlign: "left",
        background: "#fff",
        border: "1px solid var(--brc-border)",
        borderLeft: `4px solid ${n.is_read ? "var(--brc-border)" : "var(--brc-primary)"}`,
        borderRadius: "var(--brc-radius-md)",
        boxShadow: "var(--brc-shadow-xs)",
        padding: "18px 20px",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 20px rgba(0,0,139,0.08)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--brc-shadow-xs)";
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: "var(--brc-radius-sm)",
          background: n.is_read ? "var(--brc-bg-muted)" : "var(--brc-primary-tint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={18} stroke={n.is_read ? "var(--brc-text-muted)" : "var(--brc-primary)"} />
      </span>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: n.is_read ? 500 : 700, fontSize: 15, color: "var(--brc-text)" }}>
            {n.title}
          </span>
          <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 12, color: "var(--brc-text-muted)", whiteSpace: "nowrap" }}>
            {formatRelativeDate(n.created_at)}
          </span>
        </div>
        <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 14, color: "var(--brc-text-secondary)", margin: 0, lineHeight: 1.5 }}>
          {n.message}
        </p>
        {!n.is_read && (
          <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 12, fontWeight: 600, color: "var(--brc-primary)", marginTop: 4 }}>
            Tap to view
          </span>
        )}
      </div>
    </button>
  );
}

export function NotificationsPage({ role }: { role: UserRole }) {
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
          maxWidth: 1232,
          margin: "0 auto",
          width: "100%",
          padding: "clamp(24px, 5vw, 40px) clamp(20px, 8vw, 104px) 64px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h1 style={{ fontFamily: "var(--brc-font-display)", fontWeight: 800, fontSize: "clamp(28px, 6vw, 44px)", color: "var(--brc-text)", margin: 0 }}>
              Notifications
            </h1>
            <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, color: "var(--brc-text-muted)", margin: 0 }}>
              {unreadCount} unread {unreadCount === 1 ? "notification" : "notifications"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: 46,
                padding: "0 20px",
                borderRadius: "var(--brc-radius-sm)",
                border: "none",
                background: "var(--brc-primary)",
                color: "#fff",
                fontFamily: "var(--brc-font-ui)",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                opacity: markAllRead.isPending ? 0.5 : 1,
              }}
            >
              <Icon name="check" size={16} stroke="#fff" />
              Mark All as Read
            </button>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
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
              gap: 16,
            }}
          >
            <Icon name="bell" size={40} stroke="var(--brc-border)" strokeWidth={1.5} />
            <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 15, color: "var(--brc-text-muted)" }}>
              You have no notifications yet.
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {notifications.map((n) => (
              <NotificationCard key={n.id} n={n} role={role} onRead={handleRead} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
