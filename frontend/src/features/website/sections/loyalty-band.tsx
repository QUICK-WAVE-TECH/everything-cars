import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/features/auth/components/icon";
import { JoinProgramButton } from "./join-program-button";

const PERKS = [
  { icon: "gift" as const, title: "Earn Points on Every Rental", desc: "Accumulate points with each booking and watch your rewards grow." },
  { icon: "trophy" as const, title: "Unlock Premium Benefits", desc: "Access free upgrades, priority support, and exclusive discounts." },
  { icon: "clock" as const, title: "Redeem Anytime", desc: "Use your points for discounts, free rental days, or special perks." },
];

export function LoyaltyBand() {
  return (
    <section style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
      minHeight: 560,
      width: "100%",
    }}>
      {/* Left — Road CTA */}
      <div style={{
        position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", gap: 24,
        padding: "var(--brc-section-y, 104px) clamp(24px, 7vw, 145px)", overflow: "hidden",
        backgroundColor: "rgba(0,0,0,0.4)",
      }}>
        <Image
          src="/road-cta.jpg"
          alt=""
          fill
          sizes="(max-width: 900px) 100vw, 50vw"
          style={{ objectFit: "cover", zIndex: 0 }}
        />
        <div
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1 }}
        />
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 24, alignItems: "flex-start" }}>
          <h2 style={{
            fontFamily: "var(--brc-font-ui)", fontWeight: 700,
            fontSize: "clamp(32px,3.5vw,48px)", lineHeight: 1.2,
            color: "#fff", maxWidth: 483, margin: 0,
          }}>
            Ready to hit the road?
          </h2>
          <p style={{
            fontFamily: "var(--brc-font-ui)", fontSize: "clamp(16px, 4vw, 20px)", lineHeight: 1.5,
            color: "var(--brc-border)", maxWidth: 483, margin: 0,
          }}>
            Experience the best of ride on your journey. Available for purchase or hire processes.
          </p>
          <Link href="/services" className="brc-button-motion" style={{
            marginTop: 8, background: "var(--brc-accent)", color: "#fff",
            border: "none", borderRadius: 8, height: 56, padding: "0 28px",
            fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 14,
            cursor: "pointer", display: "inline-flex", alignItems: "center",
            gap: 10, width: "fit-content", textDecoration: "none",
          }}>
            Browse Cars <Icon name="arrow" size={18} />
          </Link>
        </div>
      </div>

      {/* Right — Loyalty panel */}
      <div style={{
        position: "relative", background: "var(--brc-accent-deep)", color: "#fff",
        overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
        padding: "var(--brc-section-y, 72px) clamp(24px,4vw,80px)",
      }}>
        {/* Concentric ring texture */}
        <div aria-hidden="true" className="loyalty-ring-texture" style={{
          position: "absolute", top: "-55%", right: "-30%", width: "160%",
          aspectRatio: "1", borderRadius: "50%", opacity: 0.16,
          background: "repeating-radial-gradient(circle, transparent 0 34px, #fff 34px 36px)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", width: "100%", maxWidth: 470, display: "flex", flexDirection: "column", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Icon name="gift" size={34} stroke="#fff" />
              <h3 style={{
                fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: "clamp(26px, 6vw, 34px)",
                lineHeight: 1.2, margin: 0,
              }}>
                Loyalty Rewards Program
              </h3>
            </div>
            <p style={{
              fontFamily: "var(--brc-font-ui)", fontSize: 18, lineHeight: 1.5,
              color: "#fff", margin: 0,
            }}>
              Join our rewards program and unlock amazing perks that make every journey more rewarding.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {PERKS.map((perk) => (
              <div key={perk.title} style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%", background: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Icon name={perk.icon} size={24} stroke="var(--brc-accent-deep)" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: "clamp(18px, 4.8vw, 21px)", lineHeight: 1.2 }}>{perk.title}</span>
                  <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 15, lineHeight: 1.45, color: "rgba(255,255,255,.92)" }}>{perk.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <JoinProgramButton />
        </div>
      </div>
    </section>
  );
}
