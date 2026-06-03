"use client";

import { useState } from "react";
import { Icon } from "@/features/auth/components/icon";
import { SectionHead } from "@/shared/components/section-head";

const FAQS: [string, string][] = [
  ["What is Buy & Rent Cars and how does it work?", "It's a Nigerian marketplace to rent, buy, or sell cars. Search verified listings, send a request, and the owner or dealer confirms — all tracked in your dashboard."],
  ["How do I rent a car on Buy & Rent Cars?", "Search by city and car type, choose a listing, and request to rent. Owners confirm and you complete payment securely."],
  ["Can I list my personal car for rent?", "Yes. Create an owner account, add your car details and photos, set your price, and start receiving requests."],
  ["Is there any verification process for owners and renters?", "Every owner and dealer is verified before listings go live, and renters complete identity checks for safety."],
  ["What happens if a car gets damaged during a rental?", "Damage is handled through our protection policy; report it in the request and our team mediates resolution."],
  ["When will the 'Buy' and 'Sell' features be available?", "Buy and Sell are rolling out now — you'll see Most Purchased and Most Listed cars on the homepage."],
];

function FAQItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div style={{
      background: "var(--brc-bg-subtle)", border: "1px solid var(--brc-border)",
      borderRadius: 12, padding: "18px 20px",
    }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", border: "none", background: "transparent",
          cursor: "pointer", display: "flex", justifyContent: "space-between",
          alignItems: "center", padding: 0, textAlign: "left",
        }}
      >
        <span style={{
          fontFamily: "var(--brc-font-ui)", fontSize: 15, fontWeight: 600,
          color: "var(--brc-text)",
        }}>
          {q}
        </span>
        <Icon name={open ? "chevup" : "chevdown"} size={18} stroke="var(--brc-text)" />
      </button>
      {open && (
        <p style={{
          fontFamily: "var(--brc-font-ui)", fontSize: 14, lineHeight: 1.5,
          color: "var(--brc-text-secondary)", marginTop: 12, marginBottom: 0,
        }}>
          {a}
        </p>
      )}
    </div>
  );
}

export function FAQSection() {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section style={{ background: "var(--brc-bg-subtle)", padding: "104px var(--brc-space-10, 104px)" }}>
      <div style={{ maxWidth: 1232, margin: "0 auto", display: "flex", flexDirection: "column", gap: 64, alignItems: "center" }}>
        <SectionHead pill="FAQS" title="Frequently Asked Questions" sub="Find answers to common questions about our services" center />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, width: "100%" }}>
          {FAQS.map(([q, a], idx) => (
            <FAQItem
              key={idx}
              q={q}
              a={a}
              open={openIdx === idx}
              onToggle={() => setOpenIdx(openIdx === idx ? -1 : idx)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
