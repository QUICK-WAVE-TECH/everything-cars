"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { COUNTRIES } from "@/features/auth/data/countries";

type CountrySelectProps = {
  value: string; // iso code
  onChange: (iso: string) => void;
  label?: string;
};

export function CountrySelect({
  value,
  onChange,
  label = "Country",
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = COUNTRIES.find((c) => c.iso === value);

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span
          style={{
            fontFamily: "var(--brc-font-ui)",
            fontSize: 16,
            color: "var(--brc-text)",
          }}
        >
          {label}
        </span>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>
          <div
            className="flex h-14 w-full items-center justify-between rounded-lg px-6 text-left text-sm"
            style={{
              background: "var(--brc-bg-subtle)",
              border: "1px solid var(--brc-border)",
              fontFamily: "var(--brc-font-ui)",
              color: selected ? "var(--brc-text)" : "var(--brc-text-muted)",
            }}
          >
            {selected ? (
              <span className="flex items-center gap-2">
                <Image
                  src={`https://flagcdn.com/20x15/${selected.iso}.png`}
                  alt=""
                  width={20}
                  height={15}
                  className="rounded-sm"
                />
                {selected.name}
              </span>
            ) : (
              "Select country"
            )}
            <ChevronsUpDownIcon
              size={16}
              style={{ color: "var(--brc-text-muted)" }}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[min(100vw-32px,400px)] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search countries..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {COUNTRIES.filter((c) =>
                  c.name.toLowerCase().includes(search.toLowerCase())
                ).map((country) => (
                  <CommandItem
                    key={country.iso}
                    value={country.name}
                    onSelect={() => {
                      onChange(country.iso);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="flex items-center gap-2"
                  >
                    <Image
                      src={`https://flagcdn.com/20x15/${country.iso}.png`}
                      alt=""
                      width={20}
                      height={15}
                      className="rounded-sm"
                    />
                    <span className="flex-1">{country.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {country.dial}
                    </span>
                    {value === country.iso && <CheckIcon size={16} />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
