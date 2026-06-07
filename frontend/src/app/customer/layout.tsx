import { DashboardNavbar, AuthGuard } from "@/shared/components";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole="customer">
      <div className="flex min-h-screen flex-col">
        <DashboardNavbar role="customer" />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </AuthGuard>
  );
}
