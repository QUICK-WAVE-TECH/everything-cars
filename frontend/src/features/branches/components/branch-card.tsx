"use client";

import {
  Archive,
  Building2,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  RotateCcw,
  Trash2,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Branch } from "../api/types";

/** A single branch tile: name, inherited business badge, address + contacts,
 * an active/retired status footer, and an actions menu (edit / retire /
 * reactivate / delete). Retired branches render dimmed with a "Retired" badge. */
export function BranchCard({
  branch,
  onEdit,
  onRetire,
  onReactivate,
  onDelete,
}: {
  branch: Branch;
  onEdit: (branch: Branch) => void;
  onRetire: (branch: Branch) => void;
  onReactivate: (branch: Branch) => void;
  onDelete: (branch: Branch) => void;
}) {
  const retired = !branch.is_active;

  return (
    <div
      className="flex h-full flex-col gap-4 rounded-2xl border border-(--brc-border) bg-(--brc-bg) p-5 transition-shadow hover:shadow-[0_2px_4px_rgba(18,18,18,0.03),0_14px_34px_rgba(18,18,18,0.09)] [font-family:var(--brc-font-ui)]"
      style={{ opacity: retired ? 0.66 : 1 }}
    >
      {/* Header: name + business badge + actions menu */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[17px] font-bold leading-snug tracking-tight text-(--brc-text) text-pretty">
            {branch.name}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-(--brc-text-muted)">
            <Building2 size={12} className="shrink-0" />
            {branch.business_name}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            aria-label="Branch actions"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-(--brc-text-muted) transition-colors hover:bg-(--brc-bg-subtle) hover:text-(--brc-text) data-[popup-open]:bg-(--brc-bg-subtle)"
          >
            <MoreHorizontal size={18} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="min-w-[184px]">
            <DropdownMenuItem onClick={() => onEdit(branch)}>
              <Pencil size={15} />
              Edit branch
            </DropdownMenuItem>
            {retired ? (
              <DropdownMenuItem onClick={() => onReactivate(branch)}>
                <RotateCcw size={15} />
                Reactivate branch
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => onRetire(branch)}
                className="text-(--brc-danger) data-[highlighted]:text-(--brc-danger)"
              >
                <Archive size={15} />
                Retire branch
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(branch)}
              className="text-(--brc-danger) data-[highlighted]:text-(--brc-danger)"
            >
              <Trash2 size={15} />
              Delete branch
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="h-px bg-(--brc-bg-muted)" />

      {/* Address + contacts */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2.5">
          <MapPin size={16} className="mt-0.5 shrink-0 text-(--brc-text-muted)" />
          <span className="min-w-0 text-[13.5px] leading-normal text-(--brc-text-secondary) [overflow-wrap:anywhere] text-pretty">
            {branch.street_address}
            <br />
            {branch.city}, {branch.state}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <Phone size={16} className="shrink-0 text-(--brc-text-muted)" />
          <span className="text-[13.5px] leading-normal tabular-nums text-(--brc-text-secondary) [overflow-wrap:anywhere]">
            {branch.phone}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <Mail size={16} className="shrink-0 text-(--brc-text-muted)" />
          <span className="text-[13.5px] leading-normal text-(--brc-text-secondary) [overflow-wrap:anywhere]">
            {branch.email}
          </span>
        </div>
      </div>

      <div className="mt-auto h-px bg-(--brc-bg-muted)" />

      {/* Status */}
      <div className="flex items-center gap-2">
        {retired ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-(--brc-bg-muted) px-2.5 py-1 text-[11.5px] font-bold text-(--brc-text-muted)">
            <Archive size={12} />
            Retired
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-[12.5px] font-bold text-(--brc-success)">
            <span className="h-[7px] w-[7px] rounded-full bg-(--brc-success) shadow-[0_0_0_3px_rgba(32,184,88,0.16)]" />
            Active
          </span>
        )}
      </div>
    </div>
  );
}
