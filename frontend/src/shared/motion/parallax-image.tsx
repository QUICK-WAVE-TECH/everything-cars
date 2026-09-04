"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { PREMIUM_SPRING } from "./premium";

/** An image that drifts vertically within its own frame as the frame scrolls
 * through the viewport — the classic "layers at different speeds" depth cue.
 * The inner layer is oversized top & bottom by `shift`+ so the drift never
 * exposes an edge; only `transform` animates. No-op under reduced motion.
 *
 * Renders its own `position: relative; overflow: hidden` frame — pass frame
 * sizing (height, border-radius…) via `style`. */
export function ParallaxImage({
  src,
  alt,
  sizes,
  style,
  className,
  /** Peak vertical drift in px (from +shift to −shift across the scroll). */
  shift = 40,
  priority,
}: {
  src: string;
  alt: string;
  sizes?: string;
  style?: React.CSSProperties;
  className?: string;
  shift?: number;
  priority?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useSpring(useTransform(scrollYProgress, [0, 1], [shift, -shift]), PREMIUM_SPRING);
  const pad = shift + 12;

  return (
    <div
      ref={ref}
      className={className}
      style={{ position: "relative", overflow: "hidden", ...style }}
    >
      <motion.div
        style={{ position: "absolute", left: 0, right: 0, top: -pad, bottom: -pad, y: reduce ? undefined : y }}
      >
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: "cover" }} />
      </motion.div>
    </div>
  );
}
