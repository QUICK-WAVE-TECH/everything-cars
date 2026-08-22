"use client";

import { useMe } from "@/features/auth/api";
import { AccountReview } from "./account-review";

/**
 * Wraps the owner area. An owner whose KYC an admin hasn't approved sees the
 * "Account in review" screen in place of every owner page. Team members (no
 * owner_profile) and verified owners pass through. Sits inside AuthGuard, which
 * already handles the loading/unauthenticated states.
 */
export function OwnerVerificationGate({ children }: { children: React.ReactNode }) {
  const { data: me } = useMe();

  const isOwner = me?.role === "owner";
  const unverified = isOwner && !me?.owner_profile?.is_verified;

  if (unverified) {
    return <AccountReview />;
  }
  return <>{children}</>;
}
