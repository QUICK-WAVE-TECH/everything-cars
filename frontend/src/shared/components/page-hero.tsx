type PageHeroProps = {
  img: string;
  title: string;
  sub: string;
};

export function PageHero({ img, title, sub }: PageHeroProps) {
  return (
    <section style={{
      position: "relative", minHeight: 500, display: "flex", flexDirection: "column",
      justifyContent: "center", padding: "120px var(--brc-space-10, 104px)",
      background: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${img}) center/cover no-repeat`,
      backgroundColor: "rgba(0,0,0,0.4)",
    }}>
      <div style={{ maxWidth: 1232, margin: "0 auto", width: "100%" }}>
        <div style={{ maxWidth: 700, display: "flex", flexDirection: "column", gap: 16 }}>
          <h1 style={{
            fontFamily: "var(--brc-font-display)", fontWeight: 700,
            fontSize: "clamp(40px,5vw,64px)", lineHeight: 1.2,
            color: "#fff", margin: 0,
          }}>{title}</h1>
          <p style={{
            fontFamily: "var(--brc-font-ui)", fontSize: 20, lineHeight: 1.5,
            color: "rgba(255,255,255,.92)", margin: 0,
          }}>{sub}</p>
        </div>
      </div>
    </section>
  );
}
