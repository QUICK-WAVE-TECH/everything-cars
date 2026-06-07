"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/features/auth/components/icon";
import { RentalDetailCard, type DetailField } from "@/shared/components";
import { naira, type CustomerRequest } from "../data";
import { StatusBadge } from "./status-badge";

export function RequestDetail({ request }: { request: CustomerRequest }) {
  const router = useRouter();
  const isApproved = request.status === "approved";

  const fields: DetailField[] = [
    { label: "Request Type", value: request.type },
    { label: "Duration", value: request.duration },
    { label: "Amount", value: naira(request.price) },
    { label: "Color", value: request.color },
    { label: "Requested On", value: request.requestedOn },
  ];

  const action = isApproved ? (
    <button
      onClick={() => router.push("/customer/payments")}
      className="brc-button-motion"
      style={{
        height: 52,
        width: "100%",
        borderRadius: "var(--brc-radius-sm)",
        border: "none",
        background: "var(--brc-secondary)",
        color: "#fff",
        fontFamily: "var(--brc-font-ui)",
        fontWeight: 700,
        fontSize: 15,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      Proceed to Payment
      <Icon name="arrow" size={18} stroke="#fff" />
    </button>
  ) : (
    <button
      onClick={() => router.push("/customer/requests")}
      style={{
        height: 52,
        width: "100%",
        borderRadius: "var(--brc-radius-sm)",
        border: "none",
        background: "var(--brc-border-strong)",
        color: "#fff",
        fontFamily: "var(--brc-font-ui)",
        fontWeight: 700,
        fontSize: 15,
        cursor: "pointer",
      }}
    >
      Cancel Request
    </button>
  );

  return (
    <RentalDetailCard
      title={request.car}
      subtitle={`Customer: ${request.customer}`}
      fields={fields}
      badge={<StatusBadge status={request.status} label={isApproved ? "Accepted" : "Awaiting Approval"} />}
      action={action}
      imageAlt={request.car}
    />
  );
}
