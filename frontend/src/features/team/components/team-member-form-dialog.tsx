"use client";

import { useState } from "react";
import { Check, Loader2, Lock, MapPin } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMyBranches } from "@/features/branches/api";
import { ApiError } from "@/lib/api-client";

import { useCreateMember, useUpdateMember } from "../api/team-api";
import type { TeamMember } from "../api/types";

type Values = {
  email: string;
  first_name: string;
  last_name: string;
  title: string;
  branch_ids: string[];
};
type Errors = Partial<Record<"email" | "first_name" | "last_name" | "branch_ids", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function serverErrors(error: unknown): Errors {
  if (error instanceof ApiError && error.data && typeof error.data === "object") {
    const data = error.data as Record<string, unknown>;
    const out: Errors = {};
    for (const key of ["email", "first_name", "last_name", "branch_ids"] as const) {
      const val = data[key];
      if (Array.isArray(val) && val.length) out[key] = String(val[0]);
      else if (typeof val === "string") out[key] = val;
    }
    return out;
  }
  return {};
}

/** Add or edit a team member. `member === null` → create. Email is create-only;
 * branches come from the business's active branches. */
export function TeamMemberFormDialog({
  open,
  onOpenChange,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMember | null;
}) {
  const isEdit = member !== null;
  const branchesQuery = useMyBranches();
  const activeBranches = (branchesQuery.data?.results ?? []).filter((b) => b.is_active);
  const create = useCreateMember();
  const update = useUpdateMember();
  const saving = create.isPending || update.isPending;

  const [values, setValues] = useState<Values>(() =>
    member
      ? {
          email: member.email,
          first_name: member.first_name,
          last_name: member.last_name,
          title: member.title,
          branch_ids: member.branches.map((b) => b.id),
        }
      : { email: "", first_name: "", last_name: "", title: "", branch_ids: [] },
  );
  const [errors, setErrors] = useState<Errors>({});

  const set = (key: keyof Values, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const toggleBranch = (id: string) => {
    setValues((prev) => ({
      ...prev,
      branch_ids: prev.branch_ids.includes(id)
        ? prev.branch_ids.filter((b) => b !== id)
        : [...prev.branch_ids, id],
    }));
    setErrors((prev) => ({ ...prev, branch_ids: undefined }));
  };

  function validate(): Errors {
    const e: Errors = {};
    if (!isEdit) {
      if (!values.email.trim()) e.email = "Email is required.";
      else if (!EMAIL_RE.test(values.email.trim())) e.email = "Enter a valid email.";
    }
    if (!values.first_name.trim()) e.first_name = "First name is required.";
    if (!values.last_name.trim()) e.last_name = "Last name is required.";
    if (values.branch_ids.length === 0) e.branch_ids = "Assign at least one branch.";
    return e;
  }

  function handleSubmit() {
    const next = validate();
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    const onError = (error: unknown) => {
      const fe = serverErrors(error);
      if (Object.keys(fe).length) setErrors(fe);
      else
        toast.error(
          error instanceof ApiError && error.message
            ? error.message
            : "Something went wrong. Please try again.",
        );
    };

    if (isEdit && member) {
      update.mutate(
        {
          id: member.id,
          input: { title: values.title.trim(), branch_ids: values.branch_ids },
        },
        {
          onSuccess: () => {
            toast.success("Member updated");
            onOpenChange(false);
          },
          onError,
        },
      );
    } else {
      create.mutate(
        {
          email: values.email.trim(),
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          title: values.title.trim(),
          branch_ids: values.branch_ids,
        },
        {
          onSuccess: () => {
            toast.success("Member added");
            onOpenChange(false);
          },
          onError,
        },
      );
    }
  }

  const inputClass = (invalid?: string) =>
    `h-12 w-full rounded-lg border bg-(--brc-bg-subtle) px-3.5 text-sm text-(--brc-text) outline-none transition focus:bg-(--brc-bg) focus:shadow-[0_0_0_3px_rgba(0,0,139,0.12)] ${
      invalid ? "border-(--brc-danger)" : "border-(--brc-border) focus:border-(--brc-primary)"
    }`;

  const pickedLabel =
    values.branch_ids.length === 0
      ? "None selected"
      : `${values.branch_ids.length} selected`;

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[calc(100vh-4rem)] max-w-[560px] overflow-y-auto rounded-2xl [font-family:var(--brc-font-ui)]">
        <DialogHeader>
          <DialogTitle className="text-[22px] font-bold tracking-tight">
            {isEdit ? "Edit member" : "Add member"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this member's title and branch assignments."
              : "Create a staff account and assign it to your branches."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Email */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-[13.5px] font-semibold text-(--brc-text)">Email</label>
            {isEdit ? (
              <>
                <div className="flex h-12 cursor-not-allowed items-center gap-2.5 rounded-lg border border-(--brc-border) bg-(--brc-bg-muted) px-3.5">
                  <input
                    type="text"
                    value={values.email}
                    readOnly
                    tabIndex={-1}
                    className="min-w-0 flex-1 cursor-not-allowed border-0 bg-transparent text-sm font-semibold text-(--brc-text-muted) outline-none"
                  />
                  <Lock size={15} className="shrink-0 text-(--brc-text-muted)" />
                </div>
                <span className="text-xs text-(--brc-text-muted)">
                  The sign-in email can&apos;t be changed after the account is created.
                </span>
              </>
            ) : (
              <>
                <input
                  type="email"
                  value={values.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="chidi@yourbusiness.ng"
                  className={inputClass(errors.email)}
                />
                {errors.email ? (
                  <ErrorText>{errors.email}</ErrorText>
                ) : (
                  <span className="text-xs text-(--brc-text-muted)">
                    They&apos;ll use this to sign in. It can&apos;t be changed later.
                  </span>
                )}
              </>
            )}
          </div>

          {/* First / Last */}
          <Field label="First name" error={errors.first_name}>
            <input
              type="text"
              value={values.first_name}
              onChange={(e) => set("first_name", e.target.value)}
              placeholder="Chidi"
              className={inputClass(errors.first_name)}
            />
          </Field>
          <Field label="Last name" error={errors.last_name}>
            <input
              type="text"
              value={values.last_name}
              onChange={(e) => set("last_name", e.target.value)}
              placeholder="Okafor"
              className={inputClass(errors.last_name)}
            />
          </Field>

          {/* Title */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="flex items-center gap-2 text-[13.5px] font-semibold text-(--brc-text)">
              Title
              <span className="text-[11.5px] font-semibold text-(--brc-text-muted)">
                Optional
              </span>
            </label>
            <input
              type="text"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g., Sales Rep"
              className={inputClass()}
            />
          </div>

          {/* Branch multi-select */}
          <div className="flex flex-col gap-2.5 sm:col-span-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label className="text-[13.5px] font-semibold text-(--brc-text)">
                Branches
              </label>
              <span className="text-xs font-semibold text-(--brc-text-muted)">
                {pickedLabel}
              </span>
            </div>
            <div
              className={`flex flex-col gap-2 rounded-xl border bg-(--brc-bg-subtle) p-3 ${
                errors.branch_ids ? "border-(--brc-danger)" : "border-(--brc-border)"
              }`}
            >
              {activeBranches.length === 0 ? (
                <span className="px-1 py-2 text-sm text-(--brc-text-muted)">
                  No active branches yet — create one first.
                </span>
              ) : (
                activeBranches.map((b) => {
                  const picked = values.branch_ids.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => toggleBranch(b.id)}
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        picked
                          ? "border-(--brc-primary) bg-(--brc-primary-tint)"
                          : "border-(--brc-border) bg-(--brc-bg) hover:border-(--brc-border-strong)"
                      }`}
                    >
                      <span
                        className={`flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] ${
                          picked
                            ? "border-(--brc-primary) bg-(--brc-primary) text-white"
                            : "border-(--brc-border-strong) bg-(--brc-bg)"
                        }`}
                      >
                        {picked ? <Check size={12} strokeWidth={3.2} /> : null}
                      </span>
                      <MapPin size={15} className="shrink-0 text-(--brc-text-muted)" />
                      <span className="truncate text-sm font-semibold text-(--brc-text)">
                        {b.name}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            {errors.branch_ids ? <ErrorText>{errors.branch_ids}</ErrorText> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-12 rounded-lg border border-(--brc-border) bg-(--brc-bg) px-5 text-sm font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex h-12 items-center gap-2.5 rounded-lg bg-(--brc-primary) px-5.5 text-sm font-bold text-(--brc-text-on-primary) transition-colors hover:bg-(--brc-primary-hover) disabled:cursor-wait disabled:opacity-70"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saving ? "Saving…" : "Save member"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13.5px] font-semibold text-(--brc-text)">{label}</label>
      {children}
      {error ? <ErrorText>{error}</ErrorText> : null}
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-semibold leading-snug text-(--brc-danger)">
      {children}
    </span>
  );
}
