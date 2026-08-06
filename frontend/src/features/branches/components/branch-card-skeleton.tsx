import { Skeleton } from "@/components/ui/skeleton";

/** Shimmer placeholder matching BranchCard's layout, shown while branches load. */
export function BranchCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-(--brc-border) bg-(--brc-bg) p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-3/4 rounded-md" />
          <Skeleton className="h-3 w-2/5 rounded-md" />
        </div>
        <Skeleton className="h-6 w-6 rounded-md" />
      </div>
      <div className="h-px bg-(--brc-bg-muted)" />
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2.5">
          <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-11/12 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-4 w-4 shrink-0 rounded" />
          <Skeleton className="h-3 w-2/5 rounded-md" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-4 w-4 shrink-0 rounded" />
          <Skeleton className="h-3 w-3/5 rounded-md" />
        </div>
      </div>
      <div className="h-px bg-(--brc-bg-muted)" />
      <Skeleton className="h-2.5 w-16 rounded-md" />
    </div>
  );
}
