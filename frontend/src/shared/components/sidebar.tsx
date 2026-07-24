"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/shared/types";
import { cn } from "@/shared/utils";

type SidebarLink = {
  href: string;
  label: string;
};

const customerLinks: SidebarLink[] = [
  { href: "/customer/dashboard", label: "Dashboard" },
  { href: "/customer/listings", label: "Browse Cars" },
  { href: "/customer/requests", label: "My Requests" },
  { href: "/customer/offers", label: "Offers" },
  { href: "/customer/payments", label: "Payments" },
  { href: "/customer/transactions", label: "Transactions" },
];

const ownerLinks: SidebarLink[] = [
  { href: "/owner/dashboard", label: "Dashboard" },
  { href: "/owner/my-cars", label: "My Cars" },
  { href: "/owner/requests", label: "Requests" },
  { href: "/owner/offers", label: "Offers" },
  { href: "/owner/payments", label: "Payments" },
  { href: "/owner/transactions", label: "Transactions" },
];

type SidebarProps = {
  role: UserRole;
};

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const links = role === "customer" ? customerLinks : ownerLinks;

  return (
    <aside className="w-full shrink-0 border-b bg-background md:w-64 md:border-b-0 md:border-r">
      <nav className="flex gap-2 overflow-x-auto p-3 md:flex-col md:gap-1 md:overflow-visible md:p-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors",
              pathname === link.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
