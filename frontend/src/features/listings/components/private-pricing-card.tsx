import { LockIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function currencySymbol(code: string) {
  const map: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };
  return map[code] ?? code;
}

function fmtMoney(amount: string, currency: string) {
  return `${currencySymbol(currency)}${Number(amount).toLocaleString("en-NG")}`;
}

type PrivatePricingCardProps = {
  minPrice?: string | null;
  maxPrice?: string | null;
  currency: string;
  className?: string;
};

/**
 * The owner's private negotiation range for a negotiable buy listing. Never
 * shown to customers — only the public "Negotiable" badge is. Renders
 * nothing unless both bounds are present (they're only ever set together).
 */
export function PrivatePricingCard({
  minPrice,
  maxPrice,
  currency,
  className,
}: PrivatePricingCardProps) {
  if (!minPrice || !maxPrice) return null;

  return (
    <Card
      className={cn(
        "animate-in fade-in slide-in-from-bottom-1 gap-3 rounded-2xl border border-border py-5 shadow-none duration-500 motion-reduce:animate-none",
        className,
      )}
    >
      <CardHeader className="px-5">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold">
          <span>Private pricing</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            <LockIcon className="size-3" aria-hidden="true" />
            Only visible to you and our team
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 px-5">
        <p className="m-0 text-lg font-extrabold text-foreground">
          {fmtMoney(minPrice, currency)}{" "}
          <span className="font-normal text-muted-foreground">&ndash;</span>{" "}
          {fmtMoney(maxPrice, currency)}
        </p>
        <p className="m-0 text-xs text-muted-foreground">
          Your accepted negotiation range. Customers only see the
          &quot;Negotiable&quot; badge.
        </p>
      </CardContent>
    </Card>
  );
}
