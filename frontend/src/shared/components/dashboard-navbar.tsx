"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Icon } from "@/features/auth/components/icon";
import { useAuthStore } from "@/features/auth/store";
import { useUnreadCount } from "@/features/notifications/api";
import { NotificationDropdown } from "@/features/notifications/components/notification-dropdown";
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
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.unread_count ?? 0;

  const dashboardHref = `/${role}/dashboard`;

  function handleLogout() {
    setMenuOpen(false);
    clearAuth();
    router.push("/sign-in");
  }

  const navLinkStyle: React.CSSProperties = {
    fontFamily: "var(--brc-font-ui)",
    fontSize: 16,
    color: "var(--brc-text)",
    textDecoration: "none",
    whiteSpace: "nowrap",
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

  const panelLinkStyle: React.CSSProperties = {
    fontFamily: "var(--brc-font-ui)",
    fontSize: 16,
    fontWeight: 600,
    color: "var(--brc-text)",
    textDecoration: "none",
    padding: "12px 8px",
    borderRadius: 10,
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
        padding: "16px clamp(16px, 6vw, var(--brc-space-10, 40px))",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <Link href="/" onClick={() => setMenuOpen(false)} style={{ display: "flex", flexShrink: 0 }}>
        <Image
          src="/logo.png"
          alt="Buy & Rent Cars"
          width={170}
          height={44}
          style={{ height: 44, width: "auto" }}
        />
      </Link>

      {/* Desktop nav */}
      <nav
        className="brc-dnav-desktop"
        style={{
          display: "flex",
          gap: "clamp(16px, 4vw, 28px)",
          alignItems: "center",
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

      {/* Desktop action icons */}
      <div className="brc-dnav-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <NotificationDropdown role={role} unreadCount={unreadCount} />
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

      {/* Mobile: bell + hamburger */}
      <div className="brc-dnav-mobile" style={{ display: "none", alignItems: "center", gap: 12 }}>
        <NotificationDropdown role={role} unreadCount={unreadCount} />
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          style={{ ...iconBtnStyle, cursor: "pointer" }}
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brc-text)" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brc-text)" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown panel */}
      {menuOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            borderBottom: "1px solid var(--brc-border)",
            boxShadow: "var(--brc-shadow-md)",
            display: "flex",
            flexDirection: "column",
            padding: 16,
            gap: 4,
            zIndex: 50,
          }}
        >
          <Link href="/about" onClick={() => setMenuOpen(false)} style={panelLinkStyle}>About Us</Link>
          <Link href="/services" onClick={() => setMenuOpen(false)} style={panelLinkStyle}>Services</Link>
          <Link href="/contact" onClick={() => setMenuOpen(false)} style={panelLinkStyle}>Contact Us</Link>
          <Link href={dashboardHref} onClick={() => setMenuOpen(false)} style={panelLinkStyle}>Dashboard</Link>
          <Link href={`/${role}/notifications`} onClick={() => setMenuOpen(false)} style={panelLinkStyle}>Notifications</Link>
          <Link href={`/${role}/profile`} onClick={() => setMenuOpen(false)} style={panelLinkStyle}>Profile</Link>
          <div style={{ height: 1, background: "var(--brc-border)", margin: "6px 0" }} />
          <button
            type="button"
            onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: 8, border: "none", background: "transparent", cursor: "pointer", fontFamily: "var(--brc-font-ui)", fontSize: 16, fontWeight: 600, color: "var(--brc-danger)", padding: "12px 8px", borderRadius: 10, textAlign: "left" }}
          >
            <Icon name="logout" size={20} stroke="var(--brc-danger)" />
            Log out
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .brc-dnav-desktop { display: none !important; }
          .brc-dnav-actions { display: none !important; }
          .brc-dnav-mobile { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
