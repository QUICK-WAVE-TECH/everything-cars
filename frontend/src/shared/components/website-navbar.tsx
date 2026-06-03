"use client";

import Link from "next/link";
import Image from "next/image";
import { AuthButton } from "@/features/auth/components/auth-button";

const NAV_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Contact Us", href: "/contact" },
];

export function WebsiteNavbar() {
  return (
    <header style={{
      minHeight: 84, background: "#fff",
      borderBottom: "1px solid var(--brc-border)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 20, flexWrap: "wrap",
      padding: "16px var(--brc-space-10, 104px)",
      position: "sticky", top: 0, zIndex: 50,
    }}>
      <Link href="/">
        <Image src="/logo.png" alt="Buy & Rent Cars" width={170} height={44} style={{ height: 44, width: "auto" }} />
      </Link>
      <nav style={{ display: "flex", gap: "clamp(16px, 4vw, 28px)", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        {NAV_LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="brc-nav-link"
            style={{
              fontFamily: "var(--brc-font-ui)", fontSize: 16,
              color: "var(--brc-text)", textDecoration: "none",
            }}
          >
            <span className="brc-nav-link-label">{link.label}</span>
          </Link>
        ))}
      </nav>
      <AuthButton href="/get-started" style={{ width: 150 }}>Sign Up</AuthButton>
    </header>
  );
}
