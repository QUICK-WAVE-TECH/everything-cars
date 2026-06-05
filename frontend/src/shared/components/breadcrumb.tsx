import Link from "next/link";

export type Crumb = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: Crumb[];
};

/** Full-width white bar with a blue underline, used below the dashboard navbar. */
export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <div style={{ background: "#fff", borderBottom: "2px solid var(--brc-primary)" }}>
      <div
        style={{
          maxWidth: 1232,
          margin: "0 auto",
          width: "100%",
          padding: "12px clamp(20px, 8vw, 104px)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <span key={`${item.label}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              {item.href && !last ? (
                <Link
                  href={item.href}
                  style={{
                    fontFamily: "var(--brc-font-ui)",
                    fontSize: 14,
                    color: "var(--brc-text-muted)",
                    textDecoration: "none",
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  style={{
                    fontFamily: "var(--brc-font-ui)",
                    fontSize: 14,
                    fontWeight: last ? 700 : 400,
                    color: last ? "var(--brc-text)" : "var(--brc-text-muted)",
                  }}
                >
                  {item.label}
                </span>
              )}
              {!last && <span style={{ color: "var(--brc-border-strong)" }}>/</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}
