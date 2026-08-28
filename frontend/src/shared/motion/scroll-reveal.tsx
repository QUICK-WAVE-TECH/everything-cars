"use client";

import { motion, useReducedMotion } from "motion/react";

/** Rises + fades its children in the first time they scroll into view, then
 * leaves them alone. Wrap a whole marketing section so the page unfolds as you
 * scroll. A spring settle + a generous rise make the entrance clearly readable
 * (not a whisper). No-op under reduced motion. */
export function ScrollReveal({
  children,
  className,
  /** Vertical travel in px — how far it rises from. */
  y = 48,
}: {
  children: React.ReactNode;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      // Fire once the section is ~18% into the viewport from the bottom, so the
      // rise plays where the eye is looking instead of finishing off-screen.
      viewport={{ once: true, margin: "0px 0px -18% 0px" }}
      transition={{ type: "spring", stiffness: 80, damping: 18, mass: 1 }}
    >
      {children}
    </motion.div>
  );
}
