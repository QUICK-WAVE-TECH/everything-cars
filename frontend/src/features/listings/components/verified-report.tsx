"use client";

import {
  AlertTriangleIcon,
  CalendarCheckIcon,
  CarFrontIcon,
  FuelIcon,
  GaugeIcon,
  ShieldCheckIcon,
  SnowflakeIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import type { VerifiedReport as VerifiedReportData } from "@/features/listings/api/types";

const titleCase = (v: string) =>
  v ? v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ") : "—";

function formatNumber(value: number | null | undefined) {
  return typeof value === "number" ? value.toLocaleString("en-NG") : "—";
}

function formatInspectionDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Inspection date unavailable";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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
  const inspectedOn = formatInspectionDate(report.inspected_at);
  const summary: { label: string; value: string; icon: LucideIcon }[] = [
    {
      label: "Mileage",
      value: `${formatNumber(report.mileage)} km`,
      icon: GaugeIcon,
    },
    {
      label: "Fuel",
      value: titleCase(report.fuel_type),
      icon: FuelIcon,
    },
    {
      label: "Vehicle type",
      value: titleCase(report.car_type),
      icon: CarFrontIcon,
    },
  ];

  const checks: { label: string; value: string; icon: LucideIcon }[] = [
    { label: "Overall condition", value: titleCase(report.condition), icon: WrenchIcon },
    { label: "Engine", value: titleCase(report.engine_condition), icon: WrenchIcon },
    { label: "Chassis", value: titleCase(report.chassis_condition), icon: CarFrontIcon },
    { label: "Air conditioning", value: titleCase(report.ac_condition), icon: SnowflakeIcon },
    {
      label: "Flood history",
      value: report.is_flooded ? "Reported" : "None found",
      icon: AlertTriangleIcon,
    },
    {
      label: "Accident history",
      value: report.has_accident_history ? "Reported" : "None found",
      icon: AlertTriangleIcon,
    },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-(--brc-border) bg-white shadow-[0_18px_48px_rgba(18,18,18,0.08)] [font-family:var(--brc-font-ui)]">
      <div className="border-b border-(--brc-border) bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_100%)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-(--brc-success-bg) text-(--brc-success)">
              <ShieldCheckIcon size={22} />
            </span>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h3 className="m-0 text-lg font-black text-(--brc-text) [font-family:var(--brc-font-display)]">
                  Verified inspection report
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-(--brc-success-bg) px-2.5 py-1 text-[11px] font-black text-(--brc-success)">
                  <ShieldCheckIcon size={12} />
                  Passed
                </span>
              </div>
              <p className="m-0 text-sm leading-6 text-(--brc-text-muted)">
                This vehicle passed a physical inspection by the Buy & Rent Cars team.
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-(--brc-border) bg-white px-3 py-2 text-xs font-bold text-(--brc-text-muted)">
            <CalendarCheckIcon size={14} className="text-(--brc-success)" />
            {inspectedOn}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {summary.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-4"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-white text-(--brc-primary)">
                <Icon size={18} />
              </div>
              <p className="m-0 text-[11px] font-black uppercase tracking-[0.12em] text-(--brc-text-muted)">
                {label}
              </p>
              <p className="m-0 mt-1 text-sm font-black text-(--brc-text)">
                {value}
              </p>
            </div>
          ))}
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          {checks.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-(--brc-border) bg-white px-4 py-3"
            >
              <dt className="flex min-w-0 items-center gap-2 text-sm font-semibold text-(--brc-text-secondary)">
                <Icon size={16} className="shrink-0 text-(--brc-text-muted)" />
                <span className="truncate">{label}</span>
              </dt>
              <dd className="m-0 shrink-0 text-right text-sm font-black text-(--brc-text)">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        {report.features.length > 0 && (
          <div className="mt-5">
            <p className="m-0 mb-2 text-xs font-black uppercase tracking-[0.12em] text-(--brc-text-muted)">
              Verified features
            </p>
            <div className="flex flex-wrap gap-2">
              {report.features.map((feature) => (
                <span
                  key={feature}
                  className="rounded-full bg-(--brc-primary-tint) px-3 py-1.5 text-xs font-bold text-(--brc-primary)"
                >
                  {titleCase(feature)}
                </span>
              ))}
            </div>
          </div>
        )}

        {report.notes && (
          <div className="mt-5 rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-4">
            <p className="m-0 mb-1 text-xs font-black uppercase tracking-[0.12em] text-(--brc-text-muted)">
              Inspector notes
            </p>
            <p className="m-0 text-sm leading-6 text-(--brc-text-secondary)">
              {report.notes}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
