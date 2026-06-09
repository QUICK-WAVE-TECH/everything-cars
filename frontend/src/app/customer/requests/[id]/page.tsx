"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Breadcrumb, StatCard } from "@/shared/components";
import { Icon } from "@/features/auth/components/icon";
import {
  RequestDetailCard,
  ActionButton,
  type RequestDetailStatus,
} from "@/features/requests/components/request-detail-card";
import { CUSTOMER_STATS, CUSTOMER_REQUESTS, naira } from "@/features/requests/data";

// ---------------------------------------------------------------------------
// Customer status → page-level status
// ---------------------------------------------------------------------------

function toDetailStatus(s: string): RequestDetailStatus {
  if (s === "approved") return "accepted";
  if (s === "pending") return "awaiting-approval";
  if (s === "rejected") return "cancelled";
  return "awaiting-approval";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CustomerRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const found = CUSTOMER_REQUESTS.find((r) => r.id === id);
  const request = found ?? CUSTOMER_REQUESTS[0]!;

  const [status, setStatus] = useState<RequestDetailStatus>(
    toDetailStatus(request.status)
  );

  const specRows: [string, string][][] = [
    [
      ["Request Type", request.type],
      ["Duration", request.duration],
      ["Amount", naira(request.price)],
      ["Color", request.color],
      ["Requested On", request.requestedOn],
    ],
    [
      ["Year", "2024"],
      ["Transmission", "Automatic"],
      ["Fuel Type", "Petrol"],
      ["Seats", "4"],
      ["Request Date", request.requestDate],
    ],
  ];

  const actions = (() => {
    switch (status) {
      case "awaiting-approval":
        return (
          <ActionButton
            kind="secondary"
            onClick={() => setStatus("cancelled")}
          >
            Cancel Request
          </ActionButton>
        );
      case "accepted":
        return (
          <ActionButton
            kind="dark"
            onClick={() => router.push("/customer/payments")}
          >
            Proceed to Payment
            <Icon name="arrow" size={17} stroke="#fff" />
          </ActionButton>
        );
      case "paid":
        return (
          <ActionButton
            kind="dark"
            onClick={() => router.push("/customer/transactions")}
          >
            View Transactions
          </ActionButton>
        );
      case "cancelled":
        return (
          <ActionButton
            kind="secondary"
            onClick={() => router.push("/customer/listings")}
          >
            Browse Cars
          </ActionButton>
        );
      default:
        return null;
    }
  })();

  return (
    <>
      <Breadcrumb
        items={[
          { label: "My Requests", href: "/customer/requests" },
          { label: "View Request" },
        ]}
      />

      <div style={{ background: "var(--brc-bg-subtle)", minHeight: "100vh" }}>
        <div
          style={{
            maxWidth: 1232,
            margin: "0 auto",
            width: "100%",
            padding:
              "clamp(24px, 5vw, 40px) clamp(20px, 8vw, 104px) 64px",
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          {/* Page heading */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h1
              style={{
                fontFamily: "var(--brc-font-display)",
                fontWeight: 800,
                fontSize: "clamp(28px, 6vw, 40px)",
                color: "var(--brc-text)",
                margin: 0,
              }}
            >
              My Request
            </h1>
            <p
              style={{
                fontFamily: "var(--brc-font-ui)",
                fontSize: 16,
                color: "var(--brc-text-muted)",
                margin: 0,
              }}
            >
              Here&apos;s what&apos;s happening with your requests
            </p>
          </div>

          {/* Stat cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
              gap: "clamp(14px, 2vw, 20px)",
            }}
          >
            {CUSTOMER_STATS.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          {/* Request detail card */}
          <RequestDetailCard
            carName={request.car}
            partyLabel="Owner"
            partyName={request.owner}
            status={status}
            specRows={specRows}
            actions={actions}
          />

          {/* Dev status switcher (demo) */}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              padding: "16px 20px",
              background: "#fff",
              border: "1px dashed var(--brc-border-strong)",
              borderRadius: "var(--brc-radius-md)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--brc-font-ui)",
                fontSize: 12,
                color: "var(--brc-text-muted)",
                alignSelf: "center",
                marginRight: 8,
              }}
            >
              Demo — switch status:
            </span>
            {(
              [
                "awaiting-approval",
                "accepted",
                "paid",
                "cancelled",
              ] as RequestDetailStatus[]
            ).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                style={{
                  padding: "4px 14px",
                  borderRadius: "var(--brc-radius-pill)",
                  border:
                    status === s
                      ? "1.5px solid var(--brc-primary)"
                      : "1.5px solid var(--brc-border)",
                  background: status === s ? "var(--brc-primary-tint)" : "#fff",
                  color:
                    status === s ? "var(--brc-primary)" : "var(--brc-text-muted)",
                  fontFamily: "var(--brc-font-ui)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
