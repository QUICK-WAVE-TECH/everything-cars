"use client";

import { Plus, Users } from "lucide-react";

export function TeamEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex justify-center pb-8 pt-3">
      <div className="flex w-full max-w-[588px] flex-col items-center gap-5 rounded-3xl border border-(--brc-border) bg-(--brc-bg) p-9 text-center shadow-[0_1px_2px_rgba(18,18,18,0.03),0_14px_40px_rgba(18,18,18,0.05)] [font-family:var(--brc-font-ui)]">
        <span className="flex h-[92px] w-[92px] items-center justify-center rounded-full bg-(--brc-accent-bg) text-(--brc-accent)">
          <Users size={40} strokeWidth={1.6} />
        </span>
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-[30px] font-extrabold leading-tight tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
            Build your team
          </h2>
          <p className="max-w-[44ch] text-base leading-relaxed text-(--brc-text-muted) text-pretty">
            Add staff and assign them to your branches so they can manage listings and
            offers.
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-13 items-center gap-2 rounded-lg bg-(--brc-primary) px-6.5 text-[15px] font-bold text-(--brc-text-on-primary) transition-colors hover:bg-(--brc-primary-hover)"
        >
          <Plus size={19} strokeWidth={2.25} />
          Add your first member
        </button>
      </div>
    </div>
  );
}
