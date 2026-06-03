import { WebsiteNavbar } from "@/shared/components";
import { AuthFooter } from "@/features/auth/components";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <WebsiteNavbar />
      <main style={{ flex: 1 }}>{children}</main>
      <AuthFooter />
    </div>
  );
}
