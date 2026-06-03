import { Pill } from "./pill";

type SectionHeadProps = {
  pill: string;
  title: string;
  sub?: string;
  center?: boolean;
};

export function SectionHead({ pill, title, sub, center }: SectionHeadProps) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 16,
      alignItems: center ? "center" : "flex-start",
      textAlign: center ? "center" : "left",
      maxWidth: center ? 700 : "none",
    }}>
      <Pill>{pill}</Pill>
      <h2 style={{
        fontFamily: "var(--brc-font-ui)", fontWeight: 700,
        fontSize: "clamp(30px,4vw,48px)", lineHeight: 1.25,
        color: "var(--brc-text)", margin: 0,
      }}>
        {title}
      </h2>
      {sub && (
        <p style={{
          fontFamily: "var(--brc-font-ui)", fontSize: 16, lineHeight: 1.5,
          color: "var(--brc-text-secondary)", margin: 0,
        }}>
          {sub}
        </p>
      )}
    </div>
  );
}
