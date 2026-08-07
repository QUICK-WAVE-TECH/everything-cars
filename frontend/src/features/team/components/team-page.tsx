"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Building2, Plus } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useMe } from "@/features/auth/api";

import {
  useDeactivateMember,
  useReactivateMember,
  useTeam,
} from "../api/team-api";
import type { TeamMember } from "../api/types";
import { TeamEmptyState } from "./team-empty-state";
import { TeamMemberCard } from "./team-member-card";
import { TeamMemberCardSkeleton } from "./team-member-card-skeleton";
import { TeamMemberFormDialog } from "./team-member-form-dialog";

export function TeamPage() {
  const { data: user, isLoading: userLoading } = useMe();
  const teamQuery = useTeam();
  const deactivate = useDeactivateMember();
  const reactivate = useReactivateMember();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [formNonce, setFormNonce] = useState(0);
  const [deactivateTarget, setDeactivateTarget] = useState<TeamMember | null>(null);

  const businessName = user?.owner_profile?.fleet_name ?? "";
  const isFleet =
    user?.role === "owner" && user?.owner_profile?.owner_type === "fleet";

  const members = useMemo(
    () => teamQuery.data?.results ?? [],
    [teamQuery.data?.results],
  );
  const loading = userLoading || teamQuery.isLoading;
  const isEmpty = !loading && members.length === 0;
  const isPopulated = !loading && members.length > 0;

  function openAdd() {
    setEditing(null);
    setFormNonce((n) => n + 1);
    setDialogOpen(true);
  }
  function openEdit(member: TeamMember) {
    setEditing(member);
    setFormNonce((n) => n + 1);
    setDialogOpen(true);
  }
  function handleReactivate(member: TeamMember) {
    reactivate.mutate(member.id, {
      onSuccess: () => toast.success("Member reactivated"),
      onError: () => toast.error("Couldn't reactivate the member. Please try again."),
    });
  }
  function confirmDeactivate() {
    if (!deactivateTarget) return;
    deactivate.mutate(deactivateTarget.id, {
      onSuccess: () => {
        toast.success("Member deactivated");
        setDeactivateTarget(null);
      },
      onError: () =>
        toast.error("Couldn't deactivate the member. Please try again."),
    });
  }

  if (!userLoading && !isFleet) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-16 [font-family:var(--brc-font-ui)]">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-(--brc-border) bg-(--brc-bg) p-10 text-center">
          <Building2 size={28} className="text-(--brc-text-muted)" />
          <h1 className="text-xl font-bold text-(--brc-text)">
            Team management is for business accounts
          </h1>
          <p className="max-w-prose text-sm text-(--brc-text-muted)">
            Only verified fleet/business owners can add team members.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-5 py-11 sm:px-8 [font-family:var(--brc-font-ui)]">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-col gap-2.5">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
            Team
          </h1>
          <p className="max-w-[56ch] text-base leading-relaxed text-(--brc-text-muted) text-pretty">
            Add team members and assign them to branches. They&apos;ll only see the
            vehicles and offers for their branches.
          </p>
        </div>
        {isPopulated ? (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-(--brc-primary) px-5 text-sm font-bold text-(--brc-text-on-primary) shadow-[0_1px_2px_rgba(0,0,139,0.2)] transition-colors hover:bg-(--brc-primary-hover)"
          >
            <Plus size={18} strokeWidth={2.25} />
            Add member
          </button>
        ) : null}
      </div>

      {/* Business identity strip */}
      {!loading && businessName ? (
        <div className="inline-flex max-w-full flex-wrap items-center gap-3 self-start rounded-2xl border border-(--brc-border) bg-(--brc-bg) py-2.5 pl-3 pr-4">
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-(--brc-primary-tint) text-(--brc-primary)">
            <Building2 size={17} />
          </span>
          <span className="text-[15px] font-bold text-(--brc-text)">{businessName}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-(--brc-success-bg) py-1 pl-2 pr-2.5 text-[11.5px] font-bold text-(--brc-success)">
            <BadgeCheck size={13} />
            Verified business
          </span>
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <TeamMemberCardSkeleton key={i} />
          ))}
        </div>
      ) : null}

      {isEmpty ? <TeamEmptyState onAdd={openAdd} /> : null}

      {isPopulated ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              onEdit={openEdit}
              onDeactivate={setDeactivateTarget}
              onReactivate={handleReactivate}
            />
          ))}
        </div>
      ) : null}

      <TeamMemberFormDialog
        key={formNonce}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        member={editing}
      />

      <ConfirmDialog
        open={deactivateTarget !== null}
        onOpenChange={(o) =>
          !deactivate.isPending && !o && setDeactivateTarget(null)
        }
        title="Remove this member's access?"
        description={
          <>
            They won&apos;t be able to sign in or see any branch data. You can restore
            access later.
            {deactivateTarget ? (
              <span className="mt-2 block font-bold text-(--brc-text-secondary)">
                {deactivateTarget.first_name} {deactivateTarget.last_name}
              </span>
            ) : null}
          </>
        }
        confirmLabel="Deactivate"
        destructive
        isPending={deactivate.isPending}
        onConfirm={confirmDeactivate}
      />
    </div>
  );
}
