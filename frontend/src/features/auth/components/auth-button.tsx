"use client";

import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
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
  className?: string;
};

const VARIANT_MAP: Record<
  ButtonVariant,
  {
    shadcnVariant: "default" | "secondary" | "outline";
    styles: React.CSSProperties;
    hoverStyles: React.CSSProperties;
  }
> = {
  primary: {
    shadcnVariant: "default",
    styles: {
      background: "var(--brc-primary)",
      color: "var(--brc-text-on-primary)",
    },
    hoverStyles: { background: "var(--brc-primary-hover)" },
  },
  secondary: {
    shadcnVariant: "secondary",
    styles: { background: "var(--brc-secondary)", color: "#FAFAFA" },
    hoverStyles: { background: "#000" },
  },
  neutral: {
    shadcnVariant: "outline",
    styles: {
      background: "#fff",
      color: "var(--brc-text)",
      border: "1px solid var(--brc-border)",
    },
    hoverStyles: { filter: "brightness(0.96)" },
  },
};

export function AuthButton({
  children,
  variant = "primary",
  icon,
  iconEnd,
  onClick,
  full,
  style,
  className,
}: AuthButtonProps) {
  const { shadcnVariant, styles: variantStyles } = VARIANT_MAP[variant];

  return (
    <Button
      variant={shadcnVariant}
      size="lg"
      onClick={onClick}
      className={`h-12 cursor-pointer gap-2 rounded-lg text-sm font-bold ${full ? "w-full" : ""} ${className ?? ""}`}
      style={{
        fontFamily: "var(--brc-font-ui)",
        transition: "background .18s ease, filter .18s ease",
        ...variantStyles,
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
      {iconEnd && <Icon name={iconEnd} size={18} />}
    </Button>
  );
}
