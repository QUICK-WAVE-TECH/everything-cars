"use client";

import {
  useState,
  type HTMLInputTypeAttribute,
  type InputHTMLAttributes,
} from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "./icon";

type AuthFieldProps = {
  label: string;
  placeholder: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  type?: HTMLInputTypeAttribute | "select";
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  pattern?: string;
  required?: boolean;
};

export function AuthField({
  label,
  placeholder,
  name,
  value,
  defaultValue,
  onChange,
  type = "text",
  inputMode,
  pattern,
  required,
}: AuthFieldProps) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  const isSelect = type === "select";
  const inputType = isPw ? (show ? "text" : "password") : isSelect ? "text" : type;

  return (
    <div className="flex flex-col gap-2">
      <Label
        className="text-base font-normal"
        style={{ fontFamily: "var(--brc-font-ui)", color: "var(--brc-text)" }}
      >
        {label}
      </Label>
      <div
        className="flex h-14 items-center gap-2 rounded-lg px-6"
        style={{
          background: "var(--brc-bg-subtle)",
          border: "1px solid var(--brc-border)",
        }}
      >
        <Input
          type={inputType}
          name={name}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          inputMode={inputMode}
          pattern={pattern}
          readOnly={isSelect}
          required={required}
          onChange={(e) => onChange?.(e.target.value)}
          className="h-full border-0 bg-transparent px-0 text-sm shadow-none ring-0 focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          style={{
            fontFamily: "var(--brc-font-ui)",
            color: "var(--brc-text)",
            cursor: isSelect ? "pointer" : "text",
          }}
        />
        {isPw && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setShow(!show);
            }}
            className="flex shrink-0 border-0 bg-transparent p-0 cursor-pointer"
          >
            <Icon name="eye" size={22} stroke="var(--brc-text)" />
          </button>
        )}
        {isSelect && <Icon name="chevdown" size={20} stroke="var(--brc-text-muted)" />}
      </div>
    </div>
  );
}
