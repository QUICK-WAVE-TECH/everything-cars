"use client";

type RadioProps = {
  checked: boolean;
  label: string;
  onClick: () => void;
};

export function Radio({ checked, label, onClick }: RadioProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: `1.5px solid ${checked ? "var(--brc-primary)" : "var(--brc-border-strong)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {checked && (
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "var(--brc-primary)",
            }}
          />
        )}
      </span>
      <span
        style={{
          fontFamily: "var(--brc-font-ui)",
          fontSize: 14,
          color: "var(--brc-text)",
        }}
      >
        {label}
      </span>
    </button>
  );
}
