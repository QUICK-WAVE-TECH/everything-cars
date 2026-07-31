"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Icon } from "@/features/auth/components/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FilterPopover,
  Pagination,
  RowMenu,
  type FilterField,
  type FilterValues,
} from "@/shared/components";
import { useTransactions } from "@/features/payments/api";

const PAGE_SIZE = 6;
const COLUMNS = ["Description", "Type", "Date", "Method", "Amount", "Status"];

const FILTER_FIELDS: FilterField[] = [
  {
    key: "type",
    label: "Type",
    options: [
      { value: "rental", label: "Rental" },
      { value: "purchase", label: "Purchase" },
      { value: "inspection", label: "Inspection fee" },
      { value: "refund", label: "Refund" },
    ],
  },
  {
    key: "status",
    label: "Status",
    options: [
      { value: "completed", label: "Completed" },
      { value: "pending", label: "Pending" },
      { value: "failed", label: "Failed" },
      { value: "refunded", label: "Refunded" },
    ],
  },
];

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  fontFamily: "var(--brc-font-ui)",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--brc-text-muted)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "16px",
  fontFamily: "var(--brc-font-ui)",
  fontSize: 14,
  color: "var(--brc-text)",
  whiteSpace: "nowrap",
  borderTop: "1px solid var(--brc-border)",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

function typeLabel(t: string) {
  return t === "inspection" ? "Inspection fee" : capitalize(t);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAmount(amount: string, currency: string) {
  const symbol = currency === "NGN" ? "₦" : currency === "USD" ? "$" : currency;
  return `${symbol}${Number(amount).toLocaleString("en-NG")}`;
}

function TxnStatusBadge({ status }: { status: string }) {
  const isSuccess = status === "completed";
  const isFailed = status === "failed";
  const label = capitalize(status);
  const fg = isFailed ? "var(--brc-danger)" : isSuccess ? "var(--brc-success)" : "var(--brc-text-muted)";
  const bg = isFailed ? "var(--brc-danger-bg)" : isSuccess ? "var(--brc-success-bg)" : "var(--brc-bg-muted)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "var(--brc-font-ui)",
        fontWeight: 600,
        fontSize: 12,
        padding: "4px 12px",
        borderRadius: "var(--brc-radius-pill)",
        background: bg,
        color: fg,
        whiteSpace: "nowrap",
      }}
    >
      {isSuccess ? (
        <Icon name="check" size={13} stroke={fg} />
      ) : isFailed ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <Icon name="clock" size={13} stroke={fg} />
      )}
      {label}
    </span>
  );
}

function getDetailPath(pathname: string, txnId: string) {
  if (pathname.startsWith("/admin")) return `/admin/transactions/${txnId}`;
  if (pathname.startsWith("/owner")) return `/owner/transactions/${txnId}`;
  return `/customer/transactions/${txnId}`;
}

export function TransactionsTable() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: paginatedData, isLoading } = useTransactions();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterValues>({});

  const transactions = useMemo(
    () => paginatedData?.results ?? [],
    [paginatedData?.results],
  );

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !t.car_detail.toLowerCase().includes(q) &&
          !t.reference.toLowerCase().includes(q)
        )
          return false;
      }
      if (filters.type && t.transaction_type !== filters.type) return false;
      if (filters.status && t.status !== filters.status) return false;
      return true;
    });
  }, [transactions, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (isLoading) {
    return (
      <section style={{ background: "#fff", border: "1px solid var(--brc-border)", borderRadius: "var(--brc-radius-lg)", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-11 w-full" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-10 w-full rounded-lg" />
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      </section>
    );
  }

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid var(--brc-border)",
        borderRadius: "var(--brc-radius-lg)",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h2 style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 18, color: "var(--brc-text)", margin: 0 }}>
          All Transactions
        </h2>
        <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 12, fontWeight: 600, color: "var(--brc-primary)", background: "var(--brc-primary-tint)", borderRadius: "var(--brc-radius-pill)", padding: "2px 9px" }}>
          {filtered.length}
        </span>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative", display: "flex", alignItems: "center" }}>
          <span style={{ position: "absolute", left: 12, display: "flex", pointerEvents: "none" }}>
            <Icon name="search" size={16} stroke="var(--brc-text-muted)" />
          </span>
          <Input
            placeholder="Search car or reference"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-11 text-sm"
            style={{ fontFamily: "var(--brc-font-ui)" }}
          />
        </div>
        <FilterPopover
          fields={FILTER_FIELDS}
          values={filters}
          onApply={(v) => { setFilters(v); setPage(1); }}
        />
      </div>

      {/* Mobile card list — the table scrolls awkwardly on phones */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-(--brc-border) py-10 text-center text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            No transactions match your filters.
          </div>
        ) : (
          rows.map((t) => {
            const detailPath = getDetailPath(pathname, t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => router.push(detailPath)}
                className="flex w-full flex-col gap-2 rounded-xl border border-(--brc-border) bg-white p-3.5 text-left transition-colors hover:bg-[rgba(0,0,139,0.035)] [font-family:var(--brc-font-ui)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-sm font-semibold text-(--brc-text)">
                    {typeLabel(t.transaction_type)} — {t.car_detail}
                  </span>
                  <span
                    className="shrink-0 text-sm font-bold"
                    style={{ color: t.transaction_type === "refund" ? "var(--brc-success)" : "var(--brc-text)" }}
                  >
                    {formatAmount(t.amount, t.currency)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-(--brc-text-secondary)">
                  <span>{formatDate(t.created_at)}</span>
                  <span aria-hidden>·</span>
                  <span>{capitalize(t.payment_method)}</span>
                  <span className="ml-auto">
                    <TxnStatusBadge status={t.status} />
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Table (desktop) */}
      <div className="hidden md:block" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c} style={{ ...thStyle, textAlign: c === "Amount" ? "right" : "left" }}>
                  {c}
                </th>
              ))}
              <th style={{ ...thStyle, width: 40 }} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} style={{ ...tdStyle, textAlign: "center", color: "var(--brc-text-muted)", padding: "40px 16px" }}>
                  No transactions match your filters.
                </td>
              </tr>
            ) : (
              rows.map((t) => {
                const detailPath = getDetailPath(pathname, t.id);
                return (
                  <tr
                    key={t.id}
                    onClick={() => router.push(detailPath)}
                    className="group/row cursor-pointer transition-[background-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:bg-[rgba(0,0,139,0.035)] hover:shadow-[0_16px_34px_rgba(0,0,139,0.10)]"
                  >
                    <td style={tdStyle}>
                      <span className="font-semibold transition-colors duration-300 group-hover/row:text-(--brc-primary)">
                        {typeLabel(t.transaction_type)} — {t.car_detail}
                      </span>
                    </td>
                    <td style={tdStyle}>{typeLabel(t.transaction_type)}</td>
                    <td style={{ ...tdStyle, color: "var(--brc-text-secondary)" }}>{formatDate(t.created_at)}</td>
                    <td style={tdStyle}>{capitalize(t.payment_method)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: t.transaction_type === "refund" ? "var(--brc-success)" : "var(--brc-text)" }}>
                      {formatAmount(t.amount, t.currency)}
                    </td>
                    <td style={tdStyle}>
                      <TxnStatusBadge status={t.status} />
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        items={[
                          {
                            label: "View details",
                            icon: <Icon name="banknote" size={16} stroke="var(--brc-text-secondary)" />,
                            onClick: () => router.push(detailPath),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
    </section>
  );
}
