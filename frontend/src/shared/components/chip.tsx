export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: "var(--brc-bg-subtle)", borderRadius: 8,
      padding: "4px 10px", fontSize: 12, color: "var(--brc-text-secondary)",
    }}>
      {children}
    </span>
  );
}
