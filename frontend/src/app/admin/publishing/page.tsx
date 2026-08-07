"use client";

import { ShieldAlert } from "lucide-react";

import { useMe } from "@/features/auth/api";
import { PublishingPage } from "@/features/publishing/components";

/** Publisher/Admin only. The admin layout already guarantees is_staff. */
export default function AdminPublishingPage() {
  const { data: user, isLoading } = useMe();
  if (isLoading) return null;

  const canPublish =
    user?.staff_role === "publisher" || user?.staff_role === "admin";

  if (!canPublish) {
    return (
      <div className="mx-auto flex w-full max-w-3xl px-5 py-16 [font-family:var(--brc-font-ui)]">
        <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-(--brc-border) bg-(--brc-bg) p-10 text-center">
          <ShieldAlert size={28} className="text-(--brc-text-muted)" />
          <h1 className="text-xl font-bold text-(--brc-text)">Publishers only</h1>
          <p className="max-w-prose text-sm text-(--brc-text-muted)">
            The publishing queue is available to publishers and admins.
          </p>
        </div>
      </div>
    );
  }

  return <PublishingPage />;
}
