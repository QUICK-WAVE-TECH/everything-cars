import {
  DashboardNavbar,
  AuthGuard,
  OwnerVerificationGate,
} from "@/shared/components";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole={["owner", "team_member"]}>
      <div className="flex min-h-screen flex-col">
        <DashboardNavbar role="owner" />
        <main className="min-w-0 flex-1">
          <OwnerVerificationGate>{children}</OwnerVerificationGate>
        </main>
      </div>
    </AuthGuard>
  );
}
