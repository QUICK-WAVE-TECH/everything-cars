"use client";

import { Building2, Plus, Warehouse } from "lucide-react";

/** Forced onboarding state: a verified fleet owner must create their first
 * branch before they can list cars. Welcoming, action-forward. */
export function BranchesEmptyState({
  businessName,
  onAdd,
}: {
  businessName: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex justify-center pb-8 pt-3">
      <div className="flex w-full max-w-[588px] flex-col items-center gap-5 rounded-3xl border border-(--brc-border) bg-(--brc-bg) p-9 text-center shadow-[0_1px_2px_rgba(18,18,18,0.03),0_14px_40px_rgba(18,18,18,0.05)] [font-family:var(--brc-font-ui)]">
        <span className="flex h-[92px] w-[92px] items-center justify-center rounded-full bg-(--brc-accent-bg) text-(--brc-accent)">
          <Warehouse size={40} strokeWidth={1.6} />
        </span>
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-[30px] font-extrabold leading-tight tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
            Set up your first branch
          </h2>
          <p className="max-w-[42ch] text-base leading-relaxed text-(--brc-text-muted) text-pretty">
            Add the location where your vehicles are kept. You&apos;ll be able to list
            cars once you have at least one branch.
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-13 items-center gap-2 rounded-lg bg-(--brc-primary) px-6.5 text-[15px] font-bold text-(--brc-text-on-primary) transition-colors hover:bg-(--brc-primary-hover)"
        >
          <Plus size={19} strokeWidth={2.25} />
          Add your first branch
        </button>
        <div className="flex w-full items-center justify-center gap-2 border-t border-(--brc-bg-muted) pt-5">
          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-(--brc-primary-tint) text-(--brc-primary)">
            <Building2 size={12} />
          </span>
          <span className="text-[13px] text-(--brc-text-muted)">
            Branches will be created under
          </span>
          <span className="text-[13px] font-bold text-(--brc-text)">{businessName}</span>
        </div>
      </div>
    </div>
  );
}
