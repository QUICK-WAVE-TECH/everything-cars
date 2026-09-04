"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { PREMIUM_SPRING } from "./premium";

/** Drifts its children vertically as the element travels through the viewport —
 * target-based, so it works anywhere down a long page (unlike the page-scroll
 * `Parallax`). `from`→`to` is the px offset across the full crossing; the
 * default drifts a block gently upward for a foreground-depth feel. Only
 * `transform` animates; no-op under reduced motion. */
export function ParallaxLayer({
  children,
  className,
  from = 24,
  to = -24,
}: {
  children: React.ReactNode;
  className?: string;
  from?: number;
  to?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useSpring(useTransform(scrollYProgress, [0, 1], [from, to]), PREMIUM_SPRING);

  return (
    <motion.div ref={ref} className={className} style={{ y: reduce ? undefined : y }}>
      {children}
    </motion.div>
  );
}
