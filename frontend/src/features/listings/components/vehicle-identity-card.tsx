import { LockIcon, ShieldIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type VehicleIdentityCardProps = {
  vin?: string | null;
  plateNumber?: string | null;
  className?: string;
};

/**
 * Owner/staff-only VIN + plate number. The backend never sends these fields
 * on public payloads, so this simply renders nothing when both are absent —
 * callers don't need to gate on role themselves.
 */
export function VehicleIdentityCard({
  vin,
  plateNumber,
  className,
}: VehicleIdentityCardProps) {
  if (!vin && !plateNumber) return null;

  return (
    <Card
      className={cn(
        "animate-in fade-in slide-in-from-bottom-1 gap-3 rounded-2xl border border-border py-5 shadow-none duration-500 motion-reduce:animate-none",
        className,
      )}
    >
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <ShieldIcon
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          Vehicle identity
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {vin && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                VIN
              </span>
              <span className="font-mono text-sm tracking-[0.12em] text-foreground">
                {vin}
              </span>
            </div>
          )}
          {plateNumber && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Plate number
              </span>
              <span className="font-mono text-sm tracking-[0.12em] text-foreground">
                {plateNumber}
              </span>
            </div>
          )}
        </div>
        <p className="m-0 flex items-center gap-1.5 text-xs text-muted-foreground">
          <LockIcon className="size-3" aria-hidden="true" />
          Visible only to you and our team
        </p>
      </CardContent>
    </Card>
  );
}
