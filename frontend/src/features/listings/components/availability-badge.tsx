"use client";

type AvailabilityBadgeProps = {
  status: "available" | "rented" | "sold";
  availableFrom?: string | null;
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AvailabilityBadge({ status, availableFrom }: AvailabilityBadgeProps) {
  if (status === "available") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--brc-font-ui)",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--brc-success)",
          background: "var(--brc-success-bg)",
          borderRadius: "var(--brc-radius-pill)",
          padding: "3px 10px",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--brc-success)",
            flexShrink: 0,
          }}
        />
        Available
      </span>
    );
  }

  if (status === "rented") {
    const label = availableFrom
      ? `Rented until ${formatDate(availableFrom)}`
      : "Currently Rented";
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--brc-font-ui)",
          fontSize: 12,
          fontWeight: 600,
          color: "#9a7400",
          background: "var(--brc-warning-bg)",
          borderRadius: "var(--brc-radius-pill)",
          padding: "3px 10px",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#9a7400",
            flexShrink: 0,
          }}
        />
        {label}
      </span>
    );
  }

  // sold
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--brc-font-ui)",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--brc-text-muted)",
        background: "var(--brc-bg-subtle)",
        borderRadius: "var(--brc-radius-pill)",
        padding: "3px 10px",
        border: "1px solid var(--brc-border)",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "var(--brc-text-muted)",
          flexShrink: 0,
        }}
      />
      Sold
    </span>
  );
}
