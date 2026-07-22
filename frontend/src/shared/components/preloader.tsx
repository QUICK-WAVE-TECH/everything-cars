"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useIsMutating } from "@tanstack/react-query";

declare module "@tanstack/react-query" {
  /**
   * Types the `meta` object every mutation may carry. React Query derives
   * MutationMeta from this Register interface, so new meta keys belong here —
   * which also means a typo is a type error, not a silently ignored flag.
   */
  interface Register {
    mutationMeta: {
      /**
       * Suppress the global <FormSubmitOverlay> for this mutation. Use it when
       * the trigger already shows progress inline (a spinner in the submit
       * button), so a fast action isn't buried under a full-screen takeover.
       */
      skipGlobalOverlay?: boolean;
    };
  }
}

/**
 * Preloader — the brand logo on white, softly dissolving left-to-right.
 *
 * Two consumers share the same visual:
 *  - <Preloader>: the initial app-load screen (min display + page-load aware).
 *  - <FormSubmitOverlay>: shows on top of the page whenever any form submission
 *    (react-query mutation) is in flight, so every form "loads" on submit.
 */
const MIN_MS = 5200; // initial load minimum
const SUBMIT_MIN_MS = 600; // keep the overlay up at least this long on submit
const FADE_MS = 600;

function PreloaderVisual({ leaving }: { leaving: boolean }) {
  return (
    <div className={`ec-pl${leaving ? " ec-pl--leaving" : ""}`} role="status" aria-label="Loading">
      <Image className="ec-pl__logo" src="/preloader.png" alt="Loading" width={237} height={100} priority />
      <style>{CSS}</style>
    </div>
  );
}

function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

export function Preloader() {
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(false);
  useScrollLock(!done);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setLeaving(true);
      window.setTimeout(() => setDone(true), reduce ? 0 : FADE_MS);
    };

    if (reduce) {
      finish();
      return;
    }

    // Dismiss after the minimum display time. We do NOT wait on `window.load`:
    // in dev a stalled HMR socket (or any hanging resource) can delay `load`
    // indefinitely and trap the preloader on screen.
    const t = window.setTimeout(finish, MIN_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (done) return null;
  return <PreloaderVisual leaving={leaving} />;
}

/**
 * Full-screen preloader shown while any form submission is pending.
 * Driven globally by react-query's mutation count — no per-form wiring needed.
 *
 * A mutation can opt out by declaring `meta: { skipGlobalOverlay: true }`. Use
 * that when the trigger already shows its own progress (a spinner inside the
 * submit button, say) — stacking a full-screen takeover on top of an inline
 * spinner just makes a fast action feel slow.
 */
export function FormSubmitOverlay() {
  const mutating = useIsMutating({
    predicate: (mutation) => mutation.meta?.skipGlobalOverlay !== true,
  });
  const [phase, setPhase] = useState<"hidden" | "shown" | "leaving">("hidden");
  const shownAt = useRef(0);
  useScrollLock(phase !== "hidden");

  // Show the overlay the instant a mutation starts — done during render
  // (state-adjustment pattern) rather than in an effect, so the covered
  // frame never paints and the lint rule against effect-setState holds.
  if (mutating > 0 && phase !== "shown") {
    setPhase("shown");
  }

  // Stamp the show time once the transition commits (refs and impure calls
  // are not allowed during render).
  useEffect(() => {
    if (phase === "shown") {
      shownAt.current = performance.now();
    }
  }, [phase]);

  useEffect(() => {
    if (mutating > 0) return;
    // mutating === 0
    if (phase === "shown") {
      const elapsed = performance.now() - shownAt.current;
      const wait = Math.max(0, SUBMIT_MIN_MS - elapsed);
      const t = window.setTimeout(() => setPhase("leaving"), wait);
      return () => window.clearTimeout(t);
    }
    if (phase === "leaving") {
      const t = window.setTimeout(() => setPhase("hidden"), FADE_MS);
      return () => window.clearTimeout(t);
    }
  }, [mutating, phase]);

  if (phase === "hidden") return null;
  return <PreloaderVisual leaving={phase === "leaving"} />;
}

const CSS = `
.ec-pl {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  opacity: 1;
  transition: opacity .7s ease;
}
.ec-pl--leaving { opacity: 0; pointer-events: none; }

.ec-pl__logo {
  height: clamp(36px, 10vw, 58px);
  width: auto;
  /* Soft feathered band that sweeps left-to-right: fades the logo in from the
     left, then dissolves it away toward the right. */
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 30%, #000 70%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 30%, #000 70%, transparent 100%);
  -webkit-mask-size: 320% 100%;
  mask-size: 320% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  animation: ec-pl-dissolve 2.8s ease-in-out infinite;
  will-change: mask-position;
}

@keyframes ec-pl-dissolve {
  0%   { -webkit-mask-position: 100% 0; mask-position: 100% 0; }
  38%  { -webkit-mask-position: 50% 0;  mask-position: 50% 0; }
  60%  { -webkit-mask-position: 50% 0;  mask-position: 50% 0; }
  100% { -webkit-mask-position: 0% 0;   mask-position: 0% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .ec-pl__logo {
    animation: none;
    opacity: 1;
    -webkit-mask-image: none;
    mask-image: none;
  }
}
`;
