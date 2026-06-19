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
import { useOwnerRequests } from "@/features/requests/api";
import { useMyCarsList } from "@/features/listings/api";
import { useTransactions } from "@/features/payments/api";

type DashboardStyle = CSSProperties & Record<`--${string}`, string | number>;

type QuickLink = {
  label: string;
  description: string;
  icon: IconName;
  href: string;
  bg: string;
  fg: string;
};

const OWNER_STAT_DEFS = [
  { icon: "car" as IconName, label: "Listed Cars", key: "listed", color: "var(--brc-primary)", href: "/owner/my-cars" },
  { icon: "clock" as IconName, label: "Pending Requests", key: "pending", color: "var(--brc-warning)" },
  { icon: "handshake" as IconName, label: "Approved", key: "approved", color: "var(--brc-success)" },
  { icon: "banknote" as IconName, label: "Earnings", key: "earnings", color: "var(--brc-accent)" },
];

const OWNER_QUICK_LINKS: QuickLink[] = [
  { label: "My Cars", description: "Manage listings, pricing, and availability.", icon: "car", href: "/owner/my-cars", bg: "var(--brc-primary-tint)", fg: "var(--brc-primary)" },
  { label: "Requests", description: "Review and approve rental requests.", icon: "clock", href: "/owner/requests", bg: "var(--brc-bg-muted)", fg: "var(--brc-text-secondary)" },
  { label: "Transactions", description: "Track earnings and payment history.", icon: "banknote", href: "/owner/transactions", bg: "var(--brc-success-bg)", fg: "var(--brc-success)" },
  { label: "Rewards", description: "Loyalty points and owner perks.", icon: "gift", href: "/owner/loyalty", bg: "var(--brc-accent-bg)", fg: "var(--brc-accent)" },
];

type RequestStatus = "approved" | "pending" | "rejected" | "cancelled" | "paid" | "active" | "completed";

type IncomingRequest = {
  id: string;
  car: string;
  party: string;
  mode: "Rent" | "Buy";
  days?: number;
  price: number;
  status: RequestStatus;
  note: string;
  action?: { label: string; href: string };
};


const TOP_CARS = [
  { id: 1, name: "Lexus NX 300h", location: "Lekki, Lagos", tag: "5 rentals", price: 35000, suffix: "per day", href: "/owner/my-cars/1" },
  { id: 2, name: "Toyota RAV4", location: "Victoria Island", tag: "3 rentals", price: 42000, suffix: "per day", href: "/owner/my-cars/2" },
];

const STATUS_STYLES: Record<string, { label: string; bg: string; fg: string; ring: string }> = {
  pending: { label: "Pending", bg: "var(--brc-warning-bg)", fg: "#9a7400", ring: "rgba(255,192,1,0.26)" },
  approved: { label: "Approved", bg: "var(--brc-success-bg)", fg: "var(--brc-success)", ring: "rgba(32,184,88,0.22)" },
  rejected: { label: "Rejected", bg: "var(--brc-danger-bg)", fg: "var(--brc-danger)", ring: "rgba(239,68,68,0.22)" },
  cancelled: { label: "Cancelled", bg: "var(--brc-bg-muted)", fg: "var(--brc-text-muted)", ring: "rgba(18,18,18,0.1)" },
  paid: { label: "Paid", bg: "var(--brc-accent-bg)", fg: "var(--brc-accent)", ring: "rgba(195,101,35,0.22)" },
  active: { label: "Active", bg: "var(--brc-primary-tint)", fg: "var(--brc-primary)", ring: "rgba(0,0,139,0.16)" },
  completed: { label: "Completed", bg: "var(--brc-success-bg)", fg: "var(--brc-success)", ring: "rgba(32,184,88,0.22)" },
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
  return useSyncExternalStore(noopSubscribe, () => greetingFor(new Date().getHours()), () => "Welcome");
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
      const t = window.setTimeout(() => setDisplay(target), 0);
      return () => window.clearTimeout(t);
    }
    let frame = 0;
    const start = performance.now();
    const duration = 850;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  if (target == null) return value;
  return display.toLocaleString("en-NG");
}

function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-(--brc-accent) [font-family:var(--brc-font-ui)]">{eyebrow}</p>}
        <h2 className="m-0 text-xl font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function DashboardButton({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "soft" }) {
  const primary = variant === "primary";
  return (
    <Link
      href={href}
      className={`brc-dashboard-button group inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold transition-all duration-200 [font-family:var(--brc-font-ui)] hover:-translate-y-0.5 active:translate-y-0 ${
        primary
          ? "bg-(--brc-accent) text-white shadow-[0_12px_24px_rgba(195,101,35,0.16)] hover:shadow-[0_16px_30px_rgba(195,101,35,0.2)]"
          : "border border-(--brc-border) bg-white text-(--brc-text) hover:border-(--brc-accent) hover:text-(--brc-accent) hover:shadow-[0_10px_20px_rgba(18,18,18,0.08)]"
      }`}
    >
      {children}
      <span className="brc-dashboard-arrow flex transition-transform duration-200 group-hover:translate-x-1">
        <Icon name="arrow" size={16} stroke="currentColor" />
      </span>
    </Link>
  );
}

function StatCard({ stat, delay }: { stat: (typeof OWNER_STAT_DEFS)[number] & { value: string }; delay: number }) {
  const inner = (
    <>
      <div className="mb-5 flex items-start justify-between gap-3">
        <span className="brc-dashboard-icon-bubble flex size-11 items-center justify-center rounded-full text-white shadow-[0_10px_22px_rgba(18,18,18,0.1)]" style={{ background: stat.color }}>
          <Icon name={stat.icon} size={21} stroke="#fff" />
        </span>
      </div>
      <p className="mb-2 text-sm font-medium text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{stat.label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black text-(--brc-text) [font-family:var(--brc-font-display)]">
          <AnimatedStatValue value={stat.value} />
        </span>
      </div>
    </>
  );
  const cls = "brc-dashboard-card brc-dashboard-reveal relative overflow-hidden rounded-2xl border border-(--brc-border) bg-white p-5 shadow-[var(--brc-shadow-xs)]";
  const style = { "--delay": `${delay}ms`, "--accent": stat.color } as DashboardStyle;

  if (stat.href) {
    return (
      <Link href={stat.href} className={`${cls} no-underline transition-shadow hover:shadow-md`} style={style}>
        {inner}
      </Link>
    );
  }

  return <div className={cls} style={style}>{inner}</div>;
}

/** Tilt + glow hover animation — different from customer dashboard's scale effect */
function QuickActionTile({ link, delay }: { link: QuickLink; delay: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={link.href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="brc-dashboard-card brc-dashboard-reveal group flex min-h-32 flex-col justify-between rounded-2xl border border-(--brc-border) bg-white p-5 text-left no-underline shadow-[var(--brc-shadow-xs)]"
      style={{
        "--delay": `${delay}ms`,
        "--tile-bg": link.bg,
        "--tile-fg": link.fg,
        transform: hovered ? "perspective(600px) rotateY(-2deg) rotateX(1deg) translateY(-2px)" : "perspective(600px) rotateY(0deg) rotateX(0deg) translateY(0)",
        boxShadow: hovered ? `0 16px 40px -8px color-mix(in srgb, ${link.fg} 25%, transparent), var(--brc-shadow-xs)` : "var(--brc-shadow-xs)",
        transition: "all 0.4s cubic-bezier(0.23, 1, 0.32, 1)",
      } as DashboardStyle}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className="flex size-12 items-center justify-center rounded-full bg-[var(--tile-bg)] text-[var(--tile-fg)]"
          style={{
            transform: hovered ? "rotate(8deg) scale(1.05)" : "rotate(0deg) scale(1)",
            transition: "transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        >
          <Icon name={link.icon} size={22} stroke="currentColor" />
        </span>
        <span
          className="flex size-9 items-center justify-center rounded-full border border-(--brc-border) text-(--brc-text-muted)"
          style={{
            opacity: hovered ? 1 : 0,
            borderColor: hovered ? link.fg : undefined,
            color: hovered ? link.fg : undefined,
            transition: "opacity 0.3s ease, border-color 0.3s ease, color 0.3s ease",
          }}
        >
          <Icon name="arrow" size={15} stroke="currentColor" />
        </span>
      </div>
      <div className="mt-5">
        <h3 className="m-0 text-base font-extrabold text-(--brc-text) [font-family:var(--brc-font-ui)]">{link.label}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{link.description}</p>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const tone = STATUS_STYLES[status] || STATUS_STYLES.pending!;
  return (
    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold [font-family:var(--brc-font-ui)]" style={{ background: tone.bg, color: tone.fg }}>
      <span className="brc-status-dot size-2 rounded-full" style={{ background: tone.fg, "--status-ring": tone.ring } as DashboardStyle} />
      {tone.label}
    </span>
  );
}

function RequestProgress({ status, delay = 0 }: { status: RequestStatus; delay?: number }) {
  const steps = ["Requested", "Approved", "Paid", "Active", "Completed"];
  const statusIndex: Record<string, number> = {
    pending: 0,
    approved: 1,
    paid: 2,
    active: 3,
    completed: 4,
    rejected: -1,
    cancelled: -1,
  };
  const activeUntil = statusIndex[status] ?? -1;
  const isTerminalFail = status === "rejected" || status === "cancelled";

  if (isTerminalFail) {
    return (
      <div className="mt-4 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-(--brc-danger-bg)">
          <span className="brc-progress-fill block h-full w-full rounded-full bg-(--brc-danger)" style={{ "--delay": `${delay}ms` } as DashboardStyle} />
        </div>
        <span className="text-[11px] font-bold text-(--brc-danger) [font-family:var(--brc-font-ui)]">
          {status === "rejected" ? "Rejected" : "Cancelled"}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-5 gap-1.5">
      {steps.map((step, index) => {
        const active = index <= activeUntil;
        return (
          <div key={step} className="min-w-0">
            <div className="mb-2 h-1 overflow-hidden rounded-full bg-(--brc-bg-muted)">
              <span className={`brc-progress-fill block h-full rounded-full ${active ? "bg-(--brc-accent)" : "bg-transparent"}`} style={{ "--delay": `${delay + index * 120}ms` } as DashboardStyle} />
            </div>
            <span className={`block truncate text-[11px] font-bold [font-family:var(--brc-font-ui)] ${active ? "text-(--brc-accent)" : "text-(--brc-text-muted)"}`}>{step}</span>
          </div>
        );
      })}
    </div>
  );
}

function RequestCard({ req, delay }: { req: IncomingRequest; delay: number }) {
  return (
    <article className="brc-dashboard-card brc-dashboard-reveal rounded-2xl border border-(--brc-border) bg-white p-4 shadow-[var(--brc-shadow-xs)] sm:p-5" style={{ "--delay": `${delay}ms` } as DashboardStyle}>
      <div className="grid gap-4 sm:grid-cols-[84px_1fr]">
        <div className="relative flex items-center justify-center overflow-hidden rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle)" style={{ height: "clamp(5rem, 25vw, 6rem)" }}>
          <Image src="/car-lexus.png" alt={req.car} fill sizes="(max-width: 640px) 88vw, 84px" className="brc-dashboard-car-thumb object-contain p-2 transition-transform duration-300 hover:scale-105" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="m-0 truncate text-base font-extrabold text-(--brc-text) [font-family:var(--brc-font-ui)]">{req.car}</h3>
              <p className="mt-1 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{req.party}</p>
            </div>
            <StatusBadge status={req.status} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
            <span className="rounded-full bg-(--brc-bg-muted) px-2.5 py-1 text-xs font-bold">{req.mode}</span>
            {req.days != null && (<><span aria-hidden="true" className="text-(--brc-border-strong)">&bull;</span><span>{req.days} days</span></>)}
            <span aria-hidden="true" className="text-(--brc-border-strong)">&bull;</span>
            <span className="font-extrabold text-(--brc-accent)">{naira(req.price)}</span>
          </div>
          <RequestProgress status={req.status} delay={delay + 220} />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{req.note}</p>
            {req.action && (
              <Link href={req.action.href} className="group inline-flex items-center gap-2 text-sm font-extrabold text-(--brc-accent) no-underline [font-family:var(--brc-font-ui)]">
                {req.action.label}
                <span className="flex transition-transform duration-200 group-hover:translate-x-1"><Icon name="arrow" size={15} stroke="currentColor" /></span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function TopCarCard({ car, delay }: { car: (typeof TOP_CARS)[number]; delay: number }) {
  return (
    <Link href={car.href} className="brc-dashboard-card brc-dashboard-reveal group grid grid-cols-[88px_1fr] gap-4 rounded-2xl border border-(--brc-border) bg-white p-4 no-underline shadow-[var(--brc-shadow-xs)]" style={{ "--delay": `${delay}ms` } as DashboardStyle}>
      <div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-(--brc-accent-bg)" style={{ height: "5rem" }}>
        <Image src="/car-lexus.png" alt={car.name} fill sizes="(max-width: 640px) 88px, 88px" className="brc-dashboard-car-thumb object-contain p-2 transition-transform duration-300 group-hover:scale-105" />
      </div>
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-(--brc-bg-muted) px-2 py-0.5 text-[11px] font-bold text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">{car.tag}</span>
          <span className="truncate text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{car.location}</span>
        </div>
        <h3 className="m-0 truncate text-sm font-extrabold text-(--brc-text) [font-family:var(--brc-font-ui)]">{car.name}</h3>
        <p className="mt-1 text-sm font-black text-(--brc-accent) [font-family:var(--brc-font-display)]">{naira(car.price)}</p>
        <p className="mt-0.5 text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{car.suffix}</p>
      </div>
    </Link>
  );
}

function EarningsSnapshot() {
  return (
    <section className="brc-dashboard-card brc-dashboard-reveal overflow-hidden rounded-2xl border border-(--brc-border) bg-white p-5 shadow-[var(--brc-shadow-xs)]" style={{ "--delay": "520ms" } as DashboardStyle}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-(--brc-accent) [font-family:var(--brc-font-ui)]">Loyalty</p>
          <h2 className="m-0 text-lg font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">Reward Center</h2>
        </div>
        <span className="flex size-11 items-center justify-center rounded-full bg-(--brc-accent-bg)"><Icon name="gift" size={20} stroke="var(--brc-accent)" /></span>
      </div>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="m-0 text-4xl font-black text-(--brc-text) [font-family:var(--brc-font-display)]">120</p>
          <p className="m-0 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">available points</p>
        </div>
        <Link href="/owner/loyalty" className="inline-flex items-center gap-2 rounded-full bg-(--brc-accent) px-4 py-2 text-sm font-extrabold text-white no-underline transition-transform duration-200 hover:-translate-y-0.5 [font-family:var(--brc-font-ui)]">
          View
          <Icon name="arrow" size={14} stroke="currentColor" />
        </Link>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-(--brc-bg-muted)">
        <div className="brc-progress-fill h-full w-[68%] rounded-full bg-(--brc-accent)" style={{ "--delay": "760ms" } as DashboardStyle} />
      </div>
      <p className="mt-3 text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">180 more points unlock your next reward tier.</p>
    </section>
  );
}

function statusNote(status: string): string {
  const notes: Record<string, string> = {
    pending: "New request — review and respond.",
    approved: "Approved. Awaiting payment.",
    paid: "Payment confirmed. Ready for handover.",
    active: "Rental in progress.",
    completed: "Rental completed.",
    rejected: "Request was rejected.",
    cancelled: "Request was cancelled.",
  };
  return notes[status] ?? "";
}

export default function OwnerDashboard() {
  const greeting = useGreeting();
  const { data: user } = useMe();
  const { data: requestsData } = useOwnerRequests();
  const { data: carsData } = useMyCarsList();
  const { data: txnData } = useTransactions();
  const firstName = user?.first_name || "";
  const greetingText = firstName ? `${greeting}, ${firstName}` : `${greeting}, welcome back`;

  const recentRequests: IncomingRequest[] = useMemo(() => {
    const items = requestsData?.results ?? [];
    return items.slice(0, 3).map((r) => ({
      id: r.id,
      car: r.car.title,
      party: `${r.customer.first_name} ${r.customer.last_name}`,
      mode: r.request_type === "rent" ? "Rent" as const : "Buy" as const,
      days: r.duration_days ?? undefined,
      price: Number(r.price_offered),
      status: r.status as RequestStatus,
      note: statusNote(r.status),
      action: { label: "View details", href: `/owner/requests/${r.id}` },
    }));
  }, [requestsData]);

  const cars = useMemo(() => carsData?.results ?? [], [carsData?.results]);
  const requests = useMemo(
    () => requestsData?.results ?? [],
    [requestsData?.results],
  );
  const transactions = useMemo(
    () => txnData?.results ?? [],
    [txnData?.results],
  );
  const totalEarnings = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  const ownerStats = useMemo(() => {
    const values: Record<string, string> = {
      listed: String(cars.length),
      pending: String(requests.filter((r) => r.status === "pending").length),
      approved: String(requests.filter((r) => r.status === "approved" || r.status === "paid" || r.status === "active").length),
      earnings: totalEarnings > 0 ? `₦${totalEarnings.toLocaleString("en-NG")}` : "₦0",
    };
    return OWNER_STAT_DEFS.map((def) => ({ ...def, value: values[def.key] ?? "0" }));
  }, [cars, requests, totalEarnings]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#FAFAFA_0%,#FFFFFF_46%,#FAFAFA_100%)]">
      <div className="mx-auto flex w-full max-w-[1232px] flex-col gap-7 px-5 py-7 sm:px-8 sm:py-9 lg:px-[104px] lg:py-12">
        {/* Hero */}
        <section className="brc-dashboard-hero brc-dashboard-reveal relative overflow-hidden rounded-3xl border border-(--brc-border) bg-white shadow-[0_20px_48px_rgba(18,18,18,0.06)]">
          <div className="grid min-h-[260px] gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_360px] lg:p-10">
            <div className="relative z-10 flex flex-col justify-between gap-8">
              <div>
                <span className="brc-dashboard-pill mb-4 inline-flex items-center gap-2 rounded-full bg-(--brc-accent-bg) px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-(--brc-accent) [font-family:var(--brc-font-ui)]">
                  <span className="brc-live-dot size-2 rounded-full bg-(--brc-accent)" />
                  Owner dashboard
                </span>
                <h1 className="m-0 max-w-2xl text-[clamp(2rem,6vw,3.4rem)] font-black leading-[1.04] text-(--brc-text) [font-family:var(--brc-font-display)]">{greetingText}</h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  You have {requests.filter((r) => r.status === "pending").length} pending request{requests.filter((r) => r.status === "pending").length !== 1 ? "s" : ""} and {cars.length} car{cars.length !== 1 ? "s" : ""} listed.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <DashboardButton href="/owner/my-cars">Manage Cars</DashboardButton>
                <DashboardButton href="/owner/requests" variant="soft">View Requests</DashboardButton>
              </div>
            </div>
            <div className="relative hidden min-h-[220px] items-end justify-center lg:flex">
              <div className="brc-dashboard-car-shadow absolute inset-x-8 bottom-7 h-8 rounded-full bg-[rgba(195,101,35,0.12)] blur-xl" />
              <div className="brc-dashboard-badge-pop absolute right-0 top-0 rounded-2xl border border-(--brc-border) bg-(--brc-bg-subtle) px-4 py-3 text-sm font-bold text-(--brc-text-secondary) shadow-[var(--brc-shadow-xs)] [font-family:var(--brc-font-ui)]">Verified owner</div>
              <Image src="/car-lexus.png" alt="Lexus car" width={360} height={230} priority className="brc-dashboard-hero-car relative z-10 object-contain" style={{ width: "100%", maxWidth: 360, height: "auto" }} />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section aria-label="Owner summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ownerStats.map((stat, index) => (
            <StatCard key={stat.label} stat={stat} delay={80 + index * 70} />
          ))}
        </section>

        {/* Main + sidebar */}
        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-7">
            <section className="flex flex-col gap-4">
              <SectionHeader eyebrow="Shortcuts" title="Quick Actions" />
              <div className="grid gap-4 sm:grid-cols-2">
                {OWNER_QUICK_LINKS.map((link, index) => (
                  <QuickActionTile key={link.label} link={link} delay={220 + index * 70} />
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <SectionHeader
                eyebrow="Requests"
                title="Incoming Requests"
                action={
                  <Link href="/owner/requests" className="group inline-flex items-center gap-2 text-sm font-extrabold text-(--brc-accent) no-underline [font-family:var(--brc-font-ui)]">
                    View all
                    <span className="flex transition-transform duration-200 group-hover:translate-x-1"><Icon name="arrow" size={15} stroke="currentColor" /></span>
                  </Link>
                }
              />
              <div className="flex flex-col gap-4">
                {recentRequests.map((request, index) => (
                  <RequestCard key={request.id} req={request} delay={380 + index * 70} />
                ))}
              </div>
            </section>
          </div>

          <aside className="flex min-w-0 flex-col gap-7">
            <section className="flex flex-col gap-4">
              <SectionHeader eyebrow="Performance" title="Your Top Cars" />
              <div className="flex flex-col gap-4">
                {TOP_CARS.map((car, index) => (
                  <TopCarCard key={car.id} car={car} delay={430 + index * 70} />
                ))}
              </div>
            </section>
            <EarningsSnapshot />
          </aside>
        </div>
      </div>
    </div>
  );
}
