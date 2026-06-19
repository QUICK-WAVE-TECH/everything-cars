import Link from "next/link";
import Image from "next/image";
import { WebsiteNavbar } from "@/shared/components";
import { AuthFooter } from "@/features/auth/components";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <WebsiteNavbar />

      {/* Animations */}
      <style>{`
        @keyframes brcRise { from { opacity: 0; transform: translateY(16px); } }
        @keyframes brcDash { from { background-position-x: 0; } to { background-position-x: 96px; } }
        @keyframes brcBob { from { transform: translateY(0); } to { transform: translateY(-5px); } }
        @keyframes brcShadowPulse { from { transform: scaleX(1); opacity: .9; } to { transform: scaleX(.93); opacity: .65; } }
        @keyframes brcSpin { to { transform: rotate(360deg); } }
        @keyframes brcLine { 0% { transform: translateX(0); opacity: 0; } 12% { opacity: .85; } 100% { transform: translateX(380px); opacity: 0; } }
        @keyframes brcBeam { 0%, 100% { opacity: .9; } 50% { opacity: .45; } }
        @media (prefers-reduced-motion: reduce) { .brc-anim, .brc-anim * { animation: none !important; } }
      `}</style>

      <main className="brc-anim flex flex-1 flex-col items-center justify-center gap-6 px-6 pt-14 text-center">
        {/* Pill */}
        <div style={{ animation: "brcRise .55s ease both" }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-(--brc-border) bg-(--brc-primary-tint) px-3 py-1 text-sm text-(--brc-text) opacity-90 [font-family:var(--brc-font-link)]">
            <span className="size-2 rounded-full bg-(--brc-accent)" />
            Error 404 — page not found
          </span>
        </div>

        {/* Giant 4 0 4 with spinning tire as 0 */}
        <div
          aria-hidden="true"
          className="flex items-center justify-center gap-[0.05em] select-none text-(--brc-primary) [font-family:var(--brc-font-display)]"
          style={{ fontSize: "clamp(108px, 14vw, 172px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, animation: "brcRise .55s ease .08s both" }}
        >
          <span>4</span>
          <TireIcon mode="spin" />
          <span>4</span>
        </div>

        {/* Headline */}
        <h1
          className="m-0 text-[clamp(28px,3.2vw,44px)] font-bold leading-tight text-(--brc-text) [font-family:var(--brc-font-ui)]"
          style={{ animation: "brcRise .55s ease .16s both" }}
        >
          Looks like you took a wrong turn.
        </h1>

        {/* Description */}
        <p
          className="m-0 max-w-[560px] text-lg leading-relaxed text-(--brc-text-secondary) [text-wrap:pretty]"
          style={{ animation: "brcRise .55s ease .24s both" }}
        >
          The page you&apos;re looking for has been moved, sold, or never existed. Don&apos;t worry — let&apos;s get you back on the road.
        </p>

        {/* Buttons */}
        <div
          className="flex flex-wrap justify-center gap-3"
          style={{ animation: "brcRise .55s ease .32s both" }}
        >
          <Link
            href="/"
            className="brc-button-motion inline-flex h-12 items-center gap-2 rounded-lg bg-(--brc-primary) px-6 text-sm font-bold text-(--brc-text-on-primary) no-underline hover:bg-(--brc-primary-hover) [font-family:var(--brc-font-ui)]"
          >
            Back to Homepage
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </Link>
          <Link
            href="/services"
            className="brc-button-motion inline-flex h-12 items-center gap-2 rounded-lg border border-(--brc-accent) bg-white px-6 text-sm font-bold text-(--brc-accent) no-underline hover:brightness-95 [font-family:var(--brc-font-ui)]"
          >
            Browse Cars
          </Link>
        </div>
      </main>

      {/* Road scene with driving car */}
      <div className="brc-anim relative mt-4 h-[264px] shrink-0 overflow-hidden" aria-hidden="true">
        {/* Asphalt */}
        <div className="absolute inset-x-0 bottom-0 h-[92px] bg-(--brc-secondary)">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-white/16" />
          <div
            className="absolute inset-x-0 h-[5px]"
            style={{
              top: "52%",
              background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.78) 0 44px, transparent 44px 96px)",
              animation: "brcDash .5s linear infinite",
            }}
          />
        </div>

        {/* Speed lines */}
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute rounded"
            style={{
              left: "calc(50% + 130px)",
              bottom: 116 + i * 36,
              width: 36 + i * 16,
              height: 4,
              background: "var(--brc-border)",
              opacity: 0,
              animation: `brcLine ${1.05 + i * 0.25}s linear ${i * 0.4}s infinite`,
            }}
          />
        ))}

        {/* Car */}
        <div className="absolute bottom-3" style={{ left: "50%", marginLeft: -185, width: 370 }}>
          <span
            className="absolute rounded-[50%]"
            style={{
              left: "9%", right: "7%", bottom: 4, height: 22,
              background: "radial-gradient(ellipse at center, rgba(0,0,0,0.34), transparent 68%)",
              animation: "brcShadowPulse .7s ease-in-out infinite alternate",
            }}
          />
          {/* Headlight beam */}
          <span
            className="absolute"
            style={{
              left: -178, top: "47%", width: 190, height: 72,
              background: "linear-gradient(270deg, rgba(255,149,0,0.26), transparent 88%)",
              clipPath: "polygon(100% 36%, 0 0, 0 100%, 100% 64%)",
              animation: "brcBeam 1.7s ease-in-out infinite",
            }}
          />
          <Image
            src="/car-lexus.png"
            alt=""
            width={370}
            height={200}
            className="relative block w-full"
            style={{ animation: "brcBob .68s ease-in-out infinite alternate" }}
            priority
          />
        </div>
      </div>

      <AuthFooter />
    </div>
  );
}

/* Spinning tire SVG used as the "0" in 404 */
function TireIcon({ mode = "spin" }: { mode: "spin" | "wobble" }) {
  const anim = mode === "spin" ? "brcSpin 1.05s linear infinite" : "brcWobble .95s ease-in-out infinite alternate";
  const spokes = [0, 72, 144, 216, 288];
  return (
    <svg
      viewBox="0 0 100 100"
      className="brc-anim"
      style={{ width: ".74em", height: ".74em", marginTop: ".05em", flexShrink: 0, animation: anim, transformOrigin: "50% 50%" }}
    >
      <circle cx="50" cy="50" r="47" fill="#121212" />
      <circle cx="50" cy="50" r="30" fill="#FAFAFA" />
      {spokes.map((a) => (
        <line key={a} x1="50" y1="50" x2={50 + 23 * Math.cos((a * Math.PI) / 180)} y2={50 + 23 * Math.sin((a * Math.PI) / 180)} stroke="var(--brc-primary)" strokeWidth="7" strokeLinecap="round" />
      ))}
      <circle cx="50" cy="50" r="9" fill="var(--brc-primary)" />
    </svg>
  );
}
