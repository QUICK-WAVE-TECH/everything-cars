"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import { Icon } from "@/features/auth/components/icon";

type PromoBannerProps = {
  tag: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  href: string;
  image: string;
  /** CSS object-position for the background photo, e.g. "55% 32%". */
  imagePosition?: string;
  /** Brand color for the tag + CTA. "accent" = orange (owner), "primary" = blue (customer). */
  tone?: "accent" | "primary";
  /** Extra classes — pass "flex-1" to fill remaining column height. */
  className?: string;
};

const TONES = {
  accent: { bg: "bg-(--brc-accent)", shadow: "shadow-[0_12px_24px_rgba(195,101,35,0.32)]" },
  primary: { bg: "bg-(--brc-primary)", shadow: "shadow-[0_12px_24px_rgba(0,0,139,0.32)]" },
} as const;

/**
 * Tall image-led promotional banner for the dashboard sidebars.
 * Full-bleed photo + dark gradient, with a tag, headline, subtitle and CTA
 * pinned to the bottom — mirrors the marketing "drop" card style.
 */
export function PromoBanner({
  tag,
  title,
  subtitle,
  ctaLabel,
  href,
  image,
  imagePosition = "center",
  tone = "accent",
  className = "",
}: PromoBannerProps) {
  const toneStyles = TONES[tone];
  return (
    <Link
      href={href}
      aria-label={`${title} — ${ctaLabel}`}
      className={`brc-dashboard-card brc-dashboard-reveal group relative flex min-h-[320px] flex-col justify-end overflow-hidden rounded-3xl no-underline shadow-[0_20px_48px_rgba(18,18,18,0.06)] ${className}`}
      style={{ "--delay": "600ms" } as CSSProperties & Record<string, string>}
    >
      <Image
        src={image}
        alt={title}
        fill
        sizes="(max-width: 1280px) 100vw, 360px"
        style={{ objectPosition: imagePosition }}
        className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
      />
      {/* Vertical overlay: clear at the top, dark across the lower half for legible text */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,18,18,0)_0%,rgba(18,18,18,0)_32%,rgba(18,18,18,0.55)_52%,rgba(18,18,18,0.88)_72%,rgba(18,18,18,0.97)_100%)]" />

      <div className="relative z-10 flex flex-col items-start gap-3 p-6">
        <span className={`inline-flex items-center rounded-full ${toneStyles.bg} px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white [font-family:var(--brc-font-ui)]`}>
          {tag}
        </span>
        <h3 className="m-0 text-2xl font-black leading-[1.1] text-white [font-family:var(--brc-font-display)]">
          {title}
        </h3>
        <p className="m-0 max-w-xs text-sm leading-6 text-white/85 [font-family:var(--brc-font-ui)]">
          {subtitle}
        </p>
        <span className={`mt-2 inline-flex h-11 items-center gap-2 rounded-full ${toneStyles.bg} px-5 text-sm font-bold text-white ${toneStyles.shadow} transition-transform duration-200 group-hover:-translate-y-0.5 [font-family:var(--brc-font-ui)]`}>
          {ctaLabel}
          <span className="flex transition-transform duration-200 group-hover:translate-x-1">
            <Icon name="arrow" size={16} stroke="currentColor" />
          </span>
        </span>
      </div>
    </Link>
  );
}
