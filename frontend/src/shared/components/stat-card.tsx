import { Icon } from "@/features/auth/components/icon";
import type { IconName } from "@/features/auth/components/icon";

export type StatCardProps = {
  label: string;
  value: string;
  unit?: string;
  icon: IconName;
  /** Icon circle background + bottom accent colour (a CSS colour or var). */
  color: string;
};

export function StatCard({ label, value, unit, icon, color }: StatCardProps) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--brc-border)",
        borderRadius: "var(--brc-radius-lg)",
        padding: "18px 20px",
        borderBottom: `3px solid ${color}`,
        boxShadow: "var(--brc-shadow-xs)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: "var(--brc-radius-pill)",
            background: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={20} stroke="#fff" />
        </span>
        <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 14, color: "var(--brc-text-muted)" }}>
          {label}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: "var(--brc-font-display)", fontWeight: 800, fontSize: 30, color: "var(--brc-text)" }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 14, color: "var(--brc-text-muted)" }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
