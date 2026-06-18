import { Breadcrumb } from "@/shared/components";
import { TransactionsTable } from "@/features/payments";

export default function OwnerTransactionsPage() {
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/owner/dashboard" },
          { label: "Transactions" },
        ]}
      />
      <div style={{ background: "var(--brc-bg-subtle)" }}>
        <div
          style={{
            maxWidth: 1232,
            margin: "0 auto",
            width: "100%",
            padding: "clamp(24px, 5vw, 40px) clamp(20px, 8vw, 104px) 64px",
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h1 style={{ fontFamily: "var(--brc-font-display)", fontWeight: 800, fontSize: "clamp(28px, 6vw, 44px)", color: "var(--brc-text)", margin: 0 }}>
              Transaction History
            </h1>
            <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, color: "var(--brc-text-muted)", margin: 0 }}>
              View your earnings and transaction history
            </p>
          </div>

          <TransactionsTable />
        </div>
      </div>
    </>
  );
}
