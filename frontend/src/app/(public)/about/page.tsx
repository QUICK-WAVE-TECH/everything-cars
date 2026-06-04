"use client";

import { useState } from "react";
import { PageHero } from "@/shared/components/page-hero";
import { TextImageRow } from "@/shared/components/text-image-row";
import { Pill } from "@/shared/components/pill";
import { Icon } from "@/features/auth/components/icon";

const TEAM = [
  { name: "Mr. Daniel Awuya", role: "Chief Technology Officer", initials: "DA", tone: "var(--brc-primary)" },
  { name: "Mrs. Ada Eze", role: "Chief Operating Officer", initials: "AE", tone: "var(--brc-accent)" },
  { name: "Mr. Emmanuel Okoh", role: "Head of Partnerships", initials: "EO", tone: "var(--brc-secondary)" },
  { name: "Ms. Halima Bello", role: "Head of Customer Success", initials: "HB", tone: "var(--brc-success)" },
  { name: "Mr. Nnamdi Igwe", role: "Head of Corporate Services", initials: "NI", tone: "var(--brc-primary)" },
  { name: "Mr. Tunde Bakare", role: "Head of Finance", initials: "TB", tone: "var(--brc-accent-deep)" },
];

const CEO_BIO = [
  "Mr. Arinze Okoh is an accomplished entrepreneur, business strategist, and technology innovator, currently serving as the Managing Director and Chief Executive Officer of Buy & Rent Cars. With over 15 years of experience across automotive services, digital platforms, and customer experience management, he has built a strong reputation for driving operational excellence and sustainable business growth.",
  "Mr. Okoh founded Buy & Rent Cars with a clear vision: to simplify car ownership and access across Africa — by connecting car owners, dealers, and customers through a seamless digital ecosystem. Under his leadership, the platform has become one of Nigeria's fastest-growing automotive marketplaces, known for its trust, transparency, and user-centric innovation.",
  "He holds a Bachelor's degree in Mechanical Engineering from the University of Lagos and an MBA in Business Management from Pan-Atlantic University (Lagos Business School). His passion for innovation has also led him to complete executive programs in Digital Business Strategy and Customer Experience Design from INSEAD.",
];

const CEO_AWARDS = [
  "Top 100 Tech Entrepreneurs in Nigeria — Techpoint Africa (2023)",
  "Excellence in Automotive Innovation Award — Nigerian Auto Forum (2022)",
  "Emerging CEO of the Year — BusinessDay Awards (2021)",
];

type ContactEntry =
  | { icon: "phone" | "mail"; text: string }
  | { icon: "linkedin"; text: string };

const CEO_CONTACT: ContactEntry[] = [
  { icon: "phone", text: "08120945628" },
  { icon: "mail", text: "arinze.okoh@gmail.com" },
  { icon: "linkedin", text: "linkedin.com/in/arinzeokoh/" },
];

function Avatar({ initials, tone, size }: { initials: string; tone: string; size: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: tone,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <span style={{
        fontFamily: "var(--brc-font-ui)", fontWeight: 700,
        fontSize: size * 0.32, color: "#fff", letterSpacing: ".02em",
      }}>{initials}</span>
    </div>
  );
}

function TeamMember({ m }: { m: typeof TEAM[number] }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 14, textAlign: "center", cursor: "default",
      transition: "transform .2s ease",
    }}>
      <Avatar initials={m.initials} tone={m.tone} size={132} />
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 16, color: "var(--brc-text)", lineHeight: 1.3 }}>{m.name}</span>
        <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 14, color: "var(--brc-text-muted)", lineHeight: 1.3 }}>{m.role}</span>
      </div>
    </div>
  );
}

function LinkedInIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 18v-7H6v7zM7.2 9.6a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8zM18 18v-3.9c0-2.1-1.1-3.1-2.6-3.1-1.2 0-1.8.7-2.1 1.2V11H10.8v7h2.5v-3.8c0-1 .2-2 1.4-2s1.3 1.2 1.3 2.1V18z" fill="#fff" />
    </svg>
  );
}

function ContactIcon({ entry }: { entry: ContactEntry }) {
  if (entry.icon === "linkedin") {
    return <LinkedInIcon />;
  }
  return <Icon name={entry.icon} size={14} stroke="#fff" />;
}

function FounderProfile({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(18,18,18,.55)",
        zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "48px 24px", overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 16, maxWidth: 1100, width: "100%",
          padding: "56px clamp(28px,4vw,64px)", boxShadow: "var(--brc-shadow-lg)",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 24, right: 24, width: 40, height: 40,
            borderRadius: "50%", border: "1px solid var(--brc-border)", background: "#fff",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, color: "var(--brc-text)", lineHeight: 1,
          }}
        >
          ✕
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 56, alignItems: "start" }}>
          {/* Left — photo + contact */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24, position: "sticky", top: 0 }}>
            <div style={{
              width: "100%", aspectRatio: "1", borderRadius: "50%",
              background: "url(/founder-ceo.jpg) center/cover no-repeat",
            }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {CEO_CONTACT.map((c) => (
                <div key={c.text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 4, background: "var(--brc-accent)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <ContactIcon entry={c} />
                  </span>
                  <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 14, color: "var(--brc-text-secondary)" }}>{c.text}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Right — bio */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ borderBottom: "1px solid var(--brc-border)", paddingBottom: 16, display: "flex", flexDirection: "column", gap: 6 }}>
              <h2 style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 28, color: "var(--brc-text)", margin: 0 }}>Mr. Arinze Okoh</h2>
              <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, color: "var(--brc-text-muted)" }}>Managing Director / CEO</span>
            </div>
            {CEO_BIO.map((p, i) => (
              <p key={i} style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, lineHeight: 1.6, color: "var(--brc-text-muted)", margin: 0 }}>{p}</p>
            ))}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, lineHeight: 1.6, color: "var(--brc-text-muted)", margin: 0 }}>
                Mr. Okoh&apos;s leadership excellence has earned him recognition in several industry circles, including:
              </p>
              <ul style={{ margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 6 }}>
                {CEO_AWARDS.map((a) => (
                  <li key={a} style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, lineHeight: 1.5, color: "var(--brc-text-muted)" }}>{a}</li>
                ))}
              </ul>
            </div>
            <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, lineHeight: 1.6, color: "var(--brc-text-muted)", margin: 0 }}>
              His leadership philosophy centers on integrity, innovation, and impact — values that continue to shape the culture and success of Buy &amp; Rent Cars as a customer-first, purpose-driven organization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AboutPage() {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <PageHero
        img="/about-hero.jpg"
        title="Who we Are?"
        sub="Explore a platform built to rent, buy, or sell cars seamlessly. Get behind the wheel of convenience, comfort, and confidence."
      />

      <TextImageRow
        pill="Who we Are"
        title="Your Car Journey Starts Here"
        img="/about-who.jpg"
        body={[
          "We are a team of innovators, car enthusiasts, and everyday people who understand the real challenges of owning or accessing cars in Nigeria.",
          "What started as a simple idea to make car rental easier has grown into a trusted platform where anyone can rent, buy, or list cars with complete peace of mind.",
          "At Buy & Rent Cars, we are not just creating a marketplace — we are building a community that values trust, convenience, and opportunity on the road.",
        ]}
      />

      <TextImageRow
        reverse
        bg="var(--brc-bg-subtle)"
        pill="Our Mission"
        title="Making Car Access Easy and Secure"
        img="/about-mission.jpg"
        body={[
          "Our mission is to transform how Nigerians experience mobility by giving everyone access to trusted car solutions in one place. We believe getting a car should be fast, safe, and affordable — not stressful or complicated.",
          "That is why we created a platform that empowers users and owners alike. Renters find verified cars with ease, buyers connect directly with trusted sellers, and owners earn steadily from their vehicles.",
          "We are not just changing how people move — we are helping Nigerians experience freedom, confidence, and convenience every time they drive.",
        ]}
      />

      {/* Founders Section */}
      <section style={{ background: "#fff", padding: "104px var(--brc-space-10, 104px)" }}>
        <div style={{ maxWidth: 1232, margin: "0 auto", display: "flex", flexDirection: "column", gap: 72 }}>
          {/* Header row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ alignSelf: "flex-start" }}><Pill>Founders</Pill></div>
              <h2 style={{
                fontFamily: "var(--brc-font-ui)", fontWeight: 700,
                fontSize: "clamp(30px,3.4vw,48px)", lineHeight: 1.2,
                color: "var(--brc-text)", maxWidth: 460, margin: 0,
              }}>Guided by Experience, Driven by Vision</h2>
            </div>
            <p style={{
              fontFamily: "var(--brc-font-ui)", fontSize: 16, lineHeight: 1.6,
              color: "var(--brc-text-muted)", margin: 0,
            }}>
              Our leadership team brings together a wealth of industry experience, innovation, and strategic vision. Each member plays a key role in guiding Buy &amp; Rent&apos;s mission, driving sustainable growth, empowering teams, and ensuring every client achieves meaningful and measurable success.
            </p>
          </div>

          {/* CEO + Team grid */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(380px, 460px) 1fr", gap: 56, alignItems: "center" }}>
            {/* Featured CEO */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
              <div style={{
                width: "100%", aspectRatio: "1", borderRadius: "50%",
                background: "url(/founder-ceo.jpg) center/cover no-repeat", maxWidth: 380,
              }} />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 24, color: "var(--brc-text)" }}>Mr. Arinze Okoh</span>
                <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, color: "var(--brc-text-muted)" }}>Managing Director / CEO</span>
                <button
                  onClick={() => setProfileOpen(true)}
                  style={{
                    marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8,
                    background: "transparent", border: "none", color: "var(--brc-accent)",
                    fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 14,
                    cursor: "pointer", padding: 0,
                  }}
                >
                  Read Full Profile <Icon name="arrow" size={16} stroke="var(--brc-accent)" />
                </button>
              </div>
            </div>
            {/* Team grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
              {TEAM.map((m) => <TeamMember key={m.name} m={m} />)}
            </div>
          </div>
        </div>
      </section>

      <FounderProfile open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
