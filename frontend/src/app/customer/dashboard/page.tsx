"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";

import { Icon } from "@/features/auth/components/icon";
import type { IconName } from "@/features/auth/components/icon";
import { useMe } from "@/features/auth/api";
import { CUSTOMER_STATS } from "@/features/requests/data";

type DashboardStyle = CSSProperties & Record<`--${string}`, string | number>;

type QuickLink = {
  label: string;
  description: string;
  icon: IconName;
  href: string;
  bg: string;
  fg: string;
};

const QUICK_LINKS: QuickLink[] = [
  {
    label: "Browse Cars",
    description: "Find verified cars for rent or purchase.",
    icon: "car",
    href: "/customer/listings",
    bg: "var(--brc-primary-tint)",
    fg: "var(--brc-primary)",
  },
  {
    label: "My Requests",
    description: "Track pending approvals and next steps.",
    icon: "clock",
    href: "/customer/requests",
    bg: "var(--brc-bg-muted)",
    fg: "var(--brc-text-secondary)",
  },
  {
    label: "Transactions",
    description: "Review receipts, payments, and history.",
    icon: "banknote",
    href: "/customer/transactions",
    bg: "var(--brc-success-bg)",
    fg: "var(--brc-success)",
  },
  {
    label: "Rewards",
    description: "See points and loyalty benefits.",
    icon: "gift",
    href: "/customer/loyalty",
    bg: "var(--brc-accent-bg)",
    fg: "var(--brc-accent)",
  },
];

type RequestStatus = "approved" | "pending";

type RecentRequest = {
  id: number;
  car: string;
  party: string;
  mode: "Rent" | "Buy";
  days?: number;
  price: number;
  status: RequestStatus;
  note: string;
  action?: { label: string; href: string };
};

const RECENT_REQUESTS: RecentRequest[] = [
  {
    id: 1,
    car: "Lexus NX 300h",
    party: "Hilary Emmanuel",
    mode: "Rent",
    days: 5,
    price: 175000,
    status: "approved",
    note: "Approved by owner. Payment is ready.",
    action: { label: "Proceed to payment", href: "/customer/payments" },
  },
  {
    id: 2,
    car: "Lexus NX 300h",
    party: "Hilary Emmanuel",
    mode: "Rent",
    days: 5,
    price: 175000,
    status: "pending",
    note: "Waiting for owner approval.",
  },
  {
    id: 3,
    car: "Lexus NX 300h",
    party: "Premium Auto Gallery",
    mode: "Buy",
    price: 16000000,
    status: "pending",
    note: "Dealer review in progress.",
  },
];

const RECOMMENDED_CARS = [
  {
    id: 1,
    name: "Lexus NX 300h",
    location: "Lekki, Lagos",
    tag: "Rent",
    price: 35000,
    suffix: "per day",
    href: "/customer/listings/1",
  },
  {
    id: 2,
    name: "Lexus NX 300h",
    location: "Victoria Island",
    tag: "Buy",
    price: 16000000,
    suffix: "asking price",
    href: "/customer/listings/2",
  },
];

const STATUS_STYLES: Record<
  RequestStatus,
  { label: string; bg: string; fg: string; ring: string }
> = {
  approved: {
    label: "Approved",
    bg: "var(--brc-success-bg)",
    fg: "var(--brc-success)",
    ring: "rgba(32, 184, 88, 0.22)",
  },
  pending: {
    label: "Pending",
    bg: "var(--brc-warning-bg)",
    fg: "#9a7400",
    ring: "rgba(255, 192, 1, 0.26)",
  },
};

const noopSubscribe = () => () => {};

function naira(n: number): string {
  return `₦${n.toLocaleString("en-NG")}`;
}

function greetingFor(hour: number): string {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function useGreeting(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => greetingFor(new Date().getHours()),
    () => "Welcome",
  );
}

function AnimatedStatValue({ value }: { value: string }) {
  const target = useMemo(() => {
    const digits = value.replace(/[^\d]/g, "");
    return digits ? Number(digits) : null;
  }, [value]);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (target == null) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timeout = window.setTimeout(() => setDisplay(target), 0);
      return () => window.clearTimeout(timeout);
    }

    let frame = 0;
    const startedAt = performance.now();
    const duration = 850;

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplay(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  if (target == null) return value;

  return display.toLocaleString("en-NG");
}

function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-(--brc-accent) [font-family:var(--brc-font-ui)]">
            {eyebrow}
          </p>
        )}
        <h2 className="m-0 text-xl font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function DashboardButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "soft";
}) {
  const primary = variant === "primary";

  return (
    <Link
      href={href}
      className={`brc-dashboard-button group inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold transition-all duration-200 [font-family:var(--brc-font-ui)] hover:-translate-y-0.5 active:translate-y-0 sm:w-auto ${
        primary
          ? "bg-(--brc-primary) text-white shadow-[0_12px_24px_rgba(0,0,139,0.16)] hover:bg-(--brc-primary-hover) hover:shadow-[0_16px_30px_rgba(0,0,139,0.2)]"
          : "border border-(--brc-border) bg-white text-(--brc-text) hover:border-(--brc-primary) hover:text-(--brc-primary) hover:shadow-[0_10px_20px_rgba(18,18,18,0.08)]"
      }`}
    >
      {children}
      <span className="brc-dashboard-arrow flex transition-transform duration-200 group-hover:translate-x-1">
        <Icon name="arrow" size={16} stroke="currentColor" />
      </span>
    </Link>
  );
}

function StatCard({
  stat,
  delay,
}: {
  stat: (typeof CUSTOMER_STATS)[number];
  delay: number;
}) {
  return (
    <div
      className="brc-dashboard-card brc-dashboard-reveal relative overflow-hidden rounded-2xl border border-(--brc-border) bg-white p-4 shadow-[var(--brc-shadow-xs)] sm:p-5"
      style={
        {
          "--delay": `${delay}ms`,
          "--accent": stat.color,
        } as DashboardStyle
      }
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <span
          className="brc-dashboard-icon-bubble flex size-11 items-center justify-center rounded-full text-white shadow-[0_10px_22px_rgba(18,18,18,0.1)]"
          style={{ background: stat.color }}
        >
          <Icon name={stat.icon} size={21} stroke="#fff" />
        </span>
      </div>
      <p className="mb-2 text-sm font-medium text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
        {stat.label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black text-(--brc-text) [font-family:var(--brc-font-display)]">
          <AnimatedStatValue value={stat.value} />
        </span>
        {stat.unit && (
          <span className="text-sm font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            {stat.unit}
          </span>
        )}
      </div>
    </div>
  );
}

function QuickActionTile({ link, delay }: { link: QuickLink; delay: number }) {
  return (
    <Link
      href={link.href}
      className="brc-dashboard-card brc-dashboard-reveal group flex min-h-32 flex-col justify-between rounded-2xl border border-(--brc-border) bg-white p-4 text-left no-underline shadow-[var(--brc-shadow-xs)] sm:p-5"
      style={
        {
          "--delay": `${delay}ms`,
          "--tile-bg": link.bg,
          "--tile-fg": link.fg,
        } as DashboardStyle
      }
    >
      <div className="flex items-start justify-between gap-4">
        <span className="brc-dashboard-icon-bubble flex size-12 items-center justify-center rounded-full bg-[var(--tile-bg)] text-[var(--tile-fg)] transition-transform duration-200 group-hover:scale-105">
          <Icon name={link.icon} size={22} stroke="currentColor" />
        </span>
        <span className="brc-dashboard-arrow flex size-9 items-center justify-center rounded-full border border-(--brc-border) text-(--brc-text-muted) transition-all duration-200 group-hover:border-[var(--tile-fg)] group-hover:text-[var(--tile-fg)]">
          <Icon name="arrow" size={15} stroke="currentColor" />
        </span>
      </div>
      <div className="mt-5">
        <h3 className="m-0 text-base font-extrabold text-(--brc-text) [font-family:var(--brc-font-ui)]">
          {link.label}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          {link.description}
        </p>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const tone = STATUS_STYLES[status];

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold [font-family:var(--brc-font-ui)]"
      style={{ background: tone.bg, color: tone.fg }}
    >
      <span
        className="brc-status-dot size-2 rounded-full"
        style={
          {
            background: tone.fg,
            "--status-ring": tone.ring,
          } as DashboardStyle
        }
      />
      {tone.label}
    </span>
  );
}

function RequestProgress({
  status,
  delay = 0,
}: {
  status: RequestStatus;
  delay?: number;
}) {
  const steps = ["Requested", status === "approved" ? "Approved" : "Review", "Payment"];
  const activeUntil = status === "approved" ? 1 : 0;

  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {steps.map((step, index) => {
        const active = index <= activeUntil;
        return (
          <div key={step} className="min-w-0">
            <div className="mb-2 h-1 overflow-hidden rounded-full bg-(--brc-bg-muted)">
              <span
                className={`brc-progress-fill block h-full rounded-full ${
                  active ? "bg-(--brc-primary)" : "bg-transparent"
                }`}
                style={
                  {
                    "--delay": `${delay + index * 120}ms`,
                  } as DashboardStyle
                }
              />
            </div>
            <span
              className={`block truncate text-[11px] font-bold [font-family:var(--brc-font-ui)] ${
                active ? "text-(--brc-primary)" : "text-(--brc-text-muted)"
              }`}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function RequestCard({ req, delay }: { req: RecentRequest; delay: number }) {
  return (
    <article
      className="brc-dashboard-card brc-dashboard-reveal rounded-2xl border border-(--brc-border) bg-white p-4 shadow-[var(--brc-shadow-xs)] sm:p-5"
      style={{ "--delay": `${delay}ms` } as DashboardStyle}
    >
      <div className="grid gap-4 sm:grid-cols-[84px_1fr]">
        <div
          className="relative flex items-center justify-center overflow-hidden rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle)"
          style={{ height: "clamp(5rem, 25vw, 6rem)" }}
        >
          <Image
            src="/car-lexus.png"
            alt={req.car}
            fill
            sizes="(max-width: 640px) 88vw, 84px"
            className="brc-dashboard-car-thumb object-contain p-2 transition-transform duration-300 hover:scale-105"
          />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="m-0 truncate text-base font-extrabold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                {req.car}
              </h3>
              <p className="mt-1 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                {req.party}
              </p>
            </div>
            <StatusBadge status={req.status} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
            <span className="rounded-full bg-(--brc-bg-muted) px-2.5 py-1 text-xs font-bold">
              {req.mode}
            </span>
            {req.days != null && (
              <>
                <span aria-hidden="true" className="text-(--brc-border-strong)">
                  &bull;
                </span>
                <span>{req.days} days</span>
              </>
            )}
            <span aria-hidden="true" className="text-(--brc-border-strong)">
              &bull;
            </span>
            <span className="font-extrabold text-(--brc-primary)">
              {naira(req.price)}
            </span>
          </div>

          <RequestProgress status={req.status} delay={delay + 220} />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              {req.note}
            </p>
            {req.action && (
              <Link
                href={req.action.href}
                className="group inline-flex items-center gap-2 text-sm font-extrabold text-(--brc-primary) no-underline [font-family:var(--brc-font-ui)]"
              >
                {req.action.label}
                <span className="flex transition-transform duration-200 group-hover:translate-x-1">
                  <Icon name="arrow" size={15} stroke="currentColor" />
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function RecommendedCard({
  car,
  delay,
}: {
  car: (typeof RECOMMENDED_CARS)[number];
  delay: number;
}) {
  return (
    <Link
      href={car.href}
      className="brc-dashboard-card brc-dashboard-reveal group grid grid-cols-[76px_minmax(0,1fr)] gap-3 rounded-2xl border border-(--brc-border) bg-white p-3 no-underline shadow-[var(--brc-shadow-xs)] sm:grid-cols-[88px_minmax(0,1fr)] sm:gap-4 sm:p-4"
      style={{ "--delay": `${delay}ms` } as DashboardStyle}
    >
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-xl bg-(--brc-primary-tint)"
        style={{ height: "clamp(4.5rem, 18vw, 5rem)" }}
      >
        <Image
          src="/car-lexus.png"
          alt={car.name}
          fill
          sizes="(max-width: 640px) 76px, 88px"
          className="brc-dashboard-car-thumb object-contain p-2 transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-(--brc-bg-muted) px-2 py-0.5 text-[11px] font-bold text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
            {car.tag}
          </span>
          <span className="truncate text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            {car.location}
          </span>
        </div>
        <h3 className="m-0 truncate text-sm font-extrabold text-(--brc-text) [font-family:var(--brc-font-ui)]">
          {car.name}
        </h3>
        <p className="mt-1 text-sm font-black text-(--brc-primary) [font-family:var(--brc-font-display)]">
          {naira(car.price)}
        </p>
        <p className="mt-0.5 text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          {car.suffix}
        </p>
      </div>
    </Link>
  );
}

function LoyaltySnapshot() {
  return (
    <section
      className="brc-dashboard-card brc-dashboard-reveal overflow-hidden rounded-2xl border border-(--brc-border) bg-white p-4 shadow-[var(--brc-shadow-xs)] sm:p-5"
      style={{ "--delay": "520ms" } as DashboardStyle}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-(--brc-primary) [font-family:var(--brc-font-ui)]">
            Loyalty
          </p>
          <h2 className="m-0 text-lg font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">
            Reward Center
          </h2>
        </div>
        <span className="flex size-11 items-center justify-center rounded-full bg-(--brc-primary-tint)">
          <Icon name="gift" size={20} stroke="var(--brc-primary)" />
        </span>
      </div>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="m-0 text-4xl font-black text-(--brc-text) [font-family:var(--brc-font-display)]">
            120
          </p>
          <p className="m-0 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            available points
          </p>
        </div>
        <Link
          href="/customer/loyalty"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-(--brc-primary) px-4 py-2 text-sm font-extrabold text-white no-underline transition-transform duration-200 hover:-translate-y-0.5 hover:bg-(--brc-primary-hover) [font-family:var(--brc-font-ui)] sm:w-auto"
        >
          View
          <Icon name="arrow" size={14} stroke="currentColor" />
        </Link>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-(--brc-bg-muted)">
        <div
          className="brc-progress-fill h-full w-[68%] rounded-full bg-(--brc-primary)"
          style={{ "--delay": "760ms" } as DashboardStyle}
        />
      </div>
      <p className="mt-3 text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
        180 more points unlock your next reward tier.
      </p>
    </section>
  );
}

export default function CustomerDashboard() {
  const greeting = useGreeting();
  const { data: user } = useMe();
  const firstName = user?.first_name || "";
  const greetingText = firstName
    ? `${greeting}, ${firstName}`
    : `${greeting}, welcome back`;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#FAFAFA_0%,#FFFFFF_46%,#FAFAFA_100%)]">
      <div className="mx-auto flex w-full max-w-[1232px] flex-col gap-6 px-4 py-6 sm:gap-7 sm:px-8 sm:py-9 lg:px-[104px] lg:py-12">
        <section className="brc-dashboard-hero brc-dashboard-reveal relative overflow-hidden rounded-3xl border border-(--brc-border) bg-white shadow-[0_20px_48px_rgba(18,18,18,0.06)]">
          <div className="grid min-h-[260px] gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_360px] lg:p-10">
            <div className="relative z-10 flex flex-col justify-between gap-8">
              <div>
                <span className="brc-dashboard-pill mb-4 inline-flex items-center gap-2 rounded-full bg-(--brc-primary-tint) px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-(--brc-primary) [font-family:var(--brc-font-ui)]">
                  <span className="brc-live-dot size-2 rounded-full bg-(--brc-primary)" />
                  Customer dashboard
                </span>
                <h1 className="m-0 max-w-2xl text-[clamp(2rem,6vw,3.4rem)] font-black leading-[1.04] text-(--brc-text) [font-family:var(--brc-font-display)]">
                  {greetingText}
                </h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  You have 2 active requests awaiting owner updates and 1 approved request ready for payment.
                </p>
              </div>
              <div className="grid gap-3 sm:flex sm:flex-wrap">
                <DashboardButton href="/customer/listings">Browse Cars</DashboardButton>
                <DashboardButton href="/customer/requests" variant="soft">
                  View Requests
                </DashboardButton>
              </div>
            </div>

            <div className="relative hidden min-h-[220px] items-end justify-center lg:flex">
              <div className="brc-dashboard-car-shadow absolute inset-x-8 bottom-7 h-8 rounded-full bg-[rgba(0,0,139,0.12)] blur-xl" />
              <div className="brc-dashboard-badge-pop absolute right-0 top-0 rounded-2xl border border-(--brc-border) bg-(--brc-bg-subtle) px-4 py-3 text-sm font-bold text-(--brc-text-secondary) shadow-[var(--brc-shadow-xs)] [font-family:var(--brc-font-ui)]">
                Fast approvals
              </div>
              <Image
                src="/car-lexus.png"
                alt="Lexus car"
                width={360}
                height={230}
                priority
                className="brc-dashboard-hero-car relative z-10 object-contain"
                style={{ width: "100%", maxWidth: 360, height: "auto" }}
              />
            </div>
          </div>
        </section>

        <section
          aria-label="Customer summary"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {CUSTOMER_STATS.map((stat, index) => (
            <StatCard key={stat.label} stat={stat} delay={80 + index * 70} />
          ))}
        </section>

        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-7">
            <section className="flex flex-col gap-4">
              <SectionHeader eyebrow="Shortcuts" title="Quick Actions" />
              <div className="grid gap-4 sm:grid-cols-2">
                {QUICK_LINKS.map((link, index) => (
                  <QuickActionTile
                    key={link.label}
                    link={link}
                    delay={220 + index * 70}
                  />
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <SectionHeader
                eyebrow="Requests"
                title="Recent Activity"
                action={
                  <Link
                    href="/customer/requests"
                    className="group inline-flex items-center gap-2 text-sm font-extrabold text-(--brc-primary) no-underline [font-family:var(--brc-font-ui)]"
                  >
                    View all
                    <span className="flex transition-transform duration-200 group-hover:translate-x-1">
                      <Icon name="arrow" size={15} stroke="currentColor" />
                    </span>
                  </Link>
                }
              />
              <div className="flex flex-col gap-4">
                {RECENT_REQUESTS.map((request, index) => (
                  <RequestCard
                    key={request.id}
                    req={request}
                    delay={380 + index * 70}
                  />
                ))}
              </div>
            </section>
          </div>

          <aside className="flex min-w-0 flex-col gap-7">
            <section className="flex flex-col gap-4">
              <SectionHeader eyebrow="For you" title="Recommended Cars" />
              <div className="flex flex-col gap-4">
                {RECOMMENDED_CARS.map((car, index) => (
                  <RecommendedCard
                    key={car.id}
                    car={car}
                    delay={430 + index * 70}
                  />
                ))}
              </div>
            </section>
            <LoyaltySnapshot />
          </aside>
        </div>
      </div>
    </div>
  );
}
