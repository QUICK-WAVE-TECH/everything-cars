"use client";

import { motion, useReducedMotion } from "motion/react";

/** Fades + rises its children in the first time they scroll into view, then
 * leaves them alone. Wrap a whole marketing section so the page unfolds as you
 * scroll. No-op under reduced motion. */
export function ScrollReveal({
  children,
  className,
  y = 24,
}: {
  children: React.ReactNode;
  className?: string;
  /** Vertical travel in px. */
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
