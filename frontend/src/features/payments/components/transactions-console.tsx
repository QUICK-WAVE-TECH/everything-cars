"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  DownloadIcon,
  ListIcon,
  RotateCcwIcon,
  ScaleIcon,
  SettingsIcon,
  ShieldCheckIcon,
  WalletIcon,
} from "lucide-react";
import { toast } from "sonner";

import { MotionConfig } from "motion/react";
import { ConsoleLayout } from "@/shared/console/console-layout";
import { ConsoleRail, type RailItem } from "@/shared/console/console-rail";
import { PageHeader } from "@/shared/console/page-header";
import { Kpi, KpiStrip } from "@/shared/console/kpi-strip";
import { DataTable, type Column } from "@/shared/console/data-table";
import { DetailPanel } from "@/shared/console/detail-panel";
import { useTransactions, useTransactionSummary } from "@/features/payments/api";
import type { TransactionListItem } from "@/features/payments/api/type";

const RAIL: RailItem[] = [
  { key: "verification", label: "Verification", icon: ShieldCheckIcon, soon: true },
  { key: "transactions", label: "Transactions", icon: ListIcon },
  { key: "payouts", label: "Payouts", icon: WalletIcon, soon: true },
  { key: "refunds", label: "Refunds", icon: RotateCcwIcon, soon: true },
  { key: "reconciliation", label: "Reconciliation", icon: ScaleIcon, soon: true },
  { key: "settings", label: "Settings", icon: SettingsIcon, soon: true },
];

const SELECT_CLASS =
  "h-9 rounded-xl border border-(--brc-border) bg-white px-3 text-[13px] font-bold text-(--brc-text) outline-none [font-family:var(--brc-font-ui)]";

function symbol(code: string) {
  const map: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };
  return map[code] ?? code;
}
function money(amount: string | number, currency = "NGN") {
  return `${symbol(currency)}${Number(amount).toLocaleString("en-NG")}`;
}
function compact(amount: number, currency = "NGN") {
  const s = symbol(currency);
  if (amount >= 1_000_000) return `${s}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${s}${(amount / 1_000).toFixed(0)}K`;
  return `${s}${Math.round(amount)}`;
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  completed: { label: "Completed", bg: "var(--brc-success-bg)", fg: "var(--brc-success)" },
  pending: { label: "Pending", bg: "var(--brc-warning-bg)", fg: "#9a7400" },
  failed: { label: "Failed", bg: "var(--brc-danger-bg)", fg: "var(--brc-danger)" },
  refunded: { label: "Refunded", bg: "var(--brc-primary-tint)", fg: "var(--brc-primary)" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.pending!;
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-[11.5px] font-bold [font-family:var(--brc-font-ui)]"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

function typeLabel(t: string) {
  if (t === "purchase") return "Purchase";
  if (t === "rental") return "Rental";
  if (t === "inspection") return "Inspection fee";
  if (t === "refund") return "Refund";
  return t;
}

const TYPES = ["all", "purchase", "rental", "inspection", "refund"] as const;
const STATUSES = ["all", "completed", "pending", "failed", "refunded"] as const;

export function TransactionsConsole() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selected, setSelected] = useState<TransactionListItem | null>(null);

  const { data, isLoading, isFetching } = useTransactions({ page_size: 200 });
  const { data: summary } = useTransactionSummary();
  const all = useMemo(() => data?.results ?? [], [data]);

  // Window aggregate as a resilient fallback until the global summary lands.
  const windowKpis = useMemo(() => {
    let gross = 0;
    let refunded = 0;
    let completed = 0;
    let pending = 0;
    let failed = 0;
    for (const t of all) {
      const amt = Number(t.amount);
      if (t.status === "completed") {
        completed += 1;
        gross += amt;
      } else if (t.status === "pending") pending += 1;
      else if (t.status === "failed") failed += 1;
      else if (t.status === "refunded") refunded += amt;
    }
    return { gross, refunded, completed, pending, failed };
  }, [all]);

  const kpis = {
    gross: summary?.gross_volume ?? windowKpis.gross,
    completed: summary?.completed ?? windowKpis.completed,
    pending: summary?.pending ?? windowKpis.pending,
    failed: summary?.failed ?? windowKpis.failed,
    refunded: summary?.refunded ?? windowKpis.refunded,
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (typeFilter !== "all" && t.transaction_type !== typeFilter) return false;
      if (q) {
        const hay = `${t.car_detail} ${t.payer_name} ${t.reference} ${t.tracking_id ?? ""} ${t.amount}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, search, statusFilter, typeFilter]);

  function exportCsv() {
    const head = ["Reference", "Vehicle", "Customer", "Type", "Method", "Date", "Amount", "Currency", "Status"];
    const lines = rows.map((t) =>
      [t.reference, t.car_detail, t.payer_name, t.transaction_type, t.payment_method, t.created_at, t.amount, t.currency, t.status]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  const columns: Column<TransactionListItem>[] = [
    {
      key: "txn",
      header: "Transaction",
      cell: (t) => (
        <div className="min-w-0">
          <div className="truncate font-bold text-(--brc-text)">{t.car_detail}</div>
          <div className="truncate text-[11.5px] text-(--brc-text-muted)">{t.tracking_id ?? t.reference}</div>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      hideBelow: "md",
      cell: (t) => (
        <div className="min-w-0">
          <div className="truncate font-semibold text-(--brc-text)">{t.payer_name}</div>
          {t.company_name && (
            <div className="truncate text-[11.5px] text-(--brc-text-muted)">{t.company_name}</div>
          )}
        </div>
      ),
    },
    { key: "type", header: "Type", hideBelow: "lg", cell: (t) => <span className="font-semibold text-(--brc-text-secondary)">{typeLabel(t.transaction_type)}</span> },
    { key: "date", header: "Date", hideBelow: "lg", cell: (t) => <span className="whitespace-nowrap text-(--brc-text-secondary)">{fmtDate(t.created_at)}</span> },
    { key: "method", header: "Method", hideBelow: "sm", cell: (t) => <span className="capitalize text-(--brc-text-secondary)">{t.payment_method}</span> },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (t) => (
        <span
          className="whitespace-nowrap font-bold tabular-nums"
          style={{ color: t.transaction_type === "refund" || t.status === "refunded" ? "var(--brc-danger)" : "var(--brc-text)" }}
        >
          {t.transaction_type === "refund" || t.status === "refunded" ? "−" : ""}
          {money(t.amount, t.currency)}
        </span>
      ),
    },
    { key: "status", header: "Status", align: "right", cell: (t) => <StatusBadge status={t.status} /> },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <ConsoleLayout
        rail={
          <ConsoleRail eyebrow="Finance" items={RAIL} active="transactions" onSelect={() => {}} />
        }
      >
        <PageHeader
          eyebrow="Finance Operations"
          title="Transactions"
          subtitle="Track platform payments, fees, refunds and settlements"
          live={isFetching}
          actions={
            <button
              type="button"
              onClick={exportCsv}
              disabled={rows.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-(--brc-border) bg-white px-3.5 text-[13px] font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-muted) disabled:opacity-50 [font-family:var(--brc-font-ui)]"
            >
              <DownloadIcon size={15} /> Export CSV
            </button>
          }
        />

        <KpiStrip>
          <Kpi label="Gross volume" value={kpis.gross} format={(n) => compact(n)} />
          <Kpi label="Completed" value={kpis.completed} format={(n) => String(n)} valueColor="var(--brc-success)" />
          <Kpi label="Pending" value={kpis.pending} format={(n) => String(n)} valueColor="#9a7400" />
          <Kpi label="Failed" value={kpis.failed} format={(n) => String(n)} valueColor="var(--brc-danger)" />
          <Kpi label="Refunded" value={kpis.refunded} format={(n) => compact(n)} valueColor="var(--brc-primary)" />
        </KpiStrip>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, customer, vehicle or amount"
            className="h-9 min-w-[240px] flex-1 rounded-xl border border-(--brc-border) bg-white px-3.5 text-[13px] text-(--brc-text) outline-none [font-family:var(--brc-font-ui)]"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Status" className={SELECT_CLASS}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : STATUS[s]?.label ?? s}
              </option>
            ))}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Type" className={SELECT_CLASS}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All types" : typeLabel(t)}
              </option>
            ))}
          </select>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(t) => t.id}
          onRowClick={(t) => setSelected(t)}
          activeId={selected?.id ?? null}
          isLoading={isLoading}
          empty="No transactions match your filters."
        />

        <p className="text-[12px] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          Showing {rows.length} of {all.length} transactions.
        </p>
      </ConsoleLayout>

      <DetailPanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? "Transaction details" : ""}
      >
        {selected && <TransactionDetailBody txn={selected} />}
      </DetailPanel>
    </MotionConfig>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-[12.5px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">{label}</span>
      <span className="text-right text-[13px] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{value}</span>
    </div>
  );
}

function TransactionDetailBody({ txn }: { txn: TransactionListItem }) {
  const isRefund = txn.transaction_type === "refund" || txn.status === "refunded";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span
          className="text-[26px] font-black leading-none tabular-nums [font-family:var(--brc-font-display)]"
          style={{ color: isRefund ? "var(--brc-danger)" : "var(--brc-text)" }}
        >
          {isRefund ? "−" : ""}
          {money(txn.amount, txn.currency)}
        </span>
        <StatusBadge status={txn.status} />
      </div>

      <div className="divide-y divide-(--brc-border) rounded-xl border border-(--brc-border) px-3.5">
        <Field label="Reference" value={txn.reference || "—"} />
        <Field label="Customer" value={txn.payer_name} />
        <Field label="Vehicle" value={txn.car_detail} />
        {txn.company_name && <Field label="Business" value={txn.company_name} />}
        <Field label="Type" value={typeLabel(txn.transaction_type)} />
        <Field label="Method" value={<span className="capitalize">{txn.payment_method}</span>} />
        {txn.tracking_id && <Field label="Tracking ID" value={txn.tracking_id} />}
        <Field label="Date" value={fmtDate(txn.created_at)} />
      </div>

      <div className="flex flex-col gap-2.5">
        {txn.car_id && (
          <Link
            href={`/cars/${txn.car_id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-(--brc-primary) py-2.5 text-[13px] font-bold text-white transition-all hover:brightness-95 [font-family:var(--brc-font-ui)]"
          >
            View related listing <ArrowUpRightIcon size={15} />
          </Link>
        )}
        <Link
          href={`/admin/transactions/${txn.id}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-(--brc-border) bg-white py-2.5 text-[13px] font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
        >
          Open full record & receipt
        </Link>
      </div>
    </div>
  );
}
