"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/features/auth/components/icon";
import { Chip } from "./chip";
import { AvailabilityBadge } from "@/features/listings/components/availability-badge";
import { VerifiedBadge } from "@/features/listings/components/verified-report";
import type { CarListItem } from "@/features/listings/api/types";

function currencySymbol(code: string) {
  const map: Record<string, string> = { NGN: "\u20A6", USD: "$", GBP: "\u00A3", EUR: "\u20AC" };
  return map[code] ?? code;
}

function fmtPrice(car: CarListItem, displayMode?: "rent" | "buy"): string {
  const sym = currencySymbol(car.currency);
  if (displayMode === "buy") {
    if (car.sale_price) return `${sym}${Number(car.sale_price).toLocaleString("en-NG")}`;
    return "—";
  }
  if (displayMode === "rent") {
    if (car.rent_price_per_day) return `${sym}${Number(car.rent_price_per_day).toLocaleString("en-NG")}/day`;
    return "—";
  }
  // Default: pick based on listing_type
  if (car.listing_type === "buy" && car.sale_price) {
    return `${sym}${Number(car.sale_price).toLocaleString("en-NG")}`;
  }
  if (car.rent_price_per_day) {
    return `${sym}${Number(car.rent_price_per_day).toLocaleString("en-NG")}/day`;
  }
  if (car.sale_price) {
    return `${sym}${Number(car.sale_price).toLocaleString("en-NG")}`;
  }
  return "—";
}

function listingTypeLabel(t: string) {
  if (t === "both") return "Rent / Buy";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

type ApiCarCardProps = {
  car: CarListItem;
  displayMode?: "rent" | "buy";
};

export function ApiCarCard({ car, displayMode }: ApiCarCardProps) {
  const [hover, setHover] = useState(false);
  const isSold = car.availability_status === "sold";
  const isReserved = car.availability_status === "reserved";
  const isUnavailable = isSold || isReserved;

  return (
    <Link
      href={`/cars/${car.id}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "min(300px, calc(100vw - 48px))",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        cursor: "pointer",
        transition: "transform .2s ease",
        transform: hover ? "translateY(-4px)" : "none",
        textDecoration: "none",
        color: "inherit",
        opacity: isUnavailable ? 0.65 : 1,
      }}
    >
      {/* Image */}
      <div
        style={{
          position: "relative",
          height: 200,
          borderRadius: 16,
          background: "var(--brc-bg-subtle)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: hover ? "var(--brc-shadow-md)" : "var(--brc-shadow-xs)",
          transition: "box-shadow .2s ease",
          filter: isUnavailable ? "grayscale(0.3)" : "none",
        }}
      >
        {car.primary_image ? (
          <Image
            src={car.primary_image}
            alt={car.title}
            width={258}
            height={160}
            style={{ width: "86%", height: "auto", objectFit: "contain" }}
          />
        ) : (
          <Icon name="car" size={48} stroke="var(--brc-border)" />
        )}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            alignItems: "flex-start",
          }}
        >
          <Chip>{listingTypeLabel(car.listing_type)}</Chip>
          {car.is_verified && <VerifiedBadge size="sm" />}
        </div>
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
          }}
        >
          <AvailabilityBadge status={car.availability_status} />
        </div>
      </div>

      {/* Details */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          borderBottom: "1px solid var(--brc-border)",
          paddingBottom: 10,
        }}
      >
        <span
          style={{
            fontFamily: "var(--brc-font-ui)",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--brc-text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {car.title}
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            color: "var(--brc-text-secondary)",
            fontSize: 12,
            fontFamily: "var(--brc-font-ui)",
          }}
        >
          <Icon name="pin" size={14} stroke="var(--brc-text-secondary)" />
          {car.city ? `${car.city}, ` : ""}{car.state}
        </div>
      </div>

      {/* Price + CTA */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--brc-font-display)",
            fontWeight: 700,
            fontSize: "clamp(16px, 4vw, 20px)",
            color: "var(--brc-text)",
          }}
        >
          {fmtPrice(car, displayMode)}
        </span>
        <span
          style={{
            height: 38,
            borderRadius: 8,
            padding: "0 16px",
            background: isUnavailable ? "var(--brc-bg-muted)" : "var(--brc-secondary)",
            color: isUnavailable ? "var(--brc-text-muted)" : "#FAFAFA",
            fontFamily: "var(--brc-font-ui)",
            fontWeight: 700,
            fontSize: 13,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {isSold ? "Sold" : isReserved ? "Reserved" : "View Details"}
        </span>
      </div>
    </Link>
  );
}

// Keep legacy type for backwards compat
type Car = {
  id: number;
  name: string;
  type: string;
  location: string;
  price: string;
  rating: number;
  mode: "rent" | "buy" | "list";
};

type CarCardProps = {
  car: Car;
  onAction?: (car: Car) => void;
};

export function CarCard({ car, onAction }: CarCardProps) {
  const [hover, setHover] = useState(false);
  const cta = car.mode === "buy" ? "Buy Now" : car.mode === "list" ? "View" : "Rent Now";
  const mode = car.mode === "buy" ? "buy" : "rent";

  return (
    <Link
      href={`/cars/${car.id}?mode=${mode}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "min(300px, calc(100vw - 48px))", flexShrink: 0, display: "flex", flexDirection: "column",
        gap: 16, cursor: "pointer", transition: "transform .2s ease",
        transform: hover ? "translateY(-4px)" : "none",
        textDecoration: "none", color: "inherit",
      }}
    >
      <div style={{
        position: "relative", height: 200, borderRadius: 16,
        background: "var(--brc-bg-subtle)", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: hover ? "var(--brc-shadow-md)" : "var(--brc-shadow-xs)",
        transition: "box-shadow .2s ease",
      }}>
        <Image src="/car-lexus.png" alt={car.name} width={258} height={160} style={{ width: "86%", height: "auto", objectFit: "contain" }} />
        <div style={{ position: "absolute", top: 12, left: 12 }}>
          <Chip>{car.type}</Chip>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, borderBottom: "1px solid var(--brc-border)", paddingBottom: 10 }}>
        <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, color: "var(--brc-text)" }}>{car.name}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--brc-text-secondary)", fontSize: 12 }}>
          <Icon name="pin" size={14} stroke="var(--brc-text-secondary)" />
          {car.location}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: "clamp(18px, 5vw, 22px)" }}>{car.price}</span>
        <button
          className="brc-button-motion"
          onClick={() => onAction?.(car)}
          style={{
            height: 44, borderRadius: 8, border: "none", padding: "0 18px",
            background: "var(--brc-secondary)", color: "#FAFAFA",
            fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}
        >
          {cta}
        </button>
      </div>
    </Link>
  );
}

export type { Car };
