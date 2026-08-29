import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export type SalesRange = "7d" | "30d" | "3m" | "12m";
export type SalesType = "all" | "buy" | "rent";

export type SalesReportParams = {
  range?: SalesRange;
  type?: SalesType;
  branch?: string;
};

export type SalesReport = {
  range: { from: string; to: string; label: string };
  kpis: {
    total_revenue: number;
    units_sold: number;
    avg_sale_price: number;
    conversion_rate: number;
    inspection_revenue: number;
    deltas: {
      total_revenue: number | null;
      units_sold: number | null;
      avg_sale_price: number | null;
      conversion_rate: number | null;
      inspection_revenue: number | null;
    };
  };
  revenue_series: { date: string; purchases: number; rentals: number }[];
  by_period: { label: string; units: number; revenue: number }[];
  revenue_mix: { category: string; value: number }[];
  top_models: { label: string; revenue: number }[];
  avg_price_series: {
    label: string;
    avg_sale_price: number;
    avg_rent_per_day: number;
  }[];
  by_branch: { branch: string; revenue: number; units: number }[];
  target: { revenue: number; target: number; pct: number; met: boolean };
  branches: { id: string; label: string }[];
};

function buildQuery(params?: SalesReportParams) {
  const sp = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v) sp.set(k, String(v));
  });
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export function useSalesReport(params?: SalesReportParams) {
  return useQuery({
    queryKey: ["sales-report", params ?? {}],
    queryFn: () =>
      apiClient.get<SalesReport>(
        `/listings/admin/reports/sales${buildQuery(params)}`,
      ),
    staleTime: 30 * 1000,
  });
}
