"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type RailItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Not yet built — shown muted with a "Soon" tag, not selectable. */
  soon?: boolean;
};

/** The left section-rail: an eyebrow heading and a vertical nav on desktop that
 * collapses to a horizontal scroll on small screens. Items marked `soon` are
 * visibly present but inert (honest scaffolding for views we haven't built). */
export function ConsoleRail({
  eyebrow,
  items,
  active,
  onSelect,
}: {
  eyebrow: string;
  items: RailItem[];
  active: string;
  onSelect: (key: string) => void;
}) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden self-start lg:sticky lg:top-[92px] lg:flex lg:flex-col lg:gap-0.5">
        <span className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          {eyebrow}
        </span>
        {items.map((item) => {
          const isActive = active === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              disabled={item.soon}
              onClick={() => onSelect(item.key)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] font-bold transition-colors [font-family:var(--brc-font-ui)]",
                item.soon && "cursor-not-allowed text-(--brc-text-muted)/60",
                !item.soon && isActive
                  ? "bg-(--brc-primary-tint) text-(--brc-primary)"
                  : !item.soon && "text-(--brc-text-secondary) hover:bg-(--brc-bg-subtle)",
              )}
            >
              <Icon size={17} />
              <span className="flex-1">{item.label}</span>
              {item.soon && (
                <span className="rounded-full bg-(--brc-bg-muted) px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-(--brc-text-muted)">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </aside>

      {/* Mobile */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
        {items.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              disabled={item.soon}
              onClick={() => onSelect(item.key)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-bold transition-colors [font-family:var(--brc-font-ui)]",
                item.soon && "cursor-not-allowed text-(--brc-text-muted)/60",
                !item.soon && isActive
                  ? "bg-(--brc-primary-tint) text-(--brc-primary)"
                  : !item.soon && "bg-(--brc-bg-subtle) text-(--brc-text-secondary)",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
