"use client";

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

  const isStaff = user?.is_staff ?? false;
  const dashboardHref = isStaff ? "/admin/approvals" : userRole === "owner" ? "/owner/dashboard" : "/customer/dashboard";
  const { data: unreadData } = useUnreadCount();
  const role = userRole ?? "customer";

  const handleSignOut = () => {
    signOut.mutate(undefined, {
      onSettled: () => {
        router.push("/");
      },
    });
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
      <Link href="/">
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
            }}
          >
            {isStaff ? "Admin" : "Dashboard"}
          </Link>
        )}
      </nav>

      {isAuthenticated ? (
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <NotificationDropdown role={role} unreadCount={unreadData?.unread_count ?? 0} />
          <Link href={`${dashboardHref}/../profile`} style={iconBtnStyle} title="Profile">
            <Icon name="user" size={24} stroke="var(--brc-text)" />
          </Link>
          <button style={iconBtnStyle} title="Sign out" onClick={handleSignOut}>
            <Icon name="logout" size={24} stroke="var(--brc-text)" />
          </button>
        </div>
      ) : (
        <AuthButton href="/get-started" style={{ width: 150 }}>
          Sign Up
        </AuthButton>
      )}
    </header>
  );
}
