"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/features/auth/components/icon";
import { Input } from "@/components/ui/input";
import { FilterPopover, Pagination, RowMenu, type FilterField, type FilterValues } from "@/shared/components";
import { CUSTOMER_REQUESTS, naira } from "../data";
import { StatusBadge } from "./status-badge";

const PAGE_SIZE = 7;
const COLUMNS = ["Car", "Type", "Request date", "Owner", "Price", "Duration", "Status"];
const COLUMN_WIDTHS = [180, 86, 132, 168, 126, 102, 128];

const CAR_OPTIONS = Array.from(new Set(CUSTOMER_REQUESTS.map((r) => r.car)));

const FILTER_FIELDS: FilterField[] = [
  { key: "car", label: "Car", options: CAR_OPTIONS.map((c) => ({ value: c, label: c })) },
  { key: "type", label: "Type", options: [{ value: "Rent", label: "Rent" }, { value: "Buy", label: "Buy" }] },
  {
    key: "status",
    label: "Status",
    options: [
      { value: "approved", label: "Approved" },
      { value: "pending", label: "Pending" },
      { value: "rejected", label: "Rejected" },
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
  verticalAlign: "middle",
};

const tdStyle: React.CSSProperties = {
  padding: "16px",
  fontFamily: "var(--brc-font-ui)",
  fontSize: 14,
  color: "var(--brc-text)",
  whiteSpace: "nowrap",
  borderTop: "1px solid var(--brc-border)",
  maxWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  verticalAlign: "middle",
};

const closeIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--brc-danger)" strokeWidth="2.2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export function RequestsTable() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterValues>({});

  const filtered = useMemo(() => {
    return CUSTOMER_REQUESTS.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (!r.car.toLowerCase().includes(q) && !r.owner.toLowerCase().includes(q)) return false;
      }
      if (filters.car && r.car !== filters.car) return false;
      if (filters.type && r.type !== filters.type) return false;
      if (filters.status && r.status !== filters.status) return false;
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
          All Requests
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
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 930, tableLayout: "fixed" }}>
          <colgroup>
            {COLUMN_WIDTHS.map((width, index) => (
              <col key={`${COLUMNS[index]}-${width}`} style={{ width }} />
            ))}
            <col style={{ width: 56 }} />
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c}
                  style={{
                    ...thStyle,
                    textAlign: c === "Price" ? "right" : c === "Type" || c === "Duration" ? "center" : "left",
                  }}
                >
                  {c}
                </th>
              ))}
              <th style={{ ...thStyle, width: 56 }} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} style={{ ...tdStyle, textAlign: "center", color: "var(--brc-text-muted)", padding: "40px 16px" }}>
                  No requests match your filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td style={tdStyle}>{r.car}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{r.type}</td>
                  <td style={{ ...tdStyle, color: "var(--brc-text-secondary)" }}>{r.requestDate}</td>
                  <td style={tdStyle}>{r.owner}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{naira(r.price)}</td>
                  <td style={{ ...tdStyle, color: "var(--brc-text-secondary)", textAlign: "center" }}>{r.duration}</td>
                  <td style={{ ...tdStyle, overflow: "visible" }}>
                    <StatusBadge status={r.status} />
                  </td>
                  <td style={{ ...tdStyle, overflow: "visible", textAlign: "center" }}>
                    <RowMenu
                      items={[
                        {
                          label: "View Request",
                          icon: <Icon name="car" size={16} stroke="var(--brc-text-secondary)" />,
                          onClick: () => router.push(`/customer/requests/${r.id}`),
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
