import Image from "next/image";

export type DetailField = { label: string; value: string };

type RentalDetailCardProps = {
  title: string;
  subtitle: string;
  fields: DetailField[];
  badge: React.ReactNode;
  action?: React.ReactNode;
  imageSrc?: string;
  imageAlt?: string;
};

/** Presentational rental/transaction detail card (image + meta + fields + optional action). */
export function RentalDetailCard({
  title,
  subtitle,
  fields,
  badge,
  action,
  imageSrc = "/car-lexus.png",
  imageAlt = title,
}: RentalDetailCardProps) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid var(--brc-border)",
        borderRadius: "var(--brc-radius-lg)",
        padding: "clamp(18px, 3vw, 28px)",
      }}
    >
      <div style={{ display: "flex", gap: "clamp(18px, 3vw, 32px)", flexWrap: "wrap", alignItems: "stretch" }}>
        {/* Car image */}
        <div
          style={{
            width: "clamp(220px, 30vw, 260px)",
            minHeight: 220,
            flexShrink: 0,
            borderRadius: "var(--brc-radius-md)",
            background: "var(--brc-bg-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <Image src={imageSrc} alt={imageAlt} width={240} height={160} style={{ width: "88%", height: "auto", objectFit: "contain" }} />
        </div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <h2 style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 24, color: "var(--brc-text)", margin: 0 }}>{title}</h2>
              <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 14, color: "var(--brc-text-secondary)" }}>{subtitle}</span>
            </div>
            {badge}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: "16px 24px",
            }}
          >
            {fields.map((f) => (
              <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-muted)" }}>{f.label}</span>
                <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 15, fontWeight: 600, color: "var(--brc-text)" }}>{f.value}</span>
              </div>
            ))}
          </div>

          {action && <div style={{ marginTop: "auto" }}>{action}</div>}
        </div>
      </div>
    </section>
  );
}
