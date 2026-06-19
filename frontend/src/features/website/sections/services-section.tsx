"use client";

import { useMemo } from "react";
import { SectionHead } from "@/shared/components/section-head";
import { ApiCarRow } from "@/shared/components/car-row";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicCars } from "@/features/listings/api";

export function ServicesSection() {
  const { data, isLoading } = usePublicCars();
  const cars = data?.results ?? [];

  const rentCars = useMemo(
    () => cars.filter((c) => (c.listing_type === "rent" || c.listing_type === "both") && c.availability_status !== "sold").slice(0, 8),
    [cars],
  );
  const buyCars = useMemo(
    () => cars.filter((c) => (c.listing_type === "buy" || c.listing_type === "both") && c.availability_status !== "sold").slice(0, 8),
    [cars],
  );
  const recentlySold = useMemo(
    () => cars.filter((c) => c.availability_status === "sold").slice(0, 6),
    [cars],
  );

  return (
    <section style={{ background: "#fff", padding: "var(--brc-section-y, 104px) var(--brc-space-10, 104px)" }}>
      <div style={{ maxWidth: 1232, margin: "0 auto", display: "flex", flexDirection: "column", gap: "clamp(48px, 8vw, 80px)" }}>
        <div style={{ alignSelf: "center" }}>
          <SectionHead
            pill="Our Services"
            title="Find the Perfect Car for Every Journey"
            sub="Choose from our premium collection of vehicles for rent, buy, or sell."
            center
          />
        </div>

        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            {[1, 2].map((i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Skeleton className="h-5 w-48" />
                <div style={{ display: "flex", gap: 28 }}>
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-[320px] w-[300px] shrink-0 rounded-2xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <ApiCarRow title="AVAILABLE FOR RENT" cars={rentCars} displayMode="rent" />
            <ApiCarRow title="AVAILABLE FOR PURCHASE" cars={buyCars} displayMode="buy" />
            {recentlySold.length > 0 && (
              <ApiCarRow title="RECENTLY SOLD" cars={recentlySold} />
            )}
          </>
        )}
      </div>
    </section>
  );
}
