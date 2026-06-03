"use client";

import { useRef } from "react";
import { Icon } from "@/features/auth/components/icon";
import { CarCard, type Car } from "./car-card";

type CarRowProps = {
  title: string;
  cars: Car[];
  onAction?: (car: Car) => void;
};

const navBtnStyle: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 100,
  border: "1px solid var(--brc-border)", background: "#fff",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
};

export function CarRow({ title, cars, onAction }: CarRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: number) => ref.current?.scrollBy({
    left: d * Math.min(340, window.innerWidth - 48),
    behavior: "smooth",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <span style={{
          fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 13,
          letterSpacing: ".06em", color: "var(--brc-text-secondary)",
        }}>
          {title}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="brc-button-motion brc-button-motion-icon" onClick={() => scroll(-1)} style={navBtnStyle}>
            <Icon name="chevleft" size={18} stroke="var(--brc-text)" />
          </button>
          <button className="brc-button-motion brc-button-motion-icon" onClick={() => scroll(1)} style={navBtnStyle}>
            <Icon name="chevright" size={18} stroke="var(--brc-text)" />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        style={{
          display: "flex", gap: 28, overflowX: "auto", paddingBottom: 16,
          scrollbarWidth: "none",
        }}
      >
        {cars.map((c) => <CarCard key={c.id} car={c} onAction={onAction} />)}
      </div>
      {/* Dashed road divider */}
      <div style={{
        height: 4,
        background: "repeating-linear-gradient(90deg, #121212 0 22px, transparent 22px 40px)",
        opacity: 0.85, borderRadius: 2,
      }} />
    </div>
  );
}
