"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  RotateCwIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ApiError } from "@/lib/api-client";

import {
  useDisputes,
  useDismissDispute,
  useOpenDisputeCount,
  useUpholdDispute,
  type DisputeDeal,
  type DisputeTab,
} from "../api";
import { PILL, TABS, money, relDate, absDateTime } from "../lib/dispute-format";
import { DisputeDetailSheet } from "./dispute-detail-sheet";
import { DismissDialog } from "./dismiss-dialog";

const PAGE_SIZE = 20;
const GRID =
  "grid grid-cols-[minmax(170px,1.5fr)_minmax(100px,1fr)_minmax(100px,1fr)_114px_100px_112px_28px] items-center gap-3 px-5";

function StatusPill({ deal }: { deal: DisputeDeal }) {
  const pill = PILL[deal.dispute_status];
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1.5 text-[11.5px] [font-family:var(--font-geist-sans)] ${pill.className}`}
    >
      <span className={`size-3.5 rounded-full ${pill.dot}`} />
      {pill.label}
    </span>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError && error.message
    ? error.message
    : "Something went wrong. Please try again.";
}

export function DisputesPage() {
  const [tab, setTab] = useState<DisputeTab>("open");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<DisputeDeal | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialog, setDialog] = useState<"uphold" | "dismiss" | null>(null);

  // Debounce the search box; any new query resets to the first page.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError, isPlaceholderData, refetch, isFetching } =
    useDisputes({ status: tab, search, page });
  const { data: openCount } = useOpenDisputeCount();
  const uphold = useUpholdDispute();
  const dismiss = useDismissDispute();

  const rows = data?.results ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const start = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, count);

  function selectTab(next: DisputeTab) {
    setTab(next);
    setPage(1);
  }

  function openDeal(deal: DisputeDeal) {
    setSelected(deal);
    setSheetOpen(true);
  }

  function closeAll() {
    setDialog(null);
    setSheetOpen(false);
    setSelected(null);
  }

  function doUphold() {
    if (!selected) return;
    uphold.mutate(selected.id, {
      onSuccess: () => {
        toast.error("Dispute upheld — deal reversed", {
          description: `${selected.car.title} is back on the market. Both parties and prior bidders were notified.`,
        });
        closeAll();
      },
      onError: (error) =>
        toast.error("Couldn't reverse the deal", {
          description: errorMessage(error),
        }),
    });
  }

  function doDismiss(note: string) {
    if (!selected) return;
    dismiss.mutate(
      { id: selected.id, note },
      {
        onSuccess: () => {
          toast.success("Dispute dismissed", {
            description: `The sale stands. ${selected.buyer.name} has been notified of the outcome.`,
          });
          closeAll();
        },
        onError: (error) =>
          toast.error("Couldn't dismiss the dispute", {
            description: errorMessage(error),
          }),
      },
    );
  }

  const bodyDim = isPlaceholderData ? "opacity-60" : "opacity-100";

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-8 sm:px-8 [font-family:var(--brc-font-ui)]">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex min-w-0 flex-1 basis-[300px] flex-col gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-(--brc-text) sm:text-[40px]">
            Deal disputes
          </h1>
          <p className="max-w-[560px] text-[15px] leading-relaxed text-(--brc-text-muted)">
            Buyers who say a sale never happened after the seller marked it
            completed. Uphold to reverse the deal and relist the car, or dismiss
            to let the sale stand.
          </p>
        </div>
        <div className="flex items-center gap-2.5 rounded-(--brc-radius-lg) bg-(--brc-warning-bg) px-4 py-3 ring-1 ring-(--brc-warning)">
          <AlertCircleIcon className="size-[18px] text-(--brc-accent)" />
          <span className="text-[22px] leading-none font-extrabold text-(--brc-accent) tabular-nums">
            {openCount ?? "—"}
          </span>
          <span className="text-[13px] font-semibold text-(--brc-accent)/85">
            awaiting review
          </span>
        </div>
      </div>

      {/* Section card */}
      <section className="flex flex-col overflow-hidden rounded-(--brc-radius-lg) bg-(--brc-bg) ring-1 ring-(--brc-border) shadow-(--brc-shadow-xs)">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--brc-border) p-4">
          <div
            role="tablist"
            aria-label="Filter disputes"
            className="flex flex-wrap items-center gap-1.5 rounded-(--brc-radius-md) bg-(--brc-bg-subtle) p-1 ring-1 ring-(--brc-border)"
          >
            {TABS.map((t) => {
              const active = tab === t.key;
              const badge =
                active ? count : t.key === "open" ? openCount : undefined;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectTab(t.key)}
                  className={`flex h-8 items-center gap-1.5 rounded-(--brc-radius-sm) px-3 text-[13px] font-semibold transition-colors ${
                    active
                      ? "bg-(--brc-bg) text-(--brc-text) shadow-(--brc-shadow-xs) ring-1 ring-(--brc-border)"
                      : "text-(--brc-text-muted) hover:text-(--brc-text)"
                  }`}
                >
                  {t.label}
                  {badge !== undefined && (
                    <span
                      className={`inline-flex h-[18px] min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] tabular-nums [font-family:var(--font-geist-sans)] ${
                        active
                          ? "bg-(--brc-primary-tint) text-(--brc-primary)"
                          : "text-(--brc-text-muted)"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-1 basis-[240px] items-center justify-end gap-2.5">
            <div className="relative flex min-w-0 max-w-[300px] flex-1 items-center">
              <SearchIcon className="pointer-events-none absolute left-3 size-4 text-(--brc-text-muted)" />
              <Input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search car, buyer or seller"
                aria-label="Search disputes"
                className="h-10 pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              aria-label="Refresh disputes"
              className="size-10 shrink-0"
            >
              <RotateCwIcon className={isFetching ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>

        {/* States */}
        {isLoading ? (
          <LoadingRows />
        ) : isError ? (
          <div className="m-5 flex items-start gap-3.5 rounded-(--brc-radius-md) bg-(--brc-danger-bg) p-5 ring-1 ring-(--brc-danger)">
            <AlertCircleIcon className="mt-0.5 size-5.5 shrink-0 text-(--brc-danger)" />
            <div className="flex flex-1 flex-col gap-1.5">
              <span className="text-[15px] font-bold text-(--brc-danger)">
                Couldn&apos;t load disputes
              </span>
              <span className="text-[13.5px] leading-normal text-(--brc-danger)/85">
                The disputes service didn&apos;t respond. Nothing has been
                changed — try again.
              </span>
            </div>
            <Button variant="destructive" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3.5 px-6 py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-(--brc-success-bg)">
              <ShieldCheckIcon className="size-8 text-(--brc-success)" />
            </div>
            <span className="text-lg font-bold text-(--brc-text)">
              {tab === "open"
                ? "No open disputes — you're all caught up"
                : "Nothing here"}
            </span>
            <span className="max-w-[380px] text-sm leading-relaxed text-(--brc-text-muted)">
              {tab === "open"
                ? "When a buyer reports a completed sale that never happened, it lands here for review."
                : search
                  ? "No disputes match your search."
                  : "No disputes in this state yet."}
            </span>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className={`hidden flex-col overflow-x-auto lg:flex ${bodyDim} transition-opacity`}>
              <div
                className={`${GRID} h-11 border-b border-(--brc-border) bg-(--brc-bg-subtle) text-[12.5px] font-semibold text-(--brc-text-muted)`}
              >
                <span>Car</span>
                <span>Buyer</span>
                <span>Seller</span>
                <span className="text-right">Amount</span>
                <span>Disputed</span>
                <span>Status</span>
                <span className="sr-only">Open</span>
              </div>
              {rows.map((deal) => (
                <button
                  key={deal.id}
                  type="button"
                  onClick={() => openDeal(deal)}
                  aria-label={`Dispute ${deal.ref}, ${deal.car.title}, ${PILL[deal.dispute_status].label}. Open case detail.`}
                  className={`${GRID} h-[76px] cursor-pointer border-b border-(--brc-border) text-left transition-colors hover:bg-(--brc-bg-subtle)`}
                >
                  <CarCell deal={deal} />
                  <TwoLine top={deal.buyer.name} bottom={deal.buyer.phone} />
                  <TwoLine
                    top={deal.seller.business_name || deal.seller.name}
                    bottom={deal.seller.name}
                  />
                  <span className="text-right text-sm font-bold text-(--brc-text) tabular-nums">
                    {money(deal)}
                  </span>
                  <span
                    title={absDateTime(deal.disputed_at)}
                    className="text-[12.5px] text-(--brc-text-secondary) [font-family:var(--font-geist-sans)]"
                  >
                    {relDate(deal.disputed_at)}
                  </span>
                  <StatusPill deal={deal} />
                  <ChevronRightIcon className="ml-auto size-[18px] text-(--brc-text-muted)" />
                </button>
              ))}
            </div>

            {/* Mobile cards */}
            <div className={`flex flex-col gap-2.5 p-3 lg:hidden ${bodyDim} transition-opacity`}>
              {rows.map((deal) => (
                <button
                  key={deal.id}
                  type="button"
                  onClick={() => openDeal(deal)}
                  className="flex cursor-pointer flex-col gap-3 rounded-(--brc-radius-md) bg-(--brc-bg) p-3.5 text-left ring-1 ring-(--brc-border) hover:bg-(--brc-bg-subtle)"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <CarCell deal={deal} />
                    <div className="ml-auto">
                      <StatusPill deal={deal} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <Field label="Buyer" value={deal.buyer.name} />
                    <Field
                      label="Seller"
                      value={deal.seller.business_name || deal.seller.name}
                    />
                    <Field label="Amount" value={money(deal)} />
                    <Field label="Disputed" value={relDate(deal.disputed_at)} />
                  </div>
                </button>
              ))}
            </div>

            {/* Pager */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <span className="text-[12.5px] text-(--brc-text-muted) tabular-nums [font-family:var(--font-geist-sans)]">
                  Showing {start}–{end} of {count}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1 || isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeftIcon />
                    Prev
                  </Button>
                  <span className="px-2 text-[13px] font-semibold text-(--brc-text-secondary) tabular-nums">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || isFetching}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                    <ChevronRightIcon />
                  </Button>
                  {isPlaceholderData && (
                    <Loader2Icon className="ml-1 size-4 animate-spin text-(--brc-text-muted)" />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <DisputeDetailSheet
        deal={selected}
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setSelected(null);
        }}
        onUphold={() => setDialog("uphold")}
        onDismiss={() => setDialog("dismiss")}
      />

      <ConfirmDialog
        open={dialog === "uphold"}
        onOpenChange={(o) => !uphold.isPending && setDialog(o ? "uphold" : null)}
        destructive
        isPending={uphold.isPending}
        title="Reverse this deal & relist the car?"
        description={
          selected
            ? `${selected.car.title} goes back on the market as Published, the deal is cancelled, and both parties plus everyone who bid earlier are notified. This can't be undone from here.`
            : undefined
        }
        confirmLabel="Reverse & relist"
        onConfirm={doUphold}
      />

      <DismissDialog
        open={dialog === "dismiss"}
        onOpenChange={(o) => setDialog(o ? "dismiss" : null)}
        buyerName={selected?.buyer.name ?? "The buyer"}
        isPending={dismiss.isPending}
        onConfirm={doDismiss}
      />
    </div>
  );
}

function CarCell({ deal }: { deal: DisputeDeal }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        role="img"
        aria-label={deal.car.title}
        className="h-[42px] w-14 shrink-0 rounded-(--brc-radius-sm) bg-(--brc-bg-muted) bg-cover bg-center"
        style={
          deal.car.primary_image
            ? { backgroundImage: `url(${deal.car.primary_image})` }
            : undefined
        }
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-bold text-(--brc-text)">
          {deal.car.title}
        </span>
        <span className="truncate text-[11.5px] text-(--brc-text-muted) [font-family:var(--font-geist-sans)]">
          {deal.ref}
        </span>
      </div>
    </div>
  );
}

function TwoLine({ top, bottom }: { top: string; bottom: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-[13.5px] font-semibold text-(--brc-text-secondary)">
        {top}
      </span>
      <span className="truncate text-[11.5px] text-(--brc-text-muted) [font-family:var(--font-geist-sans)]">
        {bottom || "—"}
      </span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-(--brc-text-muted) [font-family:var(--font-geist-sans)]">
        {label}
      </span>
      <span className="truncate text-[13px] font-semibold text-(--brc-text-secondary)">
        {value}
      </span>
    </div>
  );
}

function LoadingRows() {
  return (
    <div aria-busy="true" aria-label="Loading disputes" className="flex flex-col">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-(--brc-border) px-5 py-4"
        >
          <Skeleton className="h-[42px] w-14 rounded-(--brc-radius-sm)" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
          <Skeleton className="hidden h-3 w-24 lg:block" />
          <Skeleton className="hidden h-3 w-24 lg:block" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}
