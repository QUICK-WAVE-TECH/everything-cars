"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/features/auth/components/icon";
import { useMe, useSignOut } from "@/features/auth/api";
import { useUnreadCount } from "@/features/notifications/api";
import { NotificationDropdown } from "@/features/notifications/components/notification-dropdown";

const NAV_LINKS = [
  { label: "Approvals", href: "/admin/approvals" },
  { label: "Owners", href: "/admin/owners" },
  { label: "Inspections", href: "/admin/inspections" },
  { label: "Publishing", href: "/admin/publishing", staffRoles: ["publisher", "admin"] },
  { label: "Disputes", href: "/admin/disputes" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Transactions", href: "/admin/transactions" },
];

/** Nav links visible to this staff member — role-restricted ones (Publishing)
 * only show for the matching staff_role. */
function visibleLinks(staffRole: string | undefined) {
  return NAV_LINKS.filter(
    (link) => !link.staffRoles || link.staffRoles.includes(staffRole ?? ""),
  );
}

/** Two-letter initials for the staff avatar, name first, email as a fallback. */
function initials(user: { first_name?: string; last_name?: string; email?: string }): string {
  const first = user.first_name?.[0] ?? "";
  const last = user.last_name?.[0] ?? "";
  const combined = `${first}${last}`.trim();
  return (combined || user.email?.[0] || "S").toUpperCase();
}

function AdminNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const signOut = useSignOut();
  const { data: user } = useMe();
  const { data: unreadData } = useUnreadCount();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu on navigation
  // (state-adjustment-during-render pattern — avoids an effect re-render)
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
  }

  function handleSignOut() {
    signOut.mutate(undefined, {
      onSuccess: () => router.push("/sign-in"),
    });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-(--brc-border) bg-white">
      <div className="flex h-[72px] items-center justify-between px-4 sm:h-[84px] sm:px-[var(--brc-space-10,40px)]">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Image src="/logo.png" alt="Buy & Rent Cars" width={140} height={43} className="h-[43px] w-auto" />
          </Link>
          <span className="hidden rounded-full bg-(--brc-success-bg) px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-(--brc-success) [font-family:var(--brc-font-ui)] sm:inline-block">
            Staff
          </span>
        </div>

        <div className="flex items-center gap-4 sm:gap-10">
          <nav className="hidden items-center gap-7 sm:flex">
            {visibleLinks(user?.staff_role).map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-base no-underline transition-colors [font-family:var(--brc-font-ui)] ${
                    active ? "font-bold text-(--brc-primary)" : "font-medium text-(--brc-text) hover:text-(--brc-primary)"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4 sm:gap-5">
            <NotificationDropdown role="admin" unreadCount={unreadData?.unread_count ?? 0} />
            {user ? (
              <div
                className="flex size-9 items-center justify-center rounded-full bg-(--brc-primary-tint) text-[13px] font-bold text-(--brc-primary) ring-1 ring-(--brc-border)"
                title={`${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email}
                aria-label="Staff account"
              >
                {initials(user)}
              </div>
            ) : (
              <button type="button" className="flex cursor-pointer border-none bg-transparent p-0">
                <Icon name="user" size={22} stroke="var(--brc-text)" />
              </button>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="hidden cursor-pointer border-none bg-transparent p-0 sm:flex"
              title="Sign out"
            >
              <Icon name="logout" size={20} stroke="var(--brc-text-muted)" />
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
              className="flex cursor-pointer flex-col items-center justify-center gap-[5px] border-none bg-transparent p-0 sm:hidden"
            >
              <span
                className={`block h-[2px] w-[22px] bg-(--brc-text) transition-transform ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`}
              />
              <span className={`block h-[2px] w-[22px] bg-(--brc-text) transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
              <span
                className={`block h-[2px] w-[22px] bg-(--brc-text) transition-transform ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-(--brc-border) bg-white px-4 py-3 sm:hidden">
          {visibleLinks(user?.staff_role).map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-2 py-2.5 text-base no-underline transition-colors [font-family:var(--brc-font-ui)] ${
                  active ? "font-bold text-(--brc-primary)" : "font-medium text-(--brc-text) hover:text-(--brc-primary)"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex cursor-pointer items-center gap-2 rounded-md border-none bg-transparent px-2 py-2.5 text-left text-base font-medium text-(--brc-text-muted) [font-family:var(--brc-font-ui)]"
          >
            <Icon name="logout" size={18} stroke="var(--brc-text-muted)" />
            Sign out
          </button>
        </nav>
      )}
    </header>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading } = useMe();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/sign-in");
      return;
    }
    if (!user.is_staff) {
      const dashboard = user.role === "owner" ? "/owner/dashboard" : "/customer/dashboard";
      router.replace(dashboard);
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || !user.is_staff) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-(--brc-bg-subtle)">
      <AdminNavbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
