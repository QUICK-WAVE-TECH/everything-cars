"use client";

import Link from "next/link";
import { Icon } from "@/features/auth/components/icon";
import type { IconName } from "@/features/auth/components/icon";
import { useMe } from "@/features/auth/api";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

type Field = { label: string; value: string; icon: IconName };

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid var(--brc-border)",
  borderRadius: "var(--brc-radius-lg)",
  padding: "clamp(20px, 3vw, 32px)",
};

function ReadonlyField({ field }: { field: Field }) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--brc-font-ui)",
          fontSize: 14,
          color: "var(--brc-text-secondary)",
        }}
      >
        <Icon name={field.icon} size={16} stroke="var(--brc-text-secondary)" />
        {field.label}
      </span>
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          borderRadius: "var(--brc-radius-sm)",
          border: "1px solid var(--brc-border)",
          background: "var(--brc-bg-subtle)",
          padding: "0 16px",
          fontFamily: "var(--brc-font-ui)",
          fontSize: 14,
          color: "var(--brc-text)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {field.value}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { data: user, isLoading } = useMe();

  if (isLoading || !user) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          color: "var(--brc-text-muted)",
        }}
      >
        Loading...
      </div>
    );
  }
  const profile = user.customer_profile;
  const fields: Field[] = [
    { label: "First Name", value: user.first_name, icon: "user" },
    { label: "Last Name", value: user.last_name, icon: "user" },
    { label: "Email Address", value: user.email, icon: "mail" },
    { label: "Phone No", value: user.phone, icon: "phone" },
    {
      label: "Date of Birth",
      value: profile?.date_of_birth || "-",
      icon: "calendar",
    },
    {
      label: "Driver's License",
      value: profile?.drivers_license || "-",
      icon: "idcard",
    },
    { label: "Address", value: profile?.address || "—", icon: "pin" },
    { label: "State", value: profile?.state || "—", icon: "pin" },
    { label: "City", value: profile?.city || "—", icon: "pin" },
    { label: "Country", value: profile?.country || "—", icon: "pin" },
  ];

  return (
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
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h1
            style={{
              fontFamily: "var(--brc-font-display)",
              fontWeight: 800,
              fontSize: "clamp(28px, 6vw, 44px)",
              color: "var(--brc-text)",
              margin: 0,
            }}
          >
            My Profile
          </h1>
          <p
            style={{
              fontFamily: "var(--brc-font-ui)",
              fontSize: 16,
              color: "var(--brc-text-muted)",
              margin: 0,
            }}
          >
            Manage your account information
          </p>
        </div>

        {/* Account card */}
        <section
          style={{
            ...cardStyle,
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          {/* Identity */}
          <div
            style={{
              display: "flex",
              gap: 18,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                width: 88,
                height: 88,
                borderRadius: "50%",
                background: "var(--brc-primary-tint)",
                color: "var(--brc-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--brc-font-display)",
                fontWeight: 800,
                fontSize: 30,
                flexShrink: 0,
              }}
            >
              {initials(`${user.first_name} ${user.last_name}`)}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span
                style={{
                  fontFamily: "var(--brc-font-ui)",
                  fontWeight: 700,
                  fontSize: 22,
                  color: "var(--brc-text)",
                }}
              >
                {user.first_name} {user.last_name}
              </span>
              <span
                style={{
                  fontFamily: "var(--brc-font-ui)",
                  fontSize: 14,
                  color: "var(--brc-text-muted)",
                }}
              >
                {user.email}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  alignSelf: "flex-start",
                  background: "var(--brc-accent-bg)",
                  color: "var(--brc-accent)",
                  borderRadius: "var(--brc-radius-pill)",
                  padding: "4px 12px",
                  fontFamily: "var(--brc-font-ui)",
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--brc-accent)",
                  }}
                />
                Customer Account
              </span>
            </div>
          </div>

          <div style={{ height: 1, background: "var(--brc-border)" }} />

          {/* Fields */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
              gap: "20px 24px",
            }}
          >
            {fields.map((f) => (
              <ReadonlyField key={f.label} field={f} />
            ))}
          </div>
        </section>

        {/* Loyalty information */}
        <section
          style={{
            ...cardStyle,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--brc-font-ui)",
              fontWeight: 700,
              fontSize: 20,
              color: "var(--brc-text)",
              margin: 0,
            }}
          >
            Loyalty Information
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              borderRadius: "var(--brc-radius-md)",
              background:
                "linear-gradient(120deg, var(--brc-accent-bg), #fbe7d6)",
              padding: "20px 24px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{
                  fontFamily: "var(--brc-font-ui)",
                  fontSize: 14,
                  color: "var(--brc-text-secondary)",
                }}
              >
                Current Point
              </span>
              <span
                style={{
                  fontFamily: "var(--brc-font-display)",
                  fontWeight: 800,
                  fontSize: 32,
                  color: "var(--brc-accent-deep)",
                }}
              >
                {0}
              </span>
            </div>
            <Link
              href="/customer/loyalty"
              className="brc-button-motion"
              style={{
                background: "var(--brc-accent)",
                color: "#fff",
                borderRadius: "var(--brc-radius-sm)",
                padding: "0 22px",
                height: 46,
                display: "inline-flex",
                alignItems: "center",
                fontFamily: "var(--brc-font-ui)",
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              View Rewards
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
