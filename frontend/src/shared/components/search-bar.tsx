"use client";

import { useState } from "react";
import { Icon } from "@/features/auth/components/icon";

const TYPES = ["All", "Sedan", "SUV", "Luxury", "Pickup"];
const PRICES = ["All", "Under ₦50k/day", "₦50k–₦200k/day", "₦5M–₦20M", "₦20M+"];

type SearchQuery = { loc: string; type: string; price: string };

type SearchBarProps = {
  onSearch?: (query: SearchQuery) => void;
};

export function SearchBar({ onSearch }: SearchBarProps) {
  const [loc, setLoc] = useState("");
  const [type, setType] = useState("All");
  const [price, setPrice] = useState("All");

  const cellStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    flex: "1 1 180px",
    minWidth: "min(100%, 180px)",
  };
  const labelStyle: React.CSSProperties = { fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-muted)" };
  const inputStyle: React.CSSProperties = {
    height: 48, borderRadius: 8, border: "1px solid var(--brc-border)",
    background: "var(--brc-bg-subtle)", padding: "0 16px",
    fontFamily: "var(--brc-font-ui)", fontSize: 14, color: "var(--brc-text)",
    outline: "none", width: "100%",
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2397989A' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px center",
  };

  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: 16,
      display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap",
      boxShadow: "var(--brc-shadow-md)", maxWidth: 980, width: "100%",
    }}>
      <div style={cellStyle}>
        <span style={labelStyle}>Location</span>
        <input style={inputStyle} placeholder="Enter city" value={loc} onChange={(e) => setLoc(e.target.value)} />
      </div>
      <div style={cellStyle}>
        <span style={labelStyle}>Car Type</span>
        <select style={selectStyle} value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div style={cellStyle}>
        <span style={labelStyle}>Price Range (₦)</span>
        <select style={selectStyle} value={price} onChange={(e) => setPrice(e.target.value)}>
          {PRICES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>
      <button
        className="brc-button-motion"
        onClick={() => onSearch?.({ loc, type, price })}
        style={{
          width: 150, height: 48, borderRadius: 8, border: "none",
          background: "var(--brc-primary)", color: "var(--brc-text-on-primary)",
          fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 14,
          cursor: "pointer", display: "inline-flex", alignItems: "center",
          justifyContent: "center", gap: 8, flex: "1 1 150px", minWidth: "min(100%, 150px)",
        }}
      >
        <Icon name="search" size={18} />
        Search
      </button>
    </div>
  );
}
