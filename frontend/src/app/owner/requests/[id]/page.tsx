"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Breadcrumb } from "@/shared/components";
import { OwnerStats } from "@/features/requests";
import { Icon } from "@/features/auth/components/icon";
import {
  RequestDetailCard,
  ActionButton,
  type RequestDetailStatus,
} from "@/features/requests/components/request-detail-card";
import {
  OWNER_REQUESTS,
  naira,
  type OwnerRequest,
} from "@/features/requests/data";

// ---------------------------------------------------------------------------
// Owner status → detail status
// ---------------------------------------------------------------------------

function toDetailStatus(s: OwnerRequest["status"]): RequestDetailStatus {
  if (s === "new") return "new";
  if (s === "awaiting-payment") return "awaiting-payment";
  if (s === "paid") return "paid";
  if (s === "rejected") return "rejected";
  return "new";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OwnerRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const found = OWNER_REQUESTS.find((r) => r.id === id);
  const request = found ?? OWNER_REQUESTS[0]!;

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
      ["Year", String(request.year)],
      ["Transmission", request.transmission],
      ["Fuel Type", request.fuelType],
      ["Seats", String(request.seats)],
      ["Request Date", request.requestDate],
    ],
  ];

  const actions = (() => {
    switch (status) {
      case "new":
        return (
          <>
            <ActionButton
              kind="dark"
              onClick={() => setStatus("awaiting-payment")}
            >
              <Icon name="check" size={17} stroke="#fff" />
              Accept Request
            </ActionButton>
            <ActionButton
              kind="accent"
              onClick={() => setStatus("rejected")}
            >
              Reject Request
            </ActionButton>
          </>
        );
      case "awaiting-payment":
        return (
          <ActionButton
            kind="dark"
            onClick={() => router.push("/owner/transactions")}
          >
            View Transactions
          </ActionButton>
        );
      case "paid":
        return (
          <ActionButton
            kind="success"
            onClick={() => router.push("/owner/transactions")}
          >
            View Transactions
          </ActionButton>
        );
      case "rejected":
        return (
          <ActionButton
            kind="secondary"
            onClick={() => router.push("/owner/requests")}
          >
            Back to Requests
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
          { label: "Incoming Requests", href: "/owner/requests" },
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
              Incoming Request
            </h1>
            <p
              style={{
                fontFamily: "var(--brc-font-ui)",
                fontSize: 16,
                color: "var(--brc-text-muted)",
                margin: 0,
              }}
            >
              Review and respond to customer rental requests
            </p>
          </div>

          {/* Stat cards */}
          <OwnerStats />

          {/* Request detail card */}
          <RequestDetailCard
            carName={request.car}
            partyLabel="Customer"
            partyName={request.customer}
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
                "new",
                "awaiting-payment",
                "paid",
                "rejected",
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
                  background:
                    status === s ? "var(--brc-primary-tint)" : "#fff",
                  color:
                    status === s
                      ? "var(--brc-primary)"
                      : "var(--brc-text-muted)",
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
