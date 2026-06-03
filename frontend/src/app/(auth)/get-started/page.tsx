"use client";

import Link from "next/link";
import { Icon, AuthButton, AuthShell } from "@/features/auth/components";
import type { IconName } from "@/features/auth/components";
import { Card, CardContent } from "@/components/ui/card";

function RoleCard({
  iconName,
  iconBg,
  iconFg,
  title,
  body,
  cta,
  variant,
  href,
}: {
  iconName: IconName;
  iconBg: string;
  iconFg: string;
  title: string;
  body: string;
  cta: string;
  variant: "primary" | "neutral";
  href: string;
}) {
  return (
    <Card
      className="group w-full max-w-80 rounded-2xl border-[0.5px] p-5 transition-all duration-300 ease-out hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-(--brc-border-strong)"
      style={{ borderColor: "var(--brc-border)", boxShadow: "var(--brc-shadow-xs)" }}
    >
      <CardContent className="flex flex-col gap-4 p-0">
        <div
          className="transition-transform duration-300 ease-out group-hover:scale-110"
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            background: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={iconName} size={20} stroke={iconFg} />
        </div>
        <div className="flex flex-1 flex-col gap-6">
          <div className="flex flex-col gap-2.5">
            <span
              style={{
                fontFamily: "var(--brc-font-ui)",
                fontWeight: 700,
                fontSize: 18,
                color: "var(--brc-text)",
              }}
            >
              {title}
            </span>
            <span
              style={{
                fontFamily: "var(--brc-font-ui)",
                fontSize: 16,
                lineHeight: 1.5,
                color: "var(--brc-text-muted)",
              }}
            >
              {body}
            </span>
          </div>
          <div className="mt-auto">
            <AuthButton variant={variant} full href={href}>
              {cta}
            </AuthButton>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GetStartedPage() {
  return (
    <AuthShell>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(36px, 8vw, 64px)",
          alignItems: "center",
          maxWidth: 1232,
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            alignItems: "center",
            maxWidth: 572,
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--brc-font-ui)",
              fontWeight: 700,
              fontSize: 32,
              lineHeight: 1.2,
              color: "var(--brc-text)",
              margin: 0,
            }}
          >
            Choose How You Want to Get Started
          </h1>
          <p
            style={{
              fontFamily: "var(--brc-font-ui)",
              fontSize: 16,
              lineHeight: 1.5,
              color: "var(--brc-text-muted)",
              margin: 0,
            }}
          >
            Select your role to personalize your experience on Buy &amp; Rent
            Cars.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 32,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 24,
              justifyContent: "center",
              alignItems: "stretch",
              flexWrap: "wrap",
              width: "100%",
            }}
          >
            <RoleCard
              iconName="user"
              iconBg="var(--brc-primary-tint)"
              iconFg="var(--brc-primary-hover)"
              title="I'm a Customer"
              body="Looking to rent or buy a car? Sign up as a customer to browse our extensive collection of premium vehicles."
              cta="Continue as Customer"
              variant="primary"
              href="/sign-up"
            />
            <RoleCard
              iconName="car"
              iconBg="var(--brc-accent-bg)"
              iconFg="var(--brc-accent-brown)"
              title="I'm an Owner"
              body="Have cars to rent or sell? Join as an owner to list your vehicles either for rent or sale and reach thousands of customers."
              cta="Continue as Owner"
              variant="neutral"
              href="/owner-sign-up"
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              flexWrap: "wrap",
              fontFamily: "var(--brc-font-ui)",
              fontSize: 16,
              color: "var(--brc-text)",
            }}
          >
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
        </div>
      </div>
    </AuthShell>
  );
}
