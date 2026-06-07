"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "./icon";
import { COUNTRIES, DEFAULT_COUNTRY, findCountryByDial, type Country } from "../data/countries";

function Flag({ iso, name }: { iso: string; name: string }) {
  return (
    <Image
      src={`https://flagcdn.com/24x18/${iso}.png`}
      alt={`${name} flag`}
      width={24}
      height={18}
      unoptimized
      style={{ borderRadius: 2, flexShrink: 0, objectFit: "cover" }}
    />
  );
}

type PhoneFieldProps = {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  code: string;
  onCodeChange: (code: string) => void;
};

export function PhoneField({
  label = "Phone Number",
  placeholder = "Enter your phone number",
  value,
  onChange,
  code,
  onCodeChange,
}: PhoneFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Country>(findCountryByDial(code) ?? DEFAULT_COUNTRY);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.replace("+", "").includes(q.replace("+", "")),
    );
  }, [query]);

  function pick(country: Country) {
    setSelected(country);
    onCodeChange(country.dial);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-base font-normal" style={{ fontFamily: "var(--brc-font-ui)", color: "var(--brc-text)" }}>
        {label}
      </Label>
      <div
        className="flex h-14 items-center rounded-lg"
        style={{ background: "var(--brc-bg-subtle)", border: "1px solid var(--brc-border)" }}
      >
        {/* Country selector */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="Select country dial code"
            aria-expanded={open}
            className="flex h-14 cursor-pointer items-center gap-2 bg-transparent pl-6 pr-3"
            style={{ border: "none", fontFamily: "var(--brc-font-ui)", color: "var(--brc-text)", fontSize: 14 }}
          >
            <Flag iso={selected.iso} name={selected.name} />
            <span>{selected.dial}</span>
            <Icon name={open ? "chevup" : "chevdown"} size={16} stroke="var(--brc-text-muted)" />
          </button>

          {open && (
            <>
              <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  zIndex: 50,
                  width: 300,
                  maxWidth: "80vw",
                  background: "#fff",
                  border: "1px solid var(--brc-border)",
                  borderRadius: "var(--brc-radius-md)",
                  boxShadow: "var(--brc-shadow-md)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Search */}
                <div style={{ padding: 8, borderBottom: "1px solid var(--brc-border)" }}>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <span style={{ position: "absolute", left: 10, display: "flex", pointerEvents: "none" }}>
                      <Icon name="search" size={15} stroke="var(--brc-text-muted)" />
                    </span>
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search country or code"
                      style={{
                        width: "100%",
                        height: 38,
                        borderRadius: "var(--brc-radius-sm)",
                        border: "1px solid var(--brc-border)",
                        background: "var(--brc-bg-subtle)",
                        padding: "0 10px 0 32px",
                        fontFamily: "var(--brc-font-ui)",
                        fontSize: 13,
                        color: "var(--brc-text)",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                {/* List */}
                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                  {results.length === 0 ? (
                    <div style={{ padding: "20px 12px", textAlign: "center", fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-muted)" }}>
                      No matches
                    </div>
                  ) : (
                    results.map((c) => {
                      const active = c.iso === selected.iso;
                      return (
                        <button
                          key={c.iso}
                          type="button"
                          onClick={() => pick(c)}
                          className="brc-button-motion-subtle"
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "9px 12px",
                            border: "none",
                            background: active ? "var(--brc-primary-tint)" : "transparent",
                            cursor: "pointer",
                            textAlign: "left",
                            fontFamily: "var(--brc-font-ui)",
                          }}
                        >
                          <Flag iso={c.iso} name={c.name} />
                          <span style={{ flex: 1, fontSize: 13, color: "var(--brc-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {c.name}
                          </span>
                          <span style={{ fontSize: 13, color: "var(--brc-text-muted)" }}>{c.dial}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <span aria-hidden="true" style={{ width: 1, height: 24, background: "var(--brc-border)", flexShrink: 0 }} />

        {/* Phone number */}
        <Input
          type="tel"
          inputMode="tel"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-full border-0 bg-transparent px-4 text-sm shadow-none ring-0 focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          style={{ fontFamily: "var(--brc-font-ui)", color: "var(--brc-text)" }}
        />
      </div>
    </div>
  );
}
