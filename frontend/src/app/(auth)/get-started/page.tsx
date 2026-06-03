"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();

  return (
    <Card
      className="w-80 cursor-pointer rounded-2xl border-[0.5px] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:-translate-y-1"
      style={{ borderColor: "var(--brc-border)" }}
      onClick={() => router.push(href)}
    >
      <CardContent className="flex flex-col gap-4 p-0">
        <div
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
        <div
          style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
          <div style={{ marginTop: "auto" }}>
            <AuthButton variant={variant} full>
              {cta}
            </AuthButton>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GetStartedPage() {
  const router = useRouter();

  return (
    <AuthShell>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 64,
          alignItems: "center",
          maxWidth: 1232,
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
              fontFamily: "var(--brc-font-ui)",
              fontSize: 16,
              color: "var(--brc-text)",
            }}
          >
            <span>Already have an account?</span>
            <button
              onClick={() => router.push("/sign-in")}
              style={{
                border: "none", background: "transparent", cursor: "pointer",
                fontFamily: "var(--brc-font-link)", fontSize: 16,
                color: "var(--brc-accent)", textDecoration: "underline", padding: 0,
              }}
            >
              Log In
            </button>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
