"use client";

import { SearchBar } from "@/shared/components/search-bar";

export function HeroSection() {
  return (
    <section style={{
      position: "relative", minHeight: "clamp(560px, 82vh, 720px)", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 48,
      padding: "calc(var(--brc-section-y, 104px) + 16px) var(--brc-space-10, 104px)",
      background: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(/hero-bg.jpg) center/cover no-repeat`,
    }}>
      <div style={{ maxWidth: 880, textAlign: "center", display: "flex", flexDirection: "column", gap: 16 }}>
        <h1 style={{
          fontFamily: "var(--brc-font-display)", fontWeight: 800,
          fontSize: "clamp(34px,8vw,64px)", lineHeight: 1.15,
          color: "#fff", margin: 0,
        }}>
          A Smarter Way to Own or Rent Premium Cars.
        </h1>
        <p style={{
          fontFamily: "var(--brc-font-ui)", fontSize: "clamp(16px,3.8vw,20px)", lineHeight: 1.5,
          color: "rgba(255,255,255,.92)", margin: 0,
        }}>
          Explore our platform to rent, buy, or sell cars seamlessly. Get behind the wheel of convenience, comfort, and confidence.
        </p>
      </div>
      <SearchBar />
    </section>
  );
}
