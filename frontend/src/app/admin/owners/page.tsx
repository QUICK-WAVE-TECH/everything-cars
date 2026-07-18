"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheckIcon,
  FileTextIcon,
  IdCardIcon,
  Loader2Icon,
  ShieldCheckIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAdminOwners,
  useVerifyOwner,
  type AdminOwner,
} from "@/features/auth/api/admin-owners";
import { ApiError } from "@/lib/api-client";

const TABS = [
  { key: "false", label: "Pending" },
  { key: "true", label: "Verified" },
] as const;

function DocLink({ href, label }: { href: string | null; label: string }) {
  if (!href) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-3 py-2 text-xs font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
        {label}: none
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-(--brc-border) bg-white px-3 py-2 text-xs font-bold text-(--brc-primary) no-underline transition hover:bg-(--brc-primary-tint) [font-family:var(--brc-font-ui)]"
    >
      <FileTextIcon size={13} />
      {label}
    </a>
  );
}

function OwnerCard({ owner }: { owner: AdminOwner }) {
  const verifyOwner = useVerifyOwner();

  async function setVerified(verify: boolean) {
    try {
      await verifyOwner.mutateAsync({ userId: owner.user_id, verify });
      toast.success(
        verify
          ? `${owner.first_name} ${owner.last_name} verified.`
          : "Verification revoked.",
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not update owner.",
      );
    }
  }

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-(--brc-border) bg-white p-5 shadow-[var(--brc-shadow-xs)] [font-family:var(--brc-font-ui)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-black text-(--brc-text)">
              {owner.first_name} {owner.last_name}
            </span>
            <span className="rounded-full bg-(--brc-bg-subtle) px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-(--brc-text-muted)">
              {owner.owner_type === "fleet" ? "Company" : "Individual"}
            </span>
            {owner.is_verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-(--brc-success-bg) px-2 py-0.5 text-[11px] font-bold text-(--brc-success)">
                <BadgeCheckIcon size={12} />
                Verified
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-(--brc-text-secondary)">
            {owner.email}
            {owner.phone ? ` · ${owner.phone}` : ""}
            {owner.state ? ` · ${owner.state}` : ""}
          </div>
        </div>

        {owner.is_verified ? (
          <button
            type="button"
            onClick={() => setVerified(false)}
            disabled={verifyOwner.isPending}
            className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-(--brc-border) bg-white px-4 text-sm font-bold text-(--brc-text-muted) transition hover:bg-(--brc-bg-subtle) disabled:opacity-60"
          >
            Revoke
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setVerified(true)}
            disabled={verifyOwner.isPending}
            className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border-none bg-(--brc-primary) px-4 text-sm font-black text-(--brc-text-on-primary) transition hover:bg-(--brc-primary-hover) disabled:opacity-60"
          >
            {verifyOwner.isPending ? (
              <Loader2Icon size={15} className="animate-spin" />
            ) : (
              <ShieldCheckIcon size={15} />
            )}
            Verify owner
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-4 sm:grid-cols-2">
        <div className="flex items-center gap-2 text-sm">
          <IdCardIcon size={16} className="text-(--brc-text-muted)" />
          <span className="text-(--brc-text-muted)">
            {owner.id_type_display || "ID"}:
          </span>
          <span className="font-bold text-(--brc-text)">
            {owner.national_id || "—"}
          </span>
        </div>
        {owner.owner_type === "fleet" && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-(--brc-text-muted)">RC:</span>
            <span className="font-bold text-(--brc-text)">
              {owner.rc_number || "—"}
            </span>
          </div>
        )}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <DocLink href={owner.id_document} label="ID document" />
          <DocLink href={owner.document} label="Ownership document" />
        </div>
      </div>
    </li>
  );
}

export default function AdminOwnersPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("false");
  const { data, isLoading } = useAdminOwners({ verified: tab });
  const owners = data?.results ?? [];

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-6">
      <div className="mb-6">
        <span className="text-xs font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          Admin · Owner verification
        </span>
        <h1 className="mt-1 text-2xl font-black text-(--brc-text) [font-family:var(--brc-font-display)]">
          Owners
        </h1>
        <p className="mt-1 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
          Review each owner&apos;s ID and ownership documents, then verify them so
          they can list cars.
        </p>
      </div>

      <div className="mb-5 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "cursor-pointer rounded-lg px-4 py-2 text-sm font-bold transition [font-family:var(--brc-font-ui)]",
              tab === t.key
                ? "bg-(--brc-primary) text-(--brc-text-on-primary)"
                : "border border-(--brc-border) bg-white text-(--brc-text)",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2Icon size={26} className="animate-spin text-(--brc-primary)" />
        </div>
      ) : owners.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-(--brc-border) bg-(--brc-bg-subtle) text-center">
          <ShieldCheckIcon size={24} className="text-(--brc-text-muted)" />
          <p className="text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
            {tab === "false" ? "No owners awaiting verification" : "No verified owners yet"}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {owners.map((owner) => (
            <OwnerCard key={owner.user_id} owner={owner} />
          ))}
        </ul>
      )}
    </div>
  );
}
