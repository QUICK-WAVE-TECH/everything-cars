"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ID_TYPE_OPTIONS } from "@/features/auth/schemas";

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
      <Select value={value || undefined} onValueChange={(v) => onChange(v ?? "")}>
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
