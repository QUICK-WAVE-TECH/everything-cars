"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "./icon";
import type { IconName } from "./icon";

type ButtonVariant = "primary" | "secondary" | "neutral";

type AuthButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  icon?: IconName;
  iconEnd?: IconName;
  onClick?: () => void;
  full?: boolean;
  style?: React.CSSProperties;
};

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: "var(--brc-primary)", color: "var(--brc-text-on-primary)" },
  secondary: { background: "var(--brc-secondary)", color: "#FAFAFA" },
  neutral: { background: "#fff", color: "var(--brc-text)", border: "1px solid var(--brc-border)" },
};

const HOVER_BG: Record<ButtonVariant, string> = {
  primary: "var(--brc-primary-hover)",
  secondary: "#000",
  neutral: "",
};

export function AuthButton({
  children,
  variant = "primary",
  icon,
  iconEnd,
  onClick,
  full,
  style,
}: AuthButtonProps) {
  const [hover, setHover] = useState(false);
  const base = VARIANT_STYLES[variant];
  const hoverBg = HOVER_BG[variant];

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 48,
        border: "none",
        borderRadius: 8,
        padding: "0 22px",
        fontFamily: "var(--brc-font-ui)",
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: full ? "100%" : "auto",
        transition: "background .18s ease, filter .18s ease",
        ...base,
        ...(hover && hoverBg ? { background: hoverBg } : {}),
        ...(hover && variant === "neutral" ? { filter: "brightness(0.96)" } : {}),
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
      {iconEnd && <Icon name={iconEnd} size={18} />}
    </button>
  );
}
