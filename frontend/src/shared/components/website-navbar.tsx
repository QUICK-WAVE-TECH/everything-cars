"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AuthButton } from "@/features/auth/components/auth-button";
import { useAuthStore } from "@/features/auth/store";
import { useSignOut, useMe } from "@/features/auth/api";
import { useUnreadCount } from "@/features/notifications/api";
import { NotificationDropdown } from "@/features/notifications/components/notification-dropdown";
import { Icon } from "@/features/auth/components/icon";

const NAV_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Contact Us", href: "/contact" },
];

const iconBtnStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: 0,
  display: "flex",
  alignItems: "center",
};

export function WebsiteNavbar() {
  const { isAuthenticated, userRole } = useAuthStore();
  const { data: user } = useMe();
  const signOut = useSignOut();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const isStaff = user?.is_staff ?? false;
  const dashboardHref = isStaff ? "/admin/approvals" : userRole === "owner" ? "/owner/dashboard" : "/customer/dashboard";
  const profileHref = `${dashboardHref}/../profile`;
  const notificationsHref = `${dashboardHref}/../notifications`;
  const { data: unreadData } = useUnreadCount();
  const role = userRole ?? "customer";

  const handleSignOut = () => {
    setMenuOpen(false);
    signOut.mutate(undefined, {
      onSettled: () => {
        router.push("/");
      },
    });
  };

  return (
    <header
      className="brc-navbar"
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

      {/* Desktop nav links */}
      <nav
        className="brc-nav-desktop"
        style={{
          display: "flex",
          gap: "clamp(16px, 4vw, 28px)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="brc-nav-link"
            style={{
              fontFamily: "var(--brc-font-ui)",
              fontSize: 16,
              color: "var(--brc-text)",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            <span className="brc-nav-link-label">{link.label}</span>
          </Link>
        ))}
        {isAuthenticated && (
          <Link
            href={dashboardHref}
            style={{
              fontFamily: "var(--brc-font-ui)",
              fontSize: 16,
              color: "var(--brc-text)",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {isStaff ? "Admin" : "Dashboard"}
          </Link>
        )}
      </nav>

      {/* Desktop actions */}
      <div className="brc-nav-actions" style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {isAuthenticated ? (
          <>
            <NotificationDropdown role={role} unreadCount={unreadData?.unread_count ?? 0} />
            <Link href={profileHref} style={iconBtnStyle} title="Profile">
              <Icon name="user" size={24} stroke="var(--brc-text)" />
            </Link>
            <button style={iconBtnStyle} title="Sign out" onClick={handleSignOut}>
              <Icon name="logout" size={24} stroke="var(--brc-text)" />
            </button>
          </>
        ) : (
          <AuthButton href="/get-started" style={{ width: 150 }}>
            Sign Up
          </AuthButton>
        )}
      </div>

      {/* Mobile: bell (when signed in) + hamburger */}
      <div className="brc-nav-mobile-controls" style={{ display: "none", alignItems: "center", gap: 14 }}>
        {isAuthenticated && (
          <NotificationDropdown role={role} unreadCount={unreadData?.unread_count ?? 0} />
        )}
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          style={{ ...iconBtnStyle, width: 40, height: 40, justifyContent: "center", borderRadius: 10 }}
        >
          {menuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brc-text)" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brc-text)" strokeWidth="2" strokeLinecap="round">
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
          className="brc-nav-panel"
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
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: "var(--brc-font-ui)",
                fontSize: 16,
                fontWeight: 600,
                color: "var(--brc-text)",
                textDecoration: "none",
                padding: "12px 8px",
                borderRadius: 10,
              }}
            >
              {link.label}
            </Link>
          ))}

          {isAuthenticated ? (
            <>
              <Link
                href={dashboardHref}
                onClick={() => setMenuOpen(false)}
                style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, fontWeight: 600, color: "var(--brc-text)", textDecoration: "none", padding: "12px 8px", borderRadius: 10 }}
              >
                {isStaff ? "Admin" : "Dashboard"}
              </Link>
              <Link
                href={notificationsHref}
                onClick={() => setMenuOpen(false)}
                style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, fontWeight: 600, color: "var(--brc-text)", textDecoration: "none", padding: "12px 8px", borderRadius: 10 }}
              >
                Notifications
              </Link>
              <Link
                href={profileHref}
                onClick={() => setMenuOpen(false)}
                style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, fontWeight: 600, color: "var(--brc-text)", textDecoration: "none", padding: "12px 8px", borderRadius: 10 }}
              >
                Profile
              </Link>
              <div style={{ height: 1, background: "var(--brc-border)", margin: "6px 0" }} />
              <button
                type="button"
                onClick={handleSignOut}
                style={{ display: "flex", alignItems: "center", gap: 8, border: "none", background: "transparent", cursor: "pointer", fontFamily: "var(--brc-font-ui)", fontSize: 16, fontWeight: 600, color: "var(--brc-danger)", padding: "12px 8px", borderRadius: 10, textAlign: "left" }}
              >
                <Icon name="logout" size={20} stroke="var(--brc-danger)" />
                Sign out
              </button>
            </>
          ) : (
            <div style={{ marginTop: 6 }}>
              <AuthButton href="/get-started" style={{ width: "100%" }}>
                Sign Up
              </AuthButton>
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .brc-nav-desktop { display: none !important; }
          .brc-nav-actions { display: none !important; }
          .brc-nav-mobile-controls { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
