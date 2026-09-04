import { WebsiteNavbar } from "@/shared/components";
import { GrainOverlay } from "@/shared/components/grain-overlay";
import { AuthFooter } from "@/features/auth/components";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Grain lives on the marketing surface only — the admin consoles stay
          perfectly crisp for reading dense data. */}
      <GrainOverlay />
      <WebsiteNavbar />
      <main style={{ flex: 1 }}>{children}</main>
      <AuthFooter />
    </div>
  );
}
