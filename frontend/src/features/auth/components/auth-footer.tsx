import Image from "next/image";
import { Icon } from "./icon";

const FOOTER_COLS = [
  { title: "Quick Links", items: [{ label: "Home", href: "/" }, { label: "About Us", href: "/about" }, { label: "Contact Us", href: "/contact" }] },
  { title: "Services", items: [{ label: "Rent Cars", href: "/services" }, { label: "Buy Cars", href: "/services" }, { label: "Sell Cars", href: "/services" }] },
];

const CONTACTS = [
  { icon: "mail" as const, text: "info@buyandrentcars.com" },
  { icon: "mail" as const, text: "buyandrentcars@gmail.com" },
  { icon: "phone" as const, text: "+2348123456789" },
];

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  linkedin: <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 18v-7H6v7zM7.2 9.6a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8zM18 18v-3.9c0-2.1-1.1-3.1-2.6-3.1-1.2 0-1.8.7-2.1 1.2V11H10.8v7h2.5v-3.8c0-1 .2-2 1.4-2s1.3 1.2 1.3 2.1V18z" fill="#fff"/>,
  instagram: <><rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="#fff" strokeWidth="2"/><circle cx="12" cy="12" r="3.6" fill="none" stroke="#fff" strokeWidth="2"/><circle cx="16.6" cy="7.4" r="1.1" fill="#fff"/></>,
  facebook: <path d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.7-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.5v1.8h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" fill="#fff"/>,
  x: <path d="M17.5 4h2.6l-5.7 6.5L21 20h-5.2l-4-5.3L7 20H4.4l6-6.9L3.5 4h5.3l3.6 4.8zM16.6 18.4h1.4L7.8 5.5H6.3z" fill="#fff"/>,
  whatsapp: <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.6-1.2A9 9 0 1 0 12 3zm0 16.3a7.3 7.3 0 0 1-3.7-1l-.3-.2-2.7.7.7-2.6-.2-.3a7.3 7.3 0 1 1 6.2 3.4z" fill="#fff"/>,
};

const LEGAL_LINKS = ["Privacy Policy", "Terms of Service", "Cookie Policy"];

export function AuthFooter() {
  return (
    <footer style={{ background: "var(--brc-secondary)", color: "#fff", padding: "var(--brc-section-y, 80px) var(--brc-space-10, 104px) 48px" }}>
      <div style={{ maxWidth: 1232, margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
          gap: "clamp(32px, 6vw, 64px)",
        }}>
          {/* Brand column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Image src="/logo.png" alt="Buy & Rent Cars" width={170} height={72} style={{ height: 72, width: "auto", alignSelf: "flex-start", filter: "brightness(0) invert(1)" }} />
            <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,.8)", maxWidth: 300, margin: 0 }}>
              Your trusted partner for seamless car rentals. Connecting car owners with customers for the perfect ride.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {Object.entries(SOCIAL_ICONS).map(([name, svg]) => (
                <a key={name} style={{
                  width: 32, height: 32, borderRadius: 7, background: "var(--brc-accent)",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24">{svg}</svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLS.map((col) => (
            <div key={col.title} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 15 }}>{col.title}</span>
              {col.items.map((item) => (
                <a key={item.label} href={item.href} style={{
                  fontFamily: "var(--brc-font-ui)", fontSize: 14, color: "rgba(255,255,255,.75)",
                  textDecoration: "none", cursor: "pointer",
                }}>
                  {item.label}
                </a>
              ))}
            </div>
          ))}

          {/* Contact column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 15 }}>Contact</span>
            {CONTACTS.map((c) => (
              <a key={c.text} style={{
                display: "flex", alignItems: "center", gap: 12,
                fontFamily: "var(--brc-font-ui)", fontSize: 14, color: "rgba(255,255,255,.75)",
                textDecoration: "none", cursor: "pointer",
              }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 7, background: "var(--brc-accent)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Icon name={c.icon} size={17} stroke="#fff" />
                </span>
                {c.text}
              </a>
            ))}
          </div>
        </div>

        {/* Copyright bar */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,.12)", marginTop: 48, paddingTop: 24,
          display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        }}>
          <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "rgba(255,255,255,.6)" }}>
            Buy & Rent Cars &copy; {new Date().getFullYear()}. All rights reserved.
          </span>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {LEGAL_LINKS.map((l) => (
              <a key={l} style={{
                fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "rgba(255,255,255,.6)",
                textDecoration: "none", cursor: "pointer",
              }}>
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
