"use client";

import { useId } from "react";
import { Icon } from "./icon";

type UploadFieldProps = {
  label: string;
  hint: string;
  value?: string;
  onPick: (file: File | null) => void;
  /** Overridable file filter. Defaults to PDF / PNG / JPEG. */
  accept?: string;
};

const DEFAULT_ACCEPT = ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";

export function UploadField({
  label,
  hint,
  value,
  onPick,
  accept = DEFAULT_ACCEPT,
}: UploadFieldProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      <span className="text-base text-(--brc-text) [font-family:var(--brc-font-ui)]">
        {label}
      </span>
      <label
        htmlFor={id}
        className="brc-button-motion brc-button-motion-subtle flex min-h-[150px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-(--brc-border-strong) bg-(--brc-bg-subtle) px-6 py-7 text-center"
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          onPick(event.dataTransfer.files?.[0] ?? null);
        }}
      >
        <input
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(event) => onPick(event.target.files?.[0] ?? null)}
        />
        <span className="flex size-12 items-center justify-center rounded-full bg-(--brc-accent-bg)">
          <Icon name="upload" size={22} stroke="var(--brc-accent)" />
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]">
            {value || "Upload a file or drag and drop here"}
          </span>
          <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            {hint}
          </span>
        </span>
      </label>
    </div>
  );
}
