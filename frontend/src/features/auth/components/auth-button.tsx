"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
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
  type?: "button" | "submit";
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
  type = "button",
}: AuthButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg px-6 text-sm font-bold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-(--brc-primary) text-(--brc-text-on-primary) hover:bg-(--brc-primary-hover) focus-visible:ring-(--brc-primary)",
        variant === "secondary" &&
          "bg-(--brc-secondary) text-[#FAFAFA] hover:bg-black focus-visible:ring-(--brc-secondary)",
        variant === "neutral" &&
          "border border-(--brc-border) bg-white text-(--brc-text) hover:brightness-95 focus-visible:ring-(--brc-border)",
        full && "w-full",
        className,
      )}
      style={{
        fontFamily: "var(--brc-font-ui)",
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
      {iconEnd && <Icon name={iconEnd} size={18} />}
    </button>
  );
}
