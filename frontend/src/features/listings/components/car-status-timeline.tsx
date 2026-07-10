"use client";

import { CheckIcon, MessageSquareIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCarHistory } from "@/features/inspections/api/inspections-api";
import type { CarStatusHistoryEntry } from "@/features/inspections/api/types";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABELS: Record<string, string> = {
  draft: "Car Listed",
  listing_approved: "Listing Approved",
  inspection_pending: "Inspection Booked",
  inspection_in_progress: "Inspection In Progress",
  needs_clearance: "Needs Further Clearance",
  inspection_rejected: "Inspection Failed",
  inspection_no_show: "Missed Appointment",
  needs_changes: "Changes Requested",
  published: "Published",
  paused: "Paused",
  suspended: "Suspended",
  archived: "Archived",
};

function statusLabel(status: string): string {
  return (
    STATUS_LABELS[status] ??
    status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")
  );
}

function actorLabel(role: CarStatusHistoryEntry["actor_role"]): string {
  if (role === "owner") return "You";
  if (role === "staff") return "Staff";
  return "System";
}

function formatEntryDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface CarStatusTimelineProps {
  carId: string;
}

export function CarStatusTimeline({ carId }: CarStatusTimelineProps) {
  const { data: history, isLoading } = useCarHistory(carId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2 pt-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <p className="text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
        No history yet.
      </p>
    );
  }

  return (
    <ol className="flex flex-col">
      {history.map((entry, i) => {
        const isLast = i === history.length - 1;
        const isAnnotation = entry.from_status === entry.to_status;

        return (
          <li key={entry.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span
                className="absolute left-4 top-8 h-[calc(100%-1.75rem)] w-px -translate-x-1/2 bg-(--brc-border)"
                aria-hidden
              />
            )}

            <span
              className={cn(
                "z-10 flex size-8 shrink-0 items-center justify-center rounded-full border",
                isLast
                  ? "border-(--brc-primary) bg-(--brc-primary) text-white shadow-[0_8px_18px_rgba(0,0,139,0.24)]"
                  : isAnnotation
                  ? "border-(--brc-border) bg-(--brc-bg-subtle) text-(--brc-text-muted)"
                  : "border-(--brc-success)/30 bg-(--brc-success-bg) text-(--brc-success)",
              )}
            >
              {isAnnotation ? (
                <MessageSquareIcon size={14} />
              ) : (
                <CheckIcon size={14} />
              )}
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-extrabold [font-family:var(--brc-font-ui)]",
                    isLast ? "text-(--brc-primary)" : "text-(--brc-text)",
                  )}
                >
                  {isAnnotation ? `${actorLabel(entry.actor_role)} responded` : statusLabel(entry.to_status)}
                </span>
                {isLast && (
                  <span className="rounded-full bg-(--brc-primary-tint) px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-(--brc-primary) [font-family:var(--brc-font-ui)]">
                    Current
                  </span>
                )}
              </div>
              <span className="mt-0.5 block text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                {actorLabel(entry.actor_role)} · {formatEntryDate(entry.created_at)}
              </span>
              {entry.note && (
                <p className="mt-2 rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) p-3 text-sm leading-relaxed text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                  {entry.note}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
