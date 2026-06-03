"use client";

import { useId } from "react";

type RadioProps = {
  checked: boolean;
  label: string;
  name: string;
  value: string;
  onChange: () => void;
};

export function Radio({ checked, label, name, value, onChange }: RadioProps) {
  const id = useId();

  return (
    <label
      htmlFor={id}
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
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        style={{
          width: 20,
          height: 20,
          margin: 0,
          accentColor: "var(--brc-primary)",
          cursor: "pointer",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: "var(--brc-font-ui)",
          fontSize: 14,
          color: "var(--brc-text)",
        }}
      >
        {label}
      </span>
    </label>
  );
}
