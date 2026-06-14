"use client";

import { useMemo } from "react";
import { StatCard } from "@/shared/components";
import { useOwnerRequests } from "@/features/requests/api";
import type { StatItem } from "../data";

export function OwnerStats() {
  const { data } = useOwnerRequests();
  const requests = data?.results ?? [];

  const stats: StatItem[] = useMemo(() => [
    { label: "Total Requests", value: String(requests.length), icon: "car", color: "var(--brc-primary)" },
    { label: "Pending", value: String(requests.filter((r) => r.status === "pending").length), icon: "clock", color: "var(--brc-warning)" },
    { label: "Approved", value: String(requests.filter((r) => r.status === "approved").length), icon: "check", color: "var(--brc-success)" },
    { label: "Active", value: String(requests.filter((r) => r.status === "active").length), icon: "car", color: "var(--brc-accent)" },
  ], [requests]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
        gap: "clamp(14px, 2vw, 20px)",
      }}
    >
      {stats.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </div>
  );
}
