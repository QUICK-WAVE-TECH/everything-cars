"use client";

import Image from "next/image";
import { useState } from "react";
import { PageHero } from "@/shared/components/page-hero";
import { TextImageRow } from "@/shared/components/text-image-row";
import { GrainOverlay } from "@/shared/components/grain-overlay";
import { Pill } from "@/shared/components/pill";
import { Icon } from "@/features/auth/components/icon";
import { ParallaxImage } from "@/shared/motion/parallax-image";
import { RevealOnce } from "@/shared/motion/reveal-once";
import { StaggerGroup, StaggerItem } from "@/shared/motion/stagger";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

/** Squircle, not a circle — rounded squares read less stock than avatar dots. */
function Avatar({ initials, tone, size }: { initials: string; tone: string; size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: tone,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 18px 34px -18px rgba(0,0,40,0.5)",
      }}
    >
      {/* The member's name follows in text — don't read the initials twice. */}
      <span
        aria-hidden="true"
        style={{
          fontFamily: "var(--brc-font-display)",
          fontWeight: 800,
          fontSize: size * 0.3,
          color: "#fff",
          letterSpacing: ".02em",
        }}
      >
        {initials}
      </span>
    </div>
  );
}

function TeamMember({ m }: { m: typeof TEAM[number] }) {
  return (
    <div className="group flex cursor-default flex-col items-center gap-3.5 text-center">
      <div className="transition-transform duration-200 group-hover:-translate-y-1.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
        <Avatar initials={m.initials} tone={m.tone} size={124} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[16px] font-bold leading-tight text-(--brc-text) [font-family:var(--brc-font-ui)]">
          {m.name}
        </span>
        <span className="text-[13.5px] leading-tight text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          {m.role}
        </span>
      </div>
    </div>
  );
}

function LinkedInIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 18v-7H6v7zM7.2 9.6a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8zM18 18v-3.9c0-2.1-1.1-3.1-2.6-3.1-1.2 0-1.8.7-2.1 1.2V11H10.8v7h2.5v-3.8c0-1 .2-2 1.4-2s1.3 1.2 1.3 2.1V18z" fill="#fff" />
    </svg>
  );
}

function ContactIcon({ entry }: { entry: ContactEntry }) {
  if (entry.icon === "linkedin") return <LinkedInIcon />;
  return <Icon name={entry.icon} size={14} stroke="#fff" />;
}

/** Uses the shared Dialog so the founder profile inherits the focus trap, Esc
 * handling and eased entrance the rest of the app has. */
function FounderProfile({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto overscroll-contain p-6 sm:max-w-[1040px] sm:p-10">
        <DialogHeader>
          <DialogTitle className="text-[26px] font-extrabold tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
            Mr. Arinze Okoh
          </DialogTitle>
          <DialogDescription className="text-[15px] text-(--brc-text-muted)">
            Managing Director / CEO
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_1fr] lg:gap-12">
          <div className="flex flex-col gap-6">
            <div className="relative mx-auto aspect-square w-full max-w-[300px] overflow-hidden rounded-[32px]">
              <Image src="/founder-ceo.jpg" alt="Mr. Arinze Okoh" fill sizes="300px" style={{ objectFit: "cover" }} />
            </div>
            <ul className="flex list-none flex-col gap-3 p-0">
              {CEO_CONTACT.map((c) => (
                <li key={c.text} className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="flex size-6 shrink-0 items-center justify-center rounded-md"
                    style={{ background: "var(--brc-accent)" }}
                  >
                    <ContactIcon entry={c} />
                  </span>
                  <span className="text-[14px] text-(--brc-text-secondary) [overflow-wrap:anywhere] [font-family:var(--brc-font-ui)]">
                    {c.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex max-w-[68ch] flex-col gap-4">
            {CEO_BIO.map((p, i) => (
              <p
                key={i}
                className="m-0 text-[16px] leading-[1.65] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]"
                style={{ textWrap: "pretty" }}
              >
                {p}
              </p>
            ))}
            <div className="flex flex-col gap-2">
              <p className="m-0 text-[16px] leading-[1.65] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                Mr. Okoh&apos;s leadership excellence has earned him recognition in several industry
                circles, including:
              </p>
              <ul className="m-0 flex flex-col gap-1.5 pl-5">
                {CEO_AWARDS.map((a) => (
                  <li
                    key={a}
                    className="text-[16px] leading-[1.55] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]"
                  >
                    {a}
                  </li>
                ))}
              </ul>
            </div>
            <p
              className="m-0 text-[16px] leading-[1.65] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]"
              style={{ textWrap: "pretty" }}
            >
              His leadership philosophy centers on integrity, innovation, and impact — values that
              continue to shape the culture and success of Buy &amp; Rent Cars as a customer-first,
              purpose-driven organization.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AboutPage() {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <GrainOverlay />

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

      {/* Founders */}
      <section className="relative overflow-hidden bg-white" style={{ padding: "var(--brc-section-y, 104px) var(--brc-space-10, 104px)" }}>
        {/* Ambient wash so the section isn't a flat white plane */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(52% 44% at 18% 12%, rgba(0,0,139,0.07), transparent 62%), radial-gradient(46% 40% at 88% 82%, rgba(195,101,35,0.07), transparent 66%)",
          }}
        />

        <div className="relative mx-auto flex max-w-[1232px] flex-col gap-[clamp(48px,8vw,80px)]">
          {/* Asymmetric header — heading leads, supporting copy sits lower and right */}
          <RevealOnce className="grid grid-cols-1 gap-8 lg:gap-16 lg:[grid-template-columns:1.15fr_0.85fr]">
            <div className="flex flex-col gap-4">
              <div className="self-start">
                <Pill>Founders</Pill>
              </div>
              <h2
                className="m-0 max-w-[13ch] text-[clamp(32px,4vw,56px)] font-extrabold leading-[1.08] tracking-[-0.025em] text-(--brc-text) [font-family:var(--brc-font-display)]"
                style={{ textWrap: "balance" }}
              >
                Guided by Experience, Driven by Vision
              </h2>
            </div>
            <p
              className="m-0 max-w-[58ch] self-end text-[16.5px] leading-[1.65] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]"
              style={{ textWrap: "pretty" }}
            >
              Our leadership team brings together a wealth of industry experience, innovation, and
              strategic vision. Each member plays a key role in guiding Buy &amp; Rent&apos;s mission,
              driving sustainable growth, empowering teams, and ensuring every client achieves
              meaningful and measurable success.
            </p>
          </RevealOnce>

          {/* CEO + team — deliberately unequal columns */}
          <div className="grid grid-cols-1 items-center gap-12 lg:gap-16 lg:[grid-template-columns:0.82fr_1.18fr]">
            <RevealOnce className="flex flex-col items-center gap-6">
              <div className="relative w-full max-w-[360px]">
                <div
                  aria-hidden="true"
                  className="absolute -inset-4 hidden rounded-[40px] lg:block"
                  style={{ background: "linear-gradient(150deg, rgba(0,0,139,0.15), transparent 62%)" }}
                />
                <ParallaxImage
                  src="/founder-ceo.jpg"
                  alt="Mr. Arinze Okoh"
                  sizes="(max-width: 640px) 90vw, 360px"
                  shift={22}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 34,
                    boxShadow: "0 34px 64px -30px rgba(0,0,40,0.45)",
                  }}
                />
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[23px] font-extrabold tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
                  Mr. Arinze Okoh
                </span>
                <span className="text-[15.5px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  Managing Director / CEO
                </span>
                <button
                  type="button"
                  className="brc-button-motion brc-button-motion-subtle mt-2.5 inline-flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-[14px] font-bold text-(--brc-accent) [font-family:var(--brc-font-ui)]"
                  onClick={() => setProfileOpen(true)}
                >
                  Read Full Profile
                  <span aria-hidden="true" className="flex">
                    <Icon name="arrow" size={16} stroke="var(--brc-accent)" />
                  </span>
                </button>
              </div>
            </RevealOnce>

            <StaggerGroup className="grid grid-cols-2 gap-[clamp(24px,5vw,40px)] sm:grid-cols-3">
              {TEAM.map((m) => (
                <StaggerItem key={m.name}>
                  <TeamMember m={m} />
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </div>
      </section>

      <FounderProfile open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
