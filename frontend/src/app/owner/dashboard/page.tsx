"use client";

import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/features/auth/components/icon";
import type { IconName } from "@/features/auth/components/icon";
import { useMe } from "@/features/auth/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StatTile = {
  icon: IconName;
  label: string;
  value: string;
  accent: string;
};

type QuickLink = {
  label: string;
  icon: IconName;
  href: string;
  bg: string;
  fg: string;
  border?: boolean;
};

type RequestStatus = "approved" | "pending";

type IncomingRequest = {
  id: number;
  car: string;
  renter: string;
  kind: "Rent" | "Buy";
  duration?: string;
  amount: string;
  status: RequestStatus;
};

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const OWNER_STATS: StatTile[] = [
  { icon: "car",       label: "Listed Cars",        value: "5",      accent: "var(--brc-primary)"  },
  { icon: "clock",     label: "Pending Requests",   value: "3",      accent: "var(--brc-warning)"  },
  { icon: "handshake", label: "Approved Requests",  value: "8",      accent: "var(--brc-success)"  },
  { icon: "banknote",  label: "Total Earnings",     value: "₦1.2M",  accent: "var(--brc-accent)"   },
];

const OWNER_QUICK_LINKS: QuickLink[] = [
  { label: "My Cars",           icon: "car",      href: "/owner/my-cars",      bg: "var(--brc-primary-tint)", fg: "var(--brc-primary)"        },
  { label: "Incoming Requests", icon: "clock",    href: "/owner/requests",     bg: "var(--brc-bg-muted)",     fg: "var(--brc-text-secondary)", border: true },
  { label: "Transactions",      icon: "banknote", href: "/owner/transactions", bg: "var(--brc-success-bg)",   fg: "var(--brc-success)"        },
  { label: "Loyalty Rewards",   icon: "gift",     href: "/owner/loyalty",      bg: "#F9F0E9",                 fg: "var(--brc-accent)"         },
];

const RECENT_REQUESTS: IncomingRequest[] = [
  { id: 1, car: "Lexus NX 300h",   renter: "Chika Akor",    kind: "Rent", duration: "5 days", amount: "₦175,000",    status: "approved" },
  { id: 2, car: "Toyota RAV4",     renter: "John Adewara",  kind: "Rent", duration: "3 days", amount: "₦126,000",    status: "pending"  },
  { id: 3, car: "Mercedes C300",   renter: "Aisha Bello",   kind: "Buy",                      amount: "₦24,000,000", status: "pending"  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function greetingFor(hour: number): string {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

const noopSubscribe = () => () => {};

function useGreeting(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => greetingFor(new Date().getHours()),
    () => "Welcome",
  );
}

const STATUS_STYLES: Record<RequestStatus, { label: string; bg: string; fg: string }> = {
  approved: { label: "Approved", bg: "var(--brc-success-bg)", fg: "var(--brc-success)" },
  pending:  { label: "Pending",  bg: "var(--brc-warning-bg)", fg: "#9a7400"             },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const cardBase: React.CSSProperties = {
  background: "#fff",
  border: "1px solid var(--brc-border)",
  borderRadius: 18,
  boxShadow: "0 2px 4px rgba(18,18,18,0.04)",
};

/** Upgraded stat tile with corner glow + tinted icon box. */
function StatTile({ tile }: { tile: StatTile }) {
  const iconBg = `color-mix(in srgb, ${tile.accent} 14%, #fff)`;
  return (
    <div style={{ ...cardBase, padding: "20px 22px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Corner glow */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: -32,
          right: -32,
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${tile.accent} 0%, transparent 70%)`,
          opacity: 0.08,
          pointerEvents: "none",
        }}
      />

      {/* Icon + label row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            background: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name={tile.icon} size={20} stroke={tile.accent} />
        </span>
        <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--brc-text-muted)" }}>
          {tile.label}
        </span>
      </div>

      {/* Value */}
      <span style={{ fontFamily: "var(--brc-font-display)", fontWeight: 800, fontSize: 34, color: "var(--brc-text)", lineHeight: 1 }}>
        {tile.value}
      </span>
    </div>
  );
}

/** Quick-link tile with color-inversion hover. */
function QuickLinkTile({ link }: { link: QuickLink }) {
  const [hovered, setHovered] = useState(false);

  const bg    = hovered ? link.fg  : link.bg;
  const color = hovered ? "#fff"   : link.fg;
  const shadow = hovered ? "0 12px 28px rgba(18,18,18,0.14)" : "none";
  const lift   = hovered ? "translateY(-3px)" : "translateY(0)";
  const border = link.border ? `1px solid ${hovered ? "transparent" : "var(--brc-border)"}` : "none";

  return (
    <Link
      href={link.href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "18px 20px",
        borderRadius: 14,
        background: bg,
        color,
        textDecoration: "none",
        border,
        boxShadow: shadow,
        transform: lift,
        transition: "transform .3s cubic-bezier(.22,.61,.36,1), background .3s ease, color .3s ease, box-shadow .3s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            background: hovered ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background .3s ease",
          }}
        >
          <Icon name={link.icon} size={20} stroke={color} />
        </span>
        <span style={{ opacity: hovered ? 1 : 0, transition: "opacity .25s ease" }}>
          <Icon name="arrow" size={18} stroke={color} />
        </span>
      </div>
      <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 600, fontSize: 14 }}>
        {link.label}
      </span>
    </Link>
  );
}

/** Incoming request row with thumbnail + badge. */
function RequestRow({ req, last }: { req: IncomingRequest; last: boolean }) {
  const s = STATUS_STYLES[req.status];
  return (
    <div style={{ paddingBottom: last ? 0 : 20, borderBottom: last ? "none" : "1px solid var(--brc-border)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        {/* Car thumbnail */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 6,
            border: "1px solid var(--brc-border)",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <Image
            src="/car-lexus.png"
            alt={req.car}
            width={76}
            height={52}
            style={{ width: "90%", height: "auto", objectFit: "contain" }}
          />
        </div>

        {/* Details */}
        <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 18, color: "var(--brc-text)" }}>
            {req.car}
          </span>
          <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 14, color: "var(--brc-text-muted)" }}>
            {req.renter}
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
            <span>{req.kind}</span>
            {req.duration && (
              <>
                <span style={{ color: "var(--brc-border-strong)" }}>&bull;</span>
                <span>{req.duration}</span>
              </>
            )}
            <span style={{ color: "var(--brc-border-strong)" }}>&bull;</span>
            <span style={{ fontWeight: 700, color: "var(--brc-primary)" }}>{req.amount}</span>
          </div>
        </div>

        {/* Status badge — top-right */}
        <span
          style={{
            fontFamily: "var(--brc-font-ui)",
            fontWeight: 600,
            fontSize: 12,
            padding: "4px 12px",
            borderRadius: "var(--brc-radius-pill)",
            background: s.bg,
            color: s.fg,
            flexShrink: 0,
            alignSelf: "flex-start",
          }}
        >
          {s.label}
        </span>
      </div>

      {/* Footer */}
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
          {req.status === "approved" ? "Approved — awaiting payment from renter" : "Waiting for your approval"}
        </span>
        {req.status === "approved" && (
          <Link
            href="/owner/requests"
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
            View request
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

export default function OwnerDashboard() {
  const greeting = useGreeting();
  const { data: user } = useMe();
  const firstName = user?.first_name || "";

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
          Here&apos;s what&apos;s happening with your listings
        </p>
      </div>

      {/* Stat tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: "clamp(14px, 2vw, 20px)",
        }}
      >
        {OWNER_STATS.map((tile) => (
          <StatTile key={tile.label} tile={tile} />
        ))}
      </div>

      {/* Quick Links */}
      <PanelCard title="Quick Links">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
            gap: "clamp(12px, 2vw, 16px)",
          }}
        >
          {OWNER_QUICK_LINKS.map((link) => (
            <QuickLinkTile key={link.label} link={link} />
          ))}
        </div>
      </PanelCard>

      {/* Recent Incoming Requests */}
      <PanelCard title="Recent Requests">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {RECENT_REQUESTS.map((req, i) => (
            <RequestRow key={req.id} req={req} last={i === RECENT_REQUESTS.length - 1} />
          ))}
        </div>
      </PanelCard>
    </div>
  );
}
