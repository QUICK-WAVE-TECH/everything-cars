"use client";

import { useState } from "react";

export type FilterOption = { value: string; label: string };
export type FilterField = { key: string; label: string; options: FilterOption[] };
export type FilterValues = Record<string, string>;

type FilterPopoverProps = {
  fields: FilterField[];
  values: FilterValues;
  onApply: (values: FilterValues) => void;
};

const selectStyle: React.CSSProperties = {
  height: 40,
  borderRadius: "var(--brc-radius-sm)",
  border: "1px solid var(--brc-border)",
  background: "var(--brc-bg-subtle)",
  padding: "0 12px",
  fontFamily: "var(--brc-font-ui)",
  fontSize: 13,
  color: "var(--brc-text)",
  outline: "none",
  width: "100%",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2397989A' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
};

export function FilterPopover({ fields, values, onApply }: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterValues>(values);

  function openPopover() {
    setDraft(values);
    setOpen((o) => !o);
  }

  function apply() {
    onApply(draft);
    setOpen(false);
  }

  function reset() {
    const cleared: FilterValues = {};
    fields.forEach((f) => (cleared[f.key] = ""));
    setDraft(cleared);
    onApply(cleared);
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={openPopover}
        className="brc-button-motion-subtle"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          height: 44,
          padding: "0 18px",
          borderRadius: "var(--brc-radius-pill)",
          border: "1px solid var(--brc-border)",
          background: "#fff",
          cursor: "pointer",
          fontFamily: "var(--brc-font-ui)",
          fontSize: 14,
          fontWeight: 600,
          color: "var(--brc-text)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="7" y1="12" x2="17" y2="12" />
          <line x1="10" y1="18" x2="14" y2="18" />
        </svg>
        Filter
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 10px)",
              right: 0,
              zIndex: 50,
              width: 260,
              background: "#fff",
              border: "1px solid var(--brc-border)",
              borderRadius: "var(--brc-radius-md)",
              boxShadow: "var(--brc-shadow-md)",
              padding: 18,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 15, color: "var(--brc-text)" }}>Filter</span>
              <button onClick={() => setOpen(false)} aria-label="Close filter" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--brc-text-muted)", display: "flex" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {fields.map((field) => (
              <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-secondary)" }}>{field.label}</span>
                  <button
                    onClick={() => setDraft((d) => ({ ...d, [field.key]: "" }))}
                    style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--brc-font-ui)", fontSize: 12, color: "var(--brc-primary)", fontWeight: 600 }}
                  >
                    Clear
                  </button>
                </div>
                <select value={draft[field.key] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))} style={selectStyle}>
                  <option value="">Select</option>
                  {field.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                onClick={reset}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: "var(--brc-radius-sm)",
                  border: "1px solid var(--brc-border)",
                  background: "var(--brc-bg-muted)",
                  cursor: "pointer",
                  fontFamily: "var(--brc-font-ui)",
                  fontWeight: 600,
                  fontSize: 14,
                  color: "var(--brc-text)",
                }}
              >
                Reset
              </button>
              <button
                onClick={apply}
                className="brc-button-motion"
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: "var(--brc-radius-sm)",
                  border: "none",
                  background: "var(--brc-secondary)",
                  cursor: "pointer",
                  fontFamily: "var(--brc-font-ui)",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#fff",
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
