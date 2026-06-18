import { TransactionsTable } from "@/features/payments";

export default function AdminTransactionsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-7 px-4 py-10 sm:px-6 lg:px-[var(--brc-space-10,40px)] lg:py-12">
      <div>
        <span className="text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          Finance · Overview
        </span>
        <h1 className="mt-3 text-[clamp(28px,5vw,44px)] font-extrabold tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
          All Transactions
        </h1>
        <p className="mt-2 text-base text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          View all platform transactions across customers and owners
        </p>
      </div>

      <TransactionsTable />
    </div>
  );
}
