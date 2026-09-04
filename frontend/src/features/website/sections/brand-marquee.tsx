"use client";

import { motion, useReducedMotion } from "motion/react";

/** Well-known marques buyers browse for. Not partnerships — a "shop by brand"
 * teaser strip, so the copy stays neutral ("popular brands"). */
const BRANDS = [
  "Toyota",
  "Mercedes-Benz",
  "Lexus",
  "Honda",
  "BMW",
  "Ford",
  "Hyundai",
  "Kia",
  "Nissan",
  "Volkswagen",
  "Land Rover",
  "Peugeot",
];

function BrandName({ name }: { name: string }) {
  return (
    <span
      className="shrink-0 text-[clamp(18px,3vw,26px)] font-extrabold tracking-tight text-(--brc-text-muted) [font-family:var(--brc-font-display)]"
      aria-hidden
    >
      {name}
    </span>
  );
}

export function BrandMarquee() {
  const reduce = useReducedMotion();
  // Two identical sets sit side by side; translating the track by -50% lands
  // the second set exactly where the first began — a seamless loop.
  const track = [...BRANDS, ...BRANDS];

  return (
    <section
      aria-label="Popular brands"
      className="overflow-hidden border-y border-(--brc-border) bg-(--brc-bg-subtle) py-8"
    >
      <p className="mb-5 text-center text-xs font-bold uppercase tracking-[0.18em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
        Popular brands on EverythingCars
      </p>

      <div
        className="relative"
        style={{
          // Fade the strip out at both edges instead of hard-clipping names.
          maskImage:
            "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)",
        }}
      >
        {reduce ? (
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 px-6">
            {BRANDS.map((b) => (
              <BrandName key={b} name={b} />
            ))}
          </div>
        ) : (
          <motion.div
            className="flex w-max gap-12 pr-12"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 32, ease: "linear", repeat: Infinity }}
          >
            {track.map((b, i) => (
              <BrandName key={`${b}-${i}`} name={b} />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
