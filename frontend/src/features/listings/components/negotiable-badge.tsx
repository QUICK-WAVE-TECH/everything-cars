import { HandshakeIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NegotiableBadgeProps = {
  /** Renders nothing unless this is true — safe to pass the raw API value. */
  isNegotiable: boolean | null | undefined;
  /** Compact variant for car cards; the default suits detail pages. */
  size?: "sm" | "default";
  className?: string;
};

/**
 * "Negotiable" marker for buy listings. The flag itself is public; the owner's
 * private min/max range behind it is never exposed, so this component takes
 * only the boolean.
 */
export function NegotiableBadge({
  isNegotiable,
  size = "default",
  className,
}: NegotiableBadgeProps) {
  if (!isNegotiable) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "animate-in fade-in zoom-in-95 rounded-full border-(--brc-accent)/30 bg-(--brc-accent-bg) text-(--brc-accent) duration-500",
        size === "sm" ? "h-5 text-[11px]" : "h-6 text-xs",
        className,
      )}
    >
      <HandshakeIcon data-icon="inline-start" aria-hidden="true" />
      Negotiable
    </Badge>
  );
}
