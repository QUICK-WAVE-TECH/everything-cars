"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useCities } from "@/features/auth/hooks/use-geo-data";

type CityComboboxProps = {
  country: string;
  state: string;
  value: string;
  onChange: (city: string) => void;
  label?: string;
};

export function CityCombobox({
  country,
  state,
  value,
  onChange,
  label = "City",
}: CityComboboxProps) {
  const { data: cities, isLoading, isError } = useCities(country, state);
  const [open, setOpen] = useState(false);

  const fieldLabel = (
    <span
      style={{
        fontFamily: "var(--brc-font-ui)",
        fontSize: 16,
        color: "var(--brc-text)",
      }}
    >
      {label}
    </span>
  );

  // Fallback: plain text input
  if (!country || !state || isError) {
    return (
      <div className="flex flex-col gap-2">
        {fieldLabel}
        <div
          className="flex h-14 items-center rounded-lg px-6"
          style={{
            background: "var(--brc-bg-subtle)",
            border: "1px solid var(--brc-border)",
          }}
        >
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your city"
            className="h-full border-0 bg-transparent px-0 text-sm shadow-none ring-0 focus-visible:border-0 focus-visible:ring-0"
            style={{ fontFamily: "var(--brc-font-ui)", color: "var(--brc-text)" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {fieldLabel}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>
          <div
            className="flex h-14 w-full items-center justify-between rounded-lg px-6 text-left text-sm"
            style={{
              background: "var(--brc-bg-subtle)",
              border: "1px solid var(--brc-border)",
              fontFamily: "var(--brc-font-ui)",
              color: value ? "var(--brc-text)" : "var(--brc-text-muted)",
            }}
          >
            {isLoading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2Icon size={16} className="animate-spin" /> Loading
                cities...
              </span>
            ) : (
              value || "Select city"
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[min(100vw-32px,400px)] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search cities..."
              value={value}
              onValueChange={(v) => onChange(v)}
            />
            <CommandList>
              <CommandEmpty>No city found. Type to enter manually.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {(cities ?? [])
                  .filter((c) =>
                    c.toLowerCase().includes((value || "").toLowerCase())
                  )
                  .slice(0, 50)
                  .map((city) => (
                    <CommandItem
                      key={city}
                      value={city}
                      onSelect={() => {
                        onChange(city);
                        setOpen(false);
                      }}
                    >
                      {city}
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
