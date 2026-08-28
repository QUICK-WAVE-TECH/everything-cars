"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { SearchBar } from "@/shared/components/search-bar";

export function HeroSection() {
  const router = useRouter();
  const reduce = useReducedMotion();

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
    <section style={{
      position: "relative", minHeight: "clamp(560px, 82vh, 720px)", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 48,
      padding: "calc(var(--brc-section-y, 104px) + 16px) var(--brc-space-10, 104px)",
      backgroundColor: "rgba(0,0,0,0.4)", overflow: "hidden",
    }}>
      {/* Background photo with a slow Ken Burns drift */}
      <motion.div
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
        initial={false}
        animate={reduce ? { scale: 1 } : { scale: [1, 1.08] }}
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

      <motion.div
        style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 48, width: "100%" }}
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
    </section>
  );
}
