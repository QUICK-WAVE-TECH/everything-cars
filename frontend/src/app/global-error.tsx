"use client";

import Link from "next/link";
import Image from "next/image";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "var(--brc-font-ui, Manrope, sans-serif)", color: "var(--brc-text, #121212)" }}>
        {/* Animations */}
        <style>{`
          @keyframes brcRise { from { opacity: 0; transform: translateY(16px); } }
          @keyframes brcDash { from { background-position-x: 0; } to { background-position-x: 96px; } }
          @keyframes brcSpin { to { transform: rotate(360deg); } }
          @keyframes brcWobble { from { transform: rotate(-5deg); } to { transform: rotate(5deg); } }
          @keyframes brcPuff { 0% { transform: translate(0,0) scale(.35); opacity: 0; } 18% { opacity: .85; } 100% { transform: translate(-20px,-74px) scale(1.35); opacity: 0; } }
          @keyframes brcBlink { 0%, 100% { opacity: 1; } 50% { opacity: .2; } }
          @media (prefers-reduced-motion: reduce) { .brc-anim, .brc-anim * { animation: none !important; } }
        `}</style>

        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>
          {/* Minimal header */}
          <header style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 24px", borderBottom: "1px solid #E8E9E9" }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <Image src="/logo.png" alt="Buy & Rent Cars" width={140} height={43} style={{ height: 43, width: "auto" }} />
            </Link>
          </header>

          <main className="brc-anim" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "32px 24px 0", gap: 20 }}>
            {/* Pill */}
            <div style={{ animation: "brcRise .55s ease both" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 8, opacity: 0.92,
                background: "#F0F1F2", border: "1px solid #E8E9E9",
                borderRadius: 100, padding: "4px 12px", fontSize: 14, color: "#121212",
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF9500" }} />
                Error 500 — something broke down
              </span>
            </div>

            {/* Giant 5 0 0 with wobbling tires */}
            <div
              aria-hidden="true"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.05em",
                fontFamily: "var(--brc-font-display, Lexend, sans-serif)", fontWeight: 800, lineHeight: 1,
                fontSize: "clamp(108px, 14vw, 172px)", letterSpacing: "-0.03em",
                color: "var(--brc-primary, #00008B)", userSelect: "none",
                animation: "brcRise .55s ease .08s both",
              }}
            >
              <span>5</span>
              <TireIcon500 delay={0} />
              <TireIcon500 delay={0.45} />
            </div>

            {/* Headline */}
            <h1 style={{
              margin: 0, fontWeight: 700, lineHeight: 1.2,
              fontSize: "clamp(28px, 3.2vw, 44px)",
              animation: "brcRise .55s ease .16s both",
            }}>
              We&apos;ve hit a bump in the road.
            </h1>

            {/* Description */}
            <p style={{
              margin: 0, maxWidth: 560, fontSize: 18, lineHeight: 1.6,
              color: "#6B6D6E", animation: "brcRise .55s ease .24s both",
            }}>
              Something went wrong on our end — our team is already under the hood fixing it. Please try again in a moment.
            </p>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", animation: "brcRise .55s ease .32s both" }}>
              <button
                onClick={reset}
                style={{
                  height: 48, border: "none", borderRadius: 8, padding: "0 22px", cursor: "pointer",
                  background: "var(--brc-primary, #00008B)", color: "#fff",
                  fontWeight: 700, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8,
                }}
              >
                Try Again
              </button>
              <Link
                href="/"
                style={{
                  height: 48, borderRadius: 8, padding: "0 22px", cursor: "pointer",
                  background: "#FAFAFA", color: "#121212", border: "1px solid #E8E9E9",
                  fontWeight: 700, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8,
                  textDecoration: "none",
                }}
              >
                Back to Homepage
              </Link>
            </div>

            {/* Error code */}
            <code style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13,
              color: "#A3A4A5", background: "#FAFAFA", border: "1px solid #E8E9E9",
              borderRadius: 8, padding: "6px 14px",
              animation: "brcRise .55s ease .4s both",
            }}>
              ERR_500 — internal server error
            </code>
          </main>

          {/* Road scene with broken-down car */}
          <div className="brc-anim" aria-hidden="true" style={{ position: "relative", height: 264, overflow: "hidden", flexShrink: 0, marginTop: 16 }}>
            {/* Asphalt */}
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 92, background: "#121212" }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 3, background: "rgba(255,255,255,0.16)" }} />
              <div style={{
                position: "absolute", left: 0, right: 0, top: "52%", height: 5,
                background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.78) 0 44px, transparent 44px 96px)",
              }} />
            </div>

            {/* Smoke puffs */}
            {[0, 1, 2].map((i) => (
              <span key={i} style={{
                position: "absolute",
                left: `calc(50% - 185px + 15% + ${i * 9}px)`,
                top: "26%",
                width: 16 + i * 7, height: 16 + i * 7, borderRadius: "50%",
                background: "#E3E4E6", opacity: 0,
                animation: `brcPuff 2.6s ease-out ${i * 0.85}s infinite`,
              }} />
            ))}

            {/* Car */}
            <div style={{ position: "absolute", left: "50%", bottom: 12, marginLeft: -185, width: 370 }}>
              <span style={{
                position: "absolute", left: "9%", right: "7%", bottom: 4, height: 22, borderRadius: "50%",
                background: "radial-gradient(ellipse at center, rgba(0,0,0,0.34), transparent 68%)",
              }} />
              <Image src="/car-lexus.png" alt="" width={370} height={200} style={{ position: "relative", display: "block", width: "100%" }} />
            </div>

            {/* Hazard triangle */}
            <svg width="54" height="48" viewBox="0 0 60 54" style={{
              position: "absolute", left: "calc(50% + 232px)", bottom: 22,
              animation: "brcBlink 1.25s ease-in-out infinite",
            }}>
              <path d="M30 6 L55 48 H5 Z" fill="#FFC001" stroke="#FFC001" strokeWidth="8" strokeLinejoin="round" />
              <rect x="27.4" y="19" width="5.2" height="14" rx="2.6" fill="#121212" />
              <circle cx="30" cy="40" r="3.1" fill="#121212" />
            </svg>
          </div>
        </div>
      </body>
    </html>
  );
}

function TireIcon500({ delay }: { delay: number }) {
  const spokes = [0, 72, 144, 216, 288];
  return (
    <svg
      viewBox="0 0 100 100"
      className="brc-anim"
      style={{
        width: ".74em", height: ".74em", marginTop: ".05em", flexShrink: 0,
        animation: "brcWobble .95s ease-in-out infinite alternate",
        animationDelay: `${delay}s`, transformOrigin: "50% 50%",
      }}
    >
      <circle cx="50" cy="50" r="47" fill="#121212" />
      <circle cx="50" cy="50" r="30" fill="#FAFAFA" />
      {spokes.map((a) => (
        <line key={a} x1="50" y1="50" x2={50 + 23 * Math.cos((a * Math.PI) / 180)} y2={50 + 23 * Math.sin((a * Math.PI) / 180)} stroke="#00008B" strokeWidth="7" strokeLinecap="round" />
      ))}
      <circle cx="50" cy="50" r="9" fill="#00008B" />
    </svg>
  );
}
