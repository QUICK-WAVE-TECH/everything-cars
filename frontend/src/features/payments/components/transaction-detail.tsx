import { RentalDetailCard, type DetailField } from "@/shared/components";
import { naira, type Transaction } from "../data";

function carNameFrom(description: string): string {
  const parts = description.split("-");
  return parts.length > 1 ? parts[1]!.trim() : description;
}

function CompletedBadge({ success }: { success: boolean }) {
  const fg = success ? "var(--brc-success)" : "var(--brc-danger)";
  return (
    <span
      style={{
        fontFamily: "var(--brc-font-ui)",
        fontWeight: 600,
        fontSize: 12,
        padding: "4px 12px",
        borderRadius: "var(--brc-radius-pill)",
        background: success ? "var(--brc-success-bg)" : "var(--brc-danger-bg)",
        color: fg,
        whiteSpace: "nowrap",
      }}
    >
      {success ? "Completed" : "Failed"}
    </span>
  );
}

export function TransactionDetail({ transaction }: { transaction: Transaction }) {
  const car = carNameFrom(transaction.description);

  const fields: DetailField[] = [
    { label: "Request Type", value: transaction.type === "Purchase" ? "Buy" : "Rent" },
    { label: "Duration", value: "5 days" },
    { label: "Amount", value: naira(transaction.amount) },
    { label: "Color", value: "White" },
    { label: "Requested On", value: transaction.paymentDate },
  ];

  return (
    <RentalDetailCard
      title={car}
      subtitle="Customer: Daniel Emmanuel"
      fields={fields}
      badge={<CompletedBadge success={transaction.status === "Success"} />}
      imageAlt={car}
    />
  );
}
