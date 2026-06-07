import { notFound } from "next/navigation";
import { Breadcrumb } from "@/shared/components";
import { TransactionDetail, getTransaction } from "@/features/payments";

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const transaction = getTransaction(Number(id));

  if (!transaction) notFound();

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Transactions", href: "/customer/transactions" },
          { label: "Transaction Details" },
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
              An overview of all your previous transactions
            </p>
          </div>

          <TransactionDetail transaction={transaction} />
        </div>
      </div>
    </>
  );
}
