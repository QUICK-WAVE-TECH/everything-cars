"use client";

import { motion, useReducedMotion } from "motion/react";

/** Fades + rises its children in on mount, with an optional stagger index so a
 * row of cards enters in sequence. No-op under reduced motion. */
export function Reveal({
  children,
  index = 0,
  className,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: index * 0.06 }}
    >
      {children}
    </motion.div>
  );
}
