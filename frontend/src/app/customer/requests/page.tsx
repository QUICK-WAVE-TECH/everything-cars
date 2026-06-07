import { Breadcrumb } from "@/shared/components";
import { CustomerStats, RequestsTable } from "@/features/requests";

export default function MyRequestsPage() {
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/customer/dashboard" },
          { label: "My Request" },
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
              My Request
            </h1>
            <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, color: "var(--brc-text-muted)", margin: 0 }}>
              Here&apos;s what&apos;s happening with your requests
            </p>
          </div>

          <CustomerStats />
          <RequestsTable />
        </div>
      </div>
    </>
  );
}
