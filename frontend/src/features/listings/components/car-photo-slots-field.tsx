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
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
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
  const [error, setError] = useState<string | null>(null);
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
      const message = `${fileSizeMb(nextFile).toFixed(1)} MB — must be 5 MB or smaller`;
      setError(message);
      toast.error(`${nextFile.name} is ${message}.`);
      return;
    }
    setError(null);
    onPick(nextFile);
  }

  // Attachment carries the visual state machine (dashed when idle, destructive
  // when rejected, solid once filled); the drop handlers and the file input
  // stay ours — Attachment is presentational and ships no picker.
  const state = error ? "error" : hasImage ? "done" : "idle";

  return (
    <Attachment
      state={state}
      orientation="vertical"
      className={cn(
        "min-h-[230px] w-full min-w-0 gap-0 overflow-hidden p-0",
        dragging && "border-(--brc-primary) bg-(--brc-primary-tint)",
        disabled && "pointer-events-none opacity-60",
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
      {/* Header: slot name + whether it's required */}
      <div className="flex h-11 w-full shrink-0 items-center justify-between gap-2 border-b border-(--brc-border) px-3">
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
          <AttachmentTitle className="text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
            {slot.label}
          </AttachmentTitle>
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

      {/* Preview / drop target. The trigger renders as the file input's label so
          the whole area stays clickable and keyboard-reachable. */}
      <AttachmentMedia
        variant="image"
        className="relative w-full min-h-0 flex-1 rounded-none bg-(--brc-bg-subtle)"
      >
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => pick(event.target.files)}
        />
        <AttachmentTrigger
          render={<label htmlFor={id} aria-label={`Add ${slot.label} photo`} />}
          className={cn("cursor-pointer", disabled && "cursor-not-allowed")}
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
          <span className="absolute bottom-2 right-2 z-20 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-[11px] font-bold text-white [font-family:var(--brc-font-ui)]">
            {file ? <RotateCcwIcon size={12} /> : <ImageIcon size={12} />}
            {file ? "Replace" : "Current"}
          </span>
        )}
      </AttachmentMedia>

      {/* Footer: file name / hint, plus the clear action */}
      <AttachmentContent className="flex h-[54px] w-full shrink-0 items-center justify-between gap-2 border-t border-(--brc-border) px-3">
        <AttachmentDescription className="mt-0 min-w-0 truncate text-xs [font-family:var(--brc-font-ui)]">
          {error
            ? error
            : file
              ? fileLabel(file)
              : existingImage
                ? "Saved photo"
                : "JPG, PNG, WEBP, HEIC"}
        </AttachmentDescription>
        {file && (
          <AttachmentActions>
            <AttachmentAction
              type="button"
              onClick={onClear}
              aria-label={`Clear ${slot.label}`}
              className="size-8 rounded-full border border-(--brc-border) bg-white text-(--brc-text-muted) hover:border-(--brc-danger) hover:text-(--brc-danger)"
            >
              <XIcon size={15} />
            </AttachmentAction>
          </AttachmentActions>
        )}
      </AttachmentContent>
    </Attachment>
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
