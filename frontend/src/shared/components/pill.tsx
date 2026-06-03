type PillProps = { children: React.ReactNode; white?: boolean };

export function Pill({ children, white }: PillProps) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 8, opacity: 0.92,
      background: white ? "#fff" : "var(--brc-primary-tint)",
      border: "1px solid var(--brc-border-strong)",
      borderRadius: 100, padding: "4px 12px",
      fontFamily: "var(--brc-font-link)", fontSize: 14, color: "var(--brc-text)",
    }}>
      <i style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--brc-accent)" }} />
      {children}
    </span>
  );
}
