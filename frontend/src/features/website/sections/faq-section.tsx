import { SectionHead } from "@/shared/components/section-head";
import { ParallaxLayer } from "@/shared/motion/parallax-layer";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const FAQS: [string, string][] = [
  ["What is Buy & Rent Cars and how does it work?", "It's a Nigerian marketplace to rent, buy, or sell cars. Search verified listings, send a request, and the owner or dealer confirms — all tracked in your dashboard."],
  ["How do I rent a car on Buy & Rent Cars?", "Search by city and car type, choose a listing, and request to rent. Owners confirm and you complete payment securely."],
  ["Can I list my personal car for rent?", "Yes. Create an owner account, add your car details and photos, set your price, and start receiving requests."],
  ["Is there any verification process for owners and renters?", "Every owner and dealer is verified before listings go live, and renters complete identity checks for safety."],
  ["What happens if a car gets damaged during a rental?", "Damage is handled through our protection policy; report it in the request and our team mediates resolution."],
  ["When will the 'Buy' and 'Sell' features be available?", "Buy and Sell are rolling out now — you'll see Most Purchased and Most Listed cars on the homepage."],
];

export function FAQSection() {
  return (
    <section style={{ background: "var(--brc-bg-subtle)", padding: "var(--brc-section-y, 104px) var(--brc-space-10, 104px)" }}>
      <div style={{ maxWidth: 1232, margin: "0 auto", display: "flex", flexDirection: "column", gap: "clamp(36px, 7vw, 64px)", alignItems: "center" }}>
        <ParallaxLayer from={16} to={-16}>
          <SectionHead pill="FAQS" title="Frequently Asked Questions" sub="Find answers to common questions about our services" center />
        </ParallaxLayer>
        <Accordion
          defaultValue={["faq-0"]}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
            gap: 24,
            width: "100%",
          }}
        >
          {FAQS.map(([q, a], idx) => (
            <AccordionItem
              key={q}
              value={`faq-${idx}`}
              className="rounded-xl border-0"
              style={{
                background: "var(--brc-bg-subtle)",
                border: "1px solid var(--brc-border)",
                borderRadius: 12,
                padding: "18px 20px",
              }}
            >
              <AccordionTrigger
                className="py-0 hover:no-underline"
                style={{
                  fontFamily: "var(--brc-font-ui)",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--brc-text)",
                }}
              >
                {q}
              </AccordionTrigger>
              <AccordionContent
                className="pb-0"
                style={{
                  fontFamily: "var(--brc-font-ui)",
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: "var(--brc-text-secondary)",
                }}
              >
                <p style={{ margin: 0, paddingTop: 12 }}>{a}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
