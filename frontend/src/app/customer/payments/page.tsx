import { Breadcrumb } from "@/shared/components";
import { PaymentForm } from "@/features/payments";

export default function PaymentsPage() {
  return (
    <>
      <Breadcrumb
        items={[
          { label: "My Request", href: "/customer/requests" },
          { label: "Payment" },
        ]}
      />
      <div style={{ background: "var(--brc-bg-subtle)" }}>
        <div
          style={{
            maxWidth: 1232,
            margin: "0 auto",
            width: "100%",
            padding: "clamp(24px, 5vw, 40px) clamp(20px, 8vw, 104px) 64px",
          }}
        >
          <PaymentForm />
        </div>
      </div>
    </>
  );
}
