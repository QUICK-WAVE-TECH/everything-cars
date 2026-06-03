"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthField, AuthButton, Checkbox, AuthShell } from "@/features/auth/components";
import { Card, CardContent } from "@/components/ui/card";

export default function SignUpPage() {
  const [step, setStep] = useState(1);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [agree, setAgree] = useState(false);

  const set = (key: string) => (value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  return (
    <AuthShell>
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 32,
        alignItems: "center",
        width: "min(100%, 632px)",
      }}>
        <Card className="w-full rounded-2xl border-[0.5px] p-6 shadow-xs sm:p-10"
          style={{ borderColor: "var(--brc-border)" }}>
          <CardContent className="flex flex-col gap-8 p-0">
            {/* Header + progress */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <h1 style={{
                  fontFamily: "var(--brc-font-ui)",
                  fontWeight: 700,
                  fontSize: 32,
                  lineHeight: 1.2,
                  color: "var(--brc-text)",
                  margin: 0,
                }}>
                  Customer Sign Up
                </h1>
                <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, color: "var(--brc-text-muted)" }}>
                  Step {step} of 2
                </span>
              </div>
              <div style={{
                height: 4,
                borderRadius: 2,
                background: "var(--brc-bg-muted)",
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: "100%",
                  background: "var(--brc-primary)",
                  borderRadius: 2,
                  transformOrigin: "left",
                  transform: `scaleX(${step === 1 ? 0.5 : 1})`,
                  transition: "transform 0.3s ease",
                }} />
              </div>
            </div>

            {/* Fields */}
            {step === 1 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <AuthField
                  label="Full Name"
                  placeholder="First Name"
                  value={fields.name || ""}
                  onChange={set("name")}
                />
                <AuthField
                  label="Email Address"
                  placeholder="Email Address"
                  value={fields.email || ""}
                  onChange={set("email")}
                />
                <AuthField
                  label="Phone Number"
                  placeholder="Enter your phone number"
                  value={fields.phone || ""}
                  onChange={set("phone")}
                />
                <AuthField
                  label="Password"
                  placeholder="Password"
                  type="password"
                  value={fields.pw || ""}
                  onChange={set("pw")}
                />
                <AuthField
                  label="Confirm Password"
                  placeholder="Password"
                  type="password"
                  value={fields.pw2 || ""}
                  onChange={set("pw2")}
                />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <AuthField
                  label="Driver's License"
                  placeholder="Enter license number"
                  value={fields.dl || ""}
                  onChange={set("dl")}
                />
                <AuthField
                  label="Date of Birth"
                  placeholder="dd/mm/yyyy"
                  value={fields.dob || ""}
                  onChange={set("dob")}
                />
                <AuthField
                  label="Address"
                  placeholder="Enter your address"
                  value={fields.addr || ""}
                  onChange={set("addr")}
                />
                <AuthField
                  label="State"
                  placeholder="Select state"
                  type="select"
                  value={fields.state || ""}
                />
                <AuthField
                  label="City"
                  placeholder="Select city"
                  type="select"
                  value={fields.city || ""}
                />
                <Checkbox checked={agree} onChange={() => setAgree(!agree)}>
                  I agree to the{" "}
                  <span style={{ color: "var(--brc-accent)", textDecoration: "underline" }}>
                    Terms &amp; Conditions
                  </span>
                </Checkbox>
              </div>
            )}

            {/* Actions */}
            {step === 1 ? (
              <AuthButton full iconEnd="arrow" onClick={() => setStep(2)}>
                Continue
              </AuthButton>
            ) : (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <AuthButton variant="neutral" onClick={() => setStep(1)} style={{ width: "min(100%, 120px)" }}>
                  Back
                </AuthButton>
                <AuthButton full href="/verify">Create Account</AuthButton>
              </div>
            )}

            <div style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              flexWrap: "wrap",
              fontFamily: "var(--brc-font-ui)",
              fontSize: 16,
              color: "var(--brc-text)",
            }}>
              <span>Already have an account?</span>
              <Link
                href="/sign-in"
                style={{
                  border: "none", background: "transparent", cursor: "pointer",
                  fontFamily: "var(--brc-font-link)", fontSize: 16,
                  color: "var(--brc-accent)", textDecoration: "underline", padding: 0,
                }}
              >
                Log In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
