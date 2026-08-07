"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Rocket,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";

import {
  usePendingPublishing,
  usePublishCar,
  useSendBackCar,
} from "../api/publishing-api";
import type { PendingPublishingRow } from "../api/types";
import { PublishingReviewSheet } from "./publishing-review-sheet";
import { SendBackDialog } from "./send-back-dialog";

const PAGE_SIZE = 20;

function errorMessage(error: unknown): string {
  return error instanceof ApiError && error.message
    ? error.message
    : "Something went wrong. Please try again.";
}

export function PublishingPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PendingPublishingRow | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [sendBackOpen, setSendBackOpen] = useState(false);

  const query = usePendingPublishing(search, page);
  const publish = usePublishCar();
  const sendBack = useSendBackCar();

  const rows = useMemo(() => query.data?.results ?? [], [query.data?.results]);
  const count = query.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const loading = query.isLoading;
  const isEmpty = !loading && count === 0 && !search;
  const noMatches = !loading && rows.length === 0 && !!search;

  function openReview(row: PendingPublishingRow) {
    setSelected(row);
  }
  function closeReview() {
    setSelected(null);
  }

  function confirmPublish() {
    if (!selected) return;
    publish.mutate(selected.car_id, {
      onSuccess: () => {
        toast.success("Published — the listing is live.");
        setPublishOpen(false);
        closeReview();
      },
      onError: (e) => toast.error("Couldn't publish", { description: errorMessage(e) }),
    });
  }

  function confirmSendBack(note: string) {
    if (!selected) return;
    sendBack.mutate(
      { carId: selected.car_id, note },
      {
        onSuccess: () => {
          toast.success("Sent back to the owner for changes.");
          setSendBackOpen(false);
          closeReview();
        },
        onError: (e) =>
          toast.error("Couldn't send back", { description: errorMessage(e) }),
      },
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8 [font-family:var(--brc-font-ui)]">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
              Pending Publishing
            </h1>
            {!loading && count > 0 ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-(--brc-accent-bg) px-3 py-1.5 text-[12.5px] font-bold text-(--brc-accent)">
                <span className="h-[7px] w-[7px] rounded-full bg-(--brc-accent)" />
                {count} waiting
              </span>
            ) : null}
          </div>
          <p className="max-w-[56ch] text-base leading-relaxed text-(--brc-text-muted)">
            Cars that passed inspection, waiting to go live.
          </p>
        </div>

        {!isEmpty ? (
          <div className="flex h-12 w-full items-center gap-2.5 rounded-lg border border-(--brc-border) bg-(--brc-bg) px-3.5 transition focus-within:border-(--brc-primary) focus-within:shadow-[0_0_0_3px_rgba(0,0,139,0.12)] sm:w-80">
            <Search size={17} className="shrink-0 text-(--brc-text-muted)" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search car, business, or branch"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-(--brc-text) outline-none"
            />
          </div>
        ) : null}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-2xl border border-(--brc-border) bg-(--brc-bg) p-4"
            >
              <Skeleton className="h-[84px] w-[112px] rounded-xl" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/2 rounded-md" />
                <Skeleton className="h-3 w-1/3 rounded-md" />
              </div>
              <Skeleton className="h-11 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      ) : null}

      {/* Empty */}
      {isEmpty ? (
        <div className="flex justify-center py-8">
          <div className="flex max-w-[588px] flex-col items-center gap-5 rounded-3xl border border-(--brc-border) bg-(--brc-bg) p-9 text-center">
            <span className="flex h-[92px] w-[92px] items-center justify-center rounded-full bg-(--brc-accent-bg) text-(--brc-accent)">
              <Rocket size={40} strokeWidth={1.6} />
            </span>
            <div className="flex flex-col items-center gap-2.5">
              <h2 className="text-[30px] font-extrabold tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
                All caught up
              </h2>
              <p className="max-w-[40ch] text-base text-(--brc-text-muted)">
                Nothing waiting to publish right now.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* No matches */}
      {noMatches ? (
        <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-(--brc-border) bg-(--brc-bg) p-14 text-center">
          <Search size={22} className="text-(--brc-text-muted)" />
          <span className="text-[15px] font-bold text-(--brc-text)">
            No cars match “{search}”
          </span>
          <span className="text-sm text-(--brc-text-muted)">
            Try a car name, business, or branch.
          </span>
        </div>
      ) : null}

      {/* Rows */}
      {!loading && rows.length > 0 ? (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div
              key={row.car_id}
              className="flex flex-col items-start gap-4 rounded-2xl border border-(--brc-border) bg-(--brc-bg) p-4 transition-shadow hover:shadow-[0_2px_4px_rgba(18,18,18,0.03),0_14px_34px_rgba(18,18,18,0.09)] sm:flex-row sm:items-center"
            >
              <div className="flex h-[84px] w-[112px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-(--brc-border) bg-(--brc-bg-muted)">
                {row.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.thumbnail} alt="" className="h-full w-full object-cover" />
                ) : (
                  <CalendarCheck size={26} className="text-(--brc-text-muted)" />
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-[17.5px] font-bold leading-snug tracking-tight text-(--brc-text)">
                  {row.title}
                </span>
                <span className="text-[13px] font-semibold text-(--brc-text-muted)">
                  {[row.business_name, row.branch_name].filter(Boolean).join(" · ") ||
                    "—"}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[12.5px] text-(--brc-text-muted)">
                  <CalendarCheck size={13} />
                  {row.inspector_name || "Inspector"}
                  {row.inspected_at
                    ? ` · ${new Date(row.inspected_at).toLocaleDateString()}`
                    : ""}
                </span>
              </div>

              <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-(--brc-success-bg) py-1.5 pl-2.5 pr-3 text-xs font-bold text-(--brc-success)">
                  <BadgeCheck size={14} />
                  Inspection passed
                </span>
                <button
                  type="button"
                  onClick={() => openReview(row)}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-(--brc-border) bg-(--brc-bg) px-4.5 text-sm font-bold text-(--brc-primary) transition-colors hover:border-(--brc-primary) hover:bg-(--brc-primary-tint)"
                >
                  Review
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Pagination */}
      {!loading && count > PAGE_SIZE ? (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-(--brc-border) bg-(--brc-bg) px-4 text-sm font-bold text-(--brc-text) disabled:opacity-50"
          >
            <ChevronLeft size={16} />
            Prev
          </button>
          <span className="text-sm text-(--brc-text-muted)">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-(--brc-border) bg-(--brc-bg) px-4 text-sm font-bold text-(--brc-text) disabled:opacity-50"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      ) : null}

      {/* Review drawer */}
      <PublishingReviewSheet
        carId={selected?.car_id ?? null}
        open={selected !== null}
        onOpenChange={(o) => !o && closeReview()}
        onPublish={() => setPublishOpen(true)}
        onSendBack={() => setSendBackOpen(true)}
        busy={publish.isPending || sendBack.isPending}
      />

      {/* Publish confirm */}
      <ConfirmDialog
        open={publishOpen}
        onOpenChange={(o) => !publish.isPending && setPublishOpen(o)}
        title="Publish this listing?"
        description={
          <>
            It goes live on the marketplace immediately.
            {selected ? (
              <span className="mt-1.5 block font-bold text-(--brc-text-secondary)">
                {selected.title}
              </span>
            ) : null}
          </>
        }
        confirmLabel="Publish live"
        isPending={publish.isPending}
        onConfirm={confirmPublish}
      />

      {/* Send-back dialog */}
      <SendBackDialog
        open={sendBackOpen}
        onOpenChange={(o) => !sendBack.isPending && setSendBackOpen(o)}
        carTitle={selected?.title ?? ""}
        onConfirm={confirmSendBack}
        isPending={sendBack.isPending}
      />
    </div>
  );
}
