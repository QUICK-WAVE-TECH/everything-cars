"use client";

import { useState } from "react";
import { Loader2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useDeactivateSlot } from "@/features/inspections/api/inspections-api";
import type { InspectionSlot } from "@/features/inspections/api/types";
import { STATUS_META, capacityPct, formatTime, slotStatus } from "./schedule-helpers";

/** One slot in a day column: time, center, booked count, and a capacity bar.
 * Retains the inline deactivate control (with its confirm gate). */
export function SlotCard({ slot }: { slot: InspectionSlot }) {
  const status = slotStatus(slot);
  const meta = STATUS_META[status];
  const pct = capacityPct(slot);
  const deactivateSlot = useDeactivateSlot();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDeactivate() {
    try {
      await deactivateSlot.mutateAsync(slot.id);
      toast.success("Slot deactivated");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to deactivate slot");
    } finally {
      setConfirmOpen(false);
    }
  }

  return (
    <div
      className="group/slot relative rounded-xl border bg-white p-2.5 text-left shadow-[var(--brc-shadow-xs)] transition-shadow duration-150 hover:shadow-[var(--brc-shadow-sm)] motion-reduce:transition-none"
      style={{ borderColor: "var(--brc-border)" }}
    >
      <div className="truncate pr-5 text-[12px] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
        {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
      </div>
      {slot.center_name && (
        <div className="mt-0.5 truncate text-[11px] font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          {slot.center_name}
        </div>
      )}
      <div className="mt-1.5 text-[10.5px] font-bold uppercase tracking-wide [font-family:var(--brc-font-ui)]" style={{ color: meta.text }}>
        {slot.bookings_count}/{slot.capacity} booked
      </div>
      {/* Capacity bar */}
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-(--brc-bg-muted)">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: meta.bar }} />
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setConfirmOpen(true);
        }}
        disabled={deactivateSlot.isPending}
        aria-label="Deactivate slot"
        title="Deactivate slot"
        className={cn(
          "absolute right-1.5 top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-(--brc-border) bg-white text-(--brc-text-muted) opacity-0 shadow-sm transition-all duration-150 hover:border-(--brc-danger) hover:text-(--brc-danger) group-hover/slot:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none",
        )}
      >
        {deactivateSlot.isPending ? <Loader2Icon size={10} className="animate-spin" /> : <XIcon size={11} />}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Deactivate this slot?"
        description={`${formatTime(slot.start_time)} – ${formatTime(slot.end_time)} will stop accepting new bookings. Slots with active bookings can't be deactivated.`}
        confirmLabel="Deactivate"
        destructive
        isPending={deactivateSlot.isPending}
        onConfirm={handleDeactivate}
      />
    </div>
  );
}
