"use client";

import Image from "next/image";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Status pill mapping
// ---------------------------------------------------------------------------

export type RequestDetailStatus =
  | "awaiting-approval"
  | "new"
  | "accepted"
  | "awaiting-payment"
  | "paid"
  | "rejected"
  | "cancelled";

const STATUS_PILLS: Record<
  RequestDetailStatus,
  { bg: string; fg: string; label: string }
> = {
  "awaiting-approval": {
    bg: "var(--brc-warning-bg)",
    fg: "#B38601",
    label: "Awaiting Approval",
  },
  new: {
    bg: "var(--brc-primary-tint)",
    fg: "var(--brc-primary)",
    label: "New Request",
  },
  accepted: {
    bg: "var(--brc-success-bg)",
    fg: "var(--brc-success)",
    label: "Accepted",
  },
  "awaiting-payment": {
    bg: "var(--brc-warning-bg)",
    fg: "#B38601",
    label: "Awaiting Payment",
  },
  paid: {
    bg: "var(--brc-success-bg)",
    fg: "var(--brc-success)",
    label: "Payment made",
  },
  rejected: {
    bg: "var(--brc-danger-bg)",
    fg: "var(--brc-danger)",
    label: "Rejected",
  },
  cancelled: {
    bg: "var(--brc-bg-muted)",
    fg: "var(--brc-text-muted)",
    label: "Cancelled",
  },
};

// ---------------------------------------------------------------------------
// StatusPill
// ---------------------------------------------------------------------------

export function StatusPill({ status }: { status: RequestDetailStatus }) {
  const pill = STATUS_PILLS[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--brc-font-ui)",
        fontWeight: 600,
        fontSize: 13,
        padding: "5px 14px",
        borderRadius: "var(--brc-radius-pill)",
        background: pill.bg,
        color: pill.fg,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: pill.fg,
          flexShrink: 0,
        }}
      />
      {pill.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// SpecRow
// ---------------------------------------------------------------------------

export function SpecRow({ cols }: { cols: [string, string][] }) {
  return (
    <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
      {cols.map(([k, v]) => (
        <div
          key={k}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            minWidth: 78,
          }}
        >
          <span
            style={{
              fontFamily: "var(--brc-font-ui)",
              fontSize: 13,
              color: "var(--brc-text-muted)",
            }}
          >
            {k}
          </span>
          <span
            style={{
              fontFamily: "var(--brc-font-ui)",
              fontSize: 15,
              fontWeight: 600,
              color: "var(--brc-text)",
            }}
          >
            {v}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActionButton
// ---------------------------------------------------------------------------

export type ActionButtonKind = "dark" | "accent" | "success" | "secondary";

type ActionButtonProps = {
  children: ReactNode;
  kind?: ActionButtonKind;
  onClick?: () => void;
  full?: boolean;
};

const KIND_STYLES: Record<
  ActionButtonKind,
  { bg: string; color: string; border?: string }
> = {
  dark: { bg: "var(--brc-secondary)", color: "#fff" },
  accent: {
    bg: "var(--brc-accent)",
    color: "#fff",
  },
  success: { bg: "var(--brc-success)", color: "#fff" },
  secondary: {
    bg: "#fff",
    color: "var(--brc-text)",
    border: "1.5px solid var(--brc-border-strong)",
  },
};

export function ActionButton({
  children,
  kind = "dark",
  onClick,
  full = false,
}: ActionButtonProps) {
  const s = KIND_STYLES[kind];
  return (
    <button
      onClick={onClick}
      className="brc-button-motion"
      style={{
        height: 52,
        width: full ? "100%" : undefined,
        minWidth: 160,
        paddingLeft: 28,
        paddingRight: 28,
        borderRadius: 10,
        border: s.border ?? "none",
        background: s.bg,
        color: s.color,
        fontFamily: "var(--brc-font-ui)",
        fontWeight: 600,
        fontSize: 16,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// RequestDetailCard
// ---------------------------------------------------------------------------

export type RequestDetailCardProps = {
  carName: string;
  partyLabel: string; // "Owner" or "Customer"
  partyName: string;
  status: RequestDetailStatus;
  specRows: [string, string][][]; // array of rows, each row is array of [label, value]
  actions: ReactNode;
  imageSrc?: string;
};

export function RequestDetailCard({
  carName,
  partyLabel,
  partyName,
  status,
  specRows,
  actions,
  imageSrc = "/car-lexus.png",
}: RequestDetailCardProps) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid var(--brc-border)",
        borderRadius: "var(--brc-radius-lg)",
        padding: "clamp(18px, 3vw, 32px)",
        boxShadow: "var(--brc-shadow-xs)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "clamp(20px, 4vw, 40px)",
          flexWrap: "wrap",
          alignItems: "stretch",
        }}
      >
        {/* Car image */}
        <div
          style={{
            width: "clamp(220px, 28vw, 280px)",
            minHeight: 220,
            flexShrink: 0,
            borderRadius: 12,
            background: "var(--brc-bg-subtle)",
            border: "1px solid var(--brc-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <Image
            src={imageSrc}
            alt={carName}
            width={260}
            height={170}
            unoptimized
            style={{ width: "90%", height: "auto", objectFit: "contain" }}
          />
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            minWidth: 260,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <h2
                style={{
                  fontFamily: "var(--brc-font-ui)",
                  fontWeight: 700,
                  fontSize: 24,
                  color: "var(--brc-text)",
                  margin: 0,
                }}
              >
                {carName}
              </h2>
              <span
                style={{
                  fontFamily: "var(--brc-font-ui)",
                  fontSize: 14,
                  color: "var(--brc-text-secondary)",
                }}
              >
                {partyLabel}: {partyName}
              </span>
            </div>
            <StatusPill status={status} />
          </div>

          {/* Spec rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {specRows.map((row, i) => (
              <SpecRow key={i} cols={row} />
            ))}
          </div>

          {/* Divider */}
          <hr
            style={{
              border: "none",
              borderTop: "1px solid var(--brc-border)",
              margin: 0,
            }}
          />

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {actions}
          </div>
        </div>
      </div>
    </section>
  );
}
