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

// ── PDF Receipt Generator ──
import { RECEIPT_LOGO } from "./receipt-logo";

function generateReceiptHTML(txn: NonNullable<ReturnType<typeof useTransactionDetail>["data"]>) {
  const isRent = txn.request_type === "rent";
  const carTitle = txn.car_detail;
  const sym = txn.currency === "NGN" ? "\u20A6" : txn.currency === "USD" ? "$" : txn.currency;
  const amount = `${sym}${Number(txn.amount).toLocaleString("en-NG")}`;
  const date = new Date(txn.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const time = new Date(txn.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const statusLabel = txn.status === "completed" ? "Paid" : capitalize(txn.status);
  const statusColor = txn.status === "completed" ? "#1A9346" : "#9a7400";
  const statusBg = txn.status === "completed" ? "#e8f5e9" : "#fff8e1";
  const location = txn.request?.car ? `${txn.request.car.state}${txn.request.car.city ? `, ${txn.request.car.city}` : ""}` : "";

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Receipt - ${txn.reference}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; color: #1a1a2e; background: #f8f9fc; }
  .page { max-width: 640px; margin: 0 auto; background: #fff; }
  @media print {
    body { background: #fff; }
    .page { box-shadow: none; }
    .no-print { display: none !important; }
  }
  @media screen {
    .page { margin: 24px auto; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,40,0.08); overflow: hidden; }
  }

  /* Header band */
  .header-band {
    background: linear-gradient(135deg, #00008B 0%, #1a1a6e 50%, #2d1b69 100%);
    padding: 36px 40px 32px;
    color: #fff;
    position: relative;
    overflow: hidden;
  }
  .header-band::before {
    content: '';
    position: absolute;
    top: -60px; right: -40px;
    width: 200px; height: 200px;
    border-radius: 50%;
    background: rgba(255,255,255,0.06);
  }
  .header-band::after {
    content: '';
    position: absolute;
    bottom: -30px; left: 50%;
    width: 140px; height: 140px;
    border-radius: 50%;
    background: rgba(255,255,255,0.04);
  }
  .header-top { display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 1; margin-bottom: 28px; }
  .logo img { height: 36px; width: auto; }
  .logo-sub { font-size: 11px; font-weight: 500; opacity: 0.7; margin-top: 4px; letter-spacing: 0.06em; text-transform: uppercase; }
  .badge { background: ${statusBg}; color: ${statusColor}; padding: 6px 18px; border-radius: 100px; font-size: 12px; font-weight: 700; letter-spacing: 0.03em; }
  .amount-section { position: relative; z-index: 1; text-align: center; }
  .amount-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em; opacity: 0.6; margin-bottom: 10px; }
  .amount-value { font-size: 44px; font-weight: 900; letter-spacing: -0.02em; line-height: 1; }
  .amount-sub { font-size: 13px; opacity: 0.7; margin-top: 10px; font-weight: 500; }

  /* Body */
  .body { padding: 32px 40px 36px; }

  /* Reference pill */
  .ref-pill { display: inline-flex; align-items: center; gap: 8px; background: #f0f1f5; border-radius: 100px; padding: 8px 20px; font-size: 13px; font-weight: 600; color: #555; margin-bottom: 28px; }
  .ref-pill strong { color: #1a1a2e; font-weight: 800; letter-spacing: 0.02em; }

  /* Details grid */
  .details { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #eef0f4; border-radius: 14px; overflow: hidden; margin-bottom: 28px; }
  .detail-cell { padding: 16px 20px; border-bottom: 1px solid #eef0f4; }
  .detail-cell:nth-child(odd) { border-right: 1px solid #eef0f4; }
  .detail-cell:nth-last-child(-n+2) { border-bottom: none; }
  .detail-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #666; margin-bottom: 5px; }
  .detail-value { font-size: 14px; font-weight: 700; color: #121212; }

  /* Parties */
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; }
  .party-card { background: #f8f9fc; border-radius: 12px; padding: 18px 20px; }
  .party-role { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #666; margin-bottom: 6px; }
  .party-name { font-size: 15px; font-weight: 800; color: #121212; }

  /* Divider */
  .divider { height: 1px; background: linear-gradient(90deg, transparent, #dde0e8, transparent); margin: 4px 0 28px; }

  /* Footer */
  .footer { text-align: center; padding: 24px 40px; background: #f8f9fc; border-top: 1px solid #eef0f4; }
  .footer-brand { font-size: 14px; font-weight: 800; color: #00008B; margin-bottom: 4px; }
  .footer-note { font-size: 12px; color: #555; line-height: 1.6; }
  .footer-ref { margin-top: 12px; font-size: 11px; color: #777; letter-spacing: 0.04em; }
</style>
</head><body>
<div class="page">
  <!-- Header with gradient -->
  <div class="header-band">
    <div class="header-top">
      <div>
        <div class="logo"><img src="${RECEIPT_LOGO}" alt="Buy & Rent Cars" /></div>
        <div class="logo-sub">Transaction Receipt</div>
      </div>
      <span class="badge">${statusLabel}</span>
    </div>
    <div class="amount-section">
      <div class="amount-label">Total Amount Paid</div>
      <div class="amount-value">${amount}</div>
      <div class="amount-sub">${capitalize(txn.transaction_type)} &middot; ${carTitle}</div>
    </div>
  </div>

  <!-- Body -->
  <div class="body">
    <!-- Reference pill -->
    <div class="ref-pill">
      Receipt &nbsp;<strong>#${txn.reference}</strong>
    </div>

    <!-- Transaction details grid -->
    <div class="details">
      <div class="detail-cell">
        <div class="detail-label">Vehicle</div>
        <div class="detail-value">${carTitle}</div>
      </div>
      <div class="detail-cell">
        <div class="detail-label">Transaction Type</div>
        <div class="detail-value">${capitalize(txn.transaction_type)}</div>
      </div>
      <div class="detail-cell">
        <div class="detail-label">Payment Method</div>
        <div class="detail-value">${capitalize(txn.payment_method)}</div>
      </div>
      <div class="detail-cell">
        <div class="detail-label">Date</div>
        <div class="detail-value">${date} at ${time}</div>
      </div>
      ${isRent && txn.request?.duration_days ? `
      <div class="detail-cell">
        <div class="detail-label">Duration</div>
        <div class="detail-value">${txn.request.duration_days} days</div>
      </div>
      <div class="detail-cell">
        <div class="detail-label">Start Date</div>
        <div class="detail-value">${txn.request.start_date ? new Date(txn.request.start_date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "\u2014"}</div>
      </div>
      ` : `
      <div class="detail-cell">
        <div class="detail-label">Currency</div>
        <div class="detail-value">${txn.currency}</div>
      </div>
      <div class="detail-cell">
        <div class="detail-label">Location</div>
        <div class="detail-value">${location || "\u2014"}</div>
      </div>
      `}
    </div>

    <!-- Parties -->
    <div class="parties">
      <div class="party-card">
        <div class="party-role">Paid By</div>
        <div class="party-name">${txn.payer_name.trim()}</div>
      </div>
      <div class="party-card">
        <div class="party-role">Car Owner</div>
        <div class="party-name">${txn.receiver_name.trim()}</div>
      </div>
    </div>

    <div class="divider"></div>

    <p style="text-align:center;font-size:13px;color:#333;line-height:1.7;">
      This receipt confirms that payment of <strong style="color:#121212">${amount}</strong> has been received and verified.<br>
      The transaction is complete and both parties have been notified.
    </p>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">Buy & Rent Cars Ltd.</div>
    <div class="footer-note">EverythingCars Marketplace<br>For inquiries, contact support@everythingcars.com</div>
    <div class="footer-ref">REF: ${txn.reference} &middot; ${date}</div>
  </div>
</div>
</body></html>`;
}

function openReceiptWindow(txn: NonNullable<ReturnType<typeof useTransactionDetail>["data"]>): Window | null {
  const html = generateReceiptHTML(txn);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  // Clean up the object URL after a delay to allow the window to load
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return win;
}

function handlePrint(txn: NonNullable<ReturnType<typeof useTransactionDetail>["data"]>) {
  const win = openReceiptWindow(txn);
  if (!win) {
    toast.error("Popup blocked — allow popups and try again");
    return;
  }
  win.onload = () => win.print();
}

function handleDownloadPDF(txn: NonNullable<ReturnType<typeof useTransactionDetail>["data"]>) {
  const win = openReceiptWindow(txn);
  if (!win) {
    toast.error("Popup blocked — allow popups and try again");
    return;
  }
  win.onload = () => {
    win.print();
    toast.success("Use 'Save as PDF' in the print dialog to download");
  };
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
            <button type="button" onClick={() => handlePrint(txn)} title="Print receipt" className="flex size-11 cursor-pointer items-center justify-center rounded-[10px] border border-(--brc-border) bg-white transition-colors hover:bg-(--brc-bg-subtle)">
              <PrinterIcon size={19} className="text-(--brc-text-secondary)" />
            </button>
            <button type="button" onClick={() => handleDownloadPDF(txn)} title="Download as PDF" className="flex size-11 cursor-pointer items-center justify-center rounded-[10px] border border-(--brc-border) bg-white transition-colors hover:bg-(--brc-bg-subtle)">
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
                  <button type="button" onClick={() => handleDownloadPDF(txn)}
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
