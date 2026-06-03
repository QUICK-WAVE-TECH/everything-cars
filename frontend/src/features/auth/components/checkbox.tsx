"use client";

import { type ReactNode } from "react";
import { Checkbox as ShadcnCheckbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type AuthCheckboxProps = {
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
};

export function Checkbox({ checked, onChange, children }: AuthCheckboxProps) {
  return (
    <div className="flex items-center gap-2">
      <ShadcnCheckbox
        checked={checked}
        onCheckedChange={onChange}
        className="size-6 rounded-md data-checked:border-[var(--brc-primary)] data-checked:bg-[var(--brc-primary)]"
        style={{
          borderColor: checked ? "var(--brc-primary)" : "var(--brc-border-strong)",
        }}
      />
      <Label
        className="text-base font-normal cursor-pointer"
        style={{ fontFamily: "var(--brc-font-ui)", color: "var(--brc-text)" }}
        onClick={onChange}
      >
        {children}
      </Label>
    </div>
  );
}
