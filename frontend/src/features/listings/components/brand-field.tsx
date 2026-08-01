"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@/features/auth/components/icon";
import { cn } from "@/lib/utils";

/** Searchable brand picker over the canonical list, with an "Other (not listed)"
 * escape hatch that reveals a free-text field bound to `brand_other`. */
export function BrandField({
  brands,
  loading,
  value,
  otherValue,
  onSelectBrand,
  onSelectOther,
  onOtherChange,
}: {
  brands: string[];
  loading: boolean;
  value: string;
  otherValue: string;
  onSelectBrand: (name: string) => void;
  onSelectOther: () => void;
  onOtherChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [otherActive, setOtherActive] = useState(!value && !!otherValue);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = brands.filter((b) =>
    b.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const label = value || (otherActive ? "Other (not listed)" : "");
  const rowClass =
    "flex w-full cursor-pointer items-center justify-between rounded-lg border-none px-4 py-2.5 text-left text-sm transition-colors duration-150 [font-family:var(--brc-font-ui)]";

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-sm text-(--brc-text) [font-family:var(--brc-font-ui)] sm:text-base">
        Brand
      </span>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            "flex h-12 w-full cursor-pointer items-center justify-between rounded-lg bg-(--brc-bg-subtle) px-4 text-left text-sm transition-all duration-200 [font-family:var(--brc-font-ui)] sm:h-14 sm:px-5",
            open
              ? "border-2 border-(--brc-primary) shadow-[0_0_0_3px_rgba(0,0,139,0.08)]"
              : "border border-(--brc-border) hover:border-(--brc-text-muted)",
          )}
          style={{ color: label ? "var(--brc-text)" : "var(--brc-text-muted)" }}
        >
          {label || "Select brand"}
          <Icon
            name={open ? "chevup" : "chevdown"}
            size={16}
            stroke="var(--brc-text-muted)"
          />
        </button>
        {open && (
          <div className="absolute left-0 right-0 top-[54px] z-40 rounded-xl border border-(--brc-border) bg-white p-1 shadow-lg sm:top-[62px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brands"
              autoFocus
              className="mb-1 h-10 w-full rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-3 text-sm outline-none focus:border-(--brc-primary) [font-family:var(--brc-font-ui)]"
            />
            <div className="max-h-[min(45vh,240px)] overflow-y-auto">
              {loading ? (
                <div className="px-4 py-2.5 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  Loading brands…
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-4 py-2.5 text-sm text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  No matches — use “Other” below.
                </div>
              ) : (
                filtered.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      onSelectBrand(b);
                      setOtherActive(false);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      rowClass,
                      b === value
                        ? "bg-(--brc-primary-tint) font-semibold text-(--brc-primary)"
                        : "bg-transparent text-(--brc-text) hover:bg-(--brc-bg-subtle)",
                    )}
                  >
                    {b}
                    {b === value && (
                      <Icon name="check" size={16} stroke="var(--brc-primary)" />
                    )}
                  </button>
                ))
              )}
              <button
                type="button"
                onClick={() => {
                  onSelectOther();
                  setOtherActive(true);
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  rowClass,
                  "mt-1 border-t border-(--brc-border)",
                  otherActive
                    ? "bg-(--brc-primary-tint) font-semibold text-(--brc-primary)"
                    : "bg-transparent text-(--brc-text) hover:bg-(--brc-bg-subtle)",
                )}
              >
                Other (not listed)
              </button>
            </div>
          </div>
        )}
      </div>
      {otherActive && (
        <input
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder="Enter the brand name"
          className="h-12 w-full rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-4 text-sm outline-none focus:border-(--brc-primary) [font-family:var(--brc-font-ui)] sm:h-14 sm:px-5"
        />
      )}
    </div>
  );
}
