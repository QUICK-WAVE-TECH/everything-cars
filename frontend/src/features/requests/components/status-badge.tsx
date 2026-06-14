import { Icon } from "@/features/auth/components/icon";

type RequestStatusKey = "pending" | "approved" | "rejected" | "cancelled" | "paid" | "active" | "completed";

type BadgeStyle = {
  defaultLabel: string;
  bg: string;
  fg: string;
};

const STATUS_CONFIG: Record<RequestStatusKey, BadgeStyle> = {
  pending: { defaultLabel: "Pending", bg: "var(--brc-warning-bg)", fg: "#9a7400" },
  approved: { defaultLabel: "Approved", bg: "var(--brc-success-bg)", fg: "var(--brc-success)" },
  rejected: { defaultLabel: "Rejected", bg: "var(--brc-danger-bg)", fg: "var(--brc-danger)" },
  cancelled: { defaultLabel: "Cancelled", bg: "var(--brc-bg-muted)", fg: "var(--brc-text-muted)" },
  paid: { defaultLabel: "Paid", bg: "var(--brc-accent-bg)", fg: "var(--brc-accent)" },
  active: { defaultLabel: "Active", bg: "var(--brc-primary-tint)", fg: "var(--brc-primary)" },
  completed: { defaultLabel: "Completed", bg: "var(--brc-success-bg)", fg: "var(--brc-success)" },
};

function StatusIcon({ status, color }: { status: string; color: string }) {
  if (status === "approved" || status === "completed") return <Icon name="check" size={13} stroke={color} />;
  if (status === "pending") return <Icon name="clock" size={13} stroke={color} />;
  if (status === "active") return <Icon name="car" size={13} stroke={color} />;
  if (status === "paid") return <Icon name="banknote" size={13} stroke={color} />;
  if (status === "cancelled") return <Icon name="plus" size={13} stroke={color} strokeWidth={2.5} />;
  // rejected — small x
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

type StatusBadgeProps = {
  status: string;
  label?: string;
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status as RequestStatusKey] ?? STATUS_CONFIG.pending;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "var(--brc-font-ui)",
        fontWeight: 600,
        fontSize: 12,
        padding: "4px 12px",
        borderRadius: "var(--brc-radius-pill)",
        background: cfg.bg,
        color: cfg.fg,
        whiteSpace: "nowrap",
      }}
    >
      <StatusIcon status={status} color={cfg.fg} />
      {label ?? cfg.defaultLabel}
    </span>
  );
}
