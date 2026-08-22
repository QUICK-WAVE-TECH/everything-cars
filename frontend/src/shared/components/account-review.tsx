"use client";

import { useRouter } from "next/navigation";
import { BadgeCheck, Clock, LogOut, Mail, ShieldCheck } from "lucide-react";

import { useMe, useSignOut } from "@/features/auth/api";
import { idTypeLabel } from "@/features/auth/schemas";

/** Shown in place of every owner page while the owner's KYC is under review.
 * Reads `me` only — there is nothing for them to do here until an admin
 * approves the account. */
export function AccountReview() {
  const router = useRouter();
  const { data: me } = useMe();
  const signOut = useSignOut();

  const profile = me?.owner_profile;
  const isFleet = profile?.owner_type === "fleet";
  const displayName =
    isFleet && profile?.fleet_name
      ? profile.fleet_name
      : `${me?.first_name ?? ""} ${me?.last_name ?? ""}`.trim() || "—";

  function handleSignOut() {
    signOut.mutate(undefined, { onSettled: () => router.push("/sign-in") });
  }

  const rows: { label: string; value: string }[] = [
    { label: isFleet ? "Business name" : "Full name", value: displayName },
    { label: "Email", value: me?.email ?? "—" },
    { label: "Account type", value: isFleet ? "Business / Fleet" : "Individual" },
  ];
  if (profile?.id_type) {
    rows.push({ label: "ID on file", value: idTypeLabel(profile.id_type) });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-5 py-14 sm:py-20 [font-family:var(--brc-font-ui)]">
      <div className="flex flex-col overflow-hidden rounded-2xl border border-(--brc-border) bg-(--brc-bg)">
        {/* Header band */}
        <div className="flex flex-col items-center gap-4 border-b border-(--brc-border) bg-(--brc-bg-subtle) px-6 py-10 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-(--brc-primary-tint) text-(--brc-primary)">
            <Clock size={30} />
          </span>
          <div className="flex flex-col items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-(--brc-warning-bg) px-3 py-1 text-[11.5px] font-black uppercase tracking-wide text-(--brc-accent)">
              <ShieldCheck size={13} />
              Under review
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
              Your account is under review
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-(--brc-text-muted)">
              Thanks for signing up. Our team is verifying your details — you can
              start listing and managing vehicles as soon as you&apos;re approved.
            </p>
          </div>
        </div>

        {/* Submitted details */}
        <div className="flex flex-col gap-1 px-6 py-6">
          <span className="mb-2 text-[11px] font-bold uppercase tracking-wider text-(--brc-text-muted)">
            Details submitted
          </span>
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between gap-4 border-b border-(--brc-bg-muted) py-2.5 last:border-b-0"
            >
              <span className="text-[13.5px] text-(--brc-text-muted)">{r.label}</span>
              <span className="min-w-0 truncate text-right text-[14px] font-bold text-(--brc-text)">
                {r.value}
              </span>
            </div>
          ))}
        </div>

        {/* What happens next */}
        <div className="mx-6 mb-6 flex items-start gap-3 rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-4">
          <BadgeCheck size={18} className="mt-0.5 shrink-0 text-(--brc-success)" />
          <p className="text-[13px] leading-relaxed text-(--brc-text-secondary)">
            We&apos;ll email you the moment your account is approved. Reviews are
            usually quick — no further action is needed from you right now.
          </p>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col items-center gap-3 border-t border-(--brc-border) px-6 py-5">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signOut.isPending}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-(--brc-border) bg-(--brc-bg) px-5 text-sm font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) disabled:opacity-60"
          >
            <LogOut size={16} />
            {signOut.isPending ? "Signing out…" : "Sign out"}
          </button>
          <span className="inline-flex items-center gap-1.5 text-xs text-(--brc-text-muted)">
            <Mail size={13} />
            Questions? Contact support@everythingcars.ng
          </span>
        </div>
      </div>
    </div>
  );
}
