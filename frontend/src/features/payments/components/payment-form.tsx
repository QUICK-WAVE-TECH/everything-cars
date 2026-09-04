"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MorphingLabel } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/features/auth/components/icon";
import type { IconName } from "@/features/auth/components/icon";
import { cn } from "@/lib/utils";
import { useCustomerRequestDetail } from "@/features/requests/api";
import { useSubmitPayment } from "@/features/payments/api";
import type { RequestDetail } from "@/features/requests/api/types";

const BANK = {
  bank: "Providus Bank",
  name: "Buy & Rent Cars Ltd",
  account: "9931 0042 18",
};

const TABS: { id: "transfer" | "card"; label: string; icon: IconName }[] = [
  { id: "transfer", label: "Bank Transfer", icon: "building" },
  { id: "card", label: "Card", icon: "banknote" },
];

// ── Helpers ──
function currencySymbol(code: string) {
  const map: Record<string, string> = { NGN: "\u20A6", USD: "$", GBP: "\u00A3", EUR: "\u20AC", GHS: "\u20B5", KES: "KSh", ZAR: "R" };
  return map[code] ?? code;
}

function fmtMoney(amount: string | number, currency: string) {
  const sym = currencySymbol(currency);
  return `${sym}${Number(amount).toLocaleString("en-NG")}`;
}

// ── Countdown hook ──
function useCountdown(startSeconds: number) {
  const [s, setS] = useState(startSeconds);
  useEffect(() => {
    const t = setInterval(() => setS((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// ── Method tabs ──
function MethodTabs({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  return (
    <div role="tablist" className="flex gap-2 rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-1.5">
      {TABS.map((t) => {
        const on = t.id === active;
        return (
          <button key={t.id} role="tab" aria-selected={on} type="button" onClick={() => onChange(t.id)}
            className={cn(
              "flex flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-lg border-none px-3 py-3.5 text-[15px] font-bold transition-all duration-200 [font-family:var(--brc-font-ui)]",
              on ? "bg-white text-(--brc-primary) shadow-sm" : "bg-transparent text-(--brc-text-muted)",
            )}>
            <Icon name={t.icon} size={18} stroke={on ? "var(--brc-primary)" : "var(--brc-text-muted)"} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Step header ──
function StepHead({ n, title, sub }: { n: number; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-(--brc-primary) text-sm font-extrabold text-white [font-family:var(--brc-font-display)]">{n}</span>
      <div>
        <span className="block text-[17px] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{title}</span>
        {sub && <span className="text-[13.5px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{sub}</span>}
      </div>
    </div>
  );
}

// ── Copy row ──
function CopyRow({ label, value, mono, big }: { label: string; value: string; mono?: boolean; big?: boolean }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(value.replace(/\s/g, ""));
    setCopied(true);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <div className="flex items-center justify-between gap-4 border-b border-(--brc-border) py-[15px]">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[11.5px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{label}</span>
        <span className={cn("break-words font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]", mono && "tracking-wide [font-family:var(--brc-font-display)]", big ? "text-[22px] font-extrabold" : "text-base")}>{value}</span>
      </div>
      <button type="button" onClick={copy}
        className={cn(
          "inline-flex shrink-0 cursor-pointer items-center gap-[7px] rounded-lg px-3.5 py-2 text-[13px] font-bold transition-all duration-200 [font-family:var(--brc-font-ui)]",
          copied ? "border border-(--brc-success) bg-(--brc-success-bg) text-[#1A9346]" : "border border-(--brc-border) bg-white text-(--brc-primary) hover:bg-(--brc-bg-subtle)",
        )}>
        <Icon name={copied ? "check" : "file"} size={15} stroke={copied ? "#1A9346" : "var(--brc-primary)"} />
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

// ── Upload zone ──
function UploadZone({ file, onFile, onClear }: { file: File | null; onFile: (f: File) => void; onClear: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  function ingest(f: File | null) {
    if (!f) return;
    onFile(f);
    if (f.type.startsWith("image/")) {
      const r = new FileReader();
      r.onload = (e) => setPreview(e.target?.result as string);
      r.readAsDataURL(f);
    } else setPreview(null);
  }

  function fmtSize(b: number) {
    return b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(0) + " KB" : (b / 1048576).toFixed(1) + " MB";
  }

  if (file) {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-3.5">
        <span className="flex size-[54px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-(--brc-border) bg-white">
          {preview ? (
            <Image
              src={preview}
              alt=""
              width={54}
              height={54}
              className="size-full object-cover"
            />
          ) : (
            <Icon name="file" size={24} stroke="var(--brc-accent)" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon name="check" size={15} stroke="var(--brc-success)" />
            <span className="truncate text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{file.name}</span>
          </div>
          <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{fmtSize(file.size)} · Receipt attached</span>
        </div>
        <button type="button" onClick={() => { setPreview(null); onClear(); if (inputRef.current) inputRef.current.value = ""; }}
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-(--brc-border) bg-white">
          <Icon name="plus" size={17} stroke="var(--brc-text-muted)" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); ingest(e.dataTransfer.files?.[0] ?? null); }}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-[1.5px] border-dashed px-6 py-[30px] text-center transition-all duration-200",
        drag ? "border-(--brc-primary) bg-(--brc-primary-tint)" : "border-(--brc-border) bg-(--brc-bg-subtle)",
      )}>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => ingest(e.target.files?.[0] ?? null)} />
      <span className="flex size-[50px] items-center justify-center rounded-xl border border-(--brc-border) bg-white">
        <Icon name="download" size={22} stroke="var(--brc-primary)" />
      </span>
      <div>
        <span className="text-[15px] font-bold [font-family:var(--brc-font-ui)]">
          <span className="text-(--brc-primary)">Click to upload</span> <span className="text-(--brc-text)">or drag and drop</span>
        </span>
        <span className="mt-1 block text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Bank transfer receipt — PNG, JPG or PDF (max 5MB)</span>
      </div>
    </div>
  );
}

// ── Panel ──
function Panel({ children, pad = "p-[26px]" }: { children: React.ReactNode; pad?: string }) {
  return <div className={cn("rounded-2xl border border-(--brc-border) bg-white shadow-[var(--brc-shadow-xs)]", pad)}>{children}</div>;
}

// ── Summary line ──
function SummaryLine({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{label}</span>
      <span className={cn("text-sm font-semibold [font-family:var(--brc-font-ui)]", muted ? "text-(--brc-text-secondary)" : "text-(--brc-text)")}>{value}</span>
    </div>
  );
}

// ══════════ TRANSFER TAB ══════════
function TransferTab({ req, onSuccess }: { req: RequestDetail; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const submitPayment = useSubmitPayment();
  const time = useCountdown(29 * 60 + 59);
  const total = fmtMoney(req.price_offered, req.currency);

  async function handleSubmit() {
    if (!file) return;
    try {
      await submitPayment.mutateAsync({
        requestId: req.id,
        paymentMethod: "transfer",
        receipt: file,
      });
      setSubmitted(true);
      toast.success("Payment submitted successfully");
      onSuccess();
    } catch {
      toast.error("Failed to submit payment. Please try again.");
    }
  }

  if (submitted) {
    return (
      <Panel pad="px-10 py-10">
        <div className="flex flex-col items-center gap-[18px] text-center">
          <span className="flex size-[72px] items-center justify-center rounded-full bg-(--brc-warning-bg)">
            <Icon name="clock" size={34} stroke="#9a7400" />
          </span>
          <div className="flex max-w-[460px] flex-col gap-2">
            <h2 className="m-0 text-[26px] font-extrabold text-(--brc-text) [font-family:var(--brc-font-ui)]">Payment submitted</h2>
            <p className="m-0 text-[15px] leading-relaxed text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
              Thanks! We&apos;ve received your confirmation and are verifying your transfer of <strong className="text-(--brc-text)">{total}</strong>. This usually takes <strong className="text-(--brc-text)">5–10 minutes</strong>. You&apos;ll get a notification once it&apos;s confirmed.
            </p>
          </div>
          <div className="flex items-center gap-2.5 rounded-full border border-(--brc-border) bg-(--brc-bg-subtle) px-4 py-2">
            <span className="text-[13px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Request</span>
            <span className="text-sm font-extrabold tracking-wide text-(--brc-text) [font-family:var(--brc-font-display)]">{req.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="mt-1.5 flex gap-3">
            <Link href={`/customer/requests/${req.id}`}
              className="inline-flex h-12 items-center gap-2 rounded-lg border border-(--brc-border) bg-white px-5 text-sm font-bold text-(--brc-text) no-underline [font-family:var(--brc-font-ui)]">
              <Icon name="clock" size={17} stroke="currentColor" />
              View Request
            </Link>
            <Link href="/customer/transactions"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-(--brc-primary) px-5 text-sm font-bold text-(--brc-text-on-primary) no-underline [font-family:var(--brc-font-ui)]">
              <Icon name="file" size={17} stroke="currentColor" />
              View Transactions
            </Link>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Amount banner — glassmorphic */}
      <div className="relative overflow-hidden rounded-2xl border border-white/30 px-7 py-7" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(240,242,255,0.75) 50%, rgba(255,255,255,0.9) 100%)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
        <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 size-[200px] rounded-full opacity-40" style={{ background: "radial-gradient(circle, var(--brc-primary), transparent 70%)" }} />
        <div aria-hidden className="pointer-events-none absolute -bottom-10 -right-10 size-[160px] rounded-full opacity-25" style={{ background: "radial-gradient(circle, var(--brc-accent), transparent 70%)" }} />
        <div aria-hidden className="pointer-events-none absolute right-1/4 top-0 size-[120px] rounded-full opacity-20" style={{ background: "radial-gradient(circle, var(--brc-success), transparent 70%)" }} />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Amount to transfer</span>
            <span className="text-[44px] font-extrabold leading-none tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)]">{total}</span>
            <span className="text-[13.5px] text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
              {req.car.title} · {req.request_type === "rent" ? "Rent" : "Buy"}
              {req.duration_days ? ` · ${req.duration_days} days` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2.5 rounded-full border border-(--brc-border)/60 bg-white/70 px-4 py-2 shadow-sm backdrop-blur-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-(--brc-danger) opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-(--brc-danger)" />
            </span>
            <span className="text-sm font-bold tabular-nums text-(--brc-text) [font-family:var(--brc-font-ui)]">Expires in {time}</span>
          </div>
        </div>
      </div>

      {/* Step 1 */}
      <Panel>
        <StepHead n={1} title="Transfer to this account" sub="Use your bank app or USSD — add the reference as the narration" />
        <div className="mt-[18px]">
          <CopyRow label="Bank Name" value={BANK.bank} />
          <CopyRow label="Account Name" value={BANK.name} />
          <CopyRow label="Account Number" value={BANK.account} mono big />
          <CopyRow label="Amount" value={total} />
        </div>
        <div className="mt-[18px] flex items-start gap-3 rounded-xl border border-(--brc-accent)/22 bg-(--brc-accent-bg) p-4">
          <Icon name="idcard" size={19} stroke="var(--brc-accent)" />
          <span className="text-[13.5px] leading-relaxed text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
            Add <strong className="tracking-wide text-(--brc-text) [font-family:var(--brc-font-display)]">{req.id.slice(0, 8).toUpperCase()}</strong> as your transfer description so we can match your payment instantly.
          </span>
        </div>
      </Panel>

      {/* Step 2 */}
      <Panel>
        <StepHead n={2} title="Upload your receipt" sub="A screenshot or PDF of the successful transfer" />
        <div className="mt-[18px]">
          <UploadZone file={file} onFile={(f) => { setFile(f); toast.success(`Receipt attached — ${f.name}`); }} onClear={() => setFile(null)} />
        </div>
      </Panel>

      {/* Step 3 */}
      <Panel>
        <StepHead n={3} title="Confirm your payment" sub="Let us know once the transfer is complete" />
        <div className="mt-[18px] flex flex-col gap-3.5">
          {!file && (
            <span className="flex items-center gap-2 text-[13.5px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              <Icon name="file" size={16} stroke="var(--brc-text-muted)" />
              Attach your receipt above before confirming.
            </span>
          )}
          <button type="button" onClick={handleSubmit} disabled={!file || submitPayment.isPending}
            aria-busy={submitPayment.isPending || undefined}
            className={cn(
              "flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none text-[15.5px] font-bold [font-family:var(--brc-font-ui)]",
              file && !submitPayment.isPending ? "bg-(--brc-primary) text-(--brc-text-on-primary)" : "pointer-events-none bg-(--brc-primary) text-(--brc-text-on-primary) opacity-55",
            )}>
            <MorphingLabel
              status={submitPayment.isPending ? "pending" : "idle"}
              idle={<><Icon name="check" size={18} stroke="currentColor" /> I Have Made Payment</>}
              pendingLabel="Submitting…"
            />
          </button>
          <span className="text-center text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            Your booking stays reserved while we confirm. Payments are secured & verified by Buy & Rent Cars.
          </span>
        </div>
      </Panel>
    </div>
  );
}

// ══════════ CARD TAB ══════════
function CardTab({ req }: { req: RequestDetail }) {
  const total = fmtMoney(req.price_offered, req.currency);
  const [card, setCard] = useState({ num: "", exp: "", cvv: "", name: "" });
  const set = (k: keyof typeof card) => (e: React.ChangeEvent<HTMLInputElement>) => setCard((s) => ({ ...s, [k]: e.target.value }));

  return (
    <Panel>
      <StepHead n={1} title="Pay with card" sub="Visa, Mastercard & Verve accepted" />
      <div className="mt-5 flex flex-col gap-4">
        <label className="block">
          <span className="mb-[7px] block text-[13.5px] font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">Card Number</span>
          <div className="flex h-[52px] items-center gap-2.5 rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-4">
            <Icon name="banknote" size={17} stroke="var(--brc-text-muted)" />
            <input value={card.num} onChange={set("num")} placeholder="0000 0000 0000 0000"
              className="flex-1 border-none bg-transparent text-[14.5px] text-(--brc-text) outline-none placeholder:text-(--brc-text-muted) [font-family:var(--brc-font-ui)]" />
          </div>
        </label>
        <div className="flex gap-4">
          <label className="block flex-1">
            <span className="mb-[7px] block text-[13.5px] font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">Expiry</span>
            <div className="flex h-[52px] items-center rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-4">
              <input value={card.exp} onChange={set("exp")} placeholder="MM / YY"
                className="flex-1 border-none bg-transparent text-[14.5px] text-(--brc-text) outline-none placeholder:text-(--brc-text-muted) [font-family:var(--brc-font-ui)]" />
            </div>
          </label>
          <label className="block flex-1">
            <span className="mb-[7px] block text-[13.5px] font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">CVV</span>
            <div className="flex h-[52px] items-center rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-4">
              <input value={card.cvv} onChange={set("cvv")} placeholder="123"
                className="flex-1 border-none bg-transparent text-[14.5px] text-(--brc-text) outline-none placeholder:text-(--brc-text-muted) [font-family:var(--brc-font-ui)]" />
            </div>
          </label>
        </div>
        <label className="block">
          <span className="mb-[7px] block text-[13.5px] font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">Cardholder Name</span>
          <div className="flex h-[52px] items-center gap-2.5 rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-4">
            <Icon name="user" size={17} stroke="var(--brc-text-muted)" />
            <input value={card.name} onChange={set("name")} placeholder="Name on card"
              className="flex-1 border-none bg-transparent text-[14.5px] text-(--brc-text) outline-none placeholder:text-(--brc-text-muted) [font-family:var(--brc-font-ui)]" />
          </div>
        </label>
        <button type="button" onClick={() => toast("Card payments coming soon — use bank transfer for now.")}
          className="mt-1 flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-(--brc-primary) text-[15.5px] font-bold text-(--brc-text-on-primary) [font-family:var(--brc-font-ui)]">
          <Icon name="check" size={18} stroke="currentColor" />
          Pay {total}
        </button>
        <span className="flex items-center justify-center gap-[7px] text-center text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          <Icon name="check" size={15} stroke="var(--brc-success)" />
          256-bit encrypted · We never store your card details
        </span>
      </div>
    </Panel>
  );
}

// ══════════ ORDER ASIDE ══════════
function OrderAside({ req }: { req: RequestDetail }) {
  const total = fmtMoney(req.price_offered, req.currency);
  const primaryImage = req.car.images?.find((img) => img.is_primary)?.image ?? req.car.images?.[0]?.image;
  const ownerName = `${req.car.owner.first_name} ${req.car.owner.last_name}`;
  const isRent = req.request_type === "rent";
  const rateLabel = isRent
    ? `${fmtMoney(req.car.rent_price_per_day ?? req.price_offered, req.currency)}/day`
    : "Purchase";

  return (
    <aside className="flex flex-col gap-5" style={{ position: "sticky", top: 108 }}>
      <div className="overflow-hidden rounded-2xl border border-(--brc-border) bg-white shadow-[var(--brc-shadow-xs)]">
        <div className="flex flex-col items-center gap-3 border-b border-(--brc-border) bg-(--brc-bg-subtle) px-6 pb-4 pt-6">
          {primaryImage ? (
            <Image src={primaryImage} alt={req.car.title} width={240} height={150} className="w-4/5 max-w-[240px] object-contain" />
          ) : (
            <div className="flex h-[150px] w-4/5 max-w-[240px] items-center justify-center rounded-lg bg-(--brc-bg-muted)">
              <Icon name="car" size={40} stroke="var(--brc-text-muted)" />
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <span className="text-[17px] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{req.car.title}</span>
            <span className="rounded-full border border-(--brc-border) bg-white px-3 py-[3px] text-xs font-semibold text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
              {isRent ? "Rent" : "Buy"}
            </span>
          </div>
        </div>
        <div className="px-6 py-5">
          <span className="text-base font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">Order Summary</span>
          <div className="mt-4 flex flex-col gap-3">
            {isRent && req.duration_days ? (
              <SummaryLine label={`${rateLabel} × ${req.duration_days} days`} value={total} />
            ) : (
              <SummaryLine label="Offer price" value={total} />
            )}
            {req.start_date && <SummaryLine label="Start date" value={new Date(req.start_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} muted />}
            <SummaryLine label="Location" value={`${req.car.state}${req.car.city ? `, ${req.car.city}` : ""}`} muted />
            <SummaryLine label="Owner" value={ownerName} muted />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-(--brc-border) pt-4">
            <span className="text-[15px] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">Total</span>
            <span className="text-[28px] font-extrabold tracking-tight text-(--brc-primary) [font-family:var(--brc-font-display)]">{total}</span>
          </div>
        </div>
      </div>

      {/* Buyer protection */}
      <div className="flex gap-3 rounded-xl border border-(--brc-success)/26 bg-(--brc-success-bg) p-4">
        <Icon name="check" size={20} stroke="var(--brc-success)" />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">Buyer protection</span>
          <span className="text-[13px] leading-relaxed text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">Your money is held securely and only released to the owner after handover.</span>
        </div>
      </div>
    </aside>
  );
}

// ══════════ MAIN PAGE ══════════
export function PaymentForm() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId") ?? "";
  const { data: req, isLoading } = useCustomerRequestDetail(requestId);
  const [tab, setTab] = useState<"transfer" | "card">("transfer");
  const [paymentDone, setPaymentDone] = useState(false);

  if (!requestId) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Icon name="clock" size={40} stroke="var(--brc-danger)" />
        <h2 className="m-0 text-xl font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">No request selected</h2>
        <p className="text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">Go back to your requests and select an approved request to pay for.</p>
        <Link href="/customer/requests" className="inline-flex h-10 items-center gap-2 rounded-lg bg-(--brc-primary) px-5 text-sm font-bold text-(--brc-text-on-primary) no-underline [font-family:var(--brc-font-ui)]">
          View My Requests
        </Link>
      </div>
    );
  }

  if (isLoading || !req) {
    return (
      <div className="flex flex-col gap-7">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-12 w-96" />
        <div className="grid items-start gap-7" style={{ gridTemplateColumns: "minmax(0,1.7fr) minmax(320px,1fr)" }}>
          <div className="flex flex-col gap-5">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  // Only approved requests can be paid
  if (req.status !== "approved" && !paymentDone) {
    const alreadyPaid = req.status === "payment_submitted" || req.status === "paid";
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Icon name={alreadyPaid ? "check" : "clock"} size={40} stroke={alreadyPaid ? "var(--brc-success)" : "var(--brc-warning)"} />
        <h2 className="m-0 text-xl font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
          {alreadyPaid ? "Payment already submitted" : "Request not ready for payment"}
        </h2>
        <p className="text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          {alreadyPaid
            ? "Your payment is being verified. You'll be notified once confirmed."
            : `This request is currently "${req.status}". Only approved requests can be paid.`}
        </p>
        <Link href={`/customer/requests/${req.id}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-(--brc-primary) px-5 text-sm font-bold text-(--brc-text-on-primary) no-underline [font-family:var(--brc-font-ui)]">
          View Request
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <Link href={`/customer/requests/${req.id}`} className="group inline-flex w-fit items-center gap-2 text-sm font-semibold text-(--brc-text-secondary) no-underline transition-colors hover:text-(--brc-text) [font-family:var(--brc-font-ui)]">
        <Icon name="chevleft" size={18} stroke="currentColor" />
        Back to Request
      </Link>

      <div>
        <h1 className="m-0 text-[clamp(28px,3.2vw,40px)] font-extrabold leading-tight text-(--brc-text) [font-family:var(--brc-font-ui)]">
          Complete your payment
        </h1>
        <p className="mt-2 text-base text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          Choose how you&apos;d like to pay for your {req.request_type === "rent" ? "rental" : "purchase"} of the {req.car.title}.
        </p>
      </div>

      <div className="pay-grid grid items-start gap-7" style={{ gridTemplateColumns: "minmax(0,1.7fr) minmax(320px,1fr)" }}>
        <div className="flex flex-col gap-5">
          <MethodTabs active={tab} onChange={(id) => setTab(id as "transfer" | "card")} />
          {tab === "transfer" && <TransferTab req={req} onSuccess={() => setPaymentDone(true)} />}
          {tab === "card" && <CardTab req={req} />}
        </div>
        <OrderAside req={req} />
      </div>
    </div>
  );
}
