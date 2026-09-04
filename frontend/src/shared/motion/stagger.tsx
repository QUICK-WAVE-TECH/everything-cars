"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { PREMIUM_TWEEN } from "./premium";

/** Orchestrates a one-time staggered reveal of its `StaggerItem` children the
 * first time the group scrolls into view — for adjacent KPI/summary panels.
 * Keeps the group element itself in normal flow so grid/flex layout is intact:
 * pass the layout classes straight through `className`. */
export function StaggerGroup({
  children,
  className,
  /** Delay between adjacent children, in seconds (spec: 40–60ms). */
  gap = 0.05,
}: {
  children: React.ReactNode;
  className?: string;
  gap?: number;
}) {
  const variants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: gap } },
  };
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

/** A single panel inside a `StaggerGroup`. Rises 12px + fades in once. Under
 * reduced motion it simply appears (no travel). */
export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const variants: Variants = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduce ? { duration: 0 } : PREMIUM_TWEEN,
    },
  };
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}
