import Image from "next/image";
import { Pill } from "./pill";

type TextImageRowProps = {
  pill: string;
  title: string;
  body: string[];
  img: string;
  reverse?: boolean;
  bg?: string;
};

export function TextImageRow({ pill, title, body, img, reverse, bg }: TextImageRowProps) {
  const text = (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, justifyContent: "center" }}>
      <div style={{ alignSelf: "flex-start" }}><Pill>{pill}</Pill></div>
      <h2 style={{
        fontFamily: "var(--brc-font-ui)", fontWeight: 700,
        fontSize: "clamp(30px,3.4vw,48px)", lineHeight: 1.25,
        color: "var(--brc-text)", margin: 0,
      }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {body.map((p, i) => (
          <p key={i} style={{
            fontFamily: "var(--brc-font-ui)", fontSize: 16, lineHeight: 1.5,
            color: "var(--brc-text-secondary)", margin: 0,
          }}>{p}</p>
        ))}
      </div>
    </div>
  );

  const image = (
    <div style={{
      minHeight: "clamp(260px, 64vw, 396px)", borderRadius: 16,
      overflow: "hidden", position: "relative",
    }}>
      <Image
        src={img}
        alt={title}
        fill
        sizes="(max-width: 900px) 100vw, 50vw"
        style={{ objectFit: "cover" }}
      />
    </div>
  );

  return (
    <section style={{ background: bg || "#fff", padding: "var(--brc-section-y, 104px) var(--brc-space-10, 104px)" }}>
      <div style={{
        maxWidth: 1232, margin: "0 auto", display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
        gap: "clamp(32px, 6vw, 64px)", alignItems: "center",
      }}>
        {reverse ? <>{image}{text}</> : <>{text}{image}</>}
      </div>
    </section>
  );
}
