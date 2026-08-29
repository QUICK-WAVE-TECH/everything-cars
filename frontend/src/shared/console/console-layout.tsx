import { cn } from "@/lib/utils";

/** The shared admin-console frame: a sticky left section-rail, a fluid main
 * column, and an optional right detail panel (used by the table pages). Every
 * console page (Reports, Payments, Transactions, Centers…) is built inside this
 * so they stay visually identical. */
export function ConsoleLayout({
  rail,
  children,
  panel,
}: {
  rail: React.ReactNode;
  children: React.ReactNode;
  panel?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <div
        className={cn(
          "grid grid-cols-1 gap-6",
          panel
            ? "lg:grid-cols-[208px_minmax(0,1fr)] xl:grid-cols-[208px_minmax(0,1fr)_360px]"
            : "lg:grid-cols-[208px_minmax(0,1fr)]",
        )}
      >
        {rail}
        <main className="flex min-w-0 flex-col gap-5">{children}</main>
        {panel}
      </div>
    </div>
  );
}
