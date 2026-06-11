"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/store";
import { useMe } from "@/features/auth/api";
import type { UserRole } from "@/shared/types";

type AuthGuardProps = {
  children: React.ReactNode;
  requiredRole?: UserRole;
};

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

  useEffect(() => {
    // Still loading — wait
    if (isLoading) return;

    // Not authenticated
    if (!isReadyAuthenticated || isError) {
      router.replace("/sign-in");
      return;
    }

    // Wrong role
    if (requiredRole && currentRole !== requiredRole) {
      const correctDashboard =
        currentRole === "owner" ? "/owner/dashboard" : "/customer/dashboard";
      router.replace(correctDashboard);
    }
  }, [currentRole, isReadyAuthenticated, isLoading, isError, requiredRole, router]);

  // Show nothing while loading or redirecting
  if (isLoading || !isReadyAuthenticated || isError) {
    return null;
  }

  if (requiredRole && currentRole !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}
