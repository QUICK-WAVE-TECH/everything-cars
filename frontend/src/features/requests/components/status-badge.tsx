import { Icon } from "@/features/auth/components/icon";
import type { RequestStatus } from "../data";

type BadgeStyle = {
  defaultLabel: string;
  bg: string;
  fg: string;
};

const STATUS_CONFIG: Record<RequestStatus, BadgeStyle> = {
  approved: { defaultLabel: "Approved", bg: "var(--brc-success-bg)", fg: "var(--brc-success)" },
  pending: { defaultLabel: "Pending", bg: "var(--brc-warning-bg)", fg: "#9a7400" },
  rejected: { defaultLabel: "Rejected", bg: "var(--brc-danger-bg)", fg: "var(--brc-danger)" },
};

function StatusIcon({ status, color }: { status: RequestStatus; color: string }) {
  if (status === "approved") return <Icon name="check" size={13} stroke={color} />;
  if (status === "pending") return <Icon name="clock" size={13} stroke={color} />;
  // rejected — small x
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

type StatusBadgeProps = {
  status: RequestStatus;
  /** Override the displayed text (e.g. "Accepted", "Awaiting Approval"). */
  label?: string;
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
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
