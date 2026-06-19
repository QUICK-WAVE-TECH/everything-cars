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
import { useCustomerRequests } from "@/features/requests/api";
import { useTransactions } from "@/features/payments/api";
import { usePublicCars } from "@/features/listings/api";
import type { RequestStatus } from "@/features/requests/api";

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
    href: "/services",
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

type DashboardRequestStatus =
  | "pending"
  | "approved"
  | "payment_submitted"
  | "paid"
  | "active"
  | "completed"
  | "rejected"
  | "cancelled";

type RecentRequest = {
  id: string;
  car: string;
  carImage: string | null;
  party: string;
  mode: "Rent" | "Buy";
  days?: number | null;
  price: number;
  status: DashboardRequestStatus;
  note: string;
  action?: { label: string; href: string };
};

type RecommendedCar = {
  id: string;
  name: string;
  location: string;
  tag: string;
  price: number;
  suffix: string;
  href: string;
  image: string | null;
};

type StatItem = {
  label: string;
  value: string;
  unit?: string;
  icon: IconName;
  color: string;
};

const ACTIVE_STATUSES: RequestStatus[] = [
  "pending",
  "approved",
  "payment_submitted",
  "paid",
  "active",
];

const STATUS_STYLES: Record<
  DashboardRequestStatus,
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
  payment_submitted: {
    label: "Payment Submitted",
    bg: "rgba(245, 158, 11, 0.12)",
    fg: "#b45309",
    ring: "rgba(245, 158, 11, 0.22)",
  },
  paid: {
    label: "Paid",
    bg: "rgba(59, 130, 246, 0.12)",
    fg: "#1d4ed8",
    ring: "rgba(59, 130, 246, 0.22)",
  },
  active: {
    label: "Active",
    bg: "var(--brc-primary-tint)",
    fg: "var(--brc-primary)",
    ring: "rgba(0, 0, 139, 0.18)",
  },
  completed: {
    label: "Completed",
    bg: "var(--brc-success-bg)",
    fg: "var(--brc-success)",
    ring: "rgba(32, 184, 88, 0.22)",
  },
  rejected: {
    label: "Rejected",
    bg: "rgba(239, 68, 68, 0.1)",
    fg: "#dc2626",
    ring: "rgba(239, 68, 68, 0.2)",
  },
  cancelled: {
    label: "Cancelled",
    bg: "var(--brc-bg-muted)",
    fg: "var(--brc-text-muted)",
    ring: "rgba(100, 100, 100, 0.18)",
  },
};

const PROGRESS_STEPS = ["Requested", "Review", "Payment", "Active", "Complete"];

function statusToProgressStep(status: DashboardRequestStatus): number {
  switch (status) {
    case "pending":
      return 0;
    case "approved":
      return 1;
    case "payment_submitted":
      return 2;
    case "paid":
      return 2;
    case "active":
      return 3;
    case "completed":
      return 4;
    case "rejected":
    case "cancelled":
      return 0;
    default:
      return 0;
  }
}

function noteForStatus(status: DashboardRequestStatus): string {
  switch (status) {
    case "pending":
      return "Waiting for owner approval.";
    case "approved":
      return "Approved by owner. Payment is ready.";
    case "payment_submitted":
      return "Payment submitted. Awaiting confirmation.";
    case "paid":
      return "Payment confirmed. Getting ready.";
    case "active":
      return "Your booking is active.";
    case "completed":
      return "This request has been completed.";
    case "rejected":
      return "This request was declined by the owner.";
    case "cancelled":
      return "This request was cancelled.";
    default:
      return "";
  }
}

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

function StatCardSkeleton({ delay }: { delay: number }) {
  return (
    <div
      className="brc-dashboard-card brc-dashboard-reveal relative overflow-hidden rounded-2xl border border-(--brc-border) bg-white p-4 shadow-[var(--brc-shadow-xs)] sm:p-5"
      style={{ "--delay": `${delay}ms` } as DashboardStyle}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <span className="flex size-11 animate-pulse rounded-full bg-(--brc-bg-muted)" />
      </div>
      <div className="mb-2 h-3 w-24 animate-pulse rounded-full bg-(--brc-bg-muted)" />
      <div className="h-8 w-16 animate-pulse rounded-full bg-(--brc-bg-muted)" />
    </div>
  );
}

function StatCard({
  stat,
  delay,
}: {
  stat: StatItem;
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

function StatusBadge({ status }: { status: DashboardRequestStatus }) {
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
  status: DashboardRequestStatus;
  delay?: number;
}) {
  const activeUntil = statusToProgressStep(status);
  const isTerminal = status === "rejected" || status === "cancelled";

  return (
    <div className="mt-4 grid grid-cols-5 gap-2">
      {PROGRESS_STEPS.map((step, index) => {
        const active = !isTerminal && index <= activeUntil;
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
          {req.carImage ? (
            <Image
              src={req.carImage}
              alt={req.car}
              fill
              unoptimized
              sizes="(max-width: 640px) 88vw, 84px"
              className="brc-dashboard-car-thumb object-contain p-2 transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <span className="flex items-center justify-center text-(--brc-text-muted)">
              <Icon name="car" size={36} stroke="currentColor" />
            </span>
          )}
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

function RequestCardSkeleton({ delay }: { delay: number }) {
  return (
    <div
      className="brc-dashboard-card brc-dashboard-reveal rounded-2xl border border-(--brc-border) bg-white p-4 shadow-[var(--brc-shadow-xs)] sm:p-5"
      style={{ "--delay": `${delay}ms` } as DashboardStyle}
    >
      <div className="grid gap-4 sm:grid-cols-[84px_1fr]">
        <div
          className="animate-pulse rounded-xl bg-(--brc-bg-muted)"
          style={{ height: "clamp(5rem, 25vw, 6rem)" }}
        />
        <div className="flex flex-col gap-3">
          <div className="h-5 w-40 animate-pulse rounded-full bg-(--brc-bg-muted)" />
          <div className="h-4 w-28 animate-pulse rounded-full bg-(--brc-bg-muted)" />
          <div className="h-3 w-full animate-pulse rounded-full bg-(--brc-bg-muted)" />
        </div>
      </div>
    </div>
  );
}

function RecommendedCard({
  car,
  delay,
}: {
  car: RecommendedCar;
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
        {car.image ? (
          <Image
            src={car.image}
            alt={car.name}
            fill
            unoptimized
            sizes="(max-width: 640px) 76px, 88px"
            className="brc-dashboard-car-thumb object-contain p-2 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="flex items-center justify-center text-(--brc-primary)">
            <Icon name="car" size={28} stroke="currentColor" />
          </span>
        )}
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

  const { data: requestsData, isLoading: requestsLoading } =
    useCustomerRequests();
  const { data: transactionsData } = useTransactions();
  const { data: publicCarsData } = usePublicCars();

  const allRequests = requestsData?.results ?? [];

  const stats = useMemo((): StatItem[] => {
    const activeCount = allRequests.filter((r) =>
      ACTIVE_STATUSES.includes(r.status),
    ).length;
    const completedCount = allRequests.filter(
      (r) => r.status === "completed",
    ).length;
    const pendingCount = allRequests.filter(
      (r) => r.status === "pending",
    ).length;

    const completedTransactions = transactionsData?.results?.filter(
      (t) => t.status === "completed",
    ) ?? [];
    const totalSpend = completedTransactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );

    return [
      {
        label: "Active Requests",
        value: String(activeCount),
        icon: "car",
        color: "var(--brc-primary)",
      },
      {
        label: "Completed",
        value: String(completedCount),
        icon: "check",
        color: "var(--brc-success)",
      },
      {
        label: "Total Spend",
        value: naira(totalSpend),
        icon: "banknote",
        color: "var(--brc-accent)",
      },
      {
        label: "Pending Approvals",
        value: String(pendingCount),
        icon: "clock",
        color: "var(--brc-warning)",
      },
    ];
  }, [allRequests, transactionsData]);

  const recentRequests = useMemo((): RecentRequest[] => {
    return allRequests.slice(0, 3).map((r) => {
      const status = r.status as DashboardRequestStatus;
      const action =
        status === "approved"
          ? {
              label: "Proceed to payment",
              href: `/customer/payments?requestId=${r.id}`,
            }
          : undefined;
      return {
        id: r.id,
        car: r.car.title,
        carImage: r.car.primary_image,
        party: `${r.car.owner.first_name} ${r.car.owner.last_name}`,
        mode: r.request_type === "rent" ? "Rent" : "Buy",
        days: r.duration_days,
        price: Number(r.price_offered),
        status,
        note: noteForStatus(status),
        action,
      };
    });
  }, [allRequests]);

  const requestedCarIds = useMemo(
    () => new Set(allRequests.map((r) => r.car.id)),
    [allRequests],
  );

  const recommendedCars = useMemo((): RecommendedCar[] => {
    const allCars = publicCarsData?.results ?? [];
    return allCars
      .filter((c) => !requestedCarIds.has(c.id))
      .slice(0, 3)
      .map((c) => {
        let tag: string;
        let price: number;
        let suffix: string;
        if (c.listing_type === "rent") {
          tag = "Rent";
          price = Number(c.rent_price_per_day ?? 0);
          suffix = "per day";
        } else if (c.listing_type === "buy") {
          tag = "Buy";
          price = Number(c.sale_price ?? 0);
          suffix = "asking price";
        } else {
          tag = "Rent / Buy";
          price = Number(c.rent_price_per_day ?? c.sale_price ?? 0);
          suffix = c.rent_price_per_day ? "per day" : "asking price";
        }
        return {
          id: c.id,
          name: c.title,
          location: `${c.city}, ${c.state}`,
          tag,
          price,
          suffix,
          href: `/cars/${c.id}`,
          image: c.primary_image,
        };
      });
  }, [publicCarsData, requestedCarIds]);

  const heroSubtitle = useMemo(() => {
    const activeCount = allRequests.filter((r) =>
      ACTIVE_STATUSES.includes(r.status),
    ).length;
    const approvedCount = allRequests.filter(
      (r) => r.status === "approved",
    ).length;

    if (allRequests.length === 0) {
      return "Browse verified cars and submit your first request to get started.";
    }
    if (approvedCount > 0) {
      return `You have ${activeCount} active ${activeCount === 1 ? "request" : "requests"} and ${approvedCount} approved ${approvedCount === 1 ? "request" : "requests"} ready for payment.`;
    }
    return `You have ${activeCount} active ${activeCount === 1 ? "request" : "requests"} awaiting owner updates.`;
  }, [allRequests]);

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
                  {heroSubtitle}
                </p>
              </div>
              <div className="grid gap-3 sm:flex sm:flex-wrap">
                <DashboardButton href="/services">Browse Cars</DashboardButton>
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
          {requestsLoading
            ? [0, 1, 2, 3].map((i) => (
                <StatCardSkeleton key={i} delay={80 + i * 70} />
              ))
            : stats.map((stat, index) => (
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
                {requestsLoading ? (
                  [0, 1, 2].map((i) => (
                    <RequestCardSkeleton key={i} delay={380 + i * 70} />
                  ))
                ) : recentRequests.length === 0 ? (
                  <div
                    className="brc-dashboard-card brc-dashboard-reveal rounded-2xl border border-(--brc-border) bg-white p-8 text-center shadow-[var(--brc-shadow-xs)]"
                    style={{ "--delay": "380ms" } as DashboardStyle}
                  >
                    <span className="mb-3 flex justify-center text-(--brc-text-muted)">
                      <Icon name="car" size={40} stroke="currentColor" />
                    </span>
                    <p className="m-0 text-sm font-medium text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                      No requests yet — browse cars to get started
                    </p>
                    <Link
                      href="/services"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-(--brc-primary) no-underline [font-family:var(--brc-font-ui)]"
                    >
                      Browse Cars
                      <Icon name="arrow" size={14} stroke="currentColor" />
                    </Link>
                  </div>
                ) : (
                  recentRequests.map((request, index) => (
                    <RequestCard
                      key={request.id}
                      req={request}
                      delay={380 + index * 70}
                    />
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="flex min-w-0 flex-col gap-7">
            {recommendedCars.length > 0 && (
              <section className="flex flex-col gap-4">
                <SectionHeader eyebrow="For you" title="Recommended Cars" />
                <div className="flex flex-col gap-4">
                  {recommendedCars.map((car, index) => (
                    <RecommendedCard
                      key={car.id}
                      car={car}
                      delay={430 + index * 70}
                    />
                  ))}
                </div>
              </section>
            )}
            <LoyaltySnapshot />
          </aside>
        </div>
      </div>
    </div>
  );
}
