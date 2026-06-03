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
        padding: "80px var(--brc-space-10, 104px) 96px",
      }}
    >
      {children}
    </main>
  );
}
