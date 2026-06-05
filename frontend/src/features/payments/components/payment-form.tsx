"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Star } from "@/shared/components";
import { Icon } from "@/features/auth/components/icon";
import { RENTAL_SUMMARY, naira } from "../data";

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid var(--brc-border)",
  borderRadius: "var(--brc-radius-lg)",
  padding: "clamp(18px, 3vw, 28px)",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--brc-font-ui)",
  fontSize: 14,
  color: "var(--brc-text-secondary)",
};

const selectStyle: React.CSSProperties = {
  height: 44,
  borderRadius: "var(--brc-radius-sm)",
  border: "1px solid var(--brc-border)",
  background: "#fff",
  padding: "0 12px",
  fontFamily: "var(--brc-font-ui)",
  fontSize: 14,
  color: "var(--brc-text-muted)",
  outline: "none",
  width: "100%",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2397989A' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
};

const STATES = ["Lagos", "Abuja (FCT)", "Rivers", "Oyo", "Kano"];
const CITIES = ["Ikeja", "Lekki", "Victoria Island", "Surulere"];
const TIMES = ["08:00 AM", "10:00 AM", "12:00 PM", "02:00 PM", "04:00 PM"];

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function StepHeader({ title, sub, step }: { title: string; sub: string; step: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h2 style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 18, color: "var(--brc-text)", margin: 0 }}>{title}</h2>
        <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-muted)", margin: 0 }}>{sub}</p>
      </div>
      <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-muted)", whiteSpace: "nowrap" }}>Step {step} of 4</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  );
}

const rowGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
  gap: 16,
};

function Select({ placeholder, options }: { placeholder: string; options: string[] }) {
  return (
    <select defaultValue="" style={selectStyle}>
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function DateField({ placeholder }: { placeholder: string }) {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <Input placeholder={placeholder} className="h-11 text-sm pr-10" style={{ fontFamily: "var(--brc-font-ui)" }} />
      <span style={{ position: "absolute", right: 12, pointerEvents: "none", display: "flex" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brc-text-muted)" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </span>
    </div>
  );
}

function SectionToggle({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: "5px solid var(--brc-primary)",
          background: "#fff",
          flexShrink: 0,
        }}
      />
      <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 15, color: "var(--brc-text)" }}>{label}</span>
    </div>
  );
}

// Card brand marks
const VisaMark = (
  <span style={{ fontFamily: "var(--brc-font-display)", fontWeight: 800, fontStyle: "italic", fontSize: 14, color: "#1a1f71" }}>VISA</span>
);
const MastercardMark = (
  <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
    <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#EB001B" }} />
    <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#F79E1B", marginLeft: -6, opacity: 0.9 }} />
  </span>
);

type Method = "card" | "paystack" | "opay";

function MethodRow({
  selected,
  onSelect,
  label,
  right,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  right: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: "var(--brc-radius-md)",
        background: selected ? "var(--brc-primary-tint)" : "var(--brc-bg-muted)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={onSelect}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "14px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              border: selected ? "5px solid var(--brc-primary)" : "2px solid var(--brc-border-strong)",
              background: "#fff",
              flexShrink: 0,
            }}
          />
          <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 600, fontSize: 14, color: "var(--brc-text)" }}>{label}</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>{right}</span>
      </button>
      {selected && children && <div style={{ padding: "0 16px 16px" }}>{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function PaymentForm() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("card");

  const total = RENTAL_SUMMARY.subtotal;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 360px)",
        gap: "clamp(20px, 3vw, 32px)",
        alignItems: "start",
      }}
      className="payment-grid"
    >
      {/* Left column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
        {/* Billing Info */}
        <section style={cardStyle}>
          <StepHeader title="Billing Info" sub="Please enter your billing info" step={1} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={rowGrid}>
              <Field label="Full Name">
                <Input placeholder="Enter Full Name" className="h-11 text-sm" style={{ fontFamily: "var(--brc-font-ui)" }} />
              </Field>
              <Field label="Phone Number">
                <Input placeholder="Enter Number" className="h-11 text-sm" style={{ fontFamily: "var(--brc-font-ui)" }} />
              </Field>
            </div>
            <Field label="House  Address">
              <Input placeholder="Enter Address" className="h-11 text-sm" style={{ fontFamily: "var(--brc-font-ui)" }} />
            </Field>
          </div>
        </section>

        {/* Rental Info */}
        <section style={cardStyle}>
          <StepHeader title="Rental Info" sub="Please select your rental date" step={2} />
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Pick up */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SectionToggle label="Pick - Up" />
              <div style={rowGrid}>
                <Field label="State">
                  <Select placeholder="Select State" options={STATES} />
                </Field>
                <Field label="City">
                  <Select placeholder="Select City" options={CITIES} />
                </Field>
              </div>
              <div style={rowGrid}>
                <Field label="Select Date">
                  <DateField placeholder="Enter Model" />
                </Field>
                <Field label="Select Time">
                  <Select placeholder="Select Time" options={TIMES} />
                </Field>
              </div>
            </div>

            {/* Drop off */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SectionToggle label="Drop - Off" />
              <div style={rowGrid}>
                <Field label="State">
                  <Select placeholder="Select State" options={STATES} />
                </Field>
                <Field label="City">
                  <Select placeholder="Select City" options={CITIES} />
                </Field>
              </div>
              <div style={rowGrid}>
                <Field label="Select Date">
                  <DateField placeholder="Enter Model" />
                </Field>
                <Field label="Select Time">
                  <Select placeholder="Select Time" options={TIMES} />
                </Field>
              </div>
            </div>
          </div>
        </section>

        {/* Payment Method */}
        <section style={cardStyle}>
          <StepHeader title="Payment Method" sub="Please enter your payment method" step={3} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <MethodRow
              selected={method === "card"}
              onSelect={() => setMethod("card")}
              label="Pay with Card"
              right={
                <>
                  {VisaMark}
                  {MastercardMark}
                  <Icon name="chevdown" size={16} stroke="var(--brc-text-muted)" />
                </>
              }
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={rowGrid}>
                  <Field label="Card Number">
                    <Input placeholder="Enter Card Number" className="h-11 text-sm bg-white" style={{ fontFamily: "var(--brc-font-ui)" }} />
                  </Field>
                  <Field label="Expiration Date">
                    <Input placeholder="DD/MM/YY" className="h-11 text-sm bg-white" style={{ fontFamily: "var(--brc-font-ui)" }} />
                  </Field>
                </div>
                <div style={rowGrid}>
                  <Field label="Card Holder">
                    <Input placeholder="Enter Name on Card" className="h-11 text-sm bg-white" style={{ fontFamily: "var(--brc-font-ui)" }} />
                  </Field>
                  <Field label="CVC">
                    <Input placeholder="Enter CVC" className="h-11 text-sm bg-white" style={{ fontFamily: "var(--brc-font-ui)" }} />
                  </Field>
                </div>
              </div>
            </MethodRow>

            <MethodRow
              selected={method === "paystack"}
              onSelect={() => setMethod("paystack")}
              label="Paystack"
              right={<span style={{ fontFamily: "var(--brc-font-display)", fontWeight: 800, fontSize: 14, color: "#00C3F7" }}>Paystack</span>}
            />

            <MethodRow
              selected={method === "opay"}
              onSelect={() => setMethod("opay")}
              label="Opay"
              right={<span style={{ fontFamily: "var(--brc-font-display)", fontWeight: 800, fontSize: 14, color: "#1DC962" }}>Pay</span>}
            />
          </div>
        </section>
      </div>

      {/* Right column — Rental Summary */}
      <aside style={{ position: "sticky", top: 104, ...cardStyle }} className="payment-summary">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h2 style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 18, color: "var(--brc-text)", margin: 0 }}>Rental Summary</h2>
            <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-muted)", margin: 0, lineHeight: 1.5 }}>
              Prices may change depending on the length of the rental and the price of your rental car.
            </p>
          </div>

          {/* Car */}
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div
              style={{
                width: 84,
                height: 64,
                borderRadius: "var(--brc-radius-sm)",
                background: "var(--brc-bg-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <Image src="/car-lexus.png" alt={RENTAL_SUMMARY.car} width={80} height={52} style={{ width: "88%", height: "auto", objectFit: "contain" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 18, color: "var(--brc-text)" }}>{RENTAL_SUMMARY.car}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ display: "flex", gap: 1 }}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} filled={i < RENTAL_SUMMARY.rating} />
                  ))}
                </span>
                <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 12, color: "var(--brc-text-muted)" }}>{RENTAL_SUMMARY.reviewers} Reviewer</span>
              </div>
            </div>
          </div>

          {/* Lines */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SummaryLine label="Subtotal" value={naira(RENTAL_SUMMARY.subtotal)} />
            <SummaryLine label="Tax" value={naira(RENTAL_SUMMARY.tax)} />
          </div>

          {/* Promo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              border: "1px solid var(--brc-border)",
              borderRadius: "var(--brc-radius-sm)",
              padding: "4px 6px 4px 14px",
            }}
          >
            <input
              placeholder="Promo Code"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "var(--brc-font-ui)", fontSize: 14, color: "var(--brc-text)", minWidth: 0 }}
            />
            <button
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 14, color: "var(--brc-primary)", whiteSpace: "nowrap", padding: "8px 10px" }}
            >
              Apply now
            </button>
          </div>

          {/* Total */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 16, color: "var(--brc-text)" }}>Total Rental Price</span>
            <span style={{ fontFamily: "var(--brc-font-display)", fontWeight: 800, fontSize: 24, color: "var(--brc-text)" }}>{naira(total)}</span>
          </div>

          {/* Confirm */}
          <button
            onClick={() => router.push("/customer/transactions")}
            className="brc-button-motion"
            style={{
              height: 52,
              width: "100%",
              borderRadius: "var(--brc-radius-sm)",
              border: "none",
              background: "var(--brc-primary)",
              color: "#fff",
              fontFamily: "var(--brc-font-ui)",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Confirm Rental
          </button>

          <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-muted)", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
            By proceeding, you are automatically accepting the{" "}
            <span style={{ color: "var(--brc-primary)", fontWeight: 600 }}>Terms &amp; Conditions</span>
          </p>
        </div>
      </aside>

      <style>{`
        @media (max-width: 880px) {
          .payment-grid { grid-template-columns: 1fr !important; }
          .payment-summary { position: static !important; }
        }
      `}</style>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
      <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 14, color: "var(--brc-text-secondary)" }}>{label}</span>
      <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 14, color: "var(--brc-text)" }}>{value}</span>
    </div>
  );
}
