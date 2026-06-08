"use client";

import { useState } from "react";
import { ChevronsUpDownIcon, CheckIcon, Loader2Icon } from "lucide-react";
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
import { useStates } from "@/features/auth/hooks/use-geo-data";

type StateSelectProps = {
  country: string; // country name (not iso)
  value: string;
  onChange: (state: string) => void;
  label?: string;
};

export function StateSelect({
  country,
  value,
  onChange,
  label = "State",
}: StateSelectProps) {
  const { data: states, isLoading, isError } = useStates(country);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

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

  // Fallback: plain text input if API fails or no country selected
  if (!country || isError) {
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
            placeholder="Type your state"
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
                states...
              </span>
            ) : (
              value || "Select state"
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
              placeholder="Search states..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No state found.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {(states ?? [])
                  .filter((s) =>
                    s.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((state) => (
                    <CommandItem
                      key={state}
                      value={state}
                      onSelect={() => {
                        onChange(state);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <span className="flex-1">{state}</span>
                      {value === state && <CheckIcon size={16} />}
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
