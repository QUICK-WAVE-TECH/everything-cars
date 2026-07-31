"use client";

import { useState } from "react";
import { CalendarClockIcon, ChevronRightIcon, ReceiptTextIcon } from "lucide-react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

import {
  useStaffBookingDetail,
  useStaffBookings,
} from "../api/inspections-api";
import { InspectionPaymentReview } from "./inspection-payment-review";

function slotLabel(date: string, start: string): string {
  const d = new Date(`${date}T${start}`);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Staff queue of owner inspection payments awaiting verification. Lives on the
 * Payments desk alongside the request-payment queue. */
export function InspectionPaymentQueue() {
  const { data, isLoading } = useStaffBookings({ status: "awaiting_payment" });
  const [openId, setOpenId] = useState<string | null>(null);
  const detail = useStaffBookingDetail(openId);

  const rows = data?.results ?? [];
  const count = data?.count ?? 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-(--brc-border) bg-(--brc-bg) shadow-[var(--brc-shadow-xs)] [font-family:var(--brc-font-ui)]">
      <div className="flex items-center justify-between gap-3 border-b border-(--brc-border) px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-(--brc-primary-tint) text-(--brc-primary)">
            <ReceiptTextIcon size={18} />
          </span>
          <div>
            <h2 className="m-0 text-base font-bold text-(--brc-text)">
              Inspection payments
            </h2>
            <p className="m-0 text-xs text-(--brc-text-muted)">
              Owners paying to book a physical inspection
            </p>
          </div>
        </div>
        {count > 0 && (
          <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-(--brc-warning-bg) px-3 py-1.5 text-[13px] font-bold text-(--brc-accent-deep)">
            <span className="size-[7px] rounded-full bg-(--brc-accent-deep)" />
            {count} awaiting
          </span>
        )}
      </div>

      <div className="p-3 sm:p-4">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-8 text-center">
            <span className="text-sm font-bold text-(--brc-text)">
              Nothing awaiting verification
            </span>
            <span className="max-w-[340px] text-xs text-(--brc-text-muted)">
              Inspection payments submitted by owners will appear here for review.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setOpenId(b.id)}
                className="flex items-center gap-3 rounded-xl border border-(--brc-border) bg-(--brc-bg) p-3 text-left transition-colors hover:bg-(--brc-bg-subtle)"
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-(--brc-text)">
                    {b.car_title}
                  </span>
                  <span className="block truncate text-xs text-(--brc-text-muted)">
                    {b.booked_by_name}
                  </span>
                </div>
                <span className="hidden items-center gap-1.5 whitespace-nowrap text-xs text-(--brc-text-secondary) sm:flex">
                  <CalendarClockIcon size={13} className="text-(--brc-text-muted)" />
                  {slotLabel(b.slot.date, b.slot.start_time)}
                </span>
                <span className="rounded-full bg-(--brc-warning-bg) px-2.5 py-0.5 text-[11px] font-bold text-(--brc-accent)">
                  Awaiting
                </span>
                <ChevronRightIcon size={16} className="text-(--brc-text-muted)" />
              </button>
            ))}
          </div>
        )}
      </div>

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent
          side="right"
          showCloseButton
          className="w-full gap-0 overflow-y-auto bg-(--brc-bg) p-5 data-[side=right]:sm:max-w-[560px]"
        >
          {detail.isLoading ? (
            <div className="flex flex-col gap-4 pt-6">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : detail.data ? (
            <div className="flex flex-col gap-4 pt-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wide text-(--brc-text-muted)">
                  Inspection payment
                </span>
                <h3 className="m-0 mt-1 text-lg font-extrabold text-(--brc-text)">
                  {detail.data.car.title}
                </h3>
                <span className="text-sm text-(--brc-text-muted)">
                  {detail.data.booked_by_name}
                </span>
              </div>
              <InspectionPaymentReview
                booking={detail.data}
                onResolved={() => setOpenId(null)}
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
