"use client";

import { useState } from "react";
import { Icon } from "./icon";

type AuthFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange?: (value: string) => void;
  type?: "text" | "password" | "select";
};

export function AuthField({ label, placeholder, value, onChange, type = "text" }: AuthFieldProps) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  const isSelect = type === "select";

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, color: "var(--brc-text)" }}>
        {label}
      </span>
      <div
        style={{
          height: 56,
          borderRadius: 8,
          background: "var(--brc-bg-subtle)",
          border: "1px solid var(--brc-border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 24px",
        }}
      >
        <input
          type={isPw && !show ? "password" : "text"}
          value={value}
          placeholder={placeholder}
          readOnly={isSelect}
          onChange={(e) => onChange?.(e.target.value)}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            flex: 1,
            fontFamily: "var(--brc-font-ui)",
            fontSize: 14,
            color: "var(--brc-text)",
            cursor: isSelect ? "pointer" : "text",
          }}
        />
        {isPw && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setShow(!show);
            }}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 0,
              display: "flex",
            }}
          >
            <Icon name="eye" size={22} stroke="var(--brc-text)" />
          </button>
        )}
        {isSelect && <Icon name="chevdown" size={20} stroke="var(--brc-text-muted)" />}
      </div>
    </label>
  );
}
