"use client";

import Link from "next/link";
import { ArrowRightIcon, HandshakeIcon } from "lucide-react";

import { Breadcrumb } from "@/shared/components";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyDeals } from "@/features/deals/api";
import type { Deal, DealStatus } from "@/features/deals/api";
import type { UserRole } from "@/shared/types";

function money(amount: string, currency: string) {
  const symbol =
    ({ NGN: "₦", USD: "$", GBP: "£", EUR: "€" } as Record<string, string>)[currency] ??
    `${currency} `;
  return `${symbol}${Number(amount).toLocaleString("en-NG")}`;
}

const STATUS_STYLES: Record<DealStatus, { label: string; fg: string; bg: string }> = {
  active: { label: "In progress", fg: "var(--brc-accent)", bg: "var(--brc-accent-bg)" },
  completed: { label: "Completed", fg: "var(--brc-success)", bg: "var(--brc-success-bg)" },
  cancelled: { label: "Cancelled", fg: "var(--brc-text-muted)", bg: "var(--brc-bg-subtle)" },
};

function StatusBadge({ status }: { status: DealStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-(--brc-radius-pill) px-2.5 py-1 text-xs font-bold [font-family:var(--brc-font-ui)]"
      style={{ color: s.fg, background: s.bg }}
    >
      {s.label}
    </span>
  );
}

function DealRow({ deal }: { deal: Deal }) {
  const other = deal.viewer_role === "seller" ? deal.buyer : deal.seller;
  const otherName = other.business_name || `${other.first_name} ${other.last_name}`;
  const otherRole = deal.viewer_role === "seller" ? "Buyer" : "Seller";

  return (
    <Link
      href={`/deals/${deal.id}`}
      className="group flex items-center gap-4 rounded-(--brc-radius-md) border border-(--brc-border) bg-white p-4 no-underline transition-shadow hover:shadow-[var(--brc-shadow-sm)]"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-(--brc-primary-tint) text-(--brc-primary)">
        <HandshakeIcon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
          {deal.car.title}
        </div>
        <div className="truncate text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          {otherRole}: {otherName} · {money(deal.agreed_amount, deal.currency)}
        </div>
      </div>
      <StatusBadge status={deal.status} />
      <ArrowRightIcon
        className="size-4 shrink-0 text-(--brc-text-muted) transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

export function DealsListPage({ role }: { role: UserRole }) {
  const { data, isLoading } = useMyDeals();
  const deals = data?.results ?? [];

  return (
    <div className="min-h-[80vh] bg-(--brc-bg-subtle)">
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-5 py-8">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: `/${role}/dashboard` },
            { label: "Deals" },
          ]}
        />
        <div>
          <h1 className="text-2xl font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">
            Deals
          </h1>
          <p className="mt-1 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
            Accepted purchases. Open a deal to see the other party&apos;s contact details.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="rounded-(--brc-radius-md) border border-dashed border-(--brc-border) bg-white px-6 py-12 text-center">
            <HandshakeIcon
              className="mx-auto size-8 text-(--brc-text-muted)"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">
              No deals yet
            </p>
            <p className="mt-1 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              When a purchase offer is accepted, the deal shows up here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {deals.map((deal) => (
              <DealRow key={deal.id} deal={deal} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
