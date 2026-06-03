"use client";

import Link from "next/link";
import Image from "next/image";
import { Icon } from "./icon";
import { AuthButton } from "./auth-button";

const NAV_LINKS = ["About Us", "Services", "Contact Us"];

export function AuthNav() {
  return (
    <header style={{
      height: 84, background: "#fff",
      borderBottom: "1px solid var(--brc-border)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 104px",
    }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        <Link href="/">
          <Image src="/logo.png" alt="Buy & Rent Cars" width={170} height={52} style={{ height: 52, width: "auto" }} />
        </Link>
      </div>
      <nav style={{ display: "flex", gap: 28, alignItems: "center" }}>
        {NAV_LINKS.map((label) => (
          <Link
            key={label}
            href={label === "About Us" ? "/about" : label === "Services" ? "/services" : "/contact"}
            style={{
              border: "none", background: "transparent", color: "var(--brc-text)",
              fontFamily: "var(--brc-font-ui)", fontSize: 16, fontWeight: 500,
              padding: 0, cursor: "pointer", display: "flex", alignItems: "center",
              gap: 4, textDecoration: "none",
            }}
          >
            {label}
            {label === "Services" && <Icon name="chevdown" size={16} stroke="var(--brc-text)" />}
          </Link>
        ))}
      </nav>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <AuthButton href="/get-started" style={{ width: 140 }}>Sign Up</AuthButton>
      </div>
    </header>
  );
}
