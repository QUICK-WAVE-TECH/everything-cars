"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/features/auth/components/icon";
import type { IconName } from "@/features/auth/components/icon";
import { CustomerStats } from "@/features/requests";
import { useMe } from "@/features/auth/api";

type QuickLink = {
  label: string;
  icon: IconName;
  href: string;
  bg: string;
  fg: string;
};

const QUICK_LINKS: QuickLink[] = [
  { label: "Browse Cars", icon: "car", href: "/customer/listings", bg: "var(--brc-primary-tint)", fg: "var(--brc-primary)" },
  { label: "My Requests", icon: "clock", href: "/customer/requests", bg: "var(--brc-bg-muted)", fg: "var(--brc-text-secondary)" },
  { label: "View Transactions", icon: "banknote", href: "/customer/transactions", bg: "var(--brc-success-bg)", fg: "var(--brc-success)" },
  { label: "Loyalty Reward Center", icon: "gift", href: "/customer/loyalty", bg: "var(--brc-accent-bg)", fg: "var(--brc-accent)" },
];

type RequestStatus = "approved" | "pending";

type RecentRequest = {
  id: number;
  car: string;
  party: string;
  mode: "Rent" | "Buy";
  days?: number;
  price: number;
  status: RequestStatus;
  note: string;
  action?: { label: string; href: string };
};

const RECENT_REQUESTS: RecentRequest[] = [
  {
    id: 1,
    car: "Lexus NX 300h",
    party: "Hilary Emmanuel",
    mode: "Rent",
    days: 5,
    price: 175000,
    status: "approved",
    note: "Approved by Owner",
    action: { label: "Proceed to payment", href: "/customer/payments" },
  },
  {
    id: 2,
    car: "Lexus NX 300h",
    party: "Hilary Emmanuel",
    mode: "Rent",
    days: 5,
    price: 175000,
    status: "pending",
    note: "Waiting for owner approval",
  },
  {
    id: 3,
    car: "Lexus NX 300h",
    party: "Premium Auto Gallery",
    mode: "Buy",
    price: 16000000,
    status: "pending",
    note: "Waiting for owner approval",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function naira(n: number): string {
  return `₦${n.toLocaleString("en-NG")}`;
}

function greetingFor(hour: number): string {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

const noopSubscribe = () => () => {};

/** Time-based greeting computed on the client; renders a stable value on the server. */
function useGreeting(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => greetingFor(new Date().getHours()),
    () => "Welcome",
  );
}

const STATUS_STYLES: Record<RequestStatus, { label: string; bg: string; fg: string }> = {
  approved: { label: "Approved", bg: "var(--brc-success-bg)", fg: "var(--brc-success)" },
  pending: { label: "Pending", bg: "var(--brc-warning-bg)", fg: "#9a7400" },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const cardBase: React.CSSProperties = {
  background: "#fff",
  border: "1px solid var(--brc-border)",
  borderRadius: "var(--brc-radius-lg)",
};

function QuickLinkTile({ link }: { link: QuickLink }) {
  return (
    <Link
      href={link.href}
      className="brc-button-motion-subtle"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "16px 18px",
        borderRadius: "var(--brc-radius-md)",
        background: link.bg,
        color: link.fg,
        textDecoration: "none",
        fontFamily: "var(--brc-font-ui)",
        fontWeight: 600,
        fontSize: 14,
      }}
    >
      <span>{link.label}</span>
      <Icon name={link.icon} size={18} stroke={link.fg} />
    </Link>
  );
}

function RequestRow({ req, last }: { req: RecentRequest; last: boolean }) {
  const status = STATUS_STYLES[req.status];
  return (
    <div style={{ paddingBottom: last ? 0 : 18, borderBottom: last ? "none" : "1px solid var(--brc-border)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        {/* Thumbnail */}
        <div
          style={{
            width: 72,
            height: 64,
            borderRadius: "var(--brc-radius-sm)",
            border: "1px solid var(--brc-border)",
            background: "var(--brc-bg-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <Image src="/car-lexus.png" alt={req.car} width={68} height={44} style={{ width: "88%", height: "auto", objectFit: "contain" }} />
        </div>

        {/* Details */}
        <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 16, color: "var(--brc-text)" }}>
            {req.car}
          </span>
          <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-muted)" }}>
            {req.party}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              fontFamily: "var(--brc-font-ui)",
              fontSize: 13,
              color: "var(--brc-text-secondary)",
            }}
          >
            <span>{req.mode}</span>
            {req.days != null && (
              <>
                <span style={{ color: "var(--brc-border-strong)" }}>&bull;</span>
                <span>{req.days} days</span>
              </>
            )}
            <span style={{ color: "var(--brc-border-strong)" }}>&bull;</span>
            <span style={{ fontWeight: 700, color: "var(--brc-primary)" }}>{naira(req.price)}</span>
          </div>
        </div>

        {/* Status badge */}
        <span
          style={{
            fontFamily: "var(--brc-font-ui)",
            fontWeight: 600,
            fontSize: 12,
            padding: "4px 12px",
            borderRadius: "var(--brc-radius-pill)",
            background: status.bg,
            color: status.fg,
            flexShrink: 0,
          }}
        >
          {status.label}
        </span>
      </div>

      {/* Footer line */}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-muted)" }}>
          {req.note}
        </span>
        {req.action && (
          <Link
            href={req.action.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--brc-font-ui)",
              fontWeight: 700,
              fontSize: 14,
              color: "var(--brc-primary)",
              textDecoration: "none",
            }}
          >
            {req.action.label}
            <Icon name="arrow" size={16} stroke="var(--brc-primary)" />
          </Link>
        )}
      </div>
    </div>
  );
}

function PanelCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ ...cardBase, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
      <h2 style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 18, color: "var(--brc-text)", margin: 0 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CustomerDashboard() {
  const greeting = useGreeting();
  const { data: user } = useMe();
  const firstName = user?.name?.split(" ")[0] || "";

  return (
    <div
      style={{
        maxWidth: 1232,
        margin: "0 auto",
        width: "100%",
        padding: "clamp(28px, 5vw, 48px) clamp(20px, 8vw, 104px) 64px",
        display: "flex",
        flexDirection: "column",
        gap: 28,
      }}
    >
      {/* Greeting */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1 style={{ fontFamily: "var(--brc-font-display)", fontWeight: 800, fontSize: "clamp(28px, 6vw, 44px)", color: "var(--brc-text)", margin: 0 }}>
          {greeting}, {firstName}
        </h1>
        <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, color: "var(--brc-text-muted)", margin: 0 }}>
          Here&apos;s what&apos;s happening with your requests
        </p>
      </div>

      {/* Stat cards */}
      <CustomerStats />

      {/* Quick Links */}
      <PanelCard title="Quick Links">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            gap: "clamp(12px, 2vw, 16px)",
          }}
        >
          {QUICK_LINKS.map((link) => (
            <QuickLinkTile key={link.label} link={link} />
          ))}
        </div>
      </PanelCard>

      {/* Recent Requests */}
      <PanelCard title="Recent Requests">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {RECENT_REQUESTS.map((req, i) => (
            <RequestRow key={req.id} req={req} last={i === RECENT_REQUESTS.length - 1} />
          ))}
        </div>
      </PanelCard>
    </div>
  );
}
