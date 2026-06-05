"use client";

import { useState } from "react";

export type RowMenuItem = {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
};

type RowMenuProps = {
  items: RowMenuItem[];
};

/** A "⋮" actions menu for table rows. Manages its own open state. */
export function RowMenu({ items }: RowMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Row actions"
        aria-expanded={open}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--brc-text-muted)", display: "inline-flex", padding: 4 }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div
            style={{
              position: "absolute",
              top: "calc(100% - 4px)",
              right: 0,
              zIndex: 50,
              width: 170,
              background: "#fff",
              border: "1px solid var(--brc-border)",
              borderRadius: "var(--brc-radius-md)",
              boxShadow: "var(--brc-shadow-md)",
              padding: 6,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "9px 10px",
                  borderRadius: "var(--brc-radius-sm)",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontFamily: "var(--brc-font-ui)",
                  fontSize: 13,
                  color: "var(--brc-text)",
                  textAlign: "left",
                }}
              >
                {item.label}
                {item.icon}
              </button>
            ))}
          </div>
        </>
      )}
    </span>
  );
}
