"use client";

import { useState } from "react";
import { Icon } from "@/features/auth/components/icon";

type Notification = {
  id: number;
  title: string;
  message: string;
  date: string;
  read: boolean;
};

const INITIAL: Notification[] = [
  { id: 1, title: "Purchase Request Submitted", message: "Your purchase offer for 2023 Mercedes-Benz E-Class has been submitted.", date: "25/10/2025", read: false },
  { id: 2, title: "Rental Request Submitted", message: "Your rental request for 2022 Lexus RX 350 F Sport has been submitted and is pending owner approval.", date: "25/10/2025", read: false },
  { id: 3, title: "Welcome to Buy & Rent Cars!", message: "Your account has been set up successfully. You received 100 welcome loyalty points!", date: "25/10/2025", read: false },
  { id: 4, title: "Per Rental Day", message: "Your rental request for 2022 Lexus RX 350 F Sport has been submitted and is pending owner approval.", date: "25/10/2025", read: true },
  { id: 5, title: "Per Rental Day", message: "Your rental request for 2022 Lexus RX 350 F Sport has been submitted and is pending owner approval.", date: "25/10/2025", read: true },
];

function NotificationCard({
  n,
  onRead,
  onDelete,
}: {
  n: Notification;
  onRead: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--brc-border)",
        borderLeft: `4px solid ${n.read ? "var(--brc-border)" : "var(--brc-primary)"}`,
        borderRadius: "var(--brc-radius-md)",
        boxShadow: "var(--brc-shadow-xs)",
        padding: "18px 20px",
        display: "flex",
        gap: 14,
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: "var(--brc-radius-sm)",
          background: n.read ? "var(--brc-bg-muted)" : "var(--brc-primary-tint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name="bell" size={18} stroke={n.read ? "var(--brc-text-muted)" : "var(--brc-primary)"} />
      </span>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 16, color: "var(--brc-text)" }}>{n.title}</span>
          <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 12, color: "var(--brc-text-muted)", whiteSpace: "nowrap" }}>{n.date}</span>
        </div>
        <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 14, color: "var(--brc-text-muted)", margin: 0, lineHeight: 1.5 }}>{n.message}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 4 }}>
          {!n.read && (
            <button
              onClick={onRead}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--brc-font-ui)", fontWeight: 600, fontSize: 13, color: "var(--brc-primary)" }}
            >
              Mark as read
            </button>
          )}
          <button
            onClick={onDelete}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--brc-font-ui)", fontWeight: 600, fontSize: 13, color: "var(--brc-danger)" }}
          >
            <Icon name="trash" size={15} stroke="var(--brc-danger)" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>(INITIAL);

  const unread = items.filter((n) => !n.read).length;

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id: number) => setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const remove = (id: number) => setItems((prev) => prev.filter((n) => n.id !== id));

  return (
    <div style={{ background: "var(--brc-bg-subtle)" }}>
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
              {unread} unread {unread === 1 ? "notification" : "notifications"}
            </p>
          </div>
          <button
            onClick={markAllRead}
            disabled={unread === 0}
            className="brc-button-motion"
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
              cursor: unread === 0 ? "not-allowed" : "pointer",
              opacity: unread === 0 ? 0.5 : 1,
            }}
          >
            <Icon name="check" size={16} stroke="#fff" />
            Mark as Read
          </button>
        </div>

        {/* List */}
        {items.length === 0 ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--brc-border)",
              borderRadius: "var(--brc-radius-lg)",
              padding: "60px 20px",
              textAlign: "center",
              fontFamily: "var(--brc-font-ui)",
              fontSize: 15,
              color: "var(--brc-text-muted)",
            }}
          >
            You have no notifications.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {items.map((n) => (
              <NotificationCard key={n.id} n={n} onRead={() => markRead(n.id)} onDelete={() => remove(n.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
