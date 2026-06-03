"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AuthField, AuthButton, AuthShell } from "@/features/auth/components";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AuthShell>
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 32,
        alignItems: "center",
        width: 632,
      }}>
        <Image
          src="/logo.png"
          alt="Buy & Rent Cars"
          width={170}
          height={52}
          style={{ height: 52, width: "auto" }}
        />
        <div style={{
          width: "100%",
          borderRadius: 16,
          background: "#fff",
          border: "0.5px solid var(--brc-border)",
          padding: 40,
          display: "flex",
          flexDirection: "column",
          gap: 32,
          boxShadow: "var(--brc-shadow-xs)",
        }}>
          <h1 style={{
            fontFamily: "var(--brc-font-ui)",
            fontWeight: 700,
            fontSize: 32,
            lineHeight: 1.2,
            color: "var(--brc-text)",
            margin: 0,
          }}>
            Welcome Back
          </h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <AuthField
              label="Email Address"
              placeholder="Email Address"
              value={email}
              onChange={setEmail}
            />
            <AuthField
              label="Password"
              placeholder="Password"
              type="password"
              value={password}
              onChange={setPassword}
            />
          </div>
          <AuthButton full>Continue</AuthButton>
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            fontFamily: "var(--brc-font-ui)",
            fontSize: 16,
            color: "var(--brc-text)",
          }}>
            <span>Don&apos;t have an account?</span>
            <Link
              href="/sign-up"
              style={{
                fontFamily: "var(--brc-font-link)",
                fontSize: 16,
                color: "var(--brc-accent)",
                textDecoration: "underline",
              }}
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
