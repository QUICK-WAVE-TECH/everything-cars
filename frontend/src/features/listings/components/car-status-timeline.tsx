"use client";

import { CheckIcon, MessageSquareIcon, PencilIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
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
  pending_publishing: "Awaiting Publishing",
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

function actorLabel(
  entry: CarStatusHistoryEntry,
  viewer: "owner" | "staff",
): string {
  const role = entry.actor_role;
  if (role === "owner") {
    // A named business-side actor (e.g. a team member) is shown by name to both
    // the owner and staff; otherwise fall back to the generic label.
    if (entry.actor_name) return entry.actor_name;
    return viewer === "owner" ? "You" : "Owner";
  }
  if (role === "staff") {
    // Staff see the acting staff member's name; owners never do.
    return viewer === "staff" && entry.actor_name
      ? `Staff · ${entry.actor_name}`
      : "Staff";
  }
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
  /** Owner view: fetches from the owner history endpoint. */
  carId?: string;
  /** Staff view: pass pre-fetched entries (e.g. from useAdminCarHistory). */
  entries?: CarStatusHistoryEntry[];
  loading?: boolean;
  viewer?: "owner" | "staff";
}

export function CarStatusTimeline({
  carId,
  entries,
  loading = false,
  viewer = "owner",
}: CarStatusTimelineProps) {
  // When entries are supplied, skip the owner-scoped fetch entirely.
  const { data: fetched, isLoading: isFetching } = useCarHistory(
    entries ? null : carId ?? null,
  );
  const history = entries ?? fetched;
  const isLoading = entries ? loading : isFetching;
  const reduce = useReducedMotion();

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
        const changes = entry.changed_fields ?? [];
        const isEdit = isAnnotation && changes.length > 0;

        return (
          <motion.li
            key={entry.id}
            className="relative flex gap-3 pb-6 last:pb-0"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.45,
              ease: [0.16, 1, 0.3, 1],
              delay: Math.min(i, 8) * 0.05,
            }}
          >
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
              {isEdit ? (
                <PencilIcon size={14} />
              ) : isAnnotation ? (
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
                  {isEdit
                    ? "Listing updated"
                    : isAnnotation
                    ? `${actorLabel(entry, viewer)} responded`
                    : statusLabel(entry.to_status)}
                </span>
                {isLast && (
                  <span className="rounded-full bg-(--brc-primary-tint) px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-(--brc-primary) [font-family:var(--brc-font-ui)]">
                    Current
                  </span>
                )}
              </div>
              <span className="mt-0.5 block text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                {actorLabel(entry, viewer)} · {formatEntryDate(entry.created_at)}
              </span>
              {entry.note && (
                <p className="mt-2 rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) p-3 text-sm leading-relaxed text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                  {entry.note}
                </p>
              )}
              {isEdit && (
                <ul className="mt-2 flex flex-col gap-1.5 rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) p-3 [font-family:var(--brc-font-ui)]">
                  {changes.map((c) => (
                    <li key={c.field} className="flex flex-wrap items-baseline gap-1.5 text-xs">
                      <span className="font-bold text-(--brc-text)">{c.label}:</span>
                      <span className="text-(--brc-text-muted) line-through">
                        {c.old || "—"}
                      </span>
                      <span className="text-(--brc-text-muted)">→</span>
                      <span className="font-semibold text-(--brc-text-secondary)">
                        {c.new || "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
