"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Building2, Plus } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useMe } from "@/features/auth/api";

import {
  useDeactivateBranch,
  useDeleteBranch,
  useMyBranches,
  useReactivateBranch,
} from "../api/branches-api";
import type { Branch } from "../api/types";
import { BranchCard } from "./branch-card";
import { BranchCardSkeleton } from "./branch-card-skeleton";
import { BranchFormDialog } from "./branch-form-dialog";
import { BranchesEmptyState } from "./branches-empty-state";

export function BranchesPage() {
  const { data: user, isLoading: userLoading } = useMe();
  const branchesQuery = useMyBranches();
  const deactivate = useDeactivateBranch();
  const reactivate = useReactivateBranch();
  const deleteBranch = useDeleteBranch();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [formNonce, setFormNonce] = useState(0);
  const [retireTarget, setRetireTarget] = useState<Branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);

  const businessName = user?.owner_profile?.fleet_name ?? "";
  const isFleet =
    user?.role === "owner" && user?.owner_profile?.owner_type === "fleet";

  const branches = useMemo(
    () => branchesQuery.data?.results ?? [],
    [branchesQuery.data?.results],
  );
  const loading = userLoading || branchesQuery.isLoading;
  const isEmpty = !loading && branches.length === 0;
  const isPopulated = !loading && branches.length > 0;

  function openAdd() {
    setEditing(null);
    setFormNonce((n) => n + 1);
    setDialogOpen(true);
  }
  function openEdit(branch: Branch) {
    setEditing(branch);
    setFormNonce((n) => n + 1);
    setDialogOpen(true);
  }
  function handleReactivate(branch: Branch) {
    reactivate.mutate(branch.id, {
      onSuccess: () => toast.success("Branch reactivated"),
      onError: () => toast.error("Couldn't reactivate the branch. Please try again."),
    });
  }
  function confirmRetire() {
    if (!retireTarget) return;
    deactivate.mutate(retireTarget.id, {
      onSuccess: () => {
        toast.success("Branch retired");
        setRetireTarget(null);
      },
      onError: () =>
        toast.error("Couldn't retire the branch. Please try again."),
    });
  }
  function confirmDelete() {
    if (!deleteTarget) return;
    deleteBranch.mutate(deleteTarget.id, {
      onSuccess: (result) => {
        const parts: string[] = [];
        if (result.deleted_listings > 0) {
          parts.push(
            `${result.deleted_listings} listing${result.deleted_listings === 1 ? "" : "s"} removed`,
          );
        }
        if (result.archived_records > 0) {
          parts.push(
            `${result.archived_records} car${result.archived_records === 1 ? "" : "s"} archived`,
          );
        }
        toast.success("Branch deleted", {
          description: parts.length ? parts.join(" · ") : undefined,
        });
        setDeleteTarget(null);
      },
      onError: () =>
        toast.error("Couldn't delete the branch. Please try again."),
    });
  }

  // Owners who aren't fleet businesses don't have branches.
  if (!userLoading && !isFleet) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-16 [font-family:var(--brc-font-ui)]">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-(--brc-border) bg-(--brc-bg) p-10 text-center">
          <Building2 size={28} className="text-(--brc-text-muted)" />
          <h1 className="text-xl font-bold text-(--brc-text)">
            Branches are for business accounts
          </h1>
          <p className="max-w-prose text-sm text-(--brc-text-muted)">
            Branch management is available to verified fleet/business owners. Your
            account lists vehicles from a single location.
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
            Branches
          </h1>
          <p className="max-w-[52ch] text-base leading-relaxed text-(--brc-text-muted) text-pretty">
            Manage your dealership locations. Each branch has its own address and
            contact details.
          </p>
        </div>
        {isPopulated ? (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-(--brc-primary) px-5 text-sm font-bold text-(--brc-text-on-primary) shadow-[0_1px_2px_rgba(0,0,139,0.2)] transition-colors hover:bg-(--brc-primary-hover)"
          >
            <Plus size={18} strokeWidth={2.25} />
            Add branch
          </button>
        ) : null}
      </div>

      {/* Business identity strip */}
      {!loading && businessName ? (
        <div className="inline-flex max-w-full flex-wrap items-center gap-3 self-start rounded-2xl border border-(--brc-border) bg-(--brc-bg) py-2.5 pl-3 pr-4">
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-(--brc-primary-tint) text-(--brc-primary)">
            <Building2 size={17} />
          </span>
          <span className="text-[15px] font-bold text-(--brc-text)">
            {businessName}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-(--brc-success-bg) py-1 pl-2 pr-2.5 text-[11.5px] font-bold text-(--brc-success)">
            <BadgeCheck size={13} />
            Verified business
          </span>
        </div>
      ) : null}

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3].map((i) => (
            <BranchCardSkeleton key={i} />
          ))}
        </div>
      ) : null}

      {/* Empty (forced onboarding) */}
      {isEmpty ? (
        <BranchesEmptyState businessName={businessName} onAdd={openAdd} />
      ) : null}

      {/* Populated */}
      {isPopulated ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              onEdit={openEdit}
              onRetire={setRetireTarget}
              onReactivate={handleReactivate}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      ) : null}

      <BranchFormDialog
        key={formNonce}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        businessName={businessName}
        branch={editing}
      />

      <ConfirmDialog
        open={retireTarget !== null}
        onOpenChange={(o) => !deactivate.isPending && !o && setRetireTarget(null)}
        title="Retire this branch?"
        description={
          <>
            It&apos;ll be hidden from active use. You can reactivate it later.
            {retireTarget ? (
              <span className="mt-2 block font-bold text-(--brc-text-secondary)">
                {retireTarget.name}
              </span>
            ) : null}
          </>
        }
        confirmLabel="Retire branch"
        destructive
        isPending={deactivate.isPending}
        onConfirm={confirmRetire}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !deleteBranch.isPending && !o && setDeleteTarget(null)}
        title="Delete this branch?"
        description={
          <>
            {deleteTarget ? (
              <span className="mb-2 block font-bold text-(--brc-text-secondary)">
                {deleteTarget.name}
              </span>
            ) : null}
            {deleteTarget && deleteTarget.deletable_car_count > 0 ? (
              <>
                {deleteTarget.deletable_car_count} active listing
                {deleteTarget.deletable_car_count === 1 ? "" : "s"} will be{" "}
                <strong>permanently deleted</strong>.{" "}
              </>
            ) : null}
            {deleteTarget && deleteTarget.record_car_count > 0 ? (
              <>
                {deleteTarget.record_car_count} car
                {deleteTarget.record_car_count === 1 ? "" : "s"} with sales/rental
                records will be <strong>kept</strong> and unassigned from this
                branch.{" "}
              </>
            ) : null}
            {deleteTarget &&
            deleteTarget.deletable_car_count === 0 &&
            deleteTarget.record_car_count === 0 ? (
              <>This branch has no cars. </>
            ) : null}
            This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete branch"
        destructive
        isPending={deleteBranch.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
