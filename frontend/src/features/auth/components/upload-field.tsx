"use client";

import { Icon } from "./icon";

type UploadFieldProps = {
  label: string;
  hint: string;
  value?: string;
  onPick: () => void;
};

export function UploadField({ label, hint, value, onPick }: UploadFieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, color: "var(--brc-text)" }}>
        {label}
      </span>
      <button
        type="button"
        onClick={onPick}
        style={{
          minHeight: 150,
          borderRadius: 8,
          background: "var(--brc-bg-subtle)",
          border: "1px dashed var(--brc-border-strong)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: "28px 24px",
          cursor: "pointer",
          textAlign: "center",
        }}
      >
        <span
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "var(--brc-accent-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="upload" size={22} stroke="var(--brc-accent)" />
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontFamily: "var(--brc-font-ui)",
              fontWeight: 600,
              fontSize: 14,
              color: "var(--brc-text)",
            }}
          >
            {value || "Upload a file or drag and drop here"}
          </span>
          <span
            style={{
              fontFamily: "var(--brc-font-ui)",
              fontSize: 12,
              color: "var(--brc-text-muted)",
            }}
          >
            {hint}
          </span>
        </span>
      </button>
    </div>
  );
}
