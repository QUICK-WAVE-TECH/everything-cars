"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthField, AuthButton, Radio, Checkbox, UploadField, AuthShell } from "@/features/auth/components";
import { Card, CardContent } from "@/components/ui/card";

type OwnerType = "private" | "company" | null;

export default function OwnerSignUpPage() {
  const [step, setStep] = useState(1);
  const [ownerType, setOwnerType] = useState<OwnerType>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [agree, setAgree] = useState(false);

  const set = (key: string) => (value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const isCompany = ownerType === "company";

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
                  Owner Sign Up
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
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, color: "var(--brc-text)" }}>
                    Type of Ownership
                  </span>
                  <div style={{ display: "flex", gap: 24, padding: "8px 0", flexWrap: "wrap" }}>
                    <Radio
                      checked={ownerType === "private"}
                      label="Private Car"
                      name="owner-type"
                      value="private"
                      onChange={() => setOwnerType("private")}
                    />
                    <Radio
                      checked={ownerType === "company"}
                      label="Company"
                      name="owner-type"
                      value="company"
                      onChange={() => setOwnerType("company")}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {isCompany ? (
                  <>
                    <AuthField
                      label="Company Name"
                      placeholder="Enter company name"
                      value={fields.coName || ""}
                      onChange={set("coName")}
                    />
                    <AuthField
                      label="Company Registration Number (RC Number)"
                      placeholder="Enter your RC Number"
                      value={fields.rc || ""}
                      onChange={set("rc")}
                    />
                    <UploadField
                      label="Upload CAC Document"
                      hint="PDF, DOC, or DOCX (Max 9MB)"
                      value={fields.cac}
                      onPick={() => set("cac")("CAC-document.pdf")}
                    />
                    <AuthField
                      label="Company Bank Account Number"
                      placeholder="Enter company account number"
                      value={fields.acct || ""}
                      onChange={set("acct")}
                    />
                    <AuthField
                      label="Bank Name"
                      placeholder="Enter bank name"
                      value={fields.bank || ""}
                      onChange={set("bank")}
                    />
                  </>
                ) : (
                  <>
                    <AuthField
                      label="Location"
                      placeholder="Enter location"
                      value={fields.loc || ""}
                      onChange={set("loc")}
                    />
                    <AuthField
                      label="National ID"
                      placeholder="Enter your ID number"
                      value={fields.nid || ""}
                      onChange={set("nid")}
                    />
                    <UploadField
                      label="Upload Car Ownership Document"
                      hint="PDF, DOC, or DOCX (Max 9MB)"
                      value={fields.doc}
                      onPick={() => set("doc")("car-ownership.pdf")}
                    />
                    <AuthField
                      label="Bank Account Number"
                      placeholder="Enter bank account number"
                      value={fields.acct || ""}
                      onChange={set("acct")}
                    />
                    <AuthField
                      label="Bank Name"
                      placeholder="Enter bank name"
                      value={fields.bank || ""}
                      onChange={set("bank")}
                    />
                  </>
                )}
                <Checkbox checked={agree} onChange={() => setAgree(!agree)}>
                  I agree to the{" "}
                  <span style={{ color: "var(--brc-accent)", textDecoration: "underline" }}>
                    Terms of Service
                  </span>{" "}
                  and{" "}
                  <span style={{ color: "var(--brc-accent)", textDecoration: "underline" }}>
                    Privacy Policy
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
