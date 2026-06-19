"use client";

import Link from "next/link";
import Image from "next/image";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const spokes = [0, 72, 144, 216, 288];

  return (
    <>
      <style>{`
        @keyframes brcRise { from { opacity: 0; transform: translateY(16px); } }
        @keyframes brcWobble { from { transform: rotate(-5deg); } to { transform: rotate(5deg); } }
        @keyframes brcPuff { 0% { transform: translate(0,0) scale(.35); opacity: 0; } 18% { opacity: .85; } 100% { transform: translate(-20px,-74px) scale(1.35); opacity: 0; } }
        @keyframes brcBlink { 0%, 100% { opacity: 1; } 50% { opacity: .2; } }
        @media (prefers-reduced-motion: reduce) { .brc-anim, .brc-anim * { animation: none !important; } }
      `}</style>

      <div className="flex min-h-[80vh] flex-col bg-white">
        <main className="brc-anim flex flex-1 flex-col items-center justify-center gap-5 px-6 pt-8 text-center">
          {/* Pill */}
          <div style={{ animation: "brcRise .55s ease both" }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-(--brc-border) bg-(--brc-primary-tint) px-3 py-1 text-sm text-(--brc-text) opacity-90 [font-family:var(--brc-font-link)]">
              <span className="size-2 rounded-full bg-(--brc-accent)" />
              Error 500 — something broke down
            </span>
          </div>

          {/* Giant 5 0 0 with wobbling tires */}
          <div
            aria-hidden="true"
            className="flex items-center justify-center gap-[0.05em] select-none text-(--brc-primary) [font-family:var(--brc-font-display)]"
            style={{ fontSize: "clamp(108px, 14vw, 172px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, animation: "brcRise .55s ease .08s both" }}
          >
            <span>5</span>
            {[0, 0.45].map((delay, i) => (
              <svg
                key={i}
                viewBox="0 0 100 100"
                className="brc-anim"
                style={{ width: ".74em", height: ".74em", marginTop: ".05em", flexShrink: 0, animation: "brcWobble .95s ease-in-out infinite alternate", animationDelay: `${delay}s`, transformOrigin: "50% 50%" }}
              >
                <circle cx="50" cy="50" r="47" fill="#121212" />
                <circle cx="50" cy="50" r="30" fill="#FAFAFA" />
                {spokes.map((a) => (
                  <line key={a} x1="50" y1="50" x2={50 + 23 * Math.cos((a * Math.PI) / 180)} y2={50 + 23 * Math.sin((a * Math.PI) / 180)} stroke="var(--brc-primary)" strokeWidth="7" strokeLinecap="round" />
                ))}
                <circle cx="50" cy="50" r="9" fill="var(--brc-primary)" />
              </svg>
            ))}
          </div>

          {/* Headline */}
          <h1
            className="m-0 text-[clamp(28px,3.2vw,44px)] font-bold leading-tight text-(--brc-text) [font-family:var(--brc-font-ui)]"
            style={{ animation: "brcRise .55s ease .16s both" }}
          >
            We&apos;ve hit a bump in the road.
          </h1>

          {/* Description */}
          <p
            className="m-0 max-w-[560px] text-lg leading-relaxed text-(--brc-text-secondary) [text-wrap:pretty]"
            style={{ animation: "brcRise .55s ease .24s both" }}
          >
            Something went wrong on our end — our team is already under the hood fixing it. Please try again in a moment.
          </p>

          {/* Buttons */}
          <div className="flex flex-wrap justify-center gap-3" style={{ animation: "brcRise .55s ease .32s both" }}>
            <button
              onClick={reset}
              className="brc-button-motion inline-flex h-12 cursor-pointer items-center gap-2 rounded-lg border-none bg-(--brc-primary) px-6 text-sm font-bold text-(--brc-text-on-primary) hover:bg-(--brc-primary-hover) [font-family:var(--brc-font-ui)]"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="brc-button-motion inline-flex h-12 items-center gap-2 rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-6 text-sm font-bold text-(--brc-text) no-underline hover:brightness-95 [font-family:var(--brc-font-ui)]"
            >
              Back to Homepage
            </Link>
          </div>

          {/* Error code */}
          <code
            className="rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) px-3.5 py-1.5 text-[13px] text-(--brc-text-muted) [font-family:ui-monospace,SFMono-Regular,Menlo,monospace]"
            style={{ animation: "brcRise .55s ease .4s both" }}
          >
            ERR_500 — internal server error
          </code>
        </main>

        {/* Road scene — broken-down car */}
        <div className="brc-anim relative mt-4 h-[264px] shrink-0 overflow-hidden" aria-hidden="true">
          {/* Asphalt */}
          <div className="absolute inset-x-0 bottom-0 h-[92px] bg-(--brc-secondary)">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-white/16" />
            <div
              className="absolute inset-x-0 h-[5px]"
              style={{ top: "52%", background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.78) 0 44px, transparent 44px 96px)" }}
            />
          </div>

          {/* Smoke puffs */}
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                left: `calc(50% - 185px + 15% + ${i * 9}px)`, top: "26%",
                width: 16 + i * 7, height: 16 + i * 7,
                background: "#E3E4E6", opacity: 0,
                animation: `brcPuff 2.6s ease-out ${i * 0.85}s infinite`,
              }}
            />
          ))}

          {/* Car */}
          <div className="absolute bottom-3" style={{ left: "50%", marginLeft: -185, width: 370 }}>
            <span
              className="absolute rounded-[50%]"
              style={{ left: "9%", right: "7%", bottom: 4, height: 22, background: "radial-gradient(ellipse at center, rgba(0,0,0,0.34), transparent 68%)" }}
            />
            <Image src="/car-lexus.png" alt="" width={370} height={200} className="relative block w-full" />
          </div>

          {/* Hazard triangle */}
          <svg
            width="54" height="48" viewBox="0 0 60 54"
            className="absolute"
            style={{ left: "calc(50% + 232px)", bottom: 22, animation: "brcBlink 1.25s ease-in-out infinite" }}
          >
            <path d="M30 6 L55 48 H5 Z" fill="var(--brc-warning)" stroke="var(--brc-warning)" strokeWidth="8" strokeLinejoin="round" />
            <rect x="27.4" y="19" width="5.2" height="14" rx="2.6" fill="#121212" />
            <circle cx="30" cy="40" r="3.1" fill="#121212" />
          </svg>
        </div>
      </div>
    </>
  );
}
