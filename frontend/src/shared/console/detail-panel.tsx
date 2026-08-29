"use client";

import { useEffect } from "react";
import { XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PREMIUM_PANEL_SPRING } from "@/shared/motion/premium";

/** A right-anchored detail panel that slides in over the table when a row is
 * selected. Full-height, scrollable body, optional footer for actions. A dimmed
 * backdrop closes it; Esc closes it. Reduced motion fades instead of sliding. */
export function DetailPanel({
  open,
  onClose,
  title,
  children,
  footer,
  width = 420,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <motion.div
            className="absolute inset-0 bg-black/25"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.aside
            className="absolute right-0 top-0 flex h-full w-full flex-col bg-white"
            style={{ maxWidth: width, boxShadow: "-24px 0 70px -24px rgba(18,18,18,0.35)" }}
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={reduce ? { duration: 0.12 } : PREMIUM_PANEL_SPRING}
          >
            <div className="flex items-center justify-between gap-3 border-b border-(--brc-border) px-5 py-4">
              <div className="min-w-0 text-[15px] font-black text-(--brc-text) [font-family:var(--brc-font-display)]">
                {title}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-(--brc-text-muted) transition-colors hover:bg-(--brc-bg-subtle)"
              >
                <XIcon size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="border-t border-(--brc-border) p-4">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
