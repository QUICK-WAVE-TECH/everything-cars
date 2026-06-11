"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/features/auth/components/icon";
import { Star } from "./star";
import { Chip } from "./chip";

export type Car = {
  id: number;
  name: string;
  type: string;
  location: string;
  rating: number;
  mode: "rent" | "buy" | "list";
  /** Numeric prices preferred; `price` is a pre-formatted fallback. */
  rentPrice?: number;
  buyPrice?: number;
  price?: string;
  /** Availability — defaults to true when omitted. */
  available?: boolean;
  year?: number;
  /** 0 = brand new (buy mode only). */
  mileage?: number;
};

function naira(n: number): string {
  return `₦${n.toLocaleString("en-NG")}`;
}

function priceLabel(car: Car): string {
  if (car.mode === "buy") {
    return car.buyPrice != null ? naira(car.buyPrice) : (car.price ?? "");
  }
  return car.rentPrice != null ? `${naira(car.rentPrice)}/day` : (car.price ?? "");
}

const specChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  background: "var(--brc-bg-subtle)",
  border: "1px solid var(--brc-border)",
  borderRadius: "var(--brc-radius-pill)",
  padding: "3px 8px",
  fontFamily: "var(--brc-font-ui)",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--brc-text-secondary)",
  whiteSpace: "nowrap",
};

export function CarCard({ car }: { car: Car }) {
  const [hover, setHover] = useState(false);
  const available = car.available !== false;
  const isBuy = car.mode === "buy";
  const cta = isBuy ? "Buy Now" : car.mode === "list" ? "View" : "Rent Now";
  const inactiveLabel = isBuy ? "Sold" : "Currently Rented";
  const statusLabel = available ? "Available" : inactiveLabel;
  const statusBg = available
    ? "var(--brc-success-bg)"
    : isBuy ? "var(--brc-danger-bg)" : "var(--brc-warning-bg)";
  const statusFg = available
    ? "var(--brc-success)"
    : isBuy ? "var(--brc-danger)" : "#9a7400";

  const content = (
    <>
      {/* Image tile */}
      <div style={{
        position: "relative", height: 200, borderRadius: "var(--brc-radius-lg)",
        background: "var(--brc-bg-subtle)", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: hover && available ? "var(--brc-shadow-md)" : "var(--brc-shadow-xs)",
        transition: "box-shadow .2s ease",
      }}>
        <Image
          src="/car-lexus.png"
          alt={car.name}
          width={258}
          height={160}
          style={{
            width: "86%", height: "auto", objectFit: "contain",
            opacity: available ? 1 : 0.5,
            filter: available ? "none" : "grayscale(0.7)",
          }}
        />
        {/* Star rating badge */}
        <div style={{
          position: "absolute", top: 12, left: 12, background: "#fff",
          borderRadius: 100, padding: "3px 8px", display: "flex", gap: 1,
        }}>
          {[0, 1, 2, 3, 4].map((i) => <Star key={i} filled={i < car.rating} />)}
        </div>
        {/* Availability badge */}
        <div style={{
          position: "absolute", top: 12, right: 12,
          background: statusBg, color: statusFg, borderRadius: "var(--brc-radius-pill)",
          padding: "4px 10px", fontFamily: "var(--brc-font-ui)", fontWeight: 600, fontSize: 12,
        }}>
          {statusLabel}
        </div>
      </div>

      {/* Details */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
          borderBottom: "1px solid var(--brc-border)", paddingBottom: 10,
        }}>
          <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 15, fontWeight: 600, color: "var(--brc-text)" }}>
            {car.name}
          </span>
          <Chip>{car.type}</Chip>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--brc-text-muted)", fontSize: 12, fontFamily: "var(--brc-font-ui)" }}>
          <Icon name="pin" size={14} stroke="var(--brc-text-muted)" />
          {car.location}
        </div>

        {/* Price + specs always on one line */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "nowrap" }}>
          <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 18, color: available ? "var(--brc-text)" : "var(--brc-text-muted)", whiteSpace: "nowrap" }}>
            {priceLabel(car)}
          </span>
          {(car.year != null || (isBuy && car.mileage != null)) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "nowrap", flexShrink: 0 }}>
              {car.year != null && (
                <span style={specChipStyle}>
                  <Icon name="calendar" size={12} stroke="var(--brc-text-secondary)" />
                  {car.year}
                </span>
              )}
              {isBuy && car.mileage != null && (
                car.mileage === 0 ? (
                  <span style={{ ...specChipStyle, background: "var(--brc-success-bg)", borderColor: "var(--brc-success-bg)", color: "var(--brc-success)" }}>
                    Brand New
                  </span>
                ) : (
                  <span style={specChipStyle}>
                    <Icon name="car" size={12} stroke="var(--brc-text-secondary)" />
                    {car.mileage.toLocaleString("en-NG")} km
                  </span>
                )
              )}
            </div>
          )}
        </div>

        {/* CTA */}
        {available ? (
          <span
            className="brc-button-motion"
            style={{
              width: "100%", height: 46, borderRadius: "var(--brc-radius-sm)",
              border: "none", background: "var(--brc-primary)", color: "#fff",
              fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {cta}
          </span>
        ) : (
          <span
            aria-disabled="true"
            style={{
              width: "100%", height: 46, borderRadius: "var(--brc-radius-sm)",
              border: "1px solid var(--brc-border)", background: "var(--brc-bg-muted)",
              color: "var(--brc-text-muted)",
              fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {inactiveLabel}
          </span>
        )}
      </div>
    </>
  );

  const wrapStyle: React.CSSProperties = {
    width: "min(300px, calc(100vw - 48px))",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  };

  // Unavailable cars are inactive: not clickable, no hover lift.
  if (!available) {
    return <div style={{ ...wrapStyle, cursor: "default" }}>{content}</div>;
  }

  return (
    <Link
      href={`/cars/${car.id}?mode=${isBuy ? "buy" : "rent"}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...wrapStyle,
        cursor: "pointer",
        textDecoration: "none",
        color: "inherit",
        transition: "transform .2s ease",
        transform: hover ? "translateY(-4px)" : "none",
      }}
    >
      {content}
    </Link>
  );
}
