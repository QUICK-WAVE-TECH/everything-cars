"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { PREMIUM_SPRING } from "./premium";

/** Subtle page-scroll parallax for high-level page surfaces (eyebrow, title,
 * supporting copy). Maps the first ~340px of page scroll to a few px of upward
 * drift, smoothed by an overdamped spring so it never overshoots. Give the
 * title a smaller `distance` than the copy around it so it lags slightly —
 * the depth cue the brief asks for. No-op under reduced motion.
 *
 * Movement is confined to `transform`; the scroll position is read into a
 * MotionValue (never during React render) and passed straight to `style`. */
export function Parallax({
  children,
  distance = -8,
  className,
}: {
  children: React.ReactNode;
  /** Vertical travel in px across the scroll range (negative = drifts up). */
  distance?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const raw = useTransform(scrollY, [0, 340], [0, distance]);
  const y = useSpring(raw, PREMIUM_SPRING);

  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div className={className} style={{ y }}>
      {children}
    </motion.div>
  );
}
