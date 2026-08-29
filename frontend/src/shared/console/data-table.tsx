"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  /** Extra classes on the cell + header. */
  className?: string;
  /** Hide the column below this breakpoint. */
  hideBelow?: "sm" | "md" | "lg";
};

const HIDE: Record<string, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};
const ALIGN: Record<string, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

/** The console data table: a bordered card with a horizontally-scrollable table,
 * rows that stagger in, hover + click affordances, an active-row highlight, plus
 * loading and empty states. Row click drives the side `DetailPanel`. */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
  activeId,
  isLoading,
  skeletonRows = 6,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  activeId?: string | null;
  isLoading?: boolean;
  skeletonRows?: number;
  empty?: React.ReactNode;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="overflow-hidden rounded-2xl border border-(--brc-border) bg-white">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse [font-family:var(--brc-font-ui)]">
          <thead>
            <tr className="border-b border-(--brc-border) bg-(--brc-bg-subtle)/40">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "px-4 py-3 text-[11.5px] font-bold uppercase tracking-[0.04em] text-(--brc-text-muted)",
                    ALIGN[c.align ?? "left"],
                    c.hideBelow && HIDE[c.hideBelow],
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i} className="border-b border-(--brc-border) last:border-0">
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-4 py-3.5", c.hideBelow && HIDE[c.hideBelow])}>
                      <Skeleton className="h-4 w-full max-w-[140px]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-16 text-center text-[13.5px] text-(--brc-text-muted)"
                >
                  {empty ?? "No results."}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const id = getRowId(row);
                const active = activeId === id;
                return (
                  <motion.tr
                    key={id}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: reduce ? 0 : 0.3,
                      delay: reduce ? 0 : Math.min(i, 12) * 0.025,
                    }}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "border-b border-(--brc-border) transition-colors last:border-0",
                      onRowClick && "cursor-pointer",
                      active
                        ? "bg-(--brc-primary-tint) shadow-[inset_3px_0_0_var(--brc-primary)]"
                        : "hover:bg-(--brc-bg-subtle)",
                    )}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "px-4 py-3.5 text-[13.5px] text-(--brc-text)",
                          ALIGN[c.align ?? "left"],
                          c.hideBelow && HIDE[c.hideBelow],
                          c.className,
                        )}
                      >
                        {c.cell(row)}
                      </td>
                    ))}
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
