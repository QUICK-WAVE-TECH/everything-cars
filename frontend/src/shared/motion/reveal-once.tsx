"use client";

import { motion, useReducedMotion } from "motion/react";
import { PREMIUM_TWEEN } from "./premium";

/** Restrained one-time reveal for a major content section, chart panel, table
 * container or empty state: fades from `opacity: 0`, `y: 12` once it scrolls
 * into view, then stays put (no replay). Layout classes pass through
 * `className`, so it can be the grid child itself. Under reduced motion it
 * appears immediately. */
export function RevealOnce({
  children,
  className,
  /** Extra delay before this one reveals, seconds. */
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ ...PREMIUM_TWEEN, delay }}
    >
      {children}
    </motion.div>
  );
}
