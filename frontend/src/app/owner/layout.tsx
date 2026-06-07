import { Header, Sidebar, AuthGuard } from "@/shared/components";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole="owner">
      <div className="flex min-h-screen flex-col">
        <Header variant="owner" />
        <div className="flex flex-1 flex-col md:flex-row">
          <Sidebar role="owner" />
          <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
