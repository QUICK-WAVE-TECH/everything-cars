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
  const { isLoading, isError } = useMe();

  useEffect(() => {
    // Still loading — wait
    if (isLoading) return;

    // Not authenticated
    if (!isAuthenticated || isError) {
      router.replace("/sign-in");
      return;
    }

    // Wrong role
    if (requiredRole && userRole !== requiredRole) {
      const correctDashboard =
        userRole === "owner" ? "/owner/dashboard" : "/customer/dashboard";
      router.replace(correctDashboard);
    }
  }, [isAuthenticated, userRole, isLoading, isError, requiredRole, router]);

  // Show nothing while loading or redirecting
  if (isLoading || !isAuthenticated) {
    return null;
  }

  if (requiredRole && userRole !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}
