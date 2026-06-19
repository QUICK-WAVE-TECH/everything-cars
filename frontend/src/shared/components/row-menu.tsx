"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type RowMenuItem = {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
};

type RowMenuProps = {
  items: RowMenuItem[];
};

/** A "⋮" actions menu for table rows. Manages its own open state. */
export function RowMenu({ items }: RowMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label="Row actions"
        className="inline-flex cursor-pointer rounded-md border-none bg-transparent p-1.5 text-(--brc-text-muted) outline-none transition hover:bg-(--brc-bg-subtle) data-[popup-open]:bg-(--brc-bg-subtle)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="z-[100] w-[170px] rounded-lg border border-(--brc-border) bg-white p-1.5 text-(--brc-text) shadow-md"
      >
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onClick={item.onClick}
            className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2.5 text-[13px] text-(--brc-text) hover:bg-(--brc-bg-subtle) focus:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
          >
            <span className="truncate">{item.label}</span>
            {item.icon}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
