import { DashboardNavbar } from "@/shared/components";
import { AuthFooter } from "@/features/auth/components";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <DashboardNavbar role="customer" />
      <main style={{ flex: 1, background: "var(--brc-bg)" }}>{children}</main>
      <AuthFooter />
    </div>
  );
}
