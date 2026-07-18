"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ID_TYPE_OPTIONS } from "@/features/auth/schemas";

// Base UI's Select renders the raw value unless given an items map to resolve
// the display label (e.g. "drivers_licence" → "Driver's Licence").
const ID_TYPE_ITEMS: Record<string, string> = Object.fromEntries(
  ID_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

export function IdTypeSelect({
  value,
  onChange,
  label = "Means of Identification",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-base text-(--brc-text) [font-family:var(--brc-font-ui)]">
        {label}
      </span>
      <Select
        items={ID_TYPE_ITEMS}
        value={value || null}
        onValueChange={(v) => onChange(v ?? "")}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select ID type" />
        </SelectTrigger>
        <SelectContent>
          {ID_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
