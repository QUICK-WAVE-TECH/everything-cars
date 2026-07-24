"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangleIcon,
  CameraIcon,
  CheckCircle2Icon,
  DownloadIcon,
  ImagesIcon,
  LightbulbIcon,
  PlusIcon,
  RotateCcwIcon,
  StarIcon,
  Trash2Icon,
  UploadIcon,
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

function fileSizeLabel(file: File) {
  const sizeMb = fileSizeMb(file);
  return `${sizeMb.toFixed(sizeMb >= 1 ? 1 : 2)} MB`;
}

function SlotTile({
  slot,
  isCover,
  file,
  existingImage,
  disabled,
  onPick,
  onClear,
}: {
  slot: (typeof PHOTO_SLOTS)[number];
  isCover: boolean;
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
  const displayName = file?.name ?? (existingImage ? `${slot.label} photo` : "");
  const displaySize = file ? fileSizeLabel(file) : existingImage ? "Saved photo" : "";

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

  return (
    <div
      className={cn(
        "relative min-w-0 overflow-hidden rounded-2xl bg-(--brc-bg-subtle) aspect-[4/3]",
        isCover &&
          "sm:col-span-2 sm:aspect-[2/1] lg:row-span-2 lg:aspect-auto",
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
        if (
          event.relatedTarget instanceof Node &&
          event.currentTarget.contains(event.relatedTarget)
        ) {
          return;
        }
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

      {!hasImage ? (
        <label
          htmlFor={id}
          aria-label={`Add ${slot.label} photo`}
          className={cn(
            "absolute inset-0 z-10 flex cursor-pointer flex-col rounded-2xl border-[1.5px] border-dashed border-(--brc-border) transition-colors hover:border-(--brc-primary)",
            disabled && "cursor-not-allowed",
          )}
        >
          <span
            className={cn(
              "flex items-center justify-between gap-2",
              isCover ? "px-4 py-3.5" : "px-3 py-2.5",
            )}
          >
            <span className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
              <span
                className={cn(
                  "inline-flex shrink-0 items-center justify-center rounded-full border border-(--brc-border) bg-white text-(--brc-primary)",
                  isCover ? "size-7" : "size-6",
                )}
              >
                <CameraIcon className={isCover ? "size-3.5" : "size-3"} aria-hidden="true" />
              </span>
              {slot.label}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-normal [font-family:var(--brc-font-ui)]",
                slot.required
                  ? "bg-(--brc-primary-tint) text-(--brc-primary)"
                  : "border border-(--brc-border) bg-(--brc-bg-muted) text-(--brc-text-muted)",
              )}
            >
              {isCover ? "Cover · Required" : slot.required ? "Required" : "Optional"}
            </span>
          </span>

          <span
            className={cn(
              "flex flex-1 flex-col items-center justify-center text-center",
              isCover ? "gap-3 px-6 pb-6" : "gap-2 px-3 pb-3",
            )}
          >
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-full bg-white text-(--brc-primary) shadow-[0_6px_16px_rgba(0,0,0,0.08)]",
                isCover ? "size-14" : "size-10",
              )}
            >
              {isCover ? (
                <UploadIcon className="size-6" aria-hidden="true" />
              ) : (
                <PlusIcon className="size-4.5" aria-hidden="true" />
              )}
            </span>
            {isCover ? (
              <span>
                <span className="block text-[15px] font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">
                  Add your cover photo
                </span>
                <span className="mt-1 block text-xs leading-5 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                  Drag &amp; drop or{" "}
                  <span className="font-bold text-(--brc-primary)">browse</span>
                  {" "}· JPG, PNG · max 5 MB
                </span>
              </span>
            ) : (
              <span className="text-xs font-bold text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
                Add {slot.shortLabel.toLowerCase()} photo
              </span>
            )}
          </span>
        </label>
      ) : (
        <>
          <Image
            src={displayUrl!}
            alt={slot.label}
            fill
            unoptimized
            sizes={
              isCover
                ? "(max-width: 640px) 92vw, (max-width: 1024px) 80vw, 460px"
                : "(max-width: 640px) 92vw, (max-width: 1024px) 40vw, 220px"
            }
            className="object-cover motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
          />
          <span className="pointer-events-none absolute inset-0 z-10 rounded-2xl border border-(--brc-border)" />
          <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-black/45 to-transparent" />

          {isCover ? (
            <span className="absolute inset-x-4 top-3.5 z-20 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm [font-family:var(--brc-font-ui)]">
                <StarIcon className="size-3 fill-(--brc-accent-bright) text-(--brc-accent-bright)" aria-hidden="true" />
                Cover · Front
              </span>
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-(--brc-success) text-white shadow-md">
                <CheckCircle2Icon className="size-4" aria-hidden="true" />
              </span>
            </span>
          ) : (
            <span className="absolute right-2.5 top-2.5 z-20 inline-flex size-6.5 items-center justify-center rounded-full bg-(--brc-success) text-white shadow-md">
              <CheckCircle2Icon className="size-3.5" aria-hidden="true" />
            </span>
          )}

          <span
            className={cn(
              "absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent",
              isCover ? "p-4 pt-14" : "p-2.5 pt-10",
            )}
          >
            <span className="min-w-0">
              <span
                className={cn(
                  "block truncate font-bold text-white [font-family:var(--brc-font-ui)]",
                  isCover ? "text-[13px]" : "text-xs",
                )}
              >
                {isCover ? displayName : slot.label}
              </span>
              {isCover && (
                <span className="mt-0.5 block text-[11px] tabular-nums text-white/75 [font-family:var(--brc-font-ui)]">
                  {displaySize}
                </span>
              )}
            </span>

            <span className="flex shrink-0 gap-1.5">
              <label
                htmlFor={id}
                title="Replace photo"
                aria-label={`Replace ${slot.label} photo`}
                className={cn(
                  "inline-flex cursor-pointer items-center justify-center rounded-lg bg-white/95 font-bold text-(--brc-text) transition-colors hover:bg-white [font-family:var(--brc-font-ui)]",
                  isCover ? "h-8.5 gap-1.5 px-3 text-xs" : "size-7.5",
                )}
              >
                <RotateCcwIcon className="size-3.5" aria-hidden="true" />
                {isCover && "Replace"}
              </label>
              {file && (
                <button
                  type="button"
                  onClick={onClear}
                  title="Remove photo"
                  aria-label={`Remove ${slot.label} photo`}
                  className={cn(
                    "inline-flex cursor-pointer items-center justify-center rounded-lg border-none bg-black/55 text-white transition-colors hover:bg-(--brc-danger)",
                    isCover ? "size-8.5" : "size-7.5",
                  )}
                >
                  <Trash2Icon className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </span>
          </span>
        </>
      )}

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-2xl border-2 border-(--brc-primary) bg-(--brc-primary-tint)/95">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full bg-(--brc-primary) font-bold text-white shadow-md [font-family:var(--brc-font-ui)]",
              isCover ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs",
            )}
          >
            <DownloadIcon className="size-4" aria-hidden="true" />
            {isCover ? "Drop to upload" : "Drop"}
          </span>
        </div>
      )}

      {error && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-center rounded-2xl border-[1.5px] border-dashed border-(--brc-danger) bg-(--brc-danger-bg)/90 p-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full bg-(--brc-danger) px-3 py-1.5 text-center text-[11px] font-bold text-white [font-family:var(--brc-font-ui)]",
              !isCover && "text-[10px]",
            )}
          >
            <AlertTriangleIcon className="size-3.5 shrink-0" aria-hidden="true" />
            {error}
          </span>
        </div>
      )}
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
  const allRequiredReady = filledRequiredCount === 4;
  const hasSelectedFiles = Object.keys(value).length > 0;

  return (
    <section className="col-span-full flex min-w-0 flex-col gap-5 border-y border-(--brc-border) py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h3 className="m-0 text-lg font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">
            Car photos
          </h3>
          <p className="mt-1 max-w-xl text-xs leading-5 text-(--brc-text-muted) [font-family:var(--brc-font-ui)] sm:text-[13px]">
            Add clear shots from every angle. Your{" "}
            <strong className="font-bold text-(--brc-text-secondary)">front view</strong>{" "}
            becomes the listing cover buyers see first.
          </p>
        </div>
        {hasSelectedFiles && (
          <button
            type="button"
            onClick={() => onChange({})}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-(--brc-border) bg-white px-3.5 text-xs font-bold text-(--brc-text-secondary) transition-colors hover:bg-(--brc-bg-subtle) [font-family:var(--brc-font-ui)]"
          >
            <RotateCcwIcon className="size-3.5" aria-hidden="true" />
            {existingImages.length > 0 ? "Clear selected" : "Clear all"}
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div
          className="flex flex-1 gap-1.5"
          role="progressbar"
          aria-label="Required car photos"
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuenow={filledRequiredCount}
        >
          {Array.from({ length: 4 }, (_, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                index < filledRequiredCount
                  ? allRequiredReady
                    ? "bg-(--brc-success)"
                    : "bg-(--brc-primary)"
                  : "bg-(--brc-border)",
              )}
            />
          ))}
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-bold tabular-nums [font-family:var(--brc-font-ui)]",
            allRequiredReady
              ? "text-(--brc-success)"
              : "text-(--brc-text-muted)",
          )}
        >
          {allRequiredReady ? (
            <CheckCircle2Icon className="size-4" aria-hidden="true" />
          ) : (
            <ImagesIcon className="size-4" aria-hidden="true" />
          )}
          {allRequiredReady
            ? "All required views added"
            : `${filledRequiredCount} of 4 required views`}
        </span>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3.5 sm:grid-cols-2 lg:auto-rows-[172px] lg:grid-cols-4">
        {PHOTO_SLOTS.map((slot, index) => (
          <SlotTile
            key={slot.type}
            slot={slot}
            isCover={index === 0}
            file={value[slot.type]}
            existingImage={existingByType.get(slot.type)}
            disabled={disabled}
            onPick={(file) => setSlot(slot.type, file)}
            onClear={() => clearSlot(slot.type)}
          />
        ))}
      </div>

      <div className="flex items-start gap-3 border-t border-dashed border-(--brc-border) pt-4">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-(--brc-primary-tint) text-(--brc-primary)">
          <LightbulbIcon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="m-0 text-xs font-bold text-(--brc-text) [font-family:var(--brc-font-ui)] sm:text-[13px]">
            Photos that get approved faster
          </p>
          <p className="mt-0.5 text-xs leading-5 text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            Shoot in daylight, fit the whole car in frame, and skip filters.
            Clear, well-lit angles help our team verify your listing on the first pass.
          </p>
        </div>
      </div>
    </section>
  );
}
