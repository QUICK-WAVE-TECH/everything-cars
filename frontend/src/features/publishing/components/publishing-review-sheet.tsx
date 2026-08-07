"use client";

import {
  BadgeCheck,
  Building2,
  FileText,
  Loader2,
  MapPin,
  Rocket,
  Undo2,
} from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatOfferAmount } from "@/features/offers/lib/offer-format";

import { usePublishingDetail } from "../api/publishing-api";
import type { InspectionReport } from "../api/types";

const LABEL = "text-[11px] font-bold uppercase tracking-wider";

function titleize(v: string) {
  return v ? v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
}

function checks(report: InspectionReport): { label: string; value: string }[] {
  return [
    { label: "Condition", value: titleize(report.condition) },
    { label: "Mileage", value: `${report.mileage.toLocaleString()} km` },
    { label: "Fuel", value: titleize(report.fuel_type) },
    { label: "Body type", value: titleize(report.car_type) },
    { label: "Engine", value: titleize(report.engine_condition) },
    { label: "Chassis", value: titleize(report.chassis_condition) },
    { label: "A/C", value: titleize(report.ac_condition) },
    { label: "Flood / accident", value: report.is_flooded || report.has_accident_history ? "Flagged" : "Clean" },
  ];
}

function inspectorInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** The publisher's review drawer: full listing + the inspection report, with
 * Publish / Send-back actions (owned by the parent). */
export function PublishingReviewSheet({
  carId,
  open,
  onOpenChange,
  onPublish,
  onSendBack,
  busy,
}: {
  carId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: () => void;
  onSendBack: () => void;
  busy: boolean;
}) {
  const { data: car, isLoading } = usePublishingDetail(open ? carId : null);
  const report = car?.inspection ?? null;
  const price =
    car?.listing_type === "buy"
      ? car?.sale_price
        ? `${formatOfferAmount(car.sale_price, car.currency)}`
        : null
      : car?.rent_price_per_day
        ? `${formatOfferAmount(car.rent_price_per_day, car.currency)}/day`
        : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton
        className="w-full gap-0 bg-(--brc-bg) p-0 data-[side=right]:sm:w-[92vw] data-[side=right]:sm:max-w-[720px] [font-family:var(--brc-font-ui)]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Review listing before publishing</SheetTitle>
        </SheetHeader>

        {isLoading || !car ? (
          <div className="flex flex-col gap-4 p-6">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-6 w-2/3 rounded-md" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="shrink-0 border-b border-(--brc-border) p-6 pr-14">
              <h2 className="text-xl font-extrabold text-(--brc-text)">{car.title}</h2>
              <p className="mt-1 text-sm text-(--brc-text-muted)">
                {[car.brand, car.model, car.year].filter(Boolean).join(" · ")}
              </p>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
              {/* Photos */}
              {car.images?.length ? (
                <div className="grid grid-cols-3 gap-2">
                  {car.images.slice(0, 6).map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={img.id}
                      src={img.thumbnail || img.image}
                      alt=""
                      className="aspect-[4/3] w-full rounded-xl border border-(--brc-border) object-cover"
                    />
                  ))}
                </div>
              ) : null}

              {/* Listing facts */}
              <div className="flex flex-col gap-3 rounded-2xl border border-(--brc-border) bg-(--brc-bg) p-4">
                {price ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-(--brc-text-muted)">Price</span>
                    <span className="text-lg font-extrabold tabular-nums text-(--brc-text)">
                      {price}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-start gap-2.5 text-sm text-(--brc-text-secondary)">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-(--brc-text-muted)" />
                  <span>
                    {car.branch ? (
                      <>
                        {car.branch.name} — {car.branch.city}, {car.branch.state}
                      </>
                    ) : (
                      <>
                        {car.city ? `${car.city}, ` : ""}
                        {car.state}
                      </>
                    )}
                  </span>
                </div>
                {car.branch ? (
                  <div className="flex items-center gap-2 text-sm text-(--brc-text-muted)">
                    <Building2 size={15} className="shrink-0" />
                    {car.branch.phone} · {car.branch.email}
                  </div>
                ) : null}
              </div>

              {/* Inspection report */}
              {report ? (
                <div className="overflow-hidden rounded-2xl border border-(--brc-success-bg)">
                  <div className="flex items-center justify-between gap-2 bg-(--brc-success-bg) px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-[15px] font-extrabold text-(--brc-success)">
                      <BadgeCheck size={18} />
                      Inspection report · Passed
                    </span>
                  </div>
                  <div className="flex flex-col gap-4 p-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {checks(report).map((c) => (
                        <div key={c.label} className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-medium text-(--brc-text-muted)">
                            {c.label}
                          </span>
                          <span className="text-[13px] font-bold text-(--brc-text)">
                            {c.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Inspector's notes */}
                    <div className="flex flex-col gap-2 rounded-xl border border-(--brc-accent-bg) bg-(--brc-accent-bg) p-4">
                      <span className={`${LABEL} inline-flex items-center gap-2 text-(--brc-accent)`}>
                        <FileText size={14} />
                        Inspector&apos;s notes
                      </span>
                      <p className="text-sm leading-relaxed text-(--brc-text-secondary) text-pretty">
                        {report.staff_notes || "No notes recorded."}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-(--brc-accent) text-[10.5px] font-extrabold text-white">
                          {inspectorInitials(report.inspector_name)}
                        </span>
                        <span className="text-[12.5px] font-bold text-(--brc-text-secondary)">
                          {report.inspector_name}
                        </span>
                        {report.inspected_at ? (
                          <span className="text-[12.5px] text-(--brc-text-muted)">
                            · {new Date(report.inspected_at).toLocaleDateString()}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Sticky actions */}
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-(--brc-border) bg-(--brc-bg) p-4 shadow-[0_-6px_24px_rgba(18,18,18,0.06)]">
              <button
                type="button"
                onClick={onSendBack}
                disabled={busy}
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-(--brc-border) bg-(--brc-bg) px-5 text-sm font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) disabled:opacity-60"
              >
                <Undo2 size={17} />
                Send back
              </button>
              <button
                type="button"
                onClick={onPublish}
                disabled={busy}
                className="inline-flex h-12 items-center gap-2.5 rounded-lg bg-(--brc-primary) px-5.5 text-sm font-bold text-(--brc-text-on-primary) shadow-[0_1px_2px_rgba(0,0,139,0.2)] transition-colors hover:bg-(--brc-primary-hover) disabled:cursor-wait disabled:opacity-70"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={17} />}
                Publish live
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
