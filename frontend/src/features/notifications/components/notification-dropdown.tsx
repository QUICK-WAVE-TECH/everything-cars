"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/features/auth/components/icon";
import type { IconName } from "@/features/auth/components/icon";
import { formatRelativeDate } from "@/shared/utils/format";
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
} from "@/features/notifications/api";
import type { NotificationItem, NotificationType } from "@/features/notifications/api";
import type { UserRole } from "@/shared/types";

// ── Icon mapping ─────────────────────────────────────────────────────────────

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
  payment_submitted: "banknote",
  payment_confirmed: "banknote",
  rental_active: "car",
  rental_completed: "check",
  system: "bell",
};

// ── Navigation helper ─────────────────────────────────────────────────────────

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

    case "system":
    default:
      return `/${role}/dashboard`;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

type NotificationRowProps = {
  notification: NotificationItem;
  role: UserRole;
  onRead: (id: string, href: string) => void;
};

function NotificationRow({ notification, role, onRead }: NotificationRowProps) {
  const icon = TYPE_ICON[notification.notification_type] ?? "bell";
  const href = resolveHref(notification, role);

  return (
    <button
      onClick={() => onRead(notification.id, href)}
      style={{
        display: "flex",
        gap: 12,
        width: "100%",
        textAlign: "left",
        background: notification.is_read ? "transparent" : "var(--brc-bg-subtle)",
        border: "none",
        borderLeft: notification.is_read ? "3px solid transparent" : "3px solid var(--brc-primary)",
        padding: "12px 16px",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--brc-bg-subtle)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = notification.is_read
          ? "transparent"
          : "var(--brc-bg-subtle)";
      }}
    >
      {/* Icon */}
      <span
        style={{
          flexShrink: 0,
          width: 34,
          height: 34,
          borderRadius: "var(--brc-radius-pill)",
          background: "var(--brc-bg-subtle)",
          border: "1px solid var(--brc-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={16} stroke="var(--brc-text-secondary)" />
      </span>

      {/* Text */}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontFamily: "var(--brc-font-ui)",
            fontSize: 13,
            fontWeight: notification.is_read ? 400 : 600,
            color: "var(--brc-text)",
            lineHeight: 1.4,
            marginBottom: 2,
          }}
        >
          {notification.title}
        </span>
        <span
          style={{
            display: "block",
            fontFamily: "var(--brc-font-ui)",
            fontSize: 12,
            color: "var(--brc-text-secondary)",
            lineHeight: 1.4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {notification.message}
        </span>
        <span
          style={{
            display: "block",
            fontFamily: "var(--brc-font-ui)",
            fontSize: 11,
            color: "var(--brc-text-secondary)",
            marginTop: 4,
            opacity: 0.7,
          }}
        >
          {formatRelativeDate(notification.created_at)}
        </span>
      </span>
    </button>
  );
}

// ── Main Dropdown ─────────────────────────────────────────────────────────────

type NotificationDropdownProps = {
  role: UserRole;
  unreadCount: number;
};

export function NotificationDropdown({ role, unreadCount }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data, isLoading } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const notifications = data?.results.slice(0, 10) ?? [];
  const hasUnread = unreadCount > 0;

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleNotificationClick(id: string, href: string) {
    markRead.mutate(id);
    setOpen(false);
    router.push(href);
  }

  function handleMarkAllRead() {
    markAllRead.mutate();
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Bell trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-expanded={open}
        className="brc-button-motion-icon"
        style={{
          position: "relative",
          width: 40,
          height: 40,
          borderRadius: "var(--brc-radius-pill)",
          border: "1px solid var(--brc-border)",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <Icon name="bell" size={20} stroke="var(--brc-text)" />

        {/* Unread badge */}
        {hasUnread && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: unreadCount > 9 ? 5 : 7,
              right: unreadCount > 9 ? 4 : 7,
              minWidth: unreadCount > 9 ? 18 : 8,
              height: unreadCount > 9 ? 18 : 8,
              borderRadius: "var(--brc-radius-pill)",
              background: "var(--brc-danger)",
              border: "1.5px solid #fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--brc-font-ui)",
              fontSize: 10,
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1,
              padding: unreadCount > 9 ? "0 3px" : 0,
            }}
          >
            {unreadCount > 9 ? "9+" : null}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            zIndex: 200,
            width: 360,
            maxHeight: 480,
            background: "#fff",
            border: "1px solid var(--brc-border)",
            borderRadius: "var(--brc-radius-md)",
            boxShadow: "var(--brc-shadow-md)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderBottom: "1px solid var(--brc-border)",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "var(--brc-font-display)",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--brc-text)",
              }}
            >
              Notifications
              {hasUnread && (
                <span
                  style={{
                    marginLeft: 8,
                    background: "var(--brc-danger)",
                    color: "#fff",
                    borderRadius: "var(--brc-radius-pill)",
                    fontFamily: "var(--brc-font-ui)",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "1px 7px",
                    verticalAlign: "middle",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </span>

            {hasUnread && (
              <button
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
                style={{
                  fontFamily: "var(--brc-font-ui)",
                  fontSize: 12,
                  color: "var(--brc-primary)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 0",
                  opacity: markAllRead.isPending ? 0.5 : 1,
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {isLoading ? (
              <div
                style={{
                  padding: "40px 16px",
                  textAlign: "center",
                  fontFamily: "var(--brc-font-ui)",
                  fontSize: 13,
                  color: "var(--brc-text-secondary)",
                }}
              >
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div
                style={{
                  padding: "48px 16px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Icon name="bell" size={32} stroke="var(--brc-border)" strokeWidth={1.5} />
                <span
                  style={{
                    fontFamily: "var(--brc-font-ui)",
                    fontSize: 13,
                    color: "var(--brc-text-secondary)",
                  }}
                >
                  No notifications yet
                </span>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  role={role}
                  onRead={handleNotificationClick}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              borderTop: "1px solid var(--brc-border)",
              padding: "10px 16px",
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => {
                setOpen(false);
                router.push(`/${role}/notifications`);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "center",
                fontFamily: "var(--brc-font-ui)",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--brc-primary)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px 0",
              }}
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
