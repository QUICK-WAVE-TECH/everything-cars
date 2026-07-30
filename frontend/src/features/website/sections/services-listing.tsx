"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/features/auth/components/icon";
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
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicCars, useFilterOptions } from "@/features/listings/api";
import { AvailabilityBadge } from "@/features/listings/components/availability-badge";
import type { CarListItem } from "@/features/listings/api";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SERVICE_MODES = {
  rent: {
    label: "Rent",
    hero: "/services-rent-hero.jpg",
    title: "Experience Hassle-Free Car Rentals",
    sub: "Enjoy discounted rates on premium rentals across major cities.",
    cta: "Rent Now",
  },
  buy: {
    label: "Buy",
    hero: "/services-buy-hero.jpg",
    title: "Quality Cars Ready For You to Buy",
    sub: "Explore a wide range of cars from reliable dealers and private owners.",
    cta: "Buy Now",
  },
} as const;

type Mode = keyof typeof SERVICE_MODES;

const ALL_STATES_LABEL = "All States";
const ALL_CITIES_LABEL = "All Cities";

const CARS_PER_PAGE = 9;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currencySymbol(code: string) {
  const map: Record<string, string> = { NGN: "\u20A6", USD: "$", GBP: "\u00A3", EUR: "\u20AC" };
  return map[code] ?? code;
}

function fmtMoney(amount: string | number, currency: string) {
  return `${currencySymbol(currency)}${Number(amount).toLocaleString("en-NG")}`;
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
        <div style={{ position: "absolute", left: 0, right: 0, height: 4, background: "var(--brc-border)", borderRadius: 4 }} />
        <div style={{ position: "absolute", left: `${leftPct}%`, width: `${rightPct - leftPct}%`, height: 4, background: "var(--brc-primary)", borderRadius: 4 }} />
        <input
          type="range" min={min} max={max} step={1000} value={value[0]}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), value[1] - 1000);
            onChange([v, value[1]]);
          }}
          style={{ position: "absolute", width: "100%", appearance: "none", background: "transparent", cursor: "pointer", zIndex: 2 }}
        />
        <input
          type="range" min={min} max={max} step={1000} value={value[1]}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), value[0] + 1000);
            onChange([value[0], v]);
          }}
          style={{ position: "absolute", width: "100%", appearance: "none", background: "transparent", cursor: "pointer", zIndex: 2 }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--brc-font-ui)", fontSize: 12, color: "var(--brc-text-secondary)" }}>
        <span>&#x20A6;{value[0].toLocaleString("en-NG")}</span>
        <span>&#x20A6;{value[1].toLocaleString("en-NG")}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Car card (real API data)
// ---------------------------------------------------------------------------

function ServiceCarCard({ car, mode, cta }: { car: CarListItem; mode: Mode; cta: string }) {
  const [hover, setHover] = useState(false);
  const isSold = car.availability_status === "sold";
  const isRented = car.availability_status === "rented";
  const isUnavailable = isSold || isRented;

  const price = mode === "rent" && car.rent_price_per_day
    ? `${fmtMoney(car.rent_price_per_day, car.currency)}/day`
    : car.sale_price
      ? fmtMoney(car.sale_price, car.currency)
      : null;

  const specChipStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 5,
    background: "var(--brc-bg-subtle)", border: "1px solid var(--brc-border)",
    borderRadius: "var(--brc-radius-pill)", padding: "4px 10px",
    fontFamily: "var(--brc-font-ui)", fontSize: 12, fontWeight: 600,
    color: "var(--brc-text-secondary)",
  };

  const content = (
    <>
      {/* Image tile */}
      <div style={{
        position: "relative", height: 200, borderRadius: "var(--brc-radius-lg)",
        background: "var(--brc-bg-subtle)", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: hover && !isUnavailable ? "var(--brc-shadow-md)" : "var(--brc-shadow-xs)",
        transition: "box-shadow .2s ease",
        opacity: isSold ? 0.7 : 1,
      }}>
        {car.primary_image ? (
          <Image
            src={car.primary_image}
            alt={car.title}
            fill
            style={{
              objectFit: "contain",
              padding: 20,
              filter: isRented ? "grayscale(0.3)" : isSold ? "grayscale(0.7)" : "none",
            }}
          />
        ) : (
          <Icon name="car" size={56} stroke="var(--brc-border)" />
        )}

        {/* Availability badge overlay */}
        <div style={{ position: "absolute", top: 10, right: 10 }}>
          <AvailabilityBadge status={car.availability_status} listingType={car.listing_type} />
        </div>
      </div>

      {/* Details */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
          borderBottom: "1px solid var(--brc-border)", paddingBottom: 10,
        }}>
          <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 15, fontWeight: 600, color: isUnavailable ? "var(--brc-text-muted)" : "var(--brc-text)" }}>
            {car.title}
          </span>
          <Chip>{car.body_type || car.brand}</Chip>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--brc-text-muted)", fontSize: 12, fontFamily: "var(--brc-font-ui)" }}>
          <Icon name="pin" size={14} stroke="var(--brc-text-muted)" />
          {car.city ? `${car.city}, ${car.state}` : car.state}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 20, color: isUnavailable ? "var(--brc-text-muted)" : "var(--brc-text)" }}>
            {price ?? "—"}
          </span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={specChipStyle}>
              <Icon name="calendar" size={13} stroke="var(--brc-text-secondary)" />
              {car.year}
            </span>
          </div>
        </div>

        {/* CTA */}
        {isSold ? (
          <div
            style={{
              width: "100%", height: 46, borderRadius: "var(--brc-radius-sm)",
              border: "1px solid var(--brc-border)", background: "var(--brc-bg-muted)",
              color: "var(--brc-text-muted)",
              fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            Sold
          </div>
        ) : isRented ? (
          <div
            style={{
              width: "100%", height: 46, borderRadius: "var(--brc-radius-sm)",
              border: "1px solid var(--brc-border)", background: "var(--brc-warning-bg, #fffbeb)",
              color: "#9a7400",
              fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            Currently Rented
          </div>
        ) : (
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
        )}
      </div>
    </>
  );

  if (isUnavailable) {
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
// Sold car card (carousel)
// ---------------------------------------------------------------------------

function SoldCarCard({ car }: { car: CarListItem }) {
  return (
    <Link
      href={`/cars/${car.id}`}
      style={{
        display: "flex", flexDirection: "column", gap: 10,
        textDecoration: "none", color: "inherit",
        width: 220, flexShrink: 0, opacity: 0.75,
      }}
    >
      <div style={{
        position: "relative", height: 150, borderRadius: "var(--brc-radius-lg)",
        background: "var(--brc-bg-subtle)", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {car.primary_image ? (
          <Image
            src={car.primary_image}
            alt={car.title}
            fill
            style={{ objectFit: "contain", padding: 16, filter: "grayscale(0.6)" }}
          />
        ) : (
          <Icon name="car" size={40} stroke="var(--brc-border)" />
        )}
        <div style={{ position: "absolute", top: 8, right: 8 }}>
          <AvailabilityBadge status="sold" />
        </div>
      </div>
      <div>
        <p style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 600, fontSize: 13, color: "var(--brc-text-muted)", margin: "0 0 2px" }}>
          {car.title}
        </p>
        <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 12, color: "var(--brc-text-muted)", margin: 0 }}>
          {car.city ? `${car.city}, ${car.state}` : car.state}
        </p>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function CarGridSkeleton() {
  return (
    <div
      className="services-car-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
        gap: "clamp(16px, 3vw, 28px)",
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter sidebar
// ---------------------------------------------------------------------------

type Filters = {
  brands: string[];
  bodyType: string;
  availability: string;
  state: string;
  city: string;
  price: [number, number];
};

function FilterSidebar({
  mode, filters, onChange,
  availableStates, availableCities, availableBodyTypes, availableBrands,
}: {
  mode: Mode;
  filters: Filters;
  onChange: (f: Filters) => void;
  availableStates: string[];
  availableCities: string[];
  availableBodyTypes: string[];
  availableBrands: string[];
}) {
  const [showAllBrands, setShowAllBrands] = useState(false);
  const visibleBrands = showAllBrands ? availableBrands : availableBrands.slice(0, 5);

  const maxPrice = mode === "rent" ? 1000000 : 500000000;
  const minPrice = 0;

  const availOptions = mode === "rent"
    ? ["All", "Available", "Currently Rented"]
    : ["All", "Available", "Sold"];

  const activeFilterChips: { label: string; clear: () => void }[] = [
    ...filters.brands.map((t) => ({
      label: t,
      clear: () => onChange({ ...filters, brands: filters.brands.filter((x) => x !== t) }),
    })),
    ...(filters.bodyType !== "All"
      ? [{ label: filters.bodyType, clear: () => onChange({ ...filters, bodyType: "All" }) }]
      : []),
    ...(filters.availability !== "All"
      ? [{ label: filters.availability, clear: () => onChange({ ...filters, availability: "All" }) }]
      : []),
    ...(filters.state !== ALL_STATES_LABEL
      ? [{ label: filters.state, clear: () => onChange({ ...filters, state: ALL_STATES_LABEL, city: ALL_CITIES_LABEL }) }]
      : []),
    ...(filters.city !== ALL_CITIES_LABEL
      ? [{ label: filters.city, clear: () => onChange({ ...filters, city: ALL_CITIES_LABEL }) }]
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
            brands: [], bodyType: "All", availability: "All",
            state: ALL_STATES_LABEL, city: ALL_CITIES_LABEL,
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

      <Accordion multiple defaultValue={["active", "brand", "bodytype", "avail", "location", "price"]}>

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

        {/* Car Brand */}
        <AccordionItem value="brand">
          <AccordionTrigger className="px-[18px] py-3 text-[13px] font-semibold" style={{ color: "var(--brc-text)" }}>
            Car Brand
          </AccordionTrigger>
          <AccordionContent className="px-[18px] pb-4">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {visibleBrands.map((t) => (
                <label key={t} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <Checkbox
                    checked={filters.brands.includes(t)}
                    onCheckedChange={(checked) => {
                      const next = checked
                        ? [...filters.brands, t]
                        : filters.brands.filter((x) => x !== t);
                      onChange({ ...filters, brands: next });
                    }}
                  />
                  <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-secondary)" }}>
                    {t}
                  </span>
                </label>
              ))}
              {availableBrands.length > 5 && (
                <button
                  onClick={() => setShowAllBrands((s) => !s)}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                    fontFamily: "var(--brc-font-ui)", fontSize: 12, fontWeight: 600,
                    color: "var(--brc-primary)", textAlign: "left" as const,
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  {showAllBrands ? "Less" : `+${availableBrands.length - 5} More`}
                  <Icon name={showAllBrands ? "chevup" : "chevdown"} size={12} stroke="var(--brc-primary)" />
                </button>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Body Type */}
        {availableBodyTypes.length > 0 && (
          <AccordionItem value="bodytype">
            <AccordionTrigger className="px-[18px] py-3 text-[13px] font-semibold" style={{ color: "var(--brc-text)" }}>
              Body Type
            </AccordionTrigger>
            <AccordionContent className="px-[18px] pb-4">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input
                    type="radio" name="bodytype" value="All"
                    checked={filters.bodyType === "All"}
                    onChange={() => onChange({ ...filters, bodyType: "All" })}
                    style={radioStyle}
                  />
                  <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-secondary)" }}>All</span>
                </label>
                {availableBodyTypes.map((bt) => (
                  <label key={bt} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input
                      type="radio" name="bodytype" value={bt}
                      checked={filters.bodyType === bt}
                      onChange={() => onChange({ ...filters, bodyType: bt })}
                      style={radioStyle}
                    />
                    <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-secondary)" }}>
                      {bt}
                    </span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Availability */}
        <AccordionItem value="avail">
          <AccordionTrigger className="px-[18px] py-3 text-[13px] font-semibold" style={{ color: "var(--brc-text)" }}>
            Availability
          </AccordionTrigger>
          <AccordionContent className="px-[18px] pb-4">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {availOptions.map((a) => (
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
                  onChange={(e) => onChange({ ...filters, state: e.target.value, city: ALL_CITIES_LABEL })}
                  style={selectStyle}
                >
                  <option value={ALL_STATES_LABEL}>{ALL_STATES_LABEL}</option>
                  {availableStates.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={labelStyle}>City</span>
                <select
                  value={filters.city}
                  onChange={(e) => onChange({ ...filters, city: e.target.value })}
                  style={selectStyle}
                >
                  <option value={ALL_CITIES_LABEL}>{ALL_CITIES_LABEL}</option>
                  {availableCities.map((c) => <option key={c} value={c}>{c}</option>)}
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

export function ServicesListing() {
  const [mode, setMode] = useState<Mode>("rent");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    brands: [],
    bodyType: "All",
    availability: "All",
    state: ALL_STATES_LABEL,
    city: ALL_CITIES_LABEL,
    price: [0, 1000000],
  });

  const modeData = SERVICE_MODES[mode];

  // Fetch filter dropdown options from backend
  const { data: filterOptions } = useFilterOptions();
  const availableStates = filterOptions?.states ?? [];
  const availableBodyTypes = filterOptions?.body_types ?? [];
  const availableBrands = filterOptions?.brands ?? [];

  // Derive city list: if a specific state is selected, show all cities from the API
  // (backend returns all cities; we rely on the state API param to narrow results)
  const availableCities = filterOptions?.cities ?? [];

  // Fetch from real API — pass all server-side filterable params
  const { data: carsData, isLoading } = usePublicCars({
    listing_type: mode,
    state: filters.state !== ALL_STATES_LABEL ? filters.state : undefined,
    city: filters.city !== ALL_CITIES_LABEL ? filters.city : undefined,
    brand: filters.brands.length === 1 ? filters.brands[0] : undefined,
    body_type: filters.bodyType !== "All" ? filters.bodyType : undefined,
    search: search || undefined,
  });

  const allCars = useMemo(() => carsData?.results ?? [], [carsData?.results]);

  // Split into published (available/rented) and sold
  const publishedCars = useMemo(
    () => allCars.filter((c) => c.availability_status !== "sold"),
    [allCars],
  );
  const soldCars = useMemo(
    () => allCars.filter((c) => c.availability_status === "sold"),
    [allCars],
  );

  // Client-side filters on published cars (multi-brand, availability, price)
  const filtered = useMemo(() => {
    return publishedCars.filter((car) => {
      // multi-brand filter (client-side when >1 brand selected)
      if (filters.brands.length > 1) {
        const titleLower = car.title.toLowerCase();
        const brandLower = car.brand.toLowerCase();
        const matched = filters.brands.some((b) => {
          const first = b.toLowerCase().split(" ")[0];
          return first !== undefined && (titleLower.includes(first) || brandLower.includes(first));
        });
        if (!matched) return false;
      }
      // availability
      if (filters.availability !== "All") {
        if (filters.availability === "Available" && car.availability_status !== "available") return false;
        if (filters.availability === "Currently Rented" && car.availability_status !== "rented") return false;
        if (filters.availability === "Sold" && car.availability_status !== "sold") return false;
      }
      // price
      const price = mode === "rent"
        ? Number(car.rent_price_per_day ?? 0)
        : Number(car.sale_price ?? 0);
      if (price < filters.price[0] || price > filters.price[1]) return false;
      return true;
    });
  }, [publishedCars, filters, mode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / CARS_PER_PAGE));
  const currentCars = filtered.slice((page - 1) * CARS_PER_PAGE, page * CARS_PER_PAGE);
  const startResult = filtered.length === 0 ? 0 : (page - 1) * CARS_PER_PAGE + 1;
  const endResult = Math.min(page * CARS_PER_PAGE, filtered.length);

  // Reset page when mode changes
  function handleModeSwitch(m: Mode) {
    setMode(m);
    setPage(1);
    setFilters({
      brands: [],
      bodyType: "All",
      availability: "All",
      state: ALL_STATES_LABEL,
      city: ALL_CITIES_LABEL,
      price: m === "rent" ? [0, 1000000] : [0, 500000000],
    });
  }

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
        <FilterSidebar
          mode={mode}
          filters={filters}
          onChange={handleFiltersChange}
          availableStates={availableStates}
          availableCities={availableCities}
          availableBodyTypes={availableBodyTypes}
          availableBrands={availableBrands}
        />

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
                placeholder="Search by name, brand, or location…"
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
          {!isLoading && (
            <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-muted)", margin: 0 }}>
              Showing{" "}
              <strong style={{ color: "var(--brc-text)" }}>
                {startResult}&ndash;{endResult}
              </strong>
              {" "}of <strong style={{ color: "var(--brc-text)" }}>{filtered.length}</strong> results
            </p>
          )}

          {/* Car grid */}
          {isLoading ? (
            <CarGridSkeleton />
          ) : currentCars.length > 0 ? (
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
              border: "1px dashed var(--brc-border)", borderRadius: "var(--brc-radius-md)",
            }}>
              No cars match your current filters.
            </div>
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="services-pagination" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 8 }}>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
              >
                <Icon name="chevleft" size={16} />
              </Button>

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

          {/* ------------------------------------------------------------------ */}
          {/* Recently Sold — horizontal scroll carousel                          */}
          {/* ------------------------------------------------------------------ */}
          {!isLoading && soldCars.length > 0 && (
            <section style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{
                  fontFamily: "var(--brc-font-display)", fontSize: 20, fontWeight: 800,
                  color: "var(--brc-text)", margin: 0,
                }}>
                  Recently Sold
                </h2>
                <span style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-muted)" }}>
                  {soldCars.length} car{soldCars.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  overflowX: "auto",
                  paddingBottom: 12,
                  scrollSnapType: "x mandatory",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {soldCars.map((car) => (
                  <div key={car.id} style={{ scrollSnapAlign: "start" }}>
                    <SoldCarCard car={car} />
                  </div>
                ))}
              </div>
            </section>
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
