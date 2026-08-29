"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type CoverflowItem = {
  id: string;
  img: string;
  title: string;
  subtitle?: string;
  tag?: string;
  href?: string;
};

// Smooth, barely-there settle — premium, never bouncy.
const SPRING = { type: "spring", stiffness: 210, damping: 28, mass: 0.9 } as const;

/** Position of a card given its signed distance from the centre. */
function place(rel: number, spread: number) {
  const abs = Math.abs(rel);
  const dir = rel === 0 ? 0 : rel > 0 ? 1 : -1;
  if (abs === 0) return { x: 0, s: 1, ry: 0, o: 1, z: 30, b: 1 };
  if (abs === 1) return { x: dir * spread * 0.28, s: 0.85, ry: -dir * 20, o: 0.72, z: 20, b: 0.82 };
  if (abs === 2) return { x: dir * spread * 0.46, s: 0.7, ry: -dir * 30, o: 0.4, z: 10, b: 0.6 };
  return { x: dir * spread * 0.5, s: 0.5, ry: 0, o: 0, z: 0, b: 0.5 };
}

function Eyebrow({ label }: { label: string }) {
  return (
    <div className="mb-8 flex items-center gap-3">
      <span className="h-px w-9 bg-gradient-to-r from-transparent to-(--brc-primary)" />
      <h3 className="m-0 text-[0.75rem] font-bold uppercase tracking-[0.3em] text-(--brc-primary) [font-family:var(--brc-font-ui)]">
        {label}
      </h3>
      <span className="h-px w-9 bg-gradient-to-l from-transparent to-(--brc-primary)" />
    </div>
  );
}

/** A 3D coverflow. Motion-spring transitions, brand-token styling, keyboard +
 * touch + autoplay. Reduced motion drops the rotation/autoplay and swaps
 * instantly.
 *
 * `variant="section"` is the full landing-page band (background + eyebrow);
 * `variant="bare"` embeds it in a container (e.g. a photo gallery) — no band,
 * and set `overlay={false}` for pure images. */
export function CoverflowCarousel({
  items,
  sectionLabel,
  autoplay = true,
  autoplayDelay = 5000,
  ctaText = "View car",
  variant = "section",
  overlay = true,
  stageHeight,
  cardWidth = "clamp(240px, 68vw, 330px)",
  imageFit = "cover",
}: {
  items: CoverflowItem[];
  sectionLabel?: string;
  autoplay?: boolean;
  autoplayDelay?: number;
  ctaText?: string;
  variant?: "section" | "bare";
  overlay?: boolean;
  stageHeight?: string;
  cardWidth?: string;
  /** "cover" crops to fill (hero shots); "contain" shows the whole photo. */
  imageFit?: "cover" | "contain";
}) {
  const isSection = variant === "section";
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [spread, setSpread] = useState(900);
  const stageRef = useRef<HTMLDivElement>(null);
  const touchX = useRef(0);
  const reduce = useReducedMotion();
  const total = items.length;
  const stageH = stageHeight ?? (isSection ? "clamp(380px,54vw,480px)" : "clamp(300px,60vw,420px)");

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setSpread(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const next = useCallback(() => setIndex((p) => (p + 1) % total), [total]);
  const prev = useCallback(() => setIndex((p) => (p - 1 + total) % total), [total]);
  const goTo = (i: number) => setIndex(((i % total) + total) % total);

  useEffect(() => {
    if (!autoplay || reduce || hovered || total <= 1) return;
    const t = setInterval(next, autoplayDelay);
    return () => clearInterval(t);
  }, [autoplay, reduce, hovered, next, autoplayDelay, total]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [next, prev]);

  if (total === 0) return null;

  return (
    <div
      aria-label={sectionLabel ?? "Gallery"}
      className={cn(
        "relative w-full select-none overflow-hidden",
        isSection && "bg-(--brc-bg-subtle) py-14",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]!.clientX;
      }}
      onTouchEnd={(e) => {
        const d = e.changedTouches[0]!.clientX - touchX.current;
        if (Math.abs(d) > 45) (d < 0 ? next : prev)();
      }}
    >
      {isSection && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(60% 50% at 50% 35%, rgba(0,0,139,0.06), transparent 70%)" }}
        />
      )}

      <div
        className={cn(
          "relative z-10 mx-auto flex flex-col items-center",
          isSection ? "max-w-6xl px-4" : "w-full",
        )}
      >
        {isSection && sectionLabel && <Eyebrow label={sectionLabel} />}

        <div
          ref={stageRef}
          className="relative mb-6 flex w-full items-center justify-center"
          style={{ perspective: 1400, height: stageH }}
        >
          {items.map((item, idx) => {
            let rel = idx - index;
            if (rel > total / 2) rel -= total;
            else if (rel < -total / 2) rel += total;
            const pos = place(rel, spread);
            const isCenter = rel === 0;

            return (
              <motion.div
                key={item.id}
                onClick={() => !isCenter && goTo(idx)}
                className="absolute overflow-hidden rounded-2xl border border-(--brc-border) bg-white"
                style={{
                  width: cardWidth,
                  height: "86%",
                  zIndex: pos.z,
                  transformOrigin: "center",
                  cursor: isCenter ? "default" : "pointer",
                  boxShadow: isCenter
                    ? "0 30px 70px -20px rgba(18,18,18,0.38)"
                    : "0 18px 40px -22px rgba(18,18,18,0.28)",
                }}
                initial={false}
                animate={{
                  x: pos.x,
                  scale: pos.s,
                  rotateY: reduce ? 0 : pos.ry,
                  opacity: pos.o,
                  filter: `brightness(${pos.b})`,
                }}
                transition={reduce ? { duration: 0 } : SPRING}
              >
                <Image
                  src={item.img}
                  alt={item.title}
                  fill
                  sizes="330px"
                  style={{ objectFit: imageFit, padding: imageFit === "contain" ? 14 : 0 }}
                />
                {overlay && (
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.55) 68%, rgba(0,0,0,0.92) 100%)",
                    }}
                  />
                )}
                {overlay && (
                  <motion.div
                    className="relative flex h-full flex-col justify-between p-4 text-center text-white"
                    initial={false}
                    animate={{ opacity: isCenter ? 1 : 0, y: isCenter ? 0 : 14 }}
                    transition={{ duration: reduce ? 0 : 0.4 }}
                    style={{ pointerEvents: isCenter ? "auto" : "none" }}
                  >
                    {item.tag && (
                      <div className="text-right">
                        <span className="inline-block rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur-sm">
                          {item.tag}
                        </span>
                      </div>
                    )}
                    <div className="mt-auto flex flex-col items-center gap-1.5">
                      <h4
                        className="m-0 text-[clamp(18px,2.4vw,24px)] font-black uppercase leading-tight tracking-tight [font-family:var(--brc-font-display)]"
                        style={{ textShadow: "0 3px 12px rgba(0,0,0,0.95)" }}
                      >
                        {item.title}
                      </h4>
                      {item.subtitle && (
                        <span
                          className="text-[15px] font-bold text-white/90 [font-family:var(--brc-font-ui)]"
                          style={{ textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}
                        >
                          {item.subtitle}
                        </span>
                      )}
                      <span className="my-1.5 h-0.5 w-9 rounded bg-(--brc-primary)" />
                      {item.href && (
                        <Link
                          href={item.href}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 rounded-full bg-(--brc-primary) px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-white transition-transform duration-200 hover:scale-[1.04] motion-reduce:transition-none [font-family:var(--brc-font-ui)]"
                        >
                          {ctaText}
                          <ArrowRightIcon size={13} />
                        </Link>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous"
              className="absolute left-2 top-1/2 z-40 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-(--brc-border) bg-white text-(--brc-text) shadow-[var(--brc-shadow-md)] transition-colors hover:bg-(--brc-primary-tint) sm:left-4"
            >
              <ChevronLeftIcon size={18} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next"
              className="absolute right-2 top-1/2 z-40 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-(--brc-border) bg-white text-(--brc-text) shadow-[var(--brc-shadow-md)] transition-colors hover:bg-(--brc-primary-tint) sm:right-4"
            >
              <ChevronRightIcon size={18} />
            </button>
          </>
        )}

        {total > 1 && (
          <div className="flex items-center gap-2">
            {items.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className="h-2 cursor-pointer rounded-full transition-all duration-300 motion-reduce:transition-none"
                style={{
                  width: idx === index ? 28 : 8,
                  background: idx === index ? "var(--brc-primary)" : "var(--brc-border)",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
