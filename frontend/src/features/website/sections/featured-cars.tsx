"use client";

import { useMemo } from "react";
import { CoverflowCarousel, type CoverflowItem } from "@/shared/components/coverflow-carousel";
import { usePublicCars } from "@/features/listings/api";
import type { CarListItem } from "@/features/listings/api";

function currencySymbol(code: string) {
  const map: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };
  return map[code] ?? code;
}

function priceLabel(car: CarListItem): string {
  const sym = currencySymbol(car.currency);
  if (car.listing_type === "buy" && car.sale_price) {
    return `${sym}${Number(car.sale_price).toLocaleString("en-NG")}`;
  }
  if (car.rent_price_per_day) {
    return `${sym}${Number(car.rent_price_per_day).toLocaleString("en-NG")}/day`;
  }
  if (car.sale_price) {
    return `${sym}${Number(car.sale_price).toLocaleString("en-NG")}`;
  }
  return "";
}

/** A cinematic 3D coverflow of available cars for the landing page. Hidden
 * until there are photographed, available cars to show. */
export function FeaturedCars() {
  const { data } = usePublicCars();

  const items: CoverflowItem[] = useMemo(() => {
    return (data?.results ?? [])
      .filter((c) => c.primary_image && c.availability_status !== "sold")
      .slice(0, 7)
      .map((c) => ({
        id: c.id,
        img: c.primary_image!,
        title: c.title,
        subtitle: priceLabel(c),
        tag: c.listing_type === "buy" ? "For Sale" : "For Rent",
        href: `/cars/${c.id}`,
      }));
  }, [data]);

  if (items.length === 0) return null;

  return <CoverflowCarousel items={items} sectionLabel="Featured Cars" />;
}
