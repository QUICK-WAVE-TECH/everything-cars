import { TransactionsTable } from "@/features/payments";
import { Parallax } from "@/shared/motion/parallax";
import { RevealOnce } from "@/shared/motion/reveal-once";

export default function AdminTransactionsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:gap-7 sm:px-6 sm:py-10 lg:px-[var(--brc-space-10,40px)] lg:py-12">
      <div>
        <Parallax distance={-8}>
          <span className="text-[13px] font-bold uppercase tracking-widest text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            Finance · Overview
          </span>
        </Parallax>
        <Parallax distance={-4}>
          <h1 className="mt-3 text-[clamp(28px,5vw,44px)] font-extrabold tracking-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
            All Transactions
          </h1>
        </Parallax>
        <Parallax distance={-9}>
          <p className="mt-2 text-base text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            View all platform transactions across customers and owners
          </p>
        </Parallax>
      </div>

      <RevealOnce>
        <TransactionsTable />
      </RevealOnce>
    </div>
  );
}
