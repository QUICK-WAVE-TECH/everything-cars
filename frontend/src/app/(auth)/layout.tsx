import { AuthNav, AuthFooter } from "@/features/auth/components";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AuthNav />
      {children}
      <AuthFooter />
    </div>
  );
}
