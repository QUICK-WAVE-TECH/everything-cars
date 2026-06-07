"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Icon } from "@/features/auth/components/icon";
import { useAuthStore } from "@/features/auth/store";
import type { UserRole } from "@/shared/types";

type DashboardNavbarProps = {
  role: UserRole;
};

const SERVICE_LINKS = [
  { label: "Rent Cars", href: "/services" },
  { label: "Buy Cars", href: "/services" },
];

export function DashboardNavbar({ role }: DashboardNavbarProps) {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [servicesOpen, setServicesOpen] = useState(false);

  const dashboardHref = `/${role}/dashboard`;

  function handleLogout() {
    clearAuth();
    router.push("/sign-in");
  }

  const navLinkStyle: React.CSSProperties = {
    fontFamily: "var(--brc-font-ui)",
    fontSize: 16,
    color: "var(--brc-text)",
    textDecoration: "none",
  };

  const iconBtnStyle: React.CSSProperties = {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: "var(--brc-radius-pill)",
    border: "1px solid var(--brc-border)",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };

  return (
    <header
      style={{
        minHeight: 84,
        background: "#fff",
        borderBottom: "1px solid var(--brc-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        flexWrap: "wrap",
        padding: "16px var(--brc-space-10, 104px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <Link href={dashboardHref}>
        <Image
          src="/logo.png"
          alt="Buy & Rent Cars"
          width={170}
          height={44}
          style={{ height: 44, width: "auto" }}
        />
      </Link>

      <nav
        style={{
          display: "flex",
          gap: "clamp(16px, 4vw, 28px)",
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Link href="/about" className="brc-nav-link" style={navLinkStyle}>
          <span className="brc-nav-link-label">About Us</span>
        </Link>

        {/* Services dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setServicesOpen((o) => !o)}
            aria-expanded={servicesOpen}
            className="brc-nav-link"
            style={{
              ...navLinkStyle,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span className="brc-nav-link-label">Services</span>
            <Icon name={servicesOpen ? "chevup" : "chevdown"} size={16} stroke="var(--brc-text)" />
          </button>
          {servicesOpen && (
            <>
              <div
                onClick={() => setServicesOpen(false)}
                style={{ position: "fixed", inset: 0, zIndex: 40 }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 14px)",
                  left: 0,
                  zIndex: 50,
                  minWidth: 180,
                  background: "#fff",
                  border: "1px solid var(--brc-border)",
                  borderRadius: "var(--brc-radius-md)",
                  boxShadow: "var(--brc-shadow-md)",
                  padding: 6,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {SERVICE_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setServicesOpen(false)}
                    style={{
                      fontFamily: "var(--brc-font-ui)",
                      fontSize: 14,
                      color: "var(--brc-text-secondary)",
                      textDecoration: "none",
                      padding: "10px 12px",
                      borderRadius: "var(--brc-radius-sm)",
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        <Link href="/contact" className="brc-nav-link" style={navLinkStyle}>
          <span className="brc-nav-link-label">Contact Us</span>
        </Link>
        <Link href={dashboardHref} className="brc-nav-link" style={navLinkStyle}>
          <span className="brc-nav-link-label">Dashboard</span>
        </Link>
      </nav>

      {/* Action icons */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href={`/${role}/notifications`} aria-label="Notifications" className="brc-button-motion-icon" style={iconBtnStyle}>
          <Icon name="bell" size={20} stroke="var(--brc-text)" />
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 8,
              right: 9,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--brc-danger)",
              border: "1.5px solid #fff",
            }}
          />
        </Link>
        <Link href={`/${role}/profile`} aria-label="Profile" className="brc-button-motion-icon" style={iconBtnStyle}>
          <Icon name="user" size={20} stroke="var(--brc-text)" />
        </Link>
        <button
          aria-label="Log out"
          onClick={handleLogout}
          className="brc-button-motion-icon"
          style={iconBtnStyle}
        >
          <Icon name="logout" size={20} stroke="var(--brc-text)" />
        </button>
      </div>
    </header>
  );
}
