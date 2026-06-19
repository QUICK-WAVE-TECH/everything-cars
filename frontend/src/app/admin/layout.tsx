"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/features/auth/components/icon";
import { useMe, useSignOut } from "@/features/auth/api";
import { useUnreadCount } from "@/features/notifications/api";
import { NotificationDropdown } from "@/features/notifications/components/notification-dropdown";

const NAV_LINKS = [
  { label: "Approvals", href: "/admin/approvals" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Transactions", href: "/admin/transactions" },
];

function AdminNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const signOut = useSignOut();
  const { data: unreadData } = useUnreadCount();

  function handleSignOut() {
    signOut.mutate(undefined, {
      onSuccess: () => router.push("/sign-in"),
    });
  }

  return (
    <header className="sticky top-0 z-50 flex h-[72px] items-center justify-between border-b border-(--brc-border) bg-white px-6 sm:h-[84px] sm:px-[var(--brc-space-10,40px)]">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Image src="/logo.png" alt="Buy & Rent Cars" width={140} height={43} className="h-[43px] w-auto" />
        </Link>
        <span className="rounded-full bg-(--brc-success-bg) px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-(--brc-success) [font-family:var(--brc-font-ui)]">
          Staff
        </span>
      </div>

      <div className="flex items-center gap-6 sm:gap-10">
        <nav className="hidden items-center gap-7 sm:flex">
          {NAV_LINKS.map((link) => {
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

        <div className="flex items-center gap-5">
          <NotificationDropdown role="owner" unreadCount={unreadData?.unread_count ?? 0} />
          <button type="button" className="flex cursor-pointer border-none bg-transparent p-0">
            <Icon name="user" size={22} stroke="var(--brc-text)" />
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex cursor-pointer border-none bg-transparent p-0"
            title="Sign out"
          >
            <Icon name="logout" size={20} stroke="var(--brc-text-muted)" />
          </button>
        </div>
      </div>
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
