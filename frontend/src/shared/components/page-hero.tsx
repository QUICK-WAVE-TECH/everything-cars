import Image from "next/image";

type PageHeroProps = {
  img: string;
  title: string;
  sub: string;
};

export function PageHero({ img, title, sub }: PageHeroProps) {
  return (
    <section style={{
      position: "relative", minHeight: "clamp(360px, 62vw, 500px)", display: "flex", flexDirection: "column",
      justifyContent: "center", padding: "clamp(72px, 14vw, 120px) var(--brc-space-10, 104px)",
      backgroundColor: "rgba(0,0,0,0.4)",
      overflow: "hidden",
    }}>
      <Image
        src={img}
        alt=""
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover", zIndex: 0 }}
      />
      <div
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1 }}
      />
      <div style={{ maxWidth: 1232, margin: "0 auto", width: "100%", position: "relative", zIndex: 2 }}>
        <div style={{ maxWidth: 700, display: "flex", flexDirection: "column", gap: 16 }}>
          <h1 style={{
            fontFamily: "var(--brc-font-display)", fontWeight: 700,
            fontSize: "clamp(34px,10vw,64px)", lineHeight: 1.15,
            color: "#fff", margin: 0,
          }}>{title}</h1>
          <p style={{
            fontFamily: "var(--brc-font-ui)", fontSize: "clamp(16px,4.5vw,20px)", lineHeight: 1.5,
            color: "rgba(255,255,255,.92)", margin: 0,
          }}>{sub}</p>
        </div>
      </div>
    </section>
  );
}
