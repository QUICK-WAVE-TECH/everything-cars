import Image from "next/image";
import { Pill } from "@/shared/components/pill";
import { AuthButton } from "@/features/auth/components/auth-button";

export function AboutSection() {
  return (
    <section style={{ background: "var(--brc-bg-subtle)", padding: "104px var(--brc-space-10, 104px)" }}>
      <div style={{ maxWidth: 1232, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Pill>About Us</Pill>
          <h2 style={{
            fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 48,
            lineHeight: 1.25, color: "var(--brc-text)", margin: 0,
          }}>
            We Make Car Ownership and Rentals Effortless
          </h2>
          <p style={{
            fontFamily: "var(--brc-font-ui)", fontSize: 16, lineHeight: 1.5,
            color: "var(--brc-text-secondary)", maxWidth: 440, margin: 0,
          }}>
            Buy &amp; Rent Cars is a trusted platform built to make renting, buying, and selling cars simple and stress-free for everyone in Nigeria. We connect everyday users with verified car owners and dealers, giving you access to a wide range of cars.
          </p>
          <AuthButton iconEnd="arrow" href="/about" style={{ width: 170, marginTop: 8 }}>Learn More</AuthButton>
        </div>
        <div style={{ height: 452, borderRadius: 16, overflow: "hidden", position: "relative" }}>
          <Image src="/about-car.jpg" alt="About Buy & Rent Cars" fill style={{ objectFit: "cover" }} />
        </div>
      </div>
    </section>
  );
}
