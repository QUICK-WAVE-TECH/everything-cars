import type { OfferStatus } from "@/features/offers/api";
import { OFFER_STATUS_META } from "@/features/offers/lib/offer-format";
import { cn } from "@/lib/utils";

const TONE_CLASSES: Record<string, string> = {
  navy: "bg-(--brc-primary-tint) text-(--brc-primary)",
  amber: "bg-(--brc-warning-bg) text-(--brc-warning-ink,#B38601)",
  success: "bg-(--brc-success-bg) text-(--brc-success)",
  muted: "bg-(--brc-bg-muted) text-(--brc-text-muted)",
};

/** Status chip for an offer, with the human-facing label + tone from the meta map. */
export function OfferStatusBadge({
  status,
  className,
}: {
  status: OfferStatus;
  className?: string;
}) {
  const meta = OFFER_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center rounded-full px-2.5 text-xs font-bold [font-family:var(--brc-font-ui)]",
        TONE_CLASSES[meta.tone],
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
