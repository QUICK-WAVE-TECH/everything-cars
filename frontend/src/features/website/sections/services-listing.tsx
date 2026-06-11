"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/features/auth/components/icon";
import { Star } from "@/shared/components/star";
import { Chip } from "@/shared/components/chip";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const SERVICE_MODES = {
  rent: {
    label: "Rent",
    hero: "/services-rent-hero.jpg",
    title: "Experience Hassle-Free Car Rentals",
    sub: "Enjoy discounted rates on premium rentals across major cities.",
    cta: "Rent Now",
    avail: ["Available", "Currently Rented"],
  },
  buy: {
    label: "Buy",
    hero: "/services-buy-hero.jpg",
    title: "Quality Cars Ready For You to Buy",
    sub: "Explore a wide range of cars from reliable dealers and private owners.",
    cta: "Buy Now",
    avail: ["Available", "Sold"],
  },
} as const;

type Mode = keyof typeof SERVICE_MODES;

const BASE_CARS = [
  { id: 1,  name: "Lexus NX 300h",      type: "SUV",    location: "Lagos, Nigeria",      rating: 4, rentPrice: 35000,  buyPrice: 35000000, available: true,  year: 2022, mileage: 25000 },
  { id: 2,  name: "Toyota Camry",        type: "Sedan",  location: "Abuja, Nigeria",      rating: 5, rentPrice: 28000,  buyPrice: 18000000, available: true,  year: 2021, mileage: 32000 },
  { id: 3,  name: "Honda Accord",        type: "Sedan",  location: "Lagos, Nigeria",      rating: 4, rentPrice: 30000,  buyPrice: 20000000, available: false, year: 2020, mileage: 41000 },
  { id: 4,  name: "Mercedes-Benz GLE",   type: "Luxury", location: "Lagos, Nigeria",      rating: 5, rentPrice: 85000,  buyPrice: 78000000, available: true,  year: 2024, mileage: 0 },
  { id: 5,  name: "Toyota RAV4",         type: "SUV",    location: "Port Harcourt",       rating: 4, rentPrice: 42000,  buyPrice: 28000000, available: true,  year: 2022, mileage: 28000 },
  { id: 6,  name: "Hyundai Elantra",     type: "Sedan",  location: "Ibadan, Nigeria",     rating: 3, rentPrice: 22000,  buyPrice: 15000000, available: false, year: 2019, mileage: 55000 },
  { id: 7,  name: "Lexus RX 350",        type: "SUV",    location: "Lagos, Nigeria",      rating: 5, rentPrice: 60000,  buyPrice: 52000000, available: true,  year: 2024, mileage: 0 },
  { id: 8,  name: "Kia Sportage",        type: "SUV",    location: "Abuja, Nigeria",      rating: 4, rentPrice: 38000,  buyPrice: 24000000, available: false, year: 2021, mileage: 30000 },
  { id: 9,  name: "Toyota Corolla",      type: "Sedan",  location: "Lagos, Nigeria",      rating: 4, rentPrice: 25000,  buyPrice: 16000000, available: true,  year: 2020, mileage: 47000 },
  { id: 10, name: "Ford Explorer",       type: "SUV",    location: "Lagos, Nigeria",      rating: 4, rentPrice: 48000,  buyPrice: 33000000, available: true,  year: 2022, mileage: 22000 },
  { id: 11, name: "Mercedes C-Class",    type: "Luxury", location: "Abuja, Nigeria",      rating: 5, rentPrice: 70000,  buyPrice: 45000000, available: false, year: 2023, mileage: 12000 },
  { id: 12, name: "Honda CR-V",          type: "SUV",    location: "Lagos, Nigeria",      rating: 4, rentPrice: 40000,  buyPrice: 26000000, available: true,  year: 2024, mileage: 0 },
];

const CAR_TYPES_LIST = ["Camry", "Chevrolet", "Ford", "Honda Accord", "Honda CRV", "Hyundai", "Kia", "Lexus"];
const LOCATIONS_STATE = ["All States", "Lagos", "Abuja (FCT)", "Rivers", "Oyo", "Kano"];
const LOCATIONS_CITY: Record<string, string[]> = {
  "All States": ["All Cities"],
  "Lagos": ["All Cities", "Ikeja", "Lekki", "Victoria Island", "Surulere"],
  "Abuja (FCT)": ["All Cities", "Garki", "Maitama", "Wuse", "Asokoro"],
  "Rivers": ["All Cities", "Port Harcourt", "Obio-Akpor"],
  "Oyo": ["All Cities", "Ibadan", "Ogbomoso"],
  "Kano": ["All Cities", "Kano City", "Nasarawa"],
};

const CARS_PER_PAGE = 9;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return n.toLocaleString("en-NG");
}

function fmtPrice(car: typeof BASE_CARS[0], mode: Mode): string {
  return mode === "rent"
    ? `₦${fmt(car.rentPrice)}/day`
    : `₦${fmt(car.buyPrice)}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: "var(--brc-primary-tint)",
        color: "var(--brc-primary)",
        borderRadius: "var(--brc-radius-pill)",
        padding: "4px 10px",
        fontSize: 12,
        fontFamily: "var(--brc-font-ui)",
        fontWeight: 600,
      }}
    >
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        style={{
          background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", padding: 0, color: "var(--brc-primary)",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </span>
  );
}

function PriceSlider({
  min, max, value, onChange,
}: {
  min: number; max: number; value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  const range = max - min;
  const leftPct = ((value[0] - min) / range) * 100;
  const rightPct = ((value[1] - min) / range) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
        {/* Track */}
        <div style={{
          position: "absolute", left: 0, right: 0, height: 4,
          background: "var(--brc-border)", borderRadius: 4,
        }} />
        {/* Fill */}
        <div style={{
          position: "absolute",
          left: `${leftPct}%`, width: `${rightPct - leftPct}%`,
          height: 4, background: "var(--brc-primary)", borderRadius: 4,
        }} />
        {/* Min thumb */}
        <input
          type="range" min={min} max={max} step={1000} value={value[0]}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), value[1] - 1000);
            onChange([v, value[1]]);
          }}
          style={{
            position: "absolute", width: "100%", appearance: "none",
            background: "transparent", cursor: "pointer", zIndex: 2,
          }}
        />
        {/* Max thumb */}
        <input
          type="range" min={min} max={max} step={1000} value={value[1]}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), value[0] + 1000);
            onChange([value[0], v]);
          }}
          style={{
            position: "absolute", width: "100%", appearance: "none",
            background: "transparent", cursor: "pointer", zIndex: 2,
          }}
        />
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        fontFamily: "var(--brc-font-ui)", fontSize: 12,
        color: "var(--brc-text-secondary)",
      }}>
        <span>₦{fmt(value[0])}</span>
        <span>₦{fmt(value[1])}</span>
      </div>
    </div>
  );
}

function ServiceCarCard({
  car, mode, cta,
}: {
  car: typeof BASE_CARS[0];
  mode: Mode;
  cta: string;
}) {
  const [hover, setHover] = useState(false);
  const available = car.available;
  const inactiveLabel = mode === "buy" ? "Sold" : "Currently Rented";
  const statusLabel = available ? "Available" : inactiveLabel;
  const statusBg = available
    ? "var(--brc-success-bg)"
    : mode === "buy" ? "var(--brc-danger-bg)" : "var(--brc-warning-bg)";
  const statusFg = available
    ? "var(--brc-success)"
    : mode === "buy" ? "var(--brc-danger)" : "#9a7400";

  const specChipStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 4,
    background: "var(--brc-bg-subtle)", border: "1px solid var(--brc-border)",
    borderRadius: "var(--brc-radius-pill)", padding: "3px 8px",
    fontFamily: "var(--brc-font-ui)", fontSize: 11, fontWeight: 600,
    color: "var(--brc-text-secondary)", whiteSpace: "nowrap",
  };

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
          position: "absolute", top: 12, left: 12,
          background: "#fff", borderRadius: 100,
          padding: "3px 8px", display: "flex", gap: 1,
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
        {/* Price + car specs always on one line (year for rent & buy; mileage/condition buy-only) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "nowrap" }}>
          <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 18, color: available ? "var(--brc-text)" : "var(--brc-text-muted)", whiteSpace: "nowrap" }}>
            {fmtPrice(car, mode)}
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "nowrap", flexShrink: 0 }}>
            <span style={specChipStyle}>
              <Icon name="calendar" size={12} stroke="var(--brc-text-secondary)" />
              {car.year}
            </span>
            {mode === "buy" &&
              (car.mileage === 0 ? (
                <span style={{ ...specChipStyle, background: "var(--brc-success-bg)", borderColor: "var(--brc-success-bg)", color: "var(--brc-success)" }}>
                  Brand New
                </span>
              ) : (
                <span style={specChipStyle}>
                  <Icon name="car" size={13} stroke="var(--brc-text-secondary)" />
                  {fmt(car.mileage)} km
                </span>
              ))}
          </div>
        </div>
        {/* Full-width CTA */}
        {available ? (
          <button
            className="brc-button-motion"
            style={{
              width: "100%", height: 46, borderRadius: "var(--brc-radius-sm)",
              border: "none", background: "var(--brc-primary)", color: "#fff",
              fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 14,
              cursor: "pointer",
            }}
          >
            {cta}
          </button>
        ) : (
          <button
            disabled
            aria-disabled="true"
            style={{
              width: "100%", height: 46, borderRadius: "var(--brc-radius-sm)",
              border: "1px solid var(--brc-border)", background: "var(--brc-bg-muted)",
              color: "var(--brc-text-muted)",
              fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 14,
              cursor: "not-allowed",
            }}
          >
            {inactiveLabel}
          </button>
        )}
      </div>
    </>
  );

  // Unavailable cars are inactive: not clickable, no hover lift.
  if (!available) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, cursor: "default" }}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/cars/${car.id}?mode=${mode}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", flexDirection: "column", gap: 14,
        cursor: "pointer", transition: "transform .2s ease",
        transform: hover ? "translateY(-4px)" : "none",
        textDecoration: "none", color: "inherit",
      }}
    >
      {content}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Filter sidebar
// ---------------------------------------------------------------------------

type Filters = {
  types: string[];
  availability: string;
  state: string;
  city: string;
  price: [number, number];
};

function FilterSidebar({
  mode, filters, onChange,
}: {
  mode: Mode;
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const [showAllTypes, setShowAllTypes] = useState(false);
  const visibleTypes = showAllTypes ? CAR_TYPES_LIST : CAR_TYPES_LIST.slice(0, 5);
  const modeData = SERVICE_MODES[mode];

  const maxPrice = mode === "rent" ? 200000 : 100000000;
  const minPrice = 0;

  const activeFilterChips: { label: string; clear: () => void }[] = [
    ...filters.types.map((t) => ({
      label: t,
      clear: () => onChange({ ...filters, types: filters.types.filter((x) => x !== t) }),
    })),
    ...(filters.availability !== "All"
      ? [{ label: filters.availability, clear: () => onChange({ ...filters, availability: "All" }) }]
      : []),
    ...(filters.state !== "All States"
      ? [{ label: filters.state, clear: () => onChange({ ...filters, state: "All States", city: "All Cities" }) }]
      : []),
    ...(filters.city !== "All Cities"
      ? [{ label: filters.city, clear: () => onChange({ ...filters, city: "All Cities" }) }]
      : []),
  ];

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--brc-font-ui)", fontSize: 13,
    color: "var(--brc-text-secondary)", fontWeight: 600,
    textTransform: "uppercase" as const, letterSpacing: "0.04em",
  };

  const selectStyle: React.CSSProperties = {
    height: 40, borderRadius: "var(--brc-radius-sm)",
    border: "1px solid var(--brc-border)", background: "var(--brc-bg-subtle)",
    padding: "0 12px", fontFamily: "var(--brc-font-ui)", fontSize: 13,
    color: "var(--brc-text)", outline: "none", width: "100%",
    appearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2397989A' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
  };

  const radioStyle: React.CSSProperties = {
    width: 16, height: 16, accentColor: "var(--brc-primary)", cursor: "pointer",
  };

  return (
    <aside className="services-filter-sidebar" style={{
      width: 240, flexShrink: 0,
      display: "flex", flexDirection: "column", gap: 0,
      border: "1px solid var(--brc-border)",
      borderRadius: "var(--brc-radius-md)",
      overflow: "hidden",
      alignSelf: "flex-start",
      position: "sticky", top: 104,
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--brc-border)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 15, color: "var(--brc-text)" }}>
          Filters
        </span>
        <button
          onClick={() => onChange({
            types: [], availability: "All",
            state: "All States", city: "All Cities",
            price: [minPrice, maxPrice],
          })}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "var(--brc-font-ui)", fontSize: 12,
            color: "var(--brc-primary)", fontWeight: 600,
          }}
        >
          Reset all
        </button>
      </div>

      <Accordion multiple defaultValue={["active", "type", "avail", "location", "price"]}>

        {/* Active Filters */}
        {activeFilterChips.length > 0 && (
          <AccordionItem value="active">
            <AccordionTrigger className="px-[18px] py-3 text-[13px] font-semibold" style={{ color: "var(--brc-text)" }}>
              Active Filters
            </AccordionTrigger>
            <AccordionContent className="px-[18px] pb-4">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {activeFilterChips.map((c) => (
                  <FilterChip key={c.label} label={c.label} onRemove={c.clear} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Car Type */}
        <AccordionItem value="type">
          <AccordionTrigger className="px-[18px] py-3 text-[13px] font-semibold" style={{ color: "var(--brc-text)" }}>
            Car Type
          </AccordionTrigger>
          <AccordionContent className="px-[18px] pb-4">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {visibleTypes.map((t) => (
                <label key={t} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <Checkbox
                    checked={filters.types.includes(t)}
                    onCheckedChange={(checked) => {
                      const next = checked
                        ? [...filters.types, t]
                        : filters.types.filter((x) => x !== t);
                      onChange({ ...filters, types: next });
                    }}
                  />
                  <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-secondary)" }}>
                    {t}
                  </span>
                </label>
              ))}
              <button
                onClick={() => setShowAllTypes((s) => !s)}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  fontFamily: "var(--brc-font-ui)", fontSize: 12, fontWeight: 600,
                  color: "var(--brc-primary)", textAlign: "left" as const,
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                {showAllTypes ? "Less" : `+${CAR_TYPES_LIST.length - 5} More`}
                <Icon name={showAllTypes ? "chevup" : "chevdown"} size={12} stroke="var(--brc-primary)" />
              </button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Availability */}
        <AccordionItem value="avail">
          <AccordionTrigger className="px-[18px] py-3 text-[13px] font-semibold" style={{ color: "var(--brc-text)" }}>
            Availability
          </AccordionTrigger>
          <AccordionContent className="px-[18px] pb-4">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {["All", ...modeData.avail].map((a) => (
                <label key={a} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input
                    type="radio" name="availability" value={a}
                    checked={filters.availability === a}
                    onChange={() => onChange({ ...filters, availability: a })}
                    style={radioStyle}
                  />
                  <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-secondary)" }}>
                    {a}
                  </span>
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Location */}
        <AccordionItem value="location">
          <AccordionTrigger className="px-[18px] py-3 text-[13px] font-semibold" style={{ color: "var(--brc-text)" }}>
            Location
          </AccordionTrigger>
          <AccordionContent className="px-[18px] pb-4">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={labelStyle}>State</span>
                <select
                  value={filters.state}
                  onChange={(e) => onChange({ ...filters, state: e.target.value, city: "All Cities" })}
                  style={selectStyle}
                >
                  {LOCATIONS_STATE.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={labelStyle}>City</span>
                <select
                  value={filters.city}
                  onChange={(e) => onChange({ ...filters, city: e.target.value })}
                  style={selectStyle}
                >
                  {(LOCATIONS_CITY[filters.state] || ["All Cities"]).map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Price */}
        <AccordionItem value="price">
          <AccordionTrigger className="px-[18px] py-3 text-[13px] font-semibold" style={{ color: "var(--brc-text)" }}>
            Price Range
          </AccordionTrigger>
          <AccordionContent className="px-[18px] pb-5">
            <PriceSlider
              min={minPrice}
              max={maxPrice}
              value={filters.price}
              onChange={(v) => onChange({ ...filters, price: v })}
            />
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

// Maps a landing-page price option to a mode + price range.
function priceConfigFor(option: string): { mode: Mode; range: [number, number] } | null {
  switch (option) {
    case "Under ₦50k/day": return { mode: "rent", range: [0, 50000] };
    case "₦50k–₦200k/day": return { mode: "rent", range: [50000, 200000] };
    case "₦5M–₦20M": return { mode: "buy", range: [5000000, 20000000] };
    case "₦20M+": return { mode: "buy", range: [20000000, 100000000] };
    default: return null;
  }
}

export function ServicesListing() {
  const searchParams = useSearchParams();
  const initialLocation = searchParams.get("location") ?? "";
  const initialType = searchParams.get("type") ?? "";
  const priceConfig = priceConfigFor(searchParams.get("price") ?? "");
  const initialMode: Mode = priceConfig?.mode ?? "rent";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [search, setSearch] = useState(initialLocation);
  // Body type from the landing search (e.g. "SUV"); "" means no constraint.
  const bodyType = initialType && initialType !== "All" ? initialType : "";
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    types: [],
    availability: "All",
    state: "All States",
    city: "All Cities",
    price: priceConfig?.range ?? (initialMode === "rent" ? [0, 200000] : [0, 100000000]),
  });

  const modeData = SERVICE_MODES[mode];

  // Reset page and price range when mode changes
  function handleModeSwitch(m: Mode) {
    setMode(m);
    setPage(1);
    setFilters({
      types: [],
      availability: "All",
      state: "All States",
      city: "All Cities",
      price: m === "rent" ? [0, 200000] : [0, 100000000],
    });
  }

  const filtered = useMemo(() => {
    return BASE_CARS.filter((car) => {
      // search
      if (search && !car.name.toLowerCase().includes(search.toLowerCase()) &&
          !car.location.toLowerCase().includes(search.toLowerCase()) &&
          !car.type.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // body type from landing search (e.g. SUV / Sedan / Luxury)
      if (bodyType && car.type.toLowerCase() !== bodyType.toLowerCase()) return false;
      // type filter — match against brand names loosely
      if (filters.types.length > 0) {
        const nameUpper = car.name.toLowerCase();
        const matched = filters.types.some((t) => {
          const first = t.toLowerCase().split(" ")[0];
          return first !== undefined && nameUpper.includes(first);
        });
        if (!matched) return false;
      }
      // availability ("All" | "Available" | "Currently Rented"/"Sold")
      if (filters.availability !== "All") {
        const wantAvailable = filters.availability === "Available";
        if (car.available !== wantAvailable) return false;
      }
      // price range
      const price = mode === "rent" ? car.rentPrice : car.buyPrice;
      if (price < filters.price[0] || price > filters.price[1]) return false;
      // location (rough match by state key word)
      if (filters.state !== "All States") {
        const stateKey = filters.state.replace(" (FCT)", "").toLowerCase();
        if (!car.location.toLowerCase().includes(stateKey)) return false;
      }
      return true;
    });
  }, [search, filters, mode, bodyType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / CARS_PER_PAGE));
  const currentCars = filtered.slice((page - 1) * CARS_PER_PAGE, page * CARS_PER_PAGE);
  const startResult = filtered.length === 0 ? 0 : (page - 1) * CARS_PER_PAGE + 1;
  const endResult = Math.min(page * CARS_PER_PAGE, filtered.length);

  function handleFiltersChange(f: Filters) {
    setFilters(f);
    setPage(1);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section style={{
        position: "relative",
        minHeight: "clamp(300px, 42vh, 440px)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center", gap: 16, overflow: "hidden",
        padding: "var(--brc-section-y, 104px) var(--brc-space-10, 104px)",
      }}>
        <Image
          src={modeData.hero}
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover", zIndex: 0 }}
        />
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.35))",
          zIndex: 1,
        }} />
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <h1 style={{
            fontFamily: "var(--brc-font-display)", fontWeight: 800,
            fontSize: "clamp(30px, 6vw, 56px)", lineHeight: 1.15,
            color: "#fff", margin: 0, maxWidth: 740,
          }}>
            {modeData.title}
          </h1>
          <p style={{
            fontFamily: "var(--brc-font-ui)", fontSize: "clamp(15px, 3vw, 19px)", lineHeight: 1.55,
            color: "rgba(255,255,255,.9)", margin: 0, maxWidth: 540,
          }}>
            {modeData.sub}
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Page body: sidebar + main                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="services-listing-shell" style={{
        display: "flex", gap: 32, alignItems: "flex-start",
        padding: "48px clamp(20px, 8vw, 104px) 80px",
        maxWidth: 1400, margin: "0 auto", width: "100%",
      }}>

        {/* Filter sidebar */}
        <FilterSidebar mode={mode} filters={filters} onChange={handleFiltersChange} />

        {/* Main content */}
        <div className="services-listing-main" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Top bar: search + mode toggle */}
          <div className="services-listing-toolbar" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {/* Search */}
            <div className="services-listing-search" style={{
              flex: 1, minWidth: 220, position: "relative",
              display: "flex", alignItems: "center",
            }}>
              <span style={{ position: "absolute", left: 12, display: "flex", pointerEvents: "none" }}>
                <Icon name="search" size={16} stroke="var(--brc-text-muted)" />
              </span>
              <Input
                placeholder="Search by name, type, or location…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 h-11 text-sm"
                style={{ fontFamily: "var(--brc-font-ui)" }}
              />
            </div>

            {/* Rent / Buy toggle */}
            <div className="services-mode-toggle" style={{
              display: "flex", borderRadius: "var(--brc-radius-sm)",
              border: "1px solid var(--brc-border)",
              overflow: "hidden", flexShrink: 0,
            }}>
              {(["rent", "buy"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => handleModeSwitch(m)}
                  style={{
                    padding: "0 24px", height: 44,
                    background: mode === m ? "var(--brc-primary)" : "#fff",
                    color: mode === m ? "#fff" : "var(--brc-text-secondary)",
                    border: "none", cursor: "pointer",
                    fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 14,
                    transition: "background .2s, color .2s",
                  }}
                >
                  {SERVICE_MODES[m].label}
                </button>
              ))}
            </div>
          </div>

          {/* Result count */}
          <p style={{
            fontFamily: "var(--brc-font-ui)", fontSize: 13,
            color: "var(--brc-text-muted)", margin: 0,
          }}>
            Showing{" "}
            <strong style={{ color: "var(--brc-text)" }}>
              {startResult}–{endResult}
            </strong>
            {" "}of <strong style={{ color: "var(--brc-text)" }}>{filtered.length}</strong> results
          </p>

          {/* Car grid */}
          {currentCars.length > 0 ? (
            <div className="services-car-grid" style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
              gap: "clamp(16px, 3vw, 28px)",
            }}>
              {currentCars.map((car) => (
                <ServiceCarCard key={car.id} car={car} mode={mode} cta={modeData.cta} />
              ))}
            </div>
          ) : (
            <div style={{
              padding: "60px 20px", textAlign: "center",
              color: "var(--brc-text-muted)", fontFamily: "var(--brc-font-ui)", fontSize: 15,
            }}>
              No cars match your current filters.
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="services-pagination" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 8 }}>
              {/* Prev */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
              >
                <Icon name="chevleft" size={16} />
              </Button>

              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  aria-current={p === page ? "page" : undefined}
                  style={{
                    width: 36, height: 36,
                    borderRadius: "var(--brc-radius-sm)",
                    border: `1px solid ${p === page ? "var(--brc-primary)" : "var(--brc-border)"}`,
                    background: p === page ? "var(--brc-primary)" : "#fff",
                    color: p === page ? "#fff" : "var(--brc-text)",
                    fontFamily: "var(--brc-font-ui)", fontWeight: 600, fontSize: 14,
                    cursor: "pointer",
                    transition: "background .15s, color .15s, border-color .15s",
                  }}
                >
                  {p}
                </button>
              ))}

              {/* Next */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
              >
                <Icon name="chevright" size={16} />
              </Button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .services-listing-shell {
            flex-direction: column !important;
            gap: 24px !important;
            padding-top: 36px !important;
            padding-bottom: 64px !important;
          }

          .services-filter-sidebar {
            width: 100% !important;
            position: static !important;
            align-self: stretch !important;
          }
        }

        @media (max-width: 640px) {
          .services-listing-shell {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .services-listing-toolbar {
            align-items: stretch !important;
          }

          .services-listing-search {
            min-width: 100% !important;
          }

          .services-mode-toggle {
            width: 100% !important;
            flex-shrink: 1 !important;
          }

          .services-mode-toggle > button {
            flex: 1 1 0 !important;
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          .services-car-grid {
            grid-template-columns: 1fr !important;
          }

          .services-pagination {
            flex-wrap: wrap !important;
          }
        }
      `}</style>
    </div>
  );
}
