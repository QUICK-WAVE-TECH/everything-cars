"use client";

type AvailabilityBadgeProps = {
  status: "available" | "rented" | "reserved" | "sold";
  availableFrom?: string | null;
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const BADGE_CONFIG: Record<
  AvailabilityBadgeProps["status"],
  { dot: string; fg: string; bg: string; border?: string }
> = {
  available: { dot: "var(--brc-success)", fg: "var(--brc-success)", bg: "var(--brc-success-bg)" },
  rented: { dot: "#9a7400", fg: "#9a7400", bg: "var(--brc-warning-bg)" },
  reserved: { dot: "var(--brc-accent)", fg: "var(--brc-accent)", bg: "var(--brc-accent-bg)" },
  sold: { dot: "var(--brc-text-muted)", fg: "var(--brc-text-muted)", bg: "var(--brc-bg-subtle)", border: "1px solid var(--brc-border)" },
};

const BADGE_LABELS: Record<AvailabilityBadgeProps["status"], string> = {
  available: "Available",
  rented: "Currently Rented",
  reserved: "Reserved",
  sold: "Sold",
};

export function AvailabilityBadge({ status, availableFrom }: AvailabilityBadgeProps) {
  const cfg = BADGE_CONFIG[status];
  let label = BADGE_LABELS[status];

  if (status === "rented" && availableFrom) {
    label = `Rented until ${formatDate(availableFrom)}`;
  }
  if (status === "reserved" && availableFrom) {
    label = `Reserved until ${formatDate(availableFrom)}`;
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--brc-font-ui)",
        fontSize: 12,
        fontWeight: 600,
        color: cfg.fg,
        background: cfg.bg,
        borderRadius: "var(--brc-radius-pill)",
        padding: "3px 10px",
        border: cfg.border ?? "none",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
