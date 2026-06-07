"use client";

import { Icon } from "@/features/auth/components/icon";

type PaginationProps = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

const arrowBtnStyle = (disabled: boolean): React.CSSProperties => ({
  width: 36,
  height: 36,
  borderRadius: "var(--brc-radius-sm)",
  border: "1px solid var(--brc-border)",
  background: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.4 : 1,
});

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 4, flexWrap: "wrap" }}>
      <button onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Previous page" style={arrowBtnStyle(page === 1)}>
        <Icon name="chevleft" size={16} stroke="var(--brc-text)" />
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          aria-current={p === page ? "page" : undefined}
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--brc-radius-sm)",
            border: `1px solid ${p === page ? "var(--brc-secondary)" : "var(--brc-border)"}`,
            background: p === page ? "var(--brc-secondary)" : "#fff",
            color: p === page ? "#fff" : "var(--brc-text)",
            fontFamily: "var(--brc-font-ui)",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          {p}
        </button>
      ))}

      <button onClick={() => onChange(page + 1)} disabled={page === totalPages} aria-label="Next page" style={arrowBtnStyle(page === totalPages)}>
        <Icon name="chevright" size={16} stroke="var(--brc-text)" />
      </button>
    </div>
  );
}
