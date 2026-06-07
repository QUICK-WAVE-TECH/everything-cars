"use client";

import Link from "next/link";
import { type CSSProperties, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import type { IconName } from "./icon";
type ButtonVariant = "primary" | "secondary" | "neutral";
type ShadcnButtonVariant = "default" | "secondary" | "outline";

type AuthButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  icon?: IconName;
  iconEnd?: IconName;
  href?: string;
  onClick?: () => void;
  full?: boolean;
  style?: CSSProperties;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
};

export function AuthButton({
  children,
  variant = "primary",
  icon,
  iconEnd,
  href,
  onClick,
  full,
  style,
  className,
  type = "button",
  disabled,
  loading,
}: AuthButtonProps) {
  const shadcnVariantByAuthVariant: Record<ButtonVariant, ShadcnButtonVariant> =
    {
      primary: "default",
      secondary: "secondary",
      neutral: "outline",
    };
  const authButtonClasses = cn(
    "brc-button-motion h-12 gap-2 rounded-lg px-6 text-sm font-bold focus-visible:ring-2 focus-visible:ring-offset-2",
    variant === "primary" &&
      "bg-(--brc-primary) text-(--brc-text-on-primary) hover:bg-(--brc-primary-hover) focus-visible:ring-(--brc-primary)",
    variant === "secondary" &&
      "bg-(--brc-secondary) text-[#FAFAFA] hover:bg-black focus-visible:ring-(--brc-secondary)",
    variant === "neutral" &&
      "border-(--brc-border) bg-white text-(--brc-text) hover:bg-white hover:text-(--brc-text) hover:brightness-95 focus-visible:ring-(--brc-border)",
    full && "w-full",
    className,
  );
  const buttonStyle = {
    fontFamily: "var(--brc-font-ui)",
    ...style,
  };
  const spinner = (
    <svg className="animate-spin" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );

  const content = (
    <>
      {loading ? spinner : icon ? <Icon name={icon} size={18} /> : null}
      {children}
      {!loading && iconEnd && <Icon name={iconEnd} size={18} />}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          buttonVariants({
            variant: shadcnVariantByAuthVariant[variant],
            className: authButtonClasses,
          }),
        )}
        style={buttonStyle}
      >
        {content}
      </Link>
    );
  }

  return (
    <Button
      type={type}
      variant={shadcnVariantByAuthVariant[variant]}
      onClick={onClick}
      disabled={disabled || loading}
      className={authButtonClasses}
      style={buttonStyle}
    >
      {content}
    </Button>
  );
}
