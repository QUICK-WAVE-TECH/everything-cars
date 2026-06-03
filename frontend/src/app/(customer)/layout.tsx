import { Header } from "@/shared/components";
import { Sidebar } from "@/shared/components";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header variant="customer" />
      <div className="flex flex-1">
        <Sidebar role="customer" />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
