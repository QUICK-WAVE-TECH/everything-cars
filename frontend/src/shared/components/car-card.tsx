"use client";

import { useState } from "react";
import Image from "next/image";
import { Icon } from "@/features/auth/components/icon";
import { Star } from "./star";
import { Chip } from "./chip";

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

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 300, flexShrink: 0, display: "flex", flexDirection: "column",
        gap: 16, cursor: "pointer", transition: "transform .2s ease",
        transform: hover ? "translateY(-4px)" : "none",
      }}
    >
      {/* Image tile */}
      <div style={{
        position: "relative", height: 200, borderRadius: 16,
        background: "var(--brc-bg-subtle)", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: hover ? "var(--brc-shadow-md)" : "var(--brc-shadow-xs)",
        transition: "box-shadow .2s ease",
      }}>
        <Image src="/car-lexus.png" alt={car.name} width={258} height={160} style={{ width: "86%", height: "auto", objectFit: "contain" }} />
        <div style={{
          position: "absolute", top: 12, left: 12, background: "#fff",
          borderRadius: 100, padding: "3px 8px", display: "flex", gap: 1,
        }}>
          {[0, 1, 2, 3, 4].map((i) => <Star key={i} filled={i < car.rating} />)}
        </div>
      </div>

      {/* Details */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 8,
        borderBottom: "1px solid var(--brc-border)", paddingBottom: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 16, color: "var(--brc-text)" }}>{car.name}</span>
          <Chip>{car.type}</Chip>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--brc-text-secondary)", fontSize: 12 }}>
          <Icon name="pin" size={14} stroke="var(--brc-text-secondary)" />
          {car.location}
        </div>
      </div>

      {/* Price + CTA */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 22 }}>{car.price}</span>
        <button
          onClick={() => onAction?.(car)}
          style={{
            height: 44, borderRadius: 8, border: "none", padding: "0 18px",
            background: "var(--brc-secondary)", color: "#FAFAFA",
            fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 14,
            cursor: "pointer", transition: "background .18s ease",
          }}
        >
          {cta}
        </button>
      </div>
    </div>
  );
}

export type { Car };
