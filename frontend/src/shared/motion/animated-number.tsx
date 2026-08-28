"use client";

import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

/** Smoothly counts to the current value, formatting each frame (e.g. ₦ or %).
 * Snaps instantly when the viewer prefers reduced motion. */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString("en-NG"),
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const target = useMotionValue(value);
  const spring = useSpring(target, { stiffness: 90, damping: 22, mass: 0.8 });

  useEffect(() => {
    target.set(value);
  }, [value, target]);

  const text = useTransform(reduce ? target : spring, (v) => format(v));

  return (
    <motion.span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {text}
    </motion.span>
  );
}
