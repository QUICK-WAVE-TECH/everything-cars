"use client";

import Link from "next/link";
import { Icon } from "@/features/auth/components/icon";
import { useAuthStore } from "@/features/auth/store";

/** Links to the loyalty page when signed in, otherwise to sign-in. */
export function JoinProgramButton() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const href = isAuthenticated ? "/customer/loyalty" : "/sign-in";

  return (
    <Link
      href={href}
      className="brc-button-motion"
      style={{
        background: "#fff",
        color: "var(--brc-accent-deep)",
        border: "none",
        borderRadius: 8,
        height: 60,
        fontFamily: "var(--brc-font-ui)",
        fontWeight: 700,
        fontSize: 15,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        width: "100%",
        textDecoration: "none",
      }}
    >
      Join the Program <Icon name="arrow" size={18} />
    </Link>
  );
}
