"use client";

import { useState } from "react";
import { PageHero } from "@/shared/components/page-hero";
import { Icon } from "@/features/auth/components/icon";
import type { IconName } from "@/features/auth/components/icon";

function ContactField({ label, placeholder, value, onChange, textarea, type = "text" }: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  type?: string;
}) {
  const base: React.CSSProperties = {
    width: "100%", border: "1px solid var(--brc-border)", background: "#fff",
    borderRadius: 8, padding: "14px 16px", fontFamily: "var(--brc-font-ui)",
    fontSize: 14, color: "var(--brc-text)", outline: "none", resize: "none",
  };

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 14, fontWeight: 600, color: "var(--brc-text)" }}>{label}</span>
      {textarea
        ? <textarea rows={5} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={base} />
        : <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={{ ...base, height: 50 }} />
      }
    </label>
  );
}

export default function ContactPage() {
  const [fields, setFields] = useState({ name: "", email: "", phone: "", message: "" });
  const set = (k: string) => (v: string) => setFields((s) => ({ ...s, [k]: v }));

  const handleSubmit = () => {
    // TODO: wire to API
    setFields({ name: "", email: "", phone: "", message: "" });
  };

  return (
    <>
      <PageHero
        img="/contact-hero.jpg"
        title="Contact Us"
        sub="Have questions or need help? Reach out and our team will get back to you as soon as possible."
      />

      <section style={{ background: "#fff", padding: "var(--brc-section-y, 104px) var(--brc-space-10, 104px)" }}>
        <div style={{
          maxWidth: 1232, margin: "0 auto", display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
          gap: "clamp(36px, 7vw, 88px)", alignItems: "start",
        }}>
          {/* Left — copy + contact details + decorative mark */}
          <div style={{ display: "flex", flexDirection: "column", gap: 40, position: "relative" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 style={{
                fontFamily: "var(--brc-font-ui)", fontWeight: 700,
                fontSize: "clamp(30px,3.4vw,48px)", lineHeight: 1.25,
                color: "var(--brc-text)", margin: 0,
              }}>
                Still Have Questions?<br />Contact Us!
              </h2>
              <p style={{
                fontFamily: "var(--brc-font-ui)", fontSize: 16, lineHeight: 1.5,
                color: "var(--brc-text-muted)", maxWidth: 440, margin: 0,
              }}>
                We&apos;re here to help. Fill out the form, and a member of our support team will get back to you shortly.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {([ ["phone", "+234 8123456789"], ["mail", "support@buyandrentcars.com"] ] as [IconName, string][]).map(([ic, txt]) => (
                <div key={txt} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 4, background: "var(--brc-accent)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Icon name={ic} size={14} stroke="#fff" />
                  </span>
                  <span style={{
                    fontFamily: "var(--brc-font-ui)", fontSize: 16,
                    color: "var(--brc-accent)", overflowWrap: "anywhere",
                  }}>{txt}</span>
                </div>
              ))}
            </div>
            <div aria-hidden="true" style={{
              fontFamily: "var(--brc-font-display)", fontWeight: 800,
              fontSize: "clamp(96px, 35vw, 220px)",
              lineHeight: 0.8, color: "var(--brc-primary-tint)", marginTop: 8, userSelect: "none",
            }}>?</div>
          </div>

          {/* Right — form card */}
          <div style={{
            background: "var(--brc-bg-subtle)", borderRadius: 12,
            padding: "clamp(20px, 5vw, 24px)",
            display: "flex", flexDirection: "column", gap: 20,
            minWidth: 0,
          }}>
            <ContactField label="Full Name" placeholder="Your name" value={fields.name} onChange={set("name")} />
            <ContactField label="Email Address" placeholder="Your email" value={fields.email} onChange={set("email")} type="email" />
            <ContactField label="Phone Number" placeholder="Your phone number" value={fields.phone} onChange={set("phone")} />
            <ContactField label="Message" placeholder="Your message" value={fields.message} onChange={set("message")} textarea />
            <button
              className="brc-button-motion brc-contact-submit"
              onClick={handleSubmit}
              style={{
                alignSelf: "flex-start", background: "var(--brc-accent)", color: "#fff",
                border: "none", borderRadius: 8, height: 50,
                padding: "0 clamp(24px, 7vw, 38px)",
                fontFamily: "var(--brc-font-ui)", fontWeight: 600,
                fontSize: "clamp(14px, 3.6vw, 16px)", lineHeight: 1,
                cursor: "pointer", width: "fit-content", maxWidth: "100%",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                whiteSpace: "nowrap",
              }}
            >
              Send Message
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
