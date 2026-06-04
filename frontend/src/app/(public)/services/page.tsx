import { Pill } from "@/shared/components/pill";
import { SectionHead } from "@/shared/components/section-head";
import { Icon } from "@/features/auth/components/icon";
import { AuthButton } from "@/features/auth/components/auth-button";
import { ServicesSection } from "@/features/website/sections/services-section";
import { LoyaltyBand } from "@/features/website/sections/loyalty-band";

const SERVICE_OFFERINGS = [
  {
    icon: "car" as const,
    title: "Rent a Car",
    desc: "Browse hundreds of verified cars available for daily, weekly, or monthly rental. Find the right car in your city — from compact sedans to luxury SUVs.",
    cta: "Browse Rentals",
    href: "/",
    accent: "var(--brc-primary)",
    tint: "var(--brc-primary-tint)",
  },
  {
    icon: "banknote" as const,
    title: "Buy a Car",
    desc: "Explore our curated marketplace of vehicles for sale. Every listing is verified and every dealer is trusted. Compare prices, features, and find your perfect car.",
    cta: "Browse Cars for Sale",
    href: "/",
    accent: "var(--brc-accent)",
    tint: "var(--brc-accent-bg)",
  },
  {
    icon: "handshake" as const,
    title: "Sell or List Your Car",
    desc: "Own a car? List it for rent or put it up for sale. Set your own price, manage requests from your dashboard, and earn steadily from your asset.",
    cta: "List Your Car",
    href: "/get-started",
    accent: "var(--brc-success)",
    tint: "var(--brc-success-bg)",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Search & Browse", desc: "Use our search to filter by city, car type, and price range. Find verified listings in seconds." },
  { step: "02", title: "Request or Enquire", desc: "Send a rental request or buying enquiry directly through the platform — no calls needed." },
  { step: "03", title: "Confirm & Pay", desc: "The owner or dealer confirms your request. Complete payment securely through the platform." },
  { step: "04", title: "Get on the Road", desc: "Pick up your car or have it delivered. Track everything from your dashboard." },
];

export default function ServicesPage() {
  return (
    <>
      {/* Hero banner */}
      <section style={{
        position: "relative", minHeight: "clamp(320px, 46vh, 480px)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "var(--brc-section-y, 104px) var(--brc-space-10, 104px)",
        background: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(/hero-bg.jpg) center/cover no-repeat`,
        textAlign: "center", gap: 20,
      }}>
        <Pill white>Our Services</Pill>
        <h1 style={{
          fontFamily: "var(--brc-font-display)", fontWeight: 800,
          fontSize: "clamp(34px, 7vw, 60px)", lineHeight: 1.15,
          color: "#fff", margin: 0, maxWidth: 760,
        }}>
          Find the Perfect Car for Every Journey
        </h1>
        <p style={{
          fontFamily: "var(--brc-font-ui)", fontSize: "clamp(16px, 3.5vw, 20px)", lineHeight: 1.5,
          color: "rgba(255,255,255,.92)", margin: 0, maxWidth: 580,
        }}>
          Rent, buy, or sell — all from one trusted platform. Choose what you need and we&apos;ll handle the rest.
        </p>
      </section>

      {/* Service offerings */}
      <section style={{ background: "var(--brc-bg-subtle)", padding: "var(--brc-section-y, 104px) var(--brc-space-10, 104px)" }}>
        <div style={{ maxWidth: 1232, margin: "0 auto", display: "flex", flexDirection: "column", gap: "clamp(40px, 7vw, 64px)", alignItems: "center" }}>
          <SectionHead
            pill="What We Offer"
            title="Everything You Need in One Place"
            sub="Three ways to get more from your car — or find the one you need."
            center
          />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: "clamp(20px, 4vw, 32px)",
            width: "100%",
          }}>
            {SERVICE_OFFERINGS.map((s) => (
              <div key={s.title} style={{
                background: "#fff",
                border: "1px solid var(--brc-border)",
                borderRadius: 20,
                overflow: "hidden",
                display: "flex", flexDirection: "column",
              }}>
                {/* Coloured top strip */}
                <div style={{ height: 6, background: s.accent }} />
                <div style={{ padding: "clamp(24px, 4vw, 36px)", display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: s.tint,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name={s.icon} size={26} stroke={s.accent} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                    <h3 style={{
                      fontFamily: "var(--brc-font-ui)", fontWeight: 700,
                      fontSize: 22, color: "var(--brc-text)", margin: 0,
                    }}>
                      {s.title}
                    </h3>
                    <p style={{
                      fontFamily: "var(--brc-font-ui)", fontSize: 15,
                      lineHeight: 1.65, color: "var(--brc-text-secondary)", margin: 0,
                    }}>
                      {s.desc}
                    </p>
                  </div>
                  <AuthButton
                    href={s.href}
                    variant={s.icon === "car" ? "primary" : s.icon === "banknote" ? "neutral" : "secondary"}
                    iconEnd="arrow"
                    style={{ alignSelf: "flex-start" }}
                  >
                    {s.cta}
                  </AuthButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: "#fff", padding: "var(--brc-section-y, 104px) var(--brc-space-10, 104px)" }}>
        <div style={{ maxWidth: 1232, margin: "0 auto", display: "flex", flexDirection: "column", gap: "clamp(40px, 7vw, 64px)", alignItems: "center" }}>
          <SectionHead
            pill="How It Works"
            title="Get Started in Four Simple Steps"
            sub="From searching to getting on the road — it takes just a few minutes."
            center
          />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            gap: "clamp(20px, 4vw, 40px)",
            width: "100%",
          }}>
            {HOW_IT_WORKS.map((step, idx) => (
              <div key={step.step} style={{ display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
                {/* Connector line — hidden on mobile via auto-fit */}
                {idx < HOW_IT_WORKS.length - 1 && (
                  <div aria-hidden="true" style={{
                    position: "absolute", top: 28, left: "calc(100% - 12px)",
                    width: "calc(100% - 16px)", height: 2,
                    background: "var(--brc-border)",
                    display: "none",
                  }} className="step-connector" />
                )}
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: "var(--brc-primary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--brc-font-display)", fontWeight: 800,
                  fontSize: 18, color: "#fff",
                }}>
                  {step.step}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <h3 style={{
                    fontFamily: "var(--brc-font-ui)", fontWeight: 700,
                    fontSize: 18, color: "var(--brc-text)", margin: 0,
                  }}>
                    {step.title}
                  </h3>
                  <p style={{
                    fontFamily: "var(--brc-font-ui)", fontSize: 15,
                    lineHeight: 1.6, color: "var(--brc-text-secondary)", margin: 0,
                  }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Car listings — reusing existing ServicesSection */}
      <ServicesSection />

      <LoyaltyBand />
    </>
  );
}
