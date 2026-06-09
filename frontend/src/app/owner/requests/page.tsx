import { Breadcrumb } from "@/shared/components";
import { OwnerStats } from "@/features/requests";

export default function OwnerRequestsPage() {
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/owner/dashboard" },
          { label: "Incoming Requests" },
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
              Incoming Requests
            </h1>
            <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, color: "var(--brc-text-muted)", margin: 0 }}>
              Review and manage rental requests for your cars
            </p>
          </div>

          <OwnerStats />

          {/* Request table placeholder — wire with real data later */}
          <div style={{ background: "#fff", border: "1px solid var(--brc-border)", borderRadius: "var(--brc-radius-lg)", padding: 24, fontFamily: "var(--brc-font-ui)", color: "var(--brc-text-muted)", textAlign: "center" }}>
            No incoming requests yet.
          </div>
        </div>
      </div>
    </>
  );
}
