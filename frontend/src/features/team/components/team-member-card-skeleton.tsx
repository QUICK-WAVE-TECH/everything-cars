import { Skeleton } from "@/components/ui/skeleton";

export function TeamMemberCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-(--brc-border) bg-(--brc-bg) p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-[46px] w-[46px] rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-1/2 rounded-md" />
          <Skeleton className="h-3 w-1/3 rounded-md" />
        </div>
      </div>
      <div className="h-px bg-(--brc-bg-muted)" />
      <Skeleton className="h-3 w-3/5 rounded-md" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="h-px bg-(--brc-bg-muted)" />
      <Skeleton className="h-2.5 w-14 rounded-md" />
    </div>
  );
}
