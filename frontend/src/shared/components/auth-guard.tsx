"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/store";
import { useMe } from "@/features/auth/api";
import type { UserRole } from "@/shared/types";

type AuthGuardProps = {
  children: React.ReactNode;
  /** A single role, or a set of roles any of which may enter. */
  requiredRole?: UserRole | UserRole[];
};

function roleAllowed(
  current: UserRole | null | undefined,
  required?: UserRole | UserRole[],
): boolean {
  if (!required) return true;
  const allowed = Array.isArray(required) ? required : [required];
  return current != null && allowed.includes(current);
}

/**
 * Client-side auth guard. Wraps protected layouts.
 *
 * Waits for useMe() to resolve before deciding:
 * - If authenticated + correct role → render children
 * - If authenticated + wrong role → redirect to correct dashboard
 * - If not authenticated → redirect to /sign-in
 * - While loading → show nothing (proxy already handles server-side redirect)
 */
export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, userRole } = useAuthStore();
  const { data: user, isLoading, isError } = useMe();
  const isReadyAuthenticated = Boolean(user) || isAuthenticated;
  const currentRole = user?.role ?? userRole;
  const isStaff = user?.is_staff ?? false;

  useEffect(() => {
    // Still loading — wait
    if (isLoading) return;

    // Not authenticated
    if (!isReadyAuthenticated || isError) {
      router.replace("/sign-in");
      return;
    }

    // Staff users always go to admin dashboard
    if (isStaff) {
      router.replace("/admin/approvals");
      return;
    }

    // Wrong role
    if (!roleAllowed(currentRole, requiredRole)) {
      const correctDashboard =
        currentRole === "owner" || currentRole === "team_member"
          ? "/owner/dashboard"
          : "/customer/dashboard";
      router.replace(correctDashboard);
    }
  }, [currentRole, isStaff, isReadyAuthenticated, isLoading, isError, requiredRole, router]);

  // Show nothing while loading or redirecting
  if (isLoading || !isReadyAuthenticated || isError) {
    return null;
  }

  // Staff users are handled by admin layout
  if (isStaff) {
    return null;
  }

  if (!roleAllowed(currentRole, requiredRole)) {
    return null;
  }

  return <>{children}</>;
}
