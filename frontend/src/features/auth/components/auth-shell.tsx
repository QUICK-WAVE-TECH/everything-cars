import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main
      style={{
        flex: 1,
        background: "var(--brc-bg-subtle)",
        display: "flex",
        justifyContent: "center",
        padding: "var(--brc-auth-shell-y, 80px) var(--brc-space-10, 104px) var(--brc-auth-shell-bottom, 96px)",
        width: "100%",
      }}
    >
      {children}
    </main>
  );
}
