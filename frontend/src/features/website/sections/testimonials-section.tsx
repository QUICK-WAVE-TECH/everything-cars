"use client";

import { useState } from "react";
import { Icon } from "@/features/auth/components/icon";
import { Pill } from "@/shared/components/pill";
import { Star } from "@/shared/components/star";

const TESTIMONIALS = [
  { name: "John Adewara", role: "Civil Engineer", text: "I rented a car for a weekend trip through Buy & Rent Cars, and it was seamless from start to finish. The car was clean, the process was fast, and the price was just right. I'll definitely rent again." },
  { name: "Chika Akor", role: "CEO at Innov8", text: "Buying my next car was completely stress-free. I compared options, contacted a verified dealer, and closed in days." },
  { name: "Aisha Bello", role: "Doctor", text: "Listing my spare car earned me steady income. The owner dashboard makes managing requests effortless." },
];

const navBtnStyle: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 100,
  border: "1px solid rgba(255,255,255,.3)", background: "transparent",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
};

export function TestimonialsSection() {
  const [idx, setIdx] = useState(0);
  const prev = () => setIdx((idx - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  const next = () => setIdx((idx + 1) % TESTIMONIALS.length);

  return (
    <section style={{ padding: "104px var(--brc-space-10, 104px)", background: "#fff" }}>
      <div style={{ maxWidth: 1232, margin: "0 auto", display: "grid", gridTemplateColumns: "360px 1fr", gap: 48, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Pill>Testimonials</Pill>
          <h2 style={{
            fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 48,
            lineHeight: 1.2, color: "var(--brc-text)", margin: 0,
          }}>
            Client&apos;s Success Stories
          </h2>
        </div>
        <div style={{
          background: "var(--brc-secondary)", borderRadius: 16, padding: 40,
          color: "#fff", backgroundImage: "linear-gradient(rgba(255,255,255,.04),transparent)",
          position: "relative", minHeight: 240,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 18, color: "var(--brc-primary-tint)" }}>
                {TESTIMONIALS[idx]!.name}
              </div>
              <div style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-muted)" }}>
                {TESTIMONIALS[idx]!.role}
              </div>
            </div>
            <div style={{ display: "flex", gap: 1 }}>
              {[0, 1, 2, 3, 4].map((k) => <Star key={k} />)}
            </div>
          </div>
          <p style={{
            fontFamily: "var(--brc-font-ui)", fontSize: 16, lineHeight: 1.6,
            color: "rgba(255,255,255,.9)", margin: 0,
          }}>
            {TESTIMONIALS[idx]!.text}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 28 }}>
            <button onClick={prev} style={navBtnStyle}>
              <Icon name="chevleft" size={18} stroke="#fff" />
            </button>
            <button onClick={next} style={navBtnStyle}>
              <Icon name="chevright" size={18} stroke="#fff" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
