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
  { href: "/dashboard", label: "Dashboard" },
  { href: "/listings", label: "Browse Cars" },
  { href: "/requests", label: "My Requests" },
  { href: "/payments", label: "Payments" },
  { href: "/transactions", label: "Transactions" },
];

const ownerLinks: SidebarLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/my-cars", label: "My Cars" },
  { href: "/requests", label: "Requests" },
  { href: "/payments", label: "Payments" },
  { href: "/transactions", label: "Transactions" },
];

type SidebarProps = {
  role: UserRole;
};

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const links = role === "customer" ? customerLinks : ownerLinks;

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-background md:block">
      <nav className="flex flex-col gap-1 p-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition-colors",
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
