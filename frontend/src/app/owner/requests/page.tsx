"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/features/auth/components/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, FilterPopover, Pagination, RowMenu, type FilterField, type FilterValues } from "@/shared/components";
import { OwnerStats, StatusBadge } from "@/features/requests";
import { useOwnerRequests, useRequestAction } from "@/features/requests/api";
import type { RequestListItem } from "@/features/requests/api";

const PAGE_SIZE = 7;
const COLUMNS = ["Car", "Type", "Customer", "Price", "Duration", "Start Date", "Status"];
const COLUMN_WIDTHS = [180, 86, 168, 126, 102, 120, 128];

const FILTER_FIELDS: FilterField[] = [
  { key: "type", label: "Type", options: [{ value: "rent", label: "Rent" }, { value: "buy", label: "Buy" }] },
  {
    key: "status",
    label: "Status",
    options: [
      { value: "pending", label: "Pending" },
      { value: "approved", label: "Approved" },
      { value: "rejected", label: "Rejected" },
      { value: "paid", label: "Paid" },
      { value: "active", label: "Active" },
      { value: "completed", label: "Completed" },
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

function formatPrice(amount: string, currency: string): string {
  const symbol = currency === "NGN" ? "₦" : currency === "USD" ? "$" : currency;
  return `${symbol}${Number(amount).toLocaleString("en-NG")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function RequestDetailChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-(--brc-bg-subtle) px-3 py-2">
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
        {label}
      </span>
      <span className="mt-0.5 block truncate text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">
        {value}
      </span>
    </div>
  );
}

function MobileRequestCard({
  request,
  onView,
  onAction,
}: {
  request: RequestListItem;
  onView: () => void;
  onAction: (action: "approve" | "reject") => void;
}) {
  return (
    <article
      onClick={onView}
      className="cursor-pointer rounded-lg border border-(--brc-border) bg-white p-4 shadow-[0_10px_26px_rgba(18,18,18,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(18,18,18,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 truncate text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
            {request.car.title}
          </h3>
          <p className="mt-1 truncate text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            {request.customer.first_name} {request.customer.last_name}
          </p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <RequestDetailChip label="Type" value={request.request_type === "rent" ? "Rent" : "Buy"} />
        <RequestDetailChip label="Price" value={formatPrice(request.price_offered, request.currency)} />
        <RequestDetailChip label="Duration" value={request.duration_days ? `${request.duration_days} days` : "—"} />
        <RequestDetailChip label="Start Date" value={request.start_date ? formatDate(request.start_date) : "—"} />
      </div>

      <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onView}
          className="h-9 flex-1 cursor-pointer rounded-lg border border-(--brc-border) bg-white text-xs font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
        >
          View Details
        </button>
        {request.status === "pending" && (
          <>
            <button
              type="button"
              onClick={() => onAction("approve")}
              className="h-9 flex-1 cursor-pointer rounded-lg border-none bg-(--brc-success) text-xs font-bold text-white transition-colors hover:brightness-95 [font-family:var(--brc-font-ui)]"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => onAction("reject")}
              className="h-9 flex-1 cursor-pointer rounded-lg border border-(--brc-danger)/40 bg-white text-xs font-bold text-(--brc-danger) transition-colors hover:bg-(--brc-danger-bg) [font-family:var(--brc-font-ui)]"
            >
              Reject
            </button>
          </>
        )}
      </div>
    </article>
  );
}

export default function OwnerRequestsPage() {
  const router = useRouter();
  const { data: paginatedData, isLoading } = useOwnerRequests();
  const requestAction = useRequestAction();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterValues>({});

  const requests = useMemo(
    () => paginatedData?.results ?? [],
    [paginatedData?.results],
  );

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        const carName = `${r.car.brand} ${r.car.model}`.toLowerCase();
        const customerName = `${r.customer.first_name} ${r.customer.last_name}`.toLowerCase();
        if (!carName.includes(q) && !r.car.title.toLowerCase().includes(q) && !customerName.includes(q)) return false;
      }
      if (filters.type && r.request_type !== filters.type) return false;
      if (filters.status && r.status !== filters.status) return false;
      return true;
    });
  }, [requests, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function handleAction(requestId: string, action: "approve" | "reject") {
    try {
      await requestAction.mutateAsync({ requestId, action });
      toast.success(action === "approve" ? "Request approved" : "Request rejected");
    } catch {
      toast.error(`Failed to ${action} request`);
    }
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/owner/dashboard" },
          { label: "Incoming Requests" },
        ]}
      />
      <div style={{ background: "var(--brc-bg-subtle)" }}>
        <div
          style={{
            maxWidth: 1232,
            margin: "0 auto",
            width: "100%",
            padding: "clamp(24px, 5vw, 40px) clamp(20px, 8vw, 104px) 64px",
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h1 style={{ fontFamily: "var(--brc-font-display)", fontWeight: 800, fontSize: "clamp(28px, 6vw, 44px)", color: "var(--brc-text)", margin: 0 }}>
              Incoming Requests
            </h1>
            <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, color: "var(--brc-text-muted)", margin: 0 }}>
              Review and manage rental requests for your cars
            </p>
          </div>

          <OwnerStats />

          {/* Requests table */}
          {isLoading ? (
            <section style={{ background: "#fff", border: "1px solid var(--brc-border)", borderRadius: "var(--brc-radius-lg)", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-11 w-full" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-10 w-full rounded-lg" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            </section>
          ) : (
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
                    placeholder="Search car or customer"
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

              {/* Mobile card list */}
              <div className="flex flex-col gap-3 md:hidden">
                {rows.length === 0 ? (
                  <div className="py-10 text-center text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                    No requests match your filters.
                  </div>
                ) : (
                  rows.map((r) => (
                    <MobileRequestCard
                      key={r.id}
                      request={r}
                      onView={() => router.push(`/owner/requests/${r.id}`)}
                      onAction={(action) => handleAction(r.id, action)}
                    />
                  ))
                )}
              </div>

              {/* Table */}
              <div className="hidden md:block" style={{ overflowX: "auto" }}>
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
                        <th key={c} style={{ ...thStyle, textAlign: c === "Price" ? "right" : c === "Type" || c === "Duration" ? "center" : "left" }}>
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
                        <tr
                          key={r.id}
                          onClick={() => router.push(`/owner/requests/${r.id}`)}
                          className="group/row cursor-pointer transition-[background-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:bg-[rgba(0,0,139,0.035)] hover:shadow-[0_16px_34px_rgba(0,0,139,0.10)]"
                        >
                          <td style={tdStyle}>
                            <span className="font-semibold transition-colors duration-300 group-hover/row:text-(--brc-primary)">{r.car.title}</span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: "center" }}>{r.request_type === "rent" ? "Rent" : "Buy"}</td>
                          <td style={tdStyle}>{r.customer.first_name} {r.customer.last_name}</td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>{formatPrice(r.price_offered, r.currency)}</td>
                          <td style={{ ...tdStyle, color: "var(--brc-text-secondary)", textAlign: "center" }}>{r.duration_days ? `${r.duration_days} days` : "—"}</td>
                          <td style={{ ...tdStyle, color: "var(--brc-text-secondary)" }}>{r.start_date ? formatDate(r.start_date) : "—"}</td>
                          <td style={{ ...tdStyle, overflow: "visible" }}>
                            <StatusBadge status={r.status} />
                          </td>
                          <td style={{ ...tdStyle, overflow: "visible", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                            <RowMenu
                              items={[
                                {
                                  label: "View Details",
                                  icon: <Icon name="car" size={16} stroke="var(--brc-text-secondary)" />,
                                  onClick: () => router.push(`/owner/requests/${r.id}`),
                                },
                                ...(r.status === "pending"
                                  ? [
                                      {
                                        label: "Approve",
                                        icon: <Icon name="check" size={16} stroke="var(--brc-success)" />,
                                        onClick: () => handleAction(r.id, "approve"),
                                      },
                                      {
                                        label: "Reject",
                                        icon: <Icon name="plus" size={16} stroke="var(--brc-danger)" />,
                                        onClick: () => handleAction(r.id, "reject"),
                                      },
                                    ]
                                  : []),
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
          )}
        </div>
      </div>
    </>
  );
}
