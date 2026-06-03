"use client";

import { type ReactNode } from "react";
import { Icon } from "./icon";

type CheckboxProps = {
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
};

export function Checkbox({ checked, onChange, children }: CheckboxProps) {
  return (
    <button
      onClick={onChange}
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
          width: 24,
          height: 24,
          borderRadius: 6,
          border: `1.5px solid ${checked ? "var(--brc-primary)" : "var(--brc-border-strong)"}`,
          background: checked ? "var(--brc-primary)" : "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {checked && <Icon name="check" size={15} stroke="#fff" />}
      </span>
      <span
        style={{
          fontFamily: "var(--brc-font-ui)",
          fontSize: 16,
          color: "var(--brc-text)",
          textAlign: "left",
        }}
      >
        {children}
      </span>
    </button>
  );
}
