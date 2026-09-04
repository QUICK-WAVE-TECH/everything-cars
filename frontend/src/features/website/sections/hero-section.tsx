"use client";

import { useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { SearchBar } from "@/shared/components/search-bar";

// Overdamped smoothing for the scroll-linked parallax — settles, never bounces.
const HERO_SPRING = { stiffness: 100, damping: 30, mass: 0.4 } as const;

export function HeroSection() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);

  // 0 at the top, 1 once the hero has fully scrolled past — drives the parallax.
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  // Background lags downward; content drifts up faster and fades as it leaves.
  const bgY = useSpring(useTransform(scrollYProgress, [0, 1], [0, 60]), HERO_SPRING);
  const contentY = useSpring(useTransform(scrollYProgress, [0, 1], [0, -80]), HERO_SPRING);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  function handleSearch(query: { loc: string; type: string; price: string }) {
    const params = new URLSearchParams();
    if (query.loc) params.set("search", query.loc);
    if (query.type && query.type !== "All") params.set("body_type", query.type.toLowerCase());
    const qs = params.toString();
    router.push(qs ? `/services?${qs}` : "/services");
  }

  // Staggered entrance: headline → subtext → search bar rise in together.
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <section ref={heroRef} style={{
      position: "relative", minHeight: "clamp(560px, 82vh, 720px)", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 48,
      padding: "calc(var(--brc-section-y, 104px) + 16px) var(--brc-space-10, 104px)",
      backgroundColor: "rgba(0,0,0,0.4)", overflow: "hidden",
    }}>
      {/* Background parallax layer — oversized top & bottom so the lag never
          exposes an edge. Holds the slow Ken Burns drift inside it. */}
      <motion.div
        aria-hidden="true"
        style={{ position: "absolute", left: 0, right: 0, top: -60, bottom: -60, zIndex: 0, y: reduce ? undefined : bgY }}
      >
        <motion.div
          style={{ position: "absolute", inset: 0 }}
          initial={false}
          animate={reduce ? { scale: 1 } : { scale: [1.06, 1.14] }}
          transition={reduce ? undefined : { duration: 26, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
        >
          <Image
            src="/hero-bg.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
        </motion.div>
      </motion.div>

      {/* Dark scrim for text legibility */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1 }}
      />

      {/* Drifting aurora glow in brand colours (screen-blended over the photo) */}
      {!reduce && (
        <motion.div
          aria-hidden="true"
          style={{
            position: "absolute", inset: "-20%", zIndex: 1, mixBlendMode: "screen", pointerEvents: "none",
            background:
              "radial-gradient(38% 44% at 22% 30%, rgba(59,59,196,0.55), transparent 70%), " +
              "radial-gradient(34% 40% at 82% 68%, rgba(195,101,35,0.42), transparent 70%)",
          }}
          animate={{ x: ["-4%", "5%", "-4%"], y: ["-3%", "4%", "-3%"], opacity: [0.55, 0.85, 0.55] }}
          transition={{ duration: 18, ease: "easeInOut", repeat: Infinity }}
        />
      )}

      {/* Content — scroll parallax on the outer layer, entrance stagger inside. */}
      <motion.div
        style={{
          position: "relative", zIndex: 2, width: "100%",
          y: reduce ? undefined : contentY,
          opacity: reduce ? undefined : contentOpacity,
        }}
      >
        <motion.div
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 48, width: "100%" }}
          variants={container}
          initial={reduce ? false : "hidden"}
          animate="show"
        >
          <div style={{ maxWidth: 880, textAlign: "center", display: "flex", flexDirection: "column", gap: 16 }}>
            <motion.h1 variants={item} style={{
              fontFamily: "var(--brc-font-display)", fontWeight: 800,
              fontSize: "clamp(34px,8vw,64px)", lineHeight: 1.15,
              color: "#fff", margin: 0,
            }}>
              A Smarter Way to Own or Rent Premium Cars.
            </motion.h1>
            <motion.p variants={item} style={{
              fontFamily: "var(--brc-font-ui)", fontSize: "clamp(16px,3.8vw,20px)", lineHeight: 1.5,
              color: "rgba(255,255,255,.92)", margin: 0,
            }}>
              Explore our platform to rent, buy, or sell cars seamlessly. Get behind the wheel of convenience, comfort, and confidence.
            </motion.p>
          </div>
          <motion.div variants={item} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <SearchBar onSearch={handleSearch} />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
