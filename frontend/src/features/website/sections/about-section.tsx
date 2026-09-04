import { Pill } from "@/shared/components/pill";
import { AuthButton } from "@/features/auth/components/auth-button";
import { ParallaxImage } from "@/shared/motion/parallax-image";

export function AboutSection() {
  return (
    <section style={{ background: "var(--brc-bg-subtle)", padding: "var(--brc-section-y, 104px) var(--brc-space-10, 104px)" }}>
      <div style={{
        maxWidth: 1232,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
        gap: "clamp(32px, 6vw, 64px)",
        alignItems: "center",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Pill>About Us</Pill>
          <h2 style={{
            fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: "clamp(30px, 7vw, 48px)",
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
          <AuthButton iconEnd="arrow" href="/about" style={{ width: "min(100%, 170px)", marginTop: 8 }}>Learn More</AuthButton>
        </div>
        <ParallaxImage
          src="/about-car.jpg"
          alt="About Buy & Rent Cars"
          sizes="(max-width: 768px) 100vw, 50vw"
          style={{ height: "clamp(280px, 48vw, 452px)", borderRadius: 16 }}
        />
      </div>
    </section>
  );
}
