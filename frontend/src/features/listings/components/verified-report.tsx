"use client";

import { ShieldCheckIcon } from "lucide-react";
import type { VerifiedReport as VerifiedReportData } from "@/features/listings/api/types";

const titleCase = (v: string) =>
  v ? v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ") : "—";

/** Small green "Verified" pill shown on inspected cars. */
export function VerifiedBadge({ size = "md" }: { size?: "sm" | "md" }) {
  const small = size === "sm";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-(--brc-success-bg) font-bold text-(--brc-success) [font-family:var(--brc-font-ui)]"
      style={{
        padding: small ? "3px 8px" : "5px 11px",
        fontSize: small ? 11 : 12,
      }}
    >
      <ShieldCheckIcon size={small ? 12 : 14} />
      Verified
    </span>
  );
}

/** The inspector's verified condition report — shown on public detail pages once
 * a car has passed physical inspection. Contains no owner/ID/staff-identity data. */
export function VerifiedReport({ report }: { report: VerifiedReportData }) {
  const grades: [string, string][] = [
    ["Overall condition", titleCase(report.condition)],
    ["Vehicle type", titleCase(report.car_type)],
    ["Engine", titleCase(report.engine_condition)],
    ["Chassis", titleCase(report.chassis_condition)],
    ["Air conditioning", titleCase(report.ac_condition)],
    ["Flood history", report.is_flooded ? "Reported" : "None found"],
    ["Accident history", report.has_accident_history ? "Reported" : "None found"],
  ];

  const inspectedOn = new Date(report.inspected_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl border border-(--brc-success)/25 bg-(--brc-success-bg)/40 p-5 [font-family:var(--brc-font-ui)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-(--brc-success-bg) text-(--brc-success)">
            <ShieldCheckIcon size={18} />
          </span>
          <div>
            <h3 className="m-0 text-base font-black text-(--brc-text) [font-family:var(--brc-font-display)]">
              Verified inspection report
            </h3>
            <p className="m-0 text-xs text-(--brc-text-muted)">
              Physically inspected by our team · {inspectedOn}
            </p>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-0 sm:grid-cols-2">
        {grades.map(([label, value], idx) => (
          <div
            key={label}
            className="flex items-center justify-between gap-3 border-(--brc-border) py-2.5"
            style={{ borderBottom: idx < grades.length - 1 ? "1px solid var(--brc-border)" : "none" }}
          >
            <dt className="text-xs text-(--brc-text-muted)">{label}</dt>
            <dd className="m-0 text-right text-sm font-bold text-(--brc-text)">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
