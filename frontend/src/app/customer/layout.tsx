import { Header } from "@/shared/components";
import { Sidebar } from "@/shared/components";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header variant="customer" />
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar role="customer" />
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
