"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeftIcon, ChevronDownIcon, PrinterIcon, DownloadIcon, MoreVerticalIcon } from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@/features/auth/components/icon";
import type { IconName } from "@/features/auth/components/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTransactionDetail } from "@/features/payments/api";

// ── Helpers ──
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatAmount(amount: string, currency: string) {
  const sym = currency === "NGN" ? "₦" : currency === "USD" ? "$" : currency;
  return `${sym}${Number(amount).toLocaleString("en-NG")}`;
}

// ── Status badge ──
function TxnBadge({ status, size = "md" }: { status: string; size?: "md" | "lg" }) {
  const styles: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
    completed: { bg: "var(--brc-success-bg)", fg: "#1A9346", dot: "var(--brc-success)", label: "Paid" },
    pending: { bg: "var(--brc-warning-bg)", fg: "#9a7400", dot: "var(--brc-warning)", label: "Pending" },
    refunded: { bg: "var(--brc-primary-tint)", fg: "var(--brc-primary)", dot: "var(--brc-primary)", label: "Refunded" },
    failed: { bg: "var(--brc-danger-bg)", fg: "var(--brc-danger)", dot: "var(--brc-danger)", label: "Failed" },
  };
  const s = styles[status] || styles.completed!;
  const isLg = size === "lg";
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap rounded-full font-bold [font-family:var(--brc-font-ui)]", isLg ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs")} style={{ background: s.bg, color: s.fg }}>
      <span className="size-2 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

// ── Accordion section ──
function Section({ icon, title, subtitle, children, defaultOpen = true }: {
  icon: IconName; title: string; subtitle?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl border border-(--brc-border) bg-white shadow-[var(--brc-shadow-xs)]">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full cursor-pointer items-center gap-4 border-none bg-transparent p-5 text-left sm:px-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--brc-primary-tint)">
          <Icon name={icon} size={20} stroke="var(--brc-primary)" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block text-lg font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{title}</span>
          {subtitle && <span className="text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{subtitle}</span>}
        </div>
        <ChevronDownIcon size={18} className="shrink-0 text-(--brc-text-secondary) transition-transform duration-250" style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }} />
      </button>
      <div className="grid transition-[grid-template-rows] duration-300" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
        <div className="overflow-hidden">
          <div className="px-5 pb-6 pt-1 sm:px-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ── Field with icon chip ──
function TxnField({ icon, label, value, mono, accent }: {
  icon: IconName; label: string; value: string | React.ReactNode; mono?: boolean; accent?: string;
}) {
  return (
    <div className="flex min-w-0 gap-3.5">
      <span className="mt-0.5 flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border border-(--brc-border) bg-(--brc-bg-subtle)">
        <Icon name={icon} size={18} stroke="var(--brc-text-secondary)" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{label}</span>
        {typeof value === "string" ? (
          <span className={cn("break-words text-base font-semibold [font-family:var(--brc-font-ui)]", mono && "tracking-wide [font-family:var(--brc-font-display)]")} style={{ color: accent || "var(--brc-text)" }}>{value}</span>
        ) : value}
      </div>
    </div>
  );
}

// ── File card ──
function FileCard({ name, meta }: { name: string; meta: string }) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-3.5 transition-colors hover:border-(--brc-border)">
      <span className="flex size-[42px] shrink-0 items-center justify-center rounded-[10px] border border-(--brc-border) bg-white">
        <Icon name="file" size={20} stroke="var(--brc-accent)" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">{name}</span>
        <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{meta}</span>
      </div>
      <button type="button" onClick={() => toast.success(`Downloading ${name}`)} className="flex size-[34px] cursor-pointer items-center justify-center rounded-lg border-none bg-transparent transition-colors hover:bg-white">
        <DownloadIcon size={18} className="text-(--brc-text-secondary)" />
      </button>
    </div>
  );
}

// ── Timeline ──
function Timeline({ items }: { items: { tone: string; icon: IconName; time: string; title: string; detail?: string; actor?: string }[] }) {
  const toneColors: Record<string, [string, string]> = {
    success: ["var(--brc-success)", "var(--brc-success-bg)"],
    primary: ["var(--brc-primary)", "var(--brc-primary-tint)"],
    accent: ["var(--brc-accent)", "var(--brc-accent-bg)"],
    muted: ["var(--brc-text-muted)", "var(--brc-bg-subtle)"],
  };
  return (
    <div className="flex flex-col">
      {items.map((it, i) => {
        const [ink, tint] = toneColors[it.tone] ?? toneColors.muted!;
        const last = i === items.length - 1;
        return (
          <div key={i} className="flex gap-[18px]">
            <div className="flex shrink-0 flex-col items-center">
              <span className="z-[1] flex size-[38px] items-center justify-center rounded-full" style={{ background: tint, border: `1.5px solid ${ink}` }}>
                <Icon name={it.icon} size={17} stroke={ink} />
              </span>
              {!last && <span className="mt-0.5 mb-0.5 w-0.5 flex-1" style={{ background: "var(--brc-border)", minHeight: 22 }} />}
            </div>
            <div className={cn("flex min-w-0 flex-col gap-1", !last && "pb-6")}>
              <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{it.time}</span>
              <span className="text-[15px] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{it.title}</span>
              {it.detail && <span className="text-sm leading-relaxed text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">{it.detail}</span>}
              {it.actor && <span className="text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{it.actor}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Meta row ──
function MetaRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-(--brc-border) py-3">
      <Icon name={icon} size={17} stroke="var(--brc-text-muted)" />
      <span className="flex-1 text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{label}</span>
      <span className="text-right text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">{value}</span>
    </div>
  );
}

// ── Page ──
export function TransactionDetailPage({ backHref }: { backHref: string }) {
  const params = useParams();
  const txnId = params?.id as string;
  const { data: txn, isLoading } = useTransactionDetail(txnId);

  if (isLoading || !txn) {
    return (
      <div className="bg-(--brc-bg-subtle)">
        <div className="mx-auto flex w-full max-w-[1232px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-[104px] lg:py-14">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-12 w-96" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <div className="grid gap-7 lg:grid-cols-[1.7fr_1fr]">
            <div className="flex flex-col gap-6">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-56 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-[500px] w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const isRent = txn.request_type === "rent";
  const durationText = txn.request?.duration_days ? `${txn.request.duration_days} days` : "—";
  const rateText = txn.request?.duration_days ? `${formatAmount(String(Math.round(Number(txn.amount) / txn.request.duration_days)), txn.currency)} / day × ${durationText}` : "";
  const carImage = txn.request?.car?.images?.[0]?.image;
  const carTitle = txn.car_detail;
  const ownerName = txn.receiver_name;
  const payerName = txn.payer_name;
  const location = txn.request?.car ? `${txn.request.car.state}${txn.request.car.city ? `, ${txn.request.car.city}` : ""}` : "—";

  const history: { tone: string; icon: IconName; time: string; title: string; detail?: string; actor?: string }[] = [
    { tone: "success", icon: "check", time: formatDateTime(txn.created_at), title: "Payment successful", detail: `${formatAmount(txn.amount, txn.currency)} received and confirmed.`, actor: `Receipt #${txn.reference}` },
    ...(txn.request?.status_events ?? []).map((e) => ({
      tone: e.to_status === "approved" ? "accent" as const : e.to_status === "pending" ? "muted" as const : "primary" as const,
      icon: (e.to_status === "approved" ? "handshake" : e.to_status === "pending" ? "car" : "banknote") as IconName,
      time: formatDateTime(e.created_at),
      title: capitalize(e.to_status) + (e.from_status ? ` (from ${e.from_status})` : ""),
      detail: e.note || undefined,
      actor: e.actor_name,
    })),
  ];

  return (
    <div className="bg-(--brc-bg-subtle)">
      <div className="mx-auto flex w-full max-w-[1232px] flex-col gap-7 px-4 py-6 sm:px-6 sm:py-10 lg:px-[104px] lg:py-12">
        {/* Back */}
        <Link href={backHref} className="group inline-flex w-fit items-center gap-2 text-sm font-semibold text-(--brc-text-secondary) no-underline transition-colors hover:text-(--brc-text) [font-family:var(--brc-font-ui)]">
          <ArrowLeftIcon size={18} className="transition-transform duration-200 group-hover:-translate-x-1" />
          Back to Transactions
        </Link>

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-3.5">
              <h1 className="m-0 text-[clamp(28px,3.4vw,42px)] font-extrabold leading-tight text-(--brc-text) [font-family:var(--brc-font-ui)]">
                Transaction <span className="text-(--brc-primary)">#{txn.reference}</span>
              </h1>
              <TxnBadge status={txn.status} size="lg" />
            </div>
            <p className="m-0 text-base text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              {capitalize(txn.transaction_type)} · {carTitle} · {formatDateTime(txn.created_at)}
            </p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => toast.success("Print view")} className="flex size-11 cursor-pointer items-center justify-center rounded-[10px] border border-(--brc-border) bg-white transition-colors hover:bg-(--brc-bg-subtle)">
              <PrinterIcon size={19} className="text-(--brc-text-secondary)" />
            </button>
            <button type="button" onClick={() => toast.success("Downloading receipt")} className="flex size-11 cursor-pointer items-center justify-center rounded-[10px] border border-(--brc-border) bg-white transition-colors hover:bg-(--brc-bg-subtle)">
              <DownloadIcon size={19} className="text-(--brc-text-secondary)" />
            </button>
            <button type="button" className="flex size-11 cursor-pointer items-center justify-center rounded-[10px] border border-(--brc-border) bg-white transition-colors hover:bg-(--brc-bg-subtle)">
              <MoreVerticalIcon size={19} className="text-(--brc-text-secondary)" />
            </button>
          </div>
        </div>

        {/* Success banner */}
        {txn.status === "completed" && (
          <div className="flex items-center gap-3.5 rounded-xl border border-(--brc-success)/30 bg-(--brc-success-bg) px-5 py-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--brc-success)">
              <Icon name="check" size={20} stroke="#fff" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-[15px] font-bold text-[#1A7A3C] [font-family:var(--brc-font-ui)]">Payment received in full</span>
              <span className="ml-2 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                {formatAmount(txn.amount, txn.currency)} was paid on {formatDateTime(txn.created_at)}. Your {isRent ? "rental" : "purchase"} is confirmed.
              </span>
            </div>
          </div>
        )}

        {/* Two-column grid */}
        <div className="txn-grid grid items-start gap-7" style={{ gridTemplateColumns: "minmax(0,1.7fr) minmax(300px,1fr)" }}>
          {/* Left — accordions */}
          <div className="flex flex-col gap-6">
            <Section icon="file" title="Transaction Details" subtitle="Reference, vehicle and rental terms">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-x-6 gap-y-[26px]">
                <TxnField icon="idcard" label="Reference" value={txn.reference} mono />
                <TxnField icon="car" label="Vehicle" value={carTitle} />
                <TxnField icon="handshake" label="Type" value={capitalize(txn.transaction_type)} />
                <TxnField icon="banknote" label="Total Amount" value={formatAmount(txn.amount, txn.currency)} accent="var(--brc-primary)" />
                {isRent && txn.request?.duration_days && (
                  <>
                    <TxnField icon="coins" label="Daily Rate" value={`${formatAmount(String(Math.round(Number(txn.amount) / txn.request.duration_days)), txn.currency)} / day`} />
                    <TxnField icon="clock" label="Duration" value={durationText} />
                    {txn.request.start_date && <TxnField icon="calendar" label="Rental Start" value={formatDate(txn.request.start_date)} />}
                  </>
                )}
                <TxnField icon="user" label="Car Owner" value={ownerName.trim()} />
                <TxnField icon="pin" label="Location" value={location} />
                <TxnField icon="check" label="Status" value={<TxnBadge status={txn.status} />} />
              </div>
            </Section>

            <Section icon="file" title="Documents" subtitle="Receipt and signed agreement" defaultOpen={false}>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
                <FileCard name={`receipt-${txn.reference}.pdf`} meta={`PDF · ${formatDate(txn.created_at)}`} />
                <FileCard name={`rental-agreement-${txn.reference}.pdf`} meta={`PDF · ${formatDate(txn.created_at)}`} />
              </div>
            </Section>

            <Section icon="clock" title="Payment History" subtitle="Timeline of this transaction" defaultOpen={false}>
              <div className="pt-1.5">
                <Timeline items={history} />
              </div>
            </Section>
          </div>

          {/* Right — sticky summary */}
          <aside className="flex flex-col gap-6" style={{ position: "sticky", top: 108 }}>
            <div className="overflow-hidden rounded-2xl border border-(--brc-border) bg-white shadow-[var(--brc-shadow-xs)]">
              {/* Car image */}
              <div className="flex flex-col items-center gap-3.5 border-b border-(--brc-border) bg-(--brc-bg-subtle) px-6 pb-5 pt-7">
                {carImage ? (
                  <Image src={carImage} alt={carTitle} width={260} height={160} className="w-4/5 max-w-[260px] object-contain" unoptimized />
                ) : (
                  <div className="flex h-[120px] w-4/5 items-center justify-center">
                    <Icon name="car" size={48} stroke="var(--brc-text-muted)" />
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <span className="text-lg font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{carTitle}</span>
                  <span className="rounded-full border border-(--brc-border) bg-white px-3 py-[3px] text-xs font-semibold text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                    {capitalize(txn.transaction_type)}
                  </span>
                </div>
              </div>

              {/* Amount + meta */}
              <div className="px-6 py-[22px]">
                <div className="flex items-end justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Amount Paid</span>
                    <span className="text-[34px] font-extrabold leading-none tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)]">{formatAmount(txn.amount, txn.currency)}</span>
                    {rateText && <span className="text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{rateText}</span>}
                  </div>
                  <TxnBadge status={txn.status} size="lg" />
                </div>

                <div className="mt-[18px]">
                  <MetaRow icon="calendar" label="Paid on" value={formatDate(txn.created_at)} />
                  <MetaRow icon="user" label="Owner" value={ownerName.trim()} />
                  <MetaRow icon="pin" label="Location" value={location} />
                </div>

                <div className="mt-[22px] flex flex-col gap-3">
                  <button type="button" onClick={() => toast.success(`Downloading receipt — ${txn.reference}.pdf`)}
                    className="brc-button-motion flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-(--brc-primary) text-sm font-bold text-(--brc-text-on-primary) hover:bg-(--brc-primary-hover) [font-family:var(--brc-font-ui)]">
                    <DownloadIcon size={17} />
                    Download Receipt
                  </button>
                  <button type="button" onClick={() => toast.success("Opening rental agreement")}
                    className="brc-button-motion flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-(--brc-border) bg-white text-sm font-bold text-(--brc-text) hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]">
                    <Icon name="file" size={17} stroke="currentColor" />
                    View Agreement
                  </button>
                </div>
              </div>
            </div>

            {/* Support note */}
            <div className="flex gap-3 rounded-xl border border-(--brc-accent)/22 bg-(--brc-accent-bg) p-4">
              <Icon name="handshake" size={20} stroke="var(--brc-accent)" />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">Something wrong?</span>
                <span className="text-[13px] leading-relaxed text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                  You have 48 hours after pickup to <button type="button" onClick={() => toast.info("Dispute form coming soon")} className="cursor-pointer border-none bg-transparent p-0 font-semibold text-(--brc-accent) underline [font-family:var(--brc-font-ui)]">report an issue</button> with this transaction.
                </span>
              </div>
            </div>
          </aside>
        </div>

        {/* Payment Details — full width below */}
        <Section icon="banknote" title="Payment Details" subtitle="How this transaction was settled" defaultOpen={false}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-x-6 gap-y-[26px]">
            <TxnField icon="user" label="Paid By" value={payerName.trim()} />
            <TxnField icon="banknote" label="Payment Method" value={capitalize(txn.payment_method)} />
            <TxnField icon="idcard" label="Payment Reference" value={txn.reference} mono />
            <TxnField icon="calendar" label="Paid On" value={formatDateTime(txn.created_at)} />
            <TxnField icon="pin" label="Currency" value={txn.currency} />
          </div>
        </Section>
      </div>
    </div>
  );
}
