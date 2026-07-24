"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import {
  ArrowDownUpIcon,
  CarFrontIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckBigIcon,
  ClipboardListIcon,
  SearchIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  useAdminCarCounts,
  useAdminCars,
  useAdminCarStatus,
} from "@/features/listings/api/admin-api";
import type { CarListItem } from "@/features/listings/api/types";
import {
  ADMIN_APPROVAL_GROUPS,
  ADMIN_APPROVAL_LABELS,
  type AdminApprovalStatus,
  formatAdminDate,
  formatAdminPrice,
  ListingTypeChip,
} from "@/features/listings/components/admin-approval-ui";
import { AdminReviewDrawer } from "@/features/listings/components/admin-review-drawer";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

type Counts = Record<AdminApprovalStatus, number>;
type SortMode = "newest" | "oldest";

function QueueMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <div className="flex min-w-[92px] items-center justify-between gap-3 px-3 py-2 sm:min-w-[112px] sm:flex-col sm:items-start sm:gap-0.5 sm:px-4">
      <span className="text-[10px] font-bold uppercase text-(--brc-text-muted)">
        {label}
      </span>
      <strong
        className={cn(
          "text-sm font-bold tabular-nums",
          tone === "success" && "text-(--brc-success)",
          tone === "danger" && "text-(--brc-danger)",
          tone === "default" && "text-(--brc-text)",
        )}
      >
        {value}
      </strong>
    </div>
  );
}

function WorkflowSidebar({
  activeStatus,
  counts,
  onStatusChange,
}: {
  activeStatus: AdminApprovalStatus;
  counts: Counts;
  onStatusChange: (status: AdminApprovalStatus) => void;
}) {
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar
      collapsible="offcanvas"
      className="top-[72px] h-[calc(100svh-72px)] border-(--brc-border) sm:top-[84px] sm:h-[calc(100svh-84px)]"
      style={{ "--sidebar-width": "15rem" } as CSSProperties}
    >
      <div className="border-b border-(--brc-border) px-4 py-4">
        <span className="block text-xs font-bold uppercase text-(--brc-primary)">
          Review workflow
        </span>
        <span className="mt-1 block text-xs text-(--brc-text-muted)">
          Select a queue to begin
        </span>
      </div>
      <SidebarContent className="bg-(--brc-bg-subtle) py-2">
        {ADMIN_APPROVAL_GROUPS.map((group) => {
          const GroupIcon =
            group.label === "Review"
              ? ClipboardListIcon
              : group.label === "Inspection"
                ? CarFrontIcon
                : CircleCheckBigIcon;

          return (
            <SidebarGroup key={group.label} className="px-2 py-2">
              <SidebarGroupLabel className="h-7 gap-2 px-2 text-[10px] font-bold uppercase text-(--brc-text-muted)">
                <GroupIcon size={14} />
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {group.statuses.map((status) => {
                    const active = activeStatus === status;
                    return (
                      <SidebarMenuItem key={status}>
                        <SidebarMenuButton
                          type="button"
                          isActive={active}
                          tooltip={ADMIN_APPROVAL_LABELS[status]}
                          onClick={() => {
                            onStatusChange(status);
                            setOpenMobile(false);
                          }}
                          className={cn(
                            "h-9 rounded-md border border-transparent px-2.5 text-[13px] font-semibold",
                            active
                              ? "border-(--brc-primary)/15 bg-white text-(--brc-primary) shadow-[var(--brc-shadow-xs)] hover:bg-white hover:text-(--brc-primary)"
                              : "text-(--brc-text-secondary) hover:bg-white hover:text-(--brc-text)",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              active
                                ? "bg-(--brc-primary)"
                                : "bg-(--brc-border-strong)",
                            )}
                          />
                          <span>{ADMIN_APPROVAL_LABELS[status]}</span>
                        </SidebarMenuButton>
                        <SidebarMenuBadge
                          className={cn(
                            "right-2 top-2 h-5 min-w-6 rounded-md px-1.5 text-[10px] font-bold",
                            active
                              ? "bg-(--brc-primary-tint) text-(--brc-primary)"
                              : "bg-(--brc-bg-muted) text-(--brc-text-muted)",
                          )}
                        >
                          {counts[status]}
                        </SidebarMenuBadge>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

function QueueRow({
  car,
  selected,
  onSelect,
}: {
  car: CarListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-x-0 border-t-0 border-b border-(--brc-border) bg-white px-4 py-3 text-left transition-colors md:grid-cols-[minmax(220px,1.5fr)_minmax(130px,.8fr)_minmax(125px,.7fr)_105px_30px] md:px-5 xl:grid-cols-[minmax(240px,1.5fr)_minmax(140px,.8fr)_minmax(135px,.75fr)_minmax(110px,.6fr)_105px_30px]",
        selected
          ? "bg-(--brc-primary-tint)"
          : "hover:bg-(--brc-bg-subtle)",
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="relative flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-(--brc-border) bg-(--brc-bg-subtle)">
          {car.primary_image ? (
            <Image
              src={car.primary_image}
              alt=""
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <CarFrontIcon size={20} className="text-(--brc-text-muted)" />
          )}
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-sm text-(--brc-text) transition-colors group-hover:text-(--brc-primary)">
            {car.title}
          </strong>
          <span className="mt-0.5 block truncate text-xs text-(--brc-text-muted)">
            {car.year} / {car.body_type || "-"}
          </span>
          <span className="mt-1 block truncate text-[11px] text-(--brc-text-secondary) md:hidden">
            {car.owner.first_name} {car.owner.last_name} / {car.state}
          </span>
        </span>
      </span>

      <span className="hidden min-w-0 md:block">
        <span className="block truncate text-sm font-semibold text-(--brc-text-secondary)">
          {car.owner.first_name} {car.owner.last_name}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-(--brc-text-muted)">
          {car.owner.is_verified ? "Verified owner" : "Verification pending"}
        </span>
      </span>

      <span className="hidden min-w-0 md:block">
        <strong className="block truncate text-sm text-(--brc-text)">
          {formatAdminPrice(car)}
        </strong>
        <span className="mt-1 block">
          <ListingTypeChip type={car.listing_type} />
        </span>
      </span>

      <span className="hidden min-w-0 text-sm text-(--brc-text-secondary) xl:block">
        <span className="block truncate">{car.state}</span>
        <span className="mt-0.5 block truncate text-[11px] text-(--brc-text-muted)">
          {car.city || "Location pending"}
        </span>
      </span>

      <span className="hidden text-xs text-(--brc-text-muted) md:block">
        {formatAdminDate(car.created_at)}
      </span>

      <span className="flex items-center justify-end">
        <ChevronRightIcon
          size={17}
          className="text-(--brc-text-muted) transition-transform group-hover:translate-x-0.5 group-hover:text-(--brc-primary)"
        />
      </span>
    </button>
  );
}

function QueueSkeleton() {
  return (
    <div>
      {Array.from({ length: 7 }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-[64px_minmax(0,1fr)_30px] items-center gap-3 border-b border-(--brc-border) px-4 py-3 md:grid-cols-[64px_minmax(170px,1.5fr)_minmax(120px,.8fr)_minmax(110px,.7fr)_100px_30px] md:px-5"
        >
          <Skeleton className="h-12 w-16 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="hidden h-4 w-20 md:block" />
          <Skeleton className="size-5 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export default function AdminApprovalsOperationsConsole() {
  const [status, setStatus] = useState<AdminApprovalStatus>("draft");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [page, setPage] = useState(1);
  const [drawerCarId, setDrawerCarId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: paginatedData, isLoading, isFetching } = useAdminCars({
    status,
    search: debouncedSearch || undefined,
    page,
    ordering: sortMode === "newest" ? "-created_at" : "created_at",
  });
  const { data: rawCounts } = useAdminCarCounts();
  const adminStatus = useAdminCarStatus();

  const counts = useMemo<Counts>(
    () => ({
      draft: rawCounts?.draft ?? 0,
      listing_approved: rawCounts?.listing_approved ?? 0,
      inspection_pending: rawCounts?.inspection_pending ?? 0,
      inspection_in_progress: rawCounts?.inspection_in_progress ?? 0,
      needs_clearance: rawCounts?.needs_clearance ?? 0,
      inspection_no_show: rawCounts?.inspection_no_show ?? 0,
      inspection_rejected: rawCounts?.inspection_rejected ?? 0,
      needs_changes: rawCounts?.needs_changes ?? 0,
      published: rawCounts?.published ?? 0,
      suspended: rawCounts?.suspended ?? 0,
    }),
    [rawCounts],
  );

  const cars = paginatedData?.results ?? [];

  const totalCount = paginatedData?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const showSkeleton = isLoading || (isFetching && !paginatedData);
  const inspectionCount =
    counts.listing_approved +
    counts.inspection_pending +
    counts.inspection_in_progress +
    counts.needs_clearance;

  const visiblePages = useMemo(() => {
    const values = new Set([
      1,
      Math.max(1, page - 1),
      page,
      Math.min(totalPages, page + 1),
      totalPages,
    ]);
    return [...values].sort((a, b) => a - b);
  }, [page, totalPages]);

  const openDrawer = useCallback((car: CarListItem) => {
    setDrawerCarId(car.id);
    setDrawerOpen(true);
  }, []);

  function changeStatus(nextStatus: AdminApprovalStatus) {
    setStatus(nextStatus);
    setPage(1);
  }

  async function handleAction(
    carId: string,
    nextStatus: string,
    note?: string,
  ) {
    try {
      await adminStatus.mutateAsync({
        carId,
        status: nextStatus,
        note,
      });
      toast.success(
        nextStatus === "published"
          ? "Listing published"
          : nextStatus === "suspended"
            ? "Listing suspended"
            : "Status updated",
      );
      setDrawerOpen(false);
    } catch {
      toast.error("Failed to update listing status");
    }
  }

  return (
    <TooltipProvider>
      <SidebarProvider
        className="min-h-[calc(100svh-72px)] bg-white [font-family:var(--brc-font-ui)] sm:min-h-[calc(100svh-84px)]"
        style={
          {
            "--sidebar-width": "15rem",
            "--sidebar-width-icon": "3rem",
          } as CSSProperties
        }
      >
        <WorkflowSidebar
          activeStatus={status}
          counts={counts}
          onStatusChange={changeStatus}
        />

        <section className="flex min-w-0 flex-1 flex-col bg-white">
          <header className="border-b border-(--brc-border) bg-white">
            <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger
                  aria-label="Show or hide review queues"
                  title="Show or hide review queues"
                  className="shrink-0 border border-(--brc-border) bg-white hover:bg-(--brc-primary-tint) hover:text-(--brc-primary)"
                />
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase text-(--brc-primary)">
                    Moderation workspace
                  </span>
                  <h1 className="mt-1 truncate text-xl font-extrabold text-(--brc-text) sm:text-2xl [font-family:var(--brc-font-display)]">
                    Listing approvals
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-(--brc-success)">
                <span className="size-2 rounded-full bg-(--brc-success)" />
                Live sync
              </div>
            </div>

            <div className="flex overflow-x-auto border-t border-(--brc-border) bg-(--brc-bg-subtle) px-1 sm:px-4 lg:px-8">
              <QueueMetric label="Pending" value={counts.draft} />
              <span className="w-px shrink-0 bg-(--brc-border)" />
              <QueueMetric label="Inspection" value={inspectionCount} />
              <span className="w-px shrink-0 bg-(--brc-border)" />
              <QueueMetric
                label="Published"
                value={counts.published}
                tone="success"
              />
              <span className="w-px shrink-0 bg-(--brc-border)" />
              <QueueMetric
                label="Suspended"
                value={counts.suspended}
                tone="danger"
              />
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-(--brc-border) px-4 py-4 sm:px-6 lg:px-8">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="truncate text-base font-bold text-(--brc-text) sm:text-lg">
                    {ADMIN_APPROVAL_LABELS[status]}
                  </h2>
                  <span className="rounded-md bg-(--brc-primary-tint) px-2 py-1 text-[11px] font-bold text-(--brc-primary)">
                    {counts[status]}
                  </span>
                </div>
                <p className="mt-1 mb-0 text-xs text-(--brc-text-muted)">
                  {totalCount} listing{totalCount === 1 ? "" : "s"} in this queue
                </p>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <label className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-(--brc-border) bg-white px-3 focus-within:border-(--brc-primary) sm:w-72">
                  <SearchIcon
                    size={17}
                    className="shrink-0 text-(--brc-text-muted)"
                  />
                  <span className="sr-only">Search listings</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search vehicle, owner, or location"
                    className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-(--brc-text-muted)"
                  />
                </label>

                <label className="relative flex h-10 items-center gap-2 rounded-lg border border-(--brc-border) bg-white px-3">
                  <ArrowDownUpIcon
                    size={16}
                    className="shrink-0 text-(--brc-text-muted)"
                  />
                  <span className="sr-only">Sort listings</span>
                  <select
                    value={sortMode}
                    onChange={(event) => {
                      setSortMode(event.target.value as SortMode)
                      setPage(1)
                    }}
                    className="cursor-pointer appearance-none border-none bg-transparent pr-4 text-xs font-bold text-(--brc-text-secondary) outline-none"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                  <ChevronRightIcon
                    size={13}
                    className="pointer-events-none absolute right-2 rotate-90 text-(--brc-text-muted)"
                  />
                </label>
              </div>
            </div>

            {isFetching && !showSkeleton ? (
              <div className="h-0.5 overflow-hidden bg-(--brc-bg-muted)">
                <div className="h-full w-1/3 animate-pulse bg-(--brc-primary)" />
              </div>
            ) : null}

            <div className="hidden grid-cols-[minmax(220px,1.5fr)_minmax(130px,.8fr)_minmax(125px,.7fr)_105px_30px] border-b border-(--brc-border) bg-(--brc-bg-subtle) px-5 py-2.5 text-[10px] font-bold uppercase text-(--brc-text-muted) md:grid xl:grid-cols-[minmax(240px,1.5fr)_minmax(140px,.8fr)_minmax(135px,.75fr)_minmax(110px,.6fr)_105px_30px]">
              <span>Vehicle</span>
              <span>Owner</span>
              <span>Type / price</span>
              <span className="hidden xl:block">Location</span>
              <span>Submitted</span>
              <span />
            </div>

            <div className="min-h-0 flex-1">
              {showSkeleton ? (
                <QueueSkeleton />
              ) : cars.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
                  <span className="flex size-12 items-center justify-center rounded-lg bg-(--brc-bg-muted) text-(--brc-text-muted)">
                    <SearchIcon size={21} />
                  </span>
                  <div>
                    <strong className="block text-sm text-(--brc-text)">
                      No listings found
                    </strong>
                    <span className="mt-1 block text-xs text-(--brc-text-muted)">
                      Try another search or choose a different workflow queue.
                    </span>
                  </div>
                </div>
              ) : (
                cars.map((car) => (
                  <QueueRow
                    key={car.id}
                    car={car}
                    selected={drawerOpen && drawerCarId === car.id}
                    onSelect={() => openDrawer(car)}
                  />
                ))
              )}
            </div>

            {!showSkeleton && cars.length > 0 ? (
              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-(--brc-border) bg-white px-4 py-3 sm:px-6 lg:px-8">
                <span className="text-xs font-semibold text-(--brc-text-muted)">
                  Showing {(page - 1) * PAGE_SIZE + 1}-
                  {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
                </span>

                {totalPages > 1 ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Previous page"
                      disabled={page === 1}
                      onClick={() => setPage((current) => current - 1)}
                      className="flex size-9 items-center justify-center rounded-md border border-(--brc-border) bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeftIcon size={16} />
                    </button>
                    {visiblePages.map((pageNumber, index) => (
                      <span key={pageNumber} className="flex items-center gap-1.5">
                        {index > 0 &&
                        pageNumber - (visiblePages[index - 1] ?? pageNumber) >
                          1 ? (
                          <span className="px-1 text-xs text-(--brc-text-muted)">
                            ...
                          </span>
                        ) : null}
                        <button
                          type="button"
                          aria-label={`Go to page ${pageNumber}`}
                          aria-current={
                            pageNumber === page ? "page" : undefined
                          }
                          onClick={() => setPage(pageNumber)}
                          className={cn(
                            "flex size-9 items-center justify-center rounded-md border text-xs font-bold",
                            pageNumber === page
                              ? "border-(--brc-primary) bg-(--brc-primary) text-white"
                              : "border-(--brc-border) bg-white text-(--brc-text)",
                          )}
                        >
                          {pageNumber}
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      aria-label="Next page"
                      disabled={page === totalPages}
                      onClick={() => setPage((current) => current + 1)}
                      className="flex size-9 items-center justify-center rounded-md border border-(--brc-border) bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRightIcon size={16} />
                    </button>
                  </div>
                ) : null}
              </footer>
            ) : null}
          </div>
        </section>

        <AdminReviewDrawer
          key={`${drawerCarId ?? "empty"}-${drawerOpen ? "open" : "closed"}`}
          carId={drawerCarId}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onAction={handleAction}
          isActing={adminStatus.isPending}
        />
      </SidebarProvider>
    </TooltipProvider>
  );
}
