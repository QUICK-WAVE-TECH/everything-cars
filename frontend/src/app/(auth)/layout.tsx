"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthNav, AuthFooter } from "@/features/auth/components";
import { useAuthStore } from "@/features/auth/store";
import { useMe } from "@/features/auth/api";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, userRole } = useAuthStore();
  const { data: user } = useMe();

  useEffect(() => {
    if (!isAuthenticated) return;
    const isStaff = user?.is_staff ?? false;
    if (isStaff) {
      router.replace("/admin/approvals");
    } else if (userRole === "owner") {
      router.replace("/owner/dashboard");
    } else {
      router.replace("/customer/dashboard");
    }
  }, [isAuthenticated, userRole, user, router]);

  // Don't render auth pages for authenticated users
  if (isAuthenticated) return null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AuthNav />
      {children}
      <AuthFooter />
    </div>
  );
}
