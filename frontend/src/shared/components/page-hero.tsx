"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";

type PageHeroProps = {
  img: string;
  title: string;
  sub: string;
};

const HERO_SPRING = { stiffness: 100, damping: 30, mass: 0.4 } as const;

/** Interior page hero: the photo lags behind the scroll while the copy drifts up
 * and fades — the same depth treatment as the landing hero, scaled down. */
export function PageHero({ img, title, sub }: PageHeroProps) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const bgY = useSpring(useTransform(scrollYProgress, [0, 1], [0, 50]), HERO_SPRING);
  const copyY = useSpring(useTransform(scrollYProgress, [0, 1], [0, -60]), HERO_SPRING);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={ref}
      style={{
        position: "relative", minHeight: "clamp(360px, 62vw, 500px)", display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "clamp(72px, 14vw, 120px) var(--brc-space-10, 104px)",
        backgroundColor: "rgba(0,0,0,0.4)",
        overflow: "hidden",
      }}
    >
      {/* Oversized so the parallax lag never exposes an edge */}
      <motion.div
        aria-hidden="true"
        style={{ position: "absolute", left: 0, right: 0, top: -50, bottom: -50, zIndex: 0, y: reduce ? undefined : bgY }}
      >
        <Image src={img} alt="" fill priority sizes="100vw" style={{ objectFit: "cover" }} />
      </motion.div>

      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0, zIndex: 1,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.22) 45%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      <motion.div
        style={{
          maxWidth: 1232, margin: "0 auto", width: "100%", position: "relative", zIndex: 2,
          y: reduce ? undefined : copyY,
          opacity: reduce ? undefined : copyOpacity,
        }}
      >
        <motion.div
          style={{ maxWidth: 700, display: "flex", flexDirection: "column", gap: 16 }}
          initial={reduce ? false : "hidden"}
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } } }}
        >
          <motion.h1
            variants={{
              hidden: { opacity: 0, y: 18 },
              show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
            }}
            style={{
              fontFamily: "var(--brc-font-display)", fontWeight: 800,
              fontSize: "clamp(34px,10vw,64px)", lineHeight: 1.08,
              letterSpacing: "-0.02em", textWrap: "balance",
              color: "#fff", margin: 0,
            }}
          >
            {title}
          </motion.h1>
          <motion.p
            variants={{
              hidden: { opacity: 0, y: 18 },
              show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
            }}
            style={{
              fontFamily: "var(--brc-font-ui)", fontSize: "clamp(16px,4.5vw,20px)", lineHeight: 1.55,
              color: "rgba(255,255,255,.92)", margin: 0, maxWidth: "58ch", textWrap: "pretty",
            }}
          >
            {sub}
          </motion.p>
        </motion.div>
      </motion.div>
    </section>
  );
}
