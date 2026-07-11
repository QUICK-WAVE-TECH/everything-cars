"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CameraIcon,
  CheckCircle2Icon,
  ImageIcon,
  RotateCcwIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CarImage,
  CarImageFiles,
  CarImageType,
} from "@/features/listings/api/types";

const PHOTO_SLOTS: {
  type: CarImageType;
  label: string;
  shortLabel: string;
  required: boolean;
}[] = [
  { type: "front", label: "Front view", shortLabel: "Front", required: true },
  { type: "back", label: "Back view", shortLabel: "Back", required: true },
  { type: "left_side", label: "Left side", shortLabel: "Left", required: true },
  { type: "right_side", label: "Right side", shortLabel: "Right", required: true },
  { type: "interior", label: "Interior", shortLabel: "Interior", required: false },
];

type Props = {
  value: CarImageFiles;
  onChange: (files: CarImageFiles) => void;
  existingImages?: CarImage[];
  disabled?: boolean;
};

// Mirrors the backend's MAX_CAR_IMAGE_SIZE_BYTES — oversized files are
// rejected at pick time so a listing is never created with doomed photos.
export const MAX_CAR_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function fileSizeMb(file: File) {
  return file.size / (1024 * 1024);
}

export function findOversizedCarImage(
  files: Record<string, File | undefined>,
): File | null {
  return (
    Object.values(files).find(
      (f): f is File => !!f && f.size > MAX_CAR_IMAGE_SIZE_BYTES,
    ) ?? null
  );
}

function fileLabel(file: File) {
  const sizeMb = fileSizeMb(file);
  return `${file.name} - ${sizeMb.toFixed(sizeMb >= 1 ? 1 : 2)} MB`;
}

function SlotTile({
  slot,
  file,
  existingImage,
  disabled,
  onPick,
  onClear,
}: {
  slot: (typeof PHOTO_SLOTS)[number];
  file?: File;
  existingImage?: CarImage;
  disabled?: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const id = useId();
  const [dragging, setDragging] = useState(false);
  // Derive the preview URL instead of mirroring it into state; the effect
  // only handles revocation when the file changes or the component unmounts.
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayUrl = previewUrl ?? existingImage?.thumbnail ?? existingImage?.image;
  const hasImage = !!displayUrl;

  function pick(files: FileList | null) {
    const nextFile = files?.[0];
    if (!nextFile) return;
    if (nextFile.size > MAX_CAR_IMAGE_SIZE_BYTES) {
      toast.error(
        `${nextFile.name} is ${fileSizeMb(nextFile).toFixed(1)} MB — photos must be 5 MB or smaller.`,
      );
      return;
    }
    onPick(nextFile);
  }

  return (
    <div
      className={cn(
        "group relative flex min-h-[230px] min-w-0 flex-col overflow-hidden rounded-lg border bg-white",
        dragging ? "border-(--brc-primary)" : "border-(--brc-border)",
        disabled && "opacity-60",
      )}
    >
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-(--brc-border) px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full",
              hasImage
                ? "bg-(--brc-success-bg) text-(--brc-success)"
                : "bg-(--brc-bg-muted) text-(--brc-text-muted)",
            )}
          >
            {hasImage ? <CheckCircle2Icon size={14} /> : <CameraIcon size={14} />}
          </span>
          <span className="truncate text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
            {slot.label}
          </span>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase [font-family:var(--brc-font-ui)]",
            slot.required
              ? "bg-(--brc-primary-tint) text-(--brc-primary)"
              : "bg-(--brc-bg-muted) text-(--brc-text-muted)",
          )}
        >
          {slot.required ? "Required" : "Optional"}
        </span>
      </div>

      <label
        htmlFor={id}
        className={cn(
          "relative flex min-h-0 flex-1 cursor-pointer flex-col items-center justify-center bg-(--brc-bg-subtle)",
          dragging && "bg-(--brc-primary-tint)",
          disabled && "cursor-not-allowed",
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) pick(event.dataTransfer.files);
        }}
      >
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => pick(event.target.files)}
        />

        {displayUrl ? (
          <Image
            src={displayUrl}
            alt={slot.label}
            fill
            unoptimized
            sizes="(max-width: 640px) 90vw, (max-width: 1280px) 45vw, 220px"
            className="object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-white text-(--brc-primary) shadow-sm">
              <UploadIcon size={20} />
            </span>
            <span className="text-xs font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
              Add {slot.shortLabel.toLowerCase()} photo
            </span>
          </div>
        )}

        {displayUrl && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-[11px] font-bold text-white [font-family:var(--brc-font-ui)]">
            {file ? <RotateCcwIcon size={12} /> : <ImageIcon size={12} />}
            {file ? "Replace" : "Current"}
          </span>
        )}
      </label>

      <div className="flex h-[54px] shrink-0 items-center justify-between gap-2 border-t border-(--brc-border) px-3">
        <span className="min-w-0 truncate text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
          {file ? fileLabel(file) : existingImage ? "Saved photo" : "JPG, PNG, WEBP, HEIC"}
        </span>
        {file && (
          <button
            type="button"
            onClick={onClear}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-(--brc-border) bg-white text-(--brc-text-muted) transition-colors hover:border-(--brc-danger) hover:text-(--brc-danger)"
            aria-label={`Clear ${slot.label}`}
          >
            <XIcon size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

export function CarPhotoSlotsField({
  value,
  onChange,
  existingImages = [],
  disabled,
}: Props) {
  const existingByType = useMemo(() => {
    return new Map(
      existingImages
        .filter((image) => image.image_type)
        .map((image) => [image.image_type, image]),
    );
  }, [existingImages]);

  function setSlot(type: CarImageType, file: File) {
    onChange({ ...value, [type]: file });
  }

  function clearSlot(type: CarImageType) {
    const next = { ...value };
    delete next[type];
    onChange(next);
  }

  const filledRequiredCount = PHOTO_SLOTS.filter(
    (slot) => slot.required && (value[slot.type] || existingByType.has(slot.type)),
  ).length;

  return (
    <section className="col-span-full flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)] sm:text-base">
            Car photos
          </span>
          <span className="text-xs text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            {filledRequiredCount}/4 required views ready
          </span>
        </div>
        {Object.keys(value).length > 0 && (
          <button
            type="button"
            onClick={() => onChange({})}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-(--brc-border) bg-white px-3 text-xs font-bold text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
          >
            <XIcon size={14} />
            Clear selected
          </button>
        )}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {PHOTO_SLOTS.map((slot) => (
          <SlotTile
            key={slot.type}
            slot={slot}
            file={value[slot.type]}
            existingImage={existingByType.get(slot.type)}
            disabled={disabled}
            onPick={(file) => setSlot(slot.type, file)}
            onClear={() => clearSlot(slot.type)}
          />
        ))}
      </div>
    </section>
  );
}
