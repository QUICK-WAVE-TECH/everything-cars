"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/features/auth/components/icon";
import { Input } from "@/components/ui/input";
import { FilterPopover, Pagination, RowMenu, type FilterField, type FilterValues } from "@/shared/components";
import { TRANSACTIONS, naira } from "../data";

const PAGE_SIZE = 6;
const COLUMNS = ["Description", "Type", "Payment date", "Payment Method", "Amount", "Status"];

const FILTER_FIELDS: FilterField[] = [
  {
    key: "type",
    label: "Type",
    options: [
      { value: "Rental", label: "Rental" },
      { value: "Purchase", label: "Purchase" },
      { value: "Refund", label: "Refund" },
    ],
  },
  {
    key: "method",
    label: "Payment Method",
    options: [
      { value: "Credit Card", label: "Credit Card" },
      { value: "Pay Stack", label: "Pay Stack" },
      { value: "Opay Transfer", label: "Opay Transfer" },
    ],
  },
  {
    key: "status",
    label: "Status",
    options: [
      { value: "Success", label: "Success" },
      { value: "Failed", label: "Failed" },
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

const closeIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--brc-danger)" strokeWidth="2.2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function TxnStatusBadge({ status }: { status: "Success" | "Failed" }) {
  const success = status === "Success";
  const fg = success ? "var(--brc-success)" : "var(--brc-danger)";
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
        background: success ? "var(--brc-success-bg)" : "var(--brc-danger-bg)",
        color: fg,
        whiteSpace: "nowrap",
      }}
    >
      {success ? (
        <Icon name="check" size={13} stroke={fg} />
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      )}
      {status}
    </span>
  );
}

export function TransactionsTable() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterValues>({});

  const filtered = useMemo(() => {
    return TRANSACTIONS.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.description.toLowerCase().includes(q) && !t.method.toLowerCase().includes(q)) return false;
      }
      if (filters.type && t.type !== filters.type) return false;
      if (filters.method && t.method !== filters.method) return false;
      if (filters.status && t.status !== filters.status) return false;
      return true;
    });
  }, [search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
        <span
          style={{
            fontFamily: "var(--brc-font-ui)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--brc-primary)",
            background: "var(--brc-primary-tint)",
            borderRadius: "var(--brc-radius-pill)",
            padding: "2px 9px",
          }}
        >
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
            placeholder="Search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-11 text-sm"
            style={{ fontFamily: "var(--brc-font-ui)" }}
          />
        </div>

        <FilterPopover
          fields={FILTER_FIELDS}
          values={filters}
          onApply={(v) => {
            setFilters(v);
            setPage(1);
          }}
        />
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c} style={thStyle}>
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
              rows.map((t) => (
                <tr key={t.id}>
                  <td style={tdStyle}>{t.description}</td>
                  <td style={tdStyle}>{t.type}</td>
                  <td style={{ ...tdStyle, color: "var(--brc-text-secondary)" }}>{t.paymentDate}</td>
                  <td style={tdStyle}>{t.method}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: t.type === "Refund" ? "var(--brc-success)" : "var(--brc-danger)" }}>
                    {naira(t.amount)}
                  </td>
                  <td style={tdStyle}>
                    <TxnStatusBadge status={t.status} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <RowMenu
                      items={[
                        {
                          label: "View details",
                          icon: <Icon name="car" size={16} stroke="var(--brc-text-secondary)" />,
                          onClick: () => router.push(`/customer/transactions/${t.id}`),
                        },
                        { label: "Close", icon: closeIcon },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
    </section>
  );
}
