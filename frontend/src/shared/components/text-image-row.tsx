import { Pill } from "./pill";
import { ParallaxImage } from "@/shared/motion/parallax-image";
import { RevealOnce } from "@/shared/motion/reveal-once";

type TextImageRowProps = {
  pill: string;
  title: string;
  body: string[];
  img: string;
  reverse?: boolean;
  bg?: string;
};

/** Editorial text/image row. Deliberately asymmetric (the columns are not equal
 * and the image sits off the text's baseline) so it doesn't read as a generic
 * 50/50 marketing block. The photo drifts in its frame as the row scrolls. */
export function TextImageRow({ pill, title, body, img, reverse, bg }: TextImageRowProps) {
  const text = (
    <div className="flex flex-col justify-center gap-6">
      <div className="self-start">
        <Pill>{pill}</Pill>
      </div>
      <h2
        className="m-0 text-[clamp(30px,3.6vw,50px)] font-extrabold leading-[1.12] tracking-[-0.02em] text-(--brc-text) [font-family:var(--brc-font-display)]"
        style={{ textWrap: "balance" }}
      >
        {title}
      </h2>
      <div className="flex max-w-[62ch] flex-col gap-4">
        {body.map((p, i) => (
          <p
            key={i}
            className="m-0 text-[16.5px] leading-[1.65] text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]"
            style={{ textWrap: "pretty" }}
          >
            {p}
          </p>
        ))}
      </div>
    </div>
  );

  const image = (
    <div className={`relative ${reverse ? "lg:-translate-y-6" : "lg:translate-y-6"}`}>
      {/* Offset accent plate — gives the photo a layered edge instead of sitting flat */}
      <div
        aria-hidden="true"
        className="absolute -bottom-4 -left-4 -right-4 -top-4 hidden rounded-[26px] lg:block"
        style={{
          background: reverse
            ? "linear-gradient(140deg, rgba(195,101,35,0.13), transparent 62%)"
            : "linear-gradient(140deg, rgba(0,0,139,0.13), transparent 62%)",
        }}
      />
      <ParallaxImage
        src={img}
        alt={title}
        sizes="(max-width: 900px) 100vw, 50vw"
        shift={30}
        style={{
          minHeight: "clamp(260px, 64vw, 420px)",
          borderRadius: 18,
          boxShadow: "0 30px 60px -28px rgba(0,0,40,0.35)",
        }}
      />
    </div>
  );

  return (
    <section
      style={{
        background: bg || "#fff",
        padding: "var(--brc-section-y, 104px) var(--brc-space-10, 104px)",
      }}
    >
      <RevealOnce className="mx-auto grid max-w-[1232px] grid-cols-1 items-center gap-10 lg:gap-16 lg:[grid-template-columns:1.05fr_0.95fr]">
        {reverse ? (
          <>
            {image}
            {text}
          </>
        ) : (
          <>
            {text}
            {image}
          </>
        )}
      </RevealOnce>
    </section>
  );
}
