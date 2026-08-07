"use client";

import { MapPin, Mail, MoreHorizontal, Pencil, UserMinus, UserPlus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { TeamMember } from "../api/types";

/** Deterministic tinted avatar from the member's name. */
const AVATAR_TINTS = [
  { bg: "var(--brc-primary-tint)", fg: "var(--brc-primary)" },
  { bg: "var(--brc-accent-bg)", fg: "var(--brc-accent)" },
  { bg: "var(--brc-success-bg)", fg: "var(--brc-success)" },
];

function initials(m: TeamMember) {
  return `${m.first_name.charAt(0)}${m.last_name.charAt(0)}`.toUpperCase() || "?";
}

function tint(m: TeamMember) {
  const key = (m.first_name + m.last_name).length % AVATAR_TINTS.length;
  return AVATAR_TINTS[key] ?? AVATAR_TINTS[0]!;
}

export function TeamMemberCard({
  member,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  member: TeamMember;
  onEdit: (m: TeamMember) => void;
  onDeactivate: (m: TeamMember) => void;
  onReactivate: (m: TeamMember) => void;
}) {
  const disabled = !member.is_active;
  const t = tint(member);
  const name = `${member.first_name} ${member.last_name}`.trim();

  return (
    <div
      className="flex h-full flex-col gap-4 rounded-2xl border border-(--brc-border) bg-(--brc-bg) p-5 transition-shadow hover:shadow-[0_2px_4px_rgba(18,18,18,0.03),0_14px_34px_rgba(18,18,18,0.09)] [font-family:var(--brc-font-ui)]"
      style={{ opacity: disabled ? 0.66 : 1 }}
    >
      {/* Header: avatar + name/title + menu */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full text-[15.5px] font-extrabold"
            style={{ background: t.bg, color: t.fg }}
          >
            {initials(member)}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-[16.5px] font-bold leading-snug tracking-tight text-(--brc-text)">
              {name}
            </span>
            {member.title ? (
              <span className="truncate text-[12.5px] font-medium text-(--brc-text-muted)">
                {member.title}
              </span>
            ) : null}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            aria-label="Member actions"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-(--brc-text-muted) transition-colors hover:bg-(--brc-bg-subtle) hover:text-(--brc-text) data-[popup-open]:bg-(--brc-bg-subtle)"
          >
            <MoreHorizontal size={18} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="min-w-[190px]">
            <DropdownMenuItem onClick={() => onEdit(member)}>
              <Pencil size={15} />
              Edit member
            </DropdownMenuItem>
            {disabled ? (
              <DropdownMenuItem onClick={() => onReactivate(member)}>
                <UserPlus size={15} />
                Reactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => onDeactivate(member)}
                className="text-(--brc-danger) data-[highlighted]:text-(--brc-danger)"
              >
                <UserMinus size={15} />
                Deactivate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="h-px bg-(--brc-bg-muted)" />

      {/* Email */}
      <div className="flex items-center gap-2.5">
        <Mail size={16} className="shrink-0 text-(--brc-text-muted)" />
        <span className="text-[13.5px] leading-normal text-(--brc-text-secondary) [overflow-wrap:anywhere]">
          {member.email}
        </span>
      </div>

      {/* Branch chips */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-(--brc-text-muted)">
          Branches
        </span>
        <div className="flex flex-wrap gap-1.5">
          {member.branches.length ? (
            member.branches.map((b) => (
              <span
                key={b.id}
                className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-(--brc-primary-tint) py-1 pl-2.5 pr-3 text-xs font-bold text-(--brc-primary)"
              >
                <MapPin size={11} className="shrink-0" />
                {b.name}
              </span>
            ))
          ) : (
            <span className="text-xs text-(--brc-text-muted)">No branches assigned</span>
          )}
        </div>
      </div>

      <div className="mt-auto h-px bg-(--brc-bg-muted)" />

      {/* Status */}
      <div className="flex items-center gap-2">
        {disabled ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-(--brc-bg-muted) px-2.5 py-1 text-[11.5px] font-bold text-(--brc-text-muted)">
            Disabled
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
