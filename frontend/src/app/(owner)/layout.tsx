import { Header } from "@/shared/components";
import { Sidebar } from "@/shared/components";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header variant="owner" />
      <div className="flex flex-1">
        <Sidebar role="owner" />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
