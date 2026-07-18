"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2Icon, Loader2Icon, LifeBuoyIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useAssistanceRequests,
  useAvailableSlots,
  useBookForOwner,
  useCentersByCity,
  useHandleAssistance,
} from "@/features/inspections/api/inspections-api";
import type { AssistanceRequest } from "@/features/inspections/api/types";
import { ApiError } from "@/lib/api-client";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function fmtTime(t: string) {
  const [h = "0", m = "0"] = t.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${suffix}`;
}

/** Staff dialog to book an inspection on an owner's behalf. */
function BookForOwnerDialog({
  request,
  open,
  onClose,
}: {
  request: AssistanceRequest;
  open: boolean;
  onClose: () => void;
}) {
  const [centerId, setCenterId] = useState<string>("");
  const [slotId, setSlotId] = useState<string>("");
  const bookForOwner = useBookForOwner();

  // Centers are city-scoped in the public endpoint; staff pick by the owner's
  // state, so query without a city and filter client-side by state.
  const { data: centers } = useCentersByCity({
    country: undefined,
    state: request.state || undefined,
    city: request.state || undefined,
  });
  const { data: slots } = useAvailableSlots(centerId || undefined);
  const openSlots = (slots ?? []).filter((s) => s.spots_remaining > 0);

  async function handleBook() {
    if (!request.car || !slotId) return;
    try {
      await bookForOwner.mutateAsync({
        car_id: request.car,
        slot_id: slotId,
        attendee_type: "self",
      });
      toast.success(`Inspection booked for ${request.owner_name}.`);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not book inspection.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="[font-family:var(--brc-font-display)]">
            Book for {request.owner_name}
          </DialogTitle>
          <DialogDescription className="[font-family:var(--brc-font-ui)]">
            {request.car_title || "This owner's vehicle"} · {request.state || "—"}
          </DialogDescription>
        </DialogHeader>

        {!request.car ? (
          <p className="rounded-lg bg-(--brc-warning-bg) p-3 text-sm text-[#9a7400] [font-family:var(--brc-font-ui)]">
            This request isn&apos;t linked to a specific car, so it can&apos;t be
            booked automatically. Contact the owner to proceed.
          </p>
        ) : (
          <div className="flex flex-col gap-3 [font-family:var(--brc-font-ui)]">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-bold text-(--brc-text)">Center</span>
              <Select
                value={centerId || undefined}
                onValueChange={(v) => {
                  setCenterId(v ?? "");
                  setSlotId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a center" />
                </SelectTrigger>
                <SelectContent>
                  {(centers ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name} — {c.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-bold text-(--brc-text)">Slot</span>
              <Select
                value={slotId || undefined}
                onValueChange={(v) => setSlotId(v ?? "")}
                disabled={!centerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an available slot" />
                </SelectTrigger>
                <SelectContent>
                  {openSlots.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.date} · {fmtTime(s.start_time)}–{fmtTime(s.end_time)} (
                      {s.spots_remaining} left)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-lg border border-(--brc-border) bg-white px-4 text-sm font-bold text-(--brc-text) hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
          >
            Close
          </button>
          {request.car && (
            <button
              type="button"
              onClick={handleBook}
              disabled={!slotId || bookForOwner.isPending}
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-(--brc-primary) px-5 text-sm font-black text-(--brc-text-on-primary) hover:bg-(--brc-primary-hover) disabled:cursor-not-allowed disabled:opacity-60 [font-family:var(--brc-font-ui)]"
            >
              {bookForOwner.isPending && (
                <Loader2Icon size={15} className="animate-spin" />
              )}
              Book inspection
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AssistanceQueue() {
  const { data, isLoading } = useAssistanceRequests({ status: "open", page_size: 100 });
  const handle = useHandleAssistance();
  const [bookingFor, setBookingFor] = useState<AssistanceRequest | null>(null);

  const requests = useMemo(() => data?.results ?? [], [data]);

  async function markHandled(id: string) {
    try {
      await handle.mutateAsync(id);
      toast.success("Marked as handled.");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not update request.",
      );
    }
  }

  if (isLoading) return null;
  if (requests.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-[var(--brc-space-10,40px)]">
      <div className="rounded-2xl border border-(--brc-border) bg-white p-5 shadow-[var(--brc-shadow-xs)] sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-(--brc-primary-tint) text-(--brc-primary)">
            <LifeBuoyIcon size={18} />
          </span>
          <div>
            <h2 className="text-base font-black text-(--brc-text) [font-family:var(--brc-font-display)]">
              Booking assistance ({requests.length})
            </h2>
            <p className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              Owners with no inspection center in their area.
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-3">
          {requests.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-3 rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-4 sm:flex-row sm:items-center sm:justify-between [font-family:var(--brc-font-ui)]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-extrabold text-(--brc-text)">
                    {r.owner_name}
                  </span>
                  <span className="text-xs text-(--brc-text-muted)">
                    {r.state || "—"} · {timeAgo(r.created_at)}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-(--brc-text-secondary)">
                  {r.car_title || "No car linked"} · {r.owner_email}
                  {r.owner_phone ? ` · ${r.owner_phone}` : ""}
                </div>
                {r.message && (
                  <p className="mt-2 rounded-lg border border-(--brc-border) bg-white p-2.5 text-xs text-(--brc-text-secondary)">
                    {r.message}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setBookingFor(r)}
                  className={cn(
                    "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-(--brc-primary) px-4 text-sm font-bold text-(--brc-text-on-primary) hover:bg-(--brc-primary-hover)",
                  )}
                >
                  Book for owner
                </button>
                <button
                  type="button"
                  onClick={() => markHandled(r.id)}
                  disabled={handle.isPending}
                  className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-(--brc-border) bg-white px-4 text-sm font-bold text-(--brc-text) hover:bg-white/60 disabled:opacity-60"
                >
                  <CheckCircle2Icon size={15} />
                  Mark handled
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {bookingFor && (
        <BookForOwnerDialog
          request={bookingFor}
          open={!!bookingFor}
          onClose={() => setBookingFor(null)}
        />
      )}
    </section>
  );
}
