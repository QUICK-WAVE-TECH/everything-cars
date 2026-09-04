"use client";

import { useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { cn } from "@/lib/utils";

/** A sticky filter/toolbar strip that gains a subtle shadow once the page has
 * scrolled beneath it, so it detaches cleanly from the content it now floats
 * over. Sticks below the admin nav by default (`top`). Uses a single boolean
 * toggle driven off the scroll MotionValue — no per-frame React state, no
 * layout-affecting sentinel — and animates only `box-shadow`. */
export function StickyToolbar({
  children,
  className,
  /** Sticky offset from the top of the viewport, px (clears the admin nav). */
  top = 84,
  /** Scroll distance before the shadow appears, px. */
  threshold = 16,
}: {
  children: React.ReactNode;
  className?: string;
  top?: number;
  threshold?: number;
}) {
  const [stuck, setStuck] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (v) => {
    const next = v > threshold;
    // Only ever flips React state on the crossing, never every frame.
    setStuck((prev) => (prev === next ? prev : next));
  });

  return (
    <div
      className={cn(
        "sticky z-30 transition-shadow duration-200 motion-reduce:transition-none",
        className,
        // Important so it wins over any base shadow the caller's card sets.
        stuck && "shadow-[0_10px_28px_-8px_rgba(18,18,18,0.14)]!",
      )}
      style={{ top }}
    >
      {children}
    </div>
  );
}
