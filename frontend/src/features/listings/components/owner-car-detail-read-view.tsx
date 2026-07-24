"use client";

import { useState, type ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangleIcon,
  ArchiveIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  CarFrontIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisIcon,
  ExternalLinkIcon,
  FuelIcon,
  GaugeIcon,
  LockIcon,
  MapPinIcon,
  PaintbrushIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  RefreshCcwIcon,
  RotateCcwIcon,
  SendIcon,
  Settings2Icon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CarDetail } from "@/features/listings/api";
import type { InspectionBooking } from "@/features/inspections/api/types";
import { CarStatusTimeline } from "@/features/listings/components/car-status-timeline";

type IconComponent = ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;

type OwnerCarDetailReadViewProps = {
  car: CarDetail;
  activeImage: number;
  onActiveImageChange: (index: number) => void;
  pendingBooking?: InspectionBooking;
  isAppointmentToday: boolean;
  clearanceMessage: string;
  onClearanceMessageChange: (value: string) => void;
  onClearanceSubmit: () => void;
  clearanceSubmitting: boolean;
  statusUpdating: boolean;
  onBookInspection: () => void;
  onReschedule: () => void;
  onCancelBooking: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onResubmit: () => void;
  onPause: () => void;
  onRepublish: () => void;
};

type Tone = "neutral" | "success" | "warning" | "accent" | "danger";
type Command = "book" | "reschedule" | "cancel" | "edit" | "archive" | "resubmit" | "pause" | "republish";

type StatusPresentation = {
  label: string;
  tone: Tone;
  icon: IconComponent;
  title: string;
  body: string;
  primary?: { label: string; icon: IconComponent; command?: Command; href?: string };
  secondary?: { label: string; icon: IconComponent; command: Command; danger?: boolean };
  more?: Command[];
};

const STATUS_PRESENTATIONS: Record<string, StatusPresentation> = {
  draft: {
    label: "Draft",
    tone: "neutral",
    icon: RefreshCcwIcon,
    title: "Awaiting review",
    body: "Our team is reviewing your listing. Nothing is required from you right now.",
    more: ["edit", "archive"],
  },
  listing_approved: {
    label: "Approved",
    tone: "success",
    icon: CalendarCheckIcon,
    title: "Book your inspection",
    body: "Your listing passed review. Book a vehicle inspection to move toward going live.",
    primary: { label: "Book Inspection", icon: CalendarCheckIcon, command: "book" },
    more: ["edit", "archive"],
  },
  inspection_pending: {
    label: "Inspection pending",
    tone: "warning",
    icon: MapPinIcon,
    title: "Inspection booked",
    body: "You are all set. Bring your vehicle and its documents to the appointment below.",
    secondary: { label: "Cancel", icon: AlertTriangleIcon, command: "cancel", danger: true },
  },
  inspection_in_progress: {
    label: "Inspection in progress",
    tone: "accent",
    icon: WrenchIcon,
    title: "Inspection underway",
    body: "An inspector is checking your vehicle now. The result will appear here shortly.",
  },
  needs_clearance: {
    label: "Needs clearance",
    tone: "warning",
    icon: SendIcon,
    title: "Respond to the inspection team",
    body: "The inspection team needs a little more information before they can clear your car.",
    more: ["archive"],
  },
  inspection_rejected: {
    label: "Inspection failed",
    tone: "danger",
    icon: RotateCcwIcon,
    title: "Fix and resubmit",
    body: "Address the issues found during inspection, then submit the listing for another review.",
    primary: { label: "Resubmit for Review", icon: CheckIcon, command: "resubmit" },
    more: ["edit", "archive"],
  },
  inspection_no_show: {
    label: "No show",
    tone: "danger",
    icon: RotateCcwIcon,
    title: "Rebook your inspection",
    body: "The last appointment was missed. Rebook to continue the inspection process.",
    primary: { label: "Rebook Inspection", icon: RotateCcwIcon, command: "book" },
    more: ["archive"],
  },
  needs_changes: {
    label: "Needs changes",
    tone: "warning",
    icon: PencilIcon,
    title: "Make the requested changes",
    body: "Update the requested listing details, then resubmit it for review.",
    primary: { label: "Edit Listing", icon: PencilIcon, command: "edit" },
    secondary: { label: "Resubmit", icon: CheckIcon, command: "resubmit" },
    more: ["archive"],
  },
  published: {
    label: "Published",
    tone: "success",
    icon: ExternalLinkIcon,
    title: "Your car is live",
    body: "Customers can see this listing and make requests. Keep its details up to date.",
    primary: { label: "View Public Listing", icon: ExternalLinkIcon, href: "" },
    secondary: { label: "Pause listing", icon: PauseIcon, command: "pause" },
    more: ["edit", "archive"],
  },
  paused: {
    label: "Paused",
    tone: "accent",
    icon: PlayIcon,
    title: "Listing is paused",
    body: "It is hidden from the marketplace. Republish whenever you are ready.",
    primary: { label: "Republish", icon: PlayIcon, command: "republish" },
    more: ["edit", "archive"],
  },
  suspended: {
    label: "Suspended",
    tone: "danger",
    icon: AlertTriangleIcon,
    title: "Listing suspended",
    body: "Contact support to resolve the issue and restore this listing.",
  },
  archived: {
    label: "Archived",
    tone: "neutral",
    icon: ArchiveIcon,
    title: "Listing archived",
    body: "This listing is off the marketplace and remains available here for your records.",
  },
};

const TONE_CLASSES: Record<Tone, { badge: string; tile: string }> = {
  neutral: {
    badge: "bg-(--brc-bg-muted) text-(--brc-text-muted)",
    tile: "bg-(--brc-bg-muted) text-(--brc-text-muted)",
  },
  success: {
    badge: "bg-(--brc-success-bg) text-(--brc-success)",
    tile: "bg-(--brc-success-bg) text-(--brc-success)",
  },
  warning: {
    badge: "bg-(--brc-warning-bg) text-[#8a6800]",
    tile: "bg-(--brc-warning-bg) text-[#8a6800]",
  },
  accent: {
    badge: "bg-(--brc-accent-bg) text-(--brc-accent)",
    tile: "bg-(--brc-accent-bg) text-(--brc-accent)",
  },
  danger: {
    badge: "bg-(--brc-danger-bg) text-(--brc-danger)",
    tile: "bg-(--brc-danger-bg) text-(--brc-danger)",
  },
};

const COMMAND_LABELS: Record<Command, { label: string; icon: IconComponent; danger?: boolean }> = {
  book: { label: "Book inspection", icon: CalendarCheckIcon },
  reschedule: { label: "Reschedule", icon: RotateCcwIcon },
  cancel: { label: "Cancel booking", icon: AlertTriangleIcon, danger: true },
  edit: { label: "Edit listing", icon: PencilIcon },
  archive: { label: "Archive listing", icon: ArchiveIcon, danger: true },
  resubmit: { label: "Resubmit for review", icon: RefreshCcwIcon },
  pause: { label: "Pause listing", icon: PauseIcon },
  republish: { label: "Republish", icon: PlayIcon },
};

function currencySymbol(code: string) {
  return ({ NGN: "₦", USD: "$", GBP: "£", EUR: "€" } as Record<string, string>)[code] ?? `${code} `;
}

function formatMoney(value: string | null | undefined, currency: string) {
  if (!value) return "—";
  return `${currencySymbol(currency)}${Number(value).toLocaleString("en-NG")}`;
}

function titleCase(value: string | null | undefined) {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}

function formatBookingDate(booking: InspectionBooking) {
  const date = new Date(`${booking.slot.date}T${booking.slot.start_time}`);
  return date.toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function progressIndex(status: string) {
  if (["published", "paused"].includes(status)) return 4;
  if (["inspection_pending", "inspection_in_progress", "needs_clearance", "inspection_rejected", "inspection_no_show"].includes(status)) return 2;
  if (status === "listing_approved") return 2;
  if (["draft", "needs_changes"].includes(status)) return 1;
  return 0;
}

export function OwnerCarDetailReadView({
  car,
  activeImage,
  onActiveImageChange,
  pendingBooking,
  isAppointmentToday,
  clearanceMessage,
  onClearanceMessageChange,
  onClearanceSubmit,
  clearanceSubmitting,
  statusUpdating,
  onBookInspection,
  onReschedule,
  onCancelBooking,
  onEdit,
  onArchive,
  onResubmit,
  onPause,
  onRepublish,
}: OwnerCarDetailReadViewProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const presentation =
    STATUS_PRESENTATIONS[car.status] ?? STATUS_PRESENTATIONS.draft!;
  const tone = TONE_CLASSES[presentation.tone];
  const images = car.images ?? [];
  const safeImageIndex = images.length === 0 ? 0 : Math.min(activeImage, images.length - 1);
  const currentImage = images[safeImageIndex];
  const isBuy = car.listing_type === "buy";
  const price = isBuy
    ? formatMoney(car.sale_price, car.currency)
    : `${formatMoney(car.rent_price_per_day, car.currency)} /day`;
  const progress = progressIndex(car.status);
  const progressSteps = [
    { label: "Submitted", icon: CheckIcon },
    { label: "Reviewed", icon: CheckIcon },
    { label: "Inspection", icon: WrenchIcon },
    { label: "Live", icon: ExternalLinkIcon },
  ];

  const handlers: Record<Command, () => void> = {
    book: onBookInspection,
    reschedule: onReschedule,
    cancel: onCancelBooking,
    edit: onEdit,
    archive: onArchive,
    resubmit: onResubmit,
    pause: onPause,
    republish: onRepublish,
  };

  function run(command: Command) {
    setMoreOpen(false);
    handlers[command]();
  }

  function renderPrimary(mobile = false) {
    const primary = presentation.primary;
    if (!primary) return null;
    const PrimaryIcon = primary.icon;
    const classes = cn(
      "inline-flex h-[52px] items-center justify-center gap-2 rounded-xl bg-(--brc-primary) px-5 text-[15px] font-extrabold text-white no-underline shadow-[0_12px_26px_rgba(0,0,139,0.22)] transition hover:-translate-y-0.5 hover:bg-(--brc-primary-hover) disabled:pointer-events-none disabled:opacity-60",
      mobile ? "w-full" : "w-full",
    );

    if (car.status === "published") {
      return (
        <Link href={`/cars/${car.id}`} className={classes}>
          <PrimaryIcon size={18} />
          {primary.label}
        </Link>
      );
    }

    return (
      <button
        type="button"
        onClick={() => primary.command && run(primary.command)}
        disabled={statusUpdating}
        className={classes}
      >
        <PrimaryIcon size={18} />
        {primary.label}
      </button>
    );
  }

  const specs: { label: string; value: string; icon: IconComponent }[] = [
    { label: "Year", value: String(car.year), icon: CalendarDaysIcon },
    { label: "Body type", value: titleCase(car.body_type), icon: CarFrontIcon },
    { label: "Transmission", value: titleCase(car.transmission), icon: Settings2Icon },
    { label: "Fuel", value: titleCase(car.fuel_type), icon: FuelIcon },
    { label: "Seats", value: String(car.seats), icon: UsersIcon },
    { label: "Mileage", value: car.mileage ? `${car.mileage.toLocaleString("en-NG")} km` : "—", icon: GaugeIcon },
    { label: "Colour", value: car.color || "—", icon: PaintbrushIcon },
    { label: "Location", value: [car.city, car.state].filter(Boolean).join(", "), icon: MapPinIcon },
  ];

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_348px] lg:gap-10">
        <main className="flex min-w-0 flex-col gap-9">
          <section aria-label="Car gallery">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[18px] border border-(--brc-border) bg-(--brc-bg-muted)">
              {currentImage ? (
                <Image
                  src={currentImage.image}
                  alt={car.title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 980px) 100vw, 760px"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-(--brc-text-muted)">
                  <CarFrontIcon size={64} strokeWidth={1.25} />
                </div>
              )}

              {currentImage?.is_primary && (
                <span className="absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full bg-(--brc-primary) px-3 py-1.5 text-xs font-bold text-white">
                  <CheckIcon size={13} />
                  Primary photo
                </span>
              )}

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => onActiveImageChange(safeImageIndex === 0 ? images.length - 1 : safeImageIndex - 1)}
                    aria-label="Previous image"
                    className="absolute left-3.5 top-1/2 flex size-[42px] -translate-y-1/2 items-center justify-center rounded-full border border-(--brc-border) bg-white/95 text-(--brc-text) shadow-md transition hover:scale-105"
                  >
                    <ChevronLeftIcon size={19} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onActiveImageChange(safeImageIndex === images.length - 1 ? 0 : safeImageIndex + 1)}
                    aria-label="Next image"
                    className="absolute right-3.5 top-1/2 flex size-[42px] -translate-y-1/2 items-center justify-center rounded-full border border-(--brc-border) bg-white/95 text-(--brc-text) shadow-md transition hover:scale-105"
                  >
                    <ChevronRightIcon size={19} strokeWidth={2.5} />
                  </button>
                  <span className="absolute bottom-3.5 right-3.5 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">
                    {safeImageIndex + 1} / {images.length}
                  </span>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1" role="list" aria-label="Image thumbnails">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    role="listitem"
                    onClick={() => onActiveImageChange(index)}
                    aria-current={safeImageIndex === index}
                    className={cn(
                      "relative h-[74px] flex-[0_0_108px] overflow-hidden rounded-[10px] border-2 bg-(--brc-bg-muted) transition",
                      safeImageIndex === index
                        ? "border-(--brc-primary) shadow-[0_0_0_2px_rgba(0,0,139,0.12)]"
                        : "border-(--brc-border) hover:border-(--brc-border-strong)",
                    )}
                  >
                    <Image
                      src={image.thumbnail ?? image.image}
                      alt={`${car.title} ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="108px"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-[18px] text-[19px] font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">
              Specifications
            </h2>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-4">
              {specs.map((spec) => {
                const SpecIcon = spec.icon;
                return (
                  <div key={spec.label} className="min-w-0">
                    <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-(--brc-text-muted)">
                      <SpecIcon size={14} className="shrink-0 text-(--brc-primary)" />
                      {spec.label}
                    </dt>
                    <dd className="mt-1.5 truncate text-[15px] font-bold text-(--brc-text)" title={spec.value}>
                      {spec.value}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>

          {car.description && (
            <section className="border-t border-(--brc-border) pt-6">
              <h2 className="mb-3 text-[19px] font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">
                Description
              </h2>
              <p className="max-w-[62ch] text-[15px] leading-[1.65] text-(--brc-text-secondary)">
                {car.description}
              </p>
            </section>
          )}

          {car.features.length > 0 && (
            <section className="border-t border-(--brc-border) pt-6">
              <h2 className="mb-3.5 text-[19px] font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">
                Features
              </h2>
              <div className="flex flex-wrap gap-2">
                {car.features.map((feature, index) => (
                  <span
                    key={feature.id ?? `${feature.name}-${index}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-(--brc-border) bg-white px-3.5 py-2 text-[13px] font-semibold text-(--brc-text-secondary)"
                  >
                    <CheckIcon size={13} className="text-(--brc-success)" />
                    {feature.name}
                    {feature.value ? `: ${feature.value}` : ""}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="border-t border-(--brc-border) pt-6">
            <h2 className="mb-5 text-[19px] font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">
              Inspection progress
            </h2>
            <ol className="grid grid-cols-4">
              {progressSteps.map((step, index) => {
                const done = index < progress;
                const current = index === progress && progress < progressSteps.length;
                const StepIcon = step.icon;
                return (
                  <li key={step.label} className="relative flex min-w-0 flex-col items-center gap-2.5 text-center">
                    {index > 0 && (
                      <span
                        className={cn(
                          "absolute right-1/2 top-[17px] h-0.5 w-full",
                          index <= progress ? "bg-(--brc-success)" : "bg-(--brc-border)",
                        )}
                        aria-hidden
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10 flex size-9 items-center justify-center rounded-full border-2",
                        done
                          ? "border-(--brc-success) bg-(--brc-success) text-white"
                          : current
                            ? "border-(--brc-primary) bg-(--brc-primary) text-white shadow-[0_0_0_6px_rgba(0,0,139,0.08)]"
                            : "border-(--brc-border) bg-white text-(--brc-text-muted)",
                      )}
                    >
                      {done ? <CheckIcon size={16} strokeWidth={2.6} /> : <StepIcon size={16} />}
                    </span>
                    <span
                      className={cn(
                        "max-w-24 text-xs font-bold",
                        done || current ? "text-(--brc-text)" : "text-(--brc-text-muted)",
                      )}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="border-t border-(--brc-border) pt-6">
            <h2 className="mb-4 text-[19px] font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">
              Listing activity
            </h2>
            <CarStatusTimeline carId={car.id} />
          </section>
        </main>

        <aside className="flex flex-col gap-[18px] lg:sticky lg:top-6">
          {["needs_changes", "inspection_rejected"].includes(car.status) && car.admin_note && (
            <div
              className={cn(
                "rounded-2xl border p-4",
                car.status === "inspection_rejected"
                  ? "border-(--brc-danger)/30 bg-(--brc-danger-bg) text-(--brc-danger)"
                  : "border-(--brc-warning)/40 bg-(--brc-warning-bg) text-[#795c00]",
              )}
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-extrabold">
                <AlertTriangleIcon size={18} />
                {car.status === "inspection_rejected" ? "Inspection failed" : "Changes requested"}
              </div>
              <p className="text-[13px] leading-relaxed">{car.admin_note}</p>
            </div>
          )}

          <section className="rounded-[18px] border border-(--brc-primary)/15 bg-(--brc-primary-tint) p-5 shadow-[0_10px_30px_rgba(0,0,139,0.08)]">
            <div className="mb-3 flex items-center gap-3">
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tone.tile)}>
                <presentation.icon size={21} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-(--brc-primary)">
                  Next step
                </p>
                <h2 className="text-[17px] font-extrabold leading-tight text-(--brc-text) [font-family:var(--brc-font-display)]">
                  {presentation.title}
                </h2>
              </div>
            </div>
            <p className="mb-4 text-[13.5px] leading-relaxed text-(--brc-text-secondary)">
              {presentation.body}
            </p>

            {car.status === "inspection_pending" && pendingBooking && (
              <div className="mb-3.5 space-y-2 rounded-xl border border-(--brc-border) bg-white px-3.5 py-3 text-[13px]">
                <div className="flex items-start gap-2 font-bold text-(--brc-text)">
                  <MapPinIcon size={15} className="mt-0.5 shrink-0 text-(--brc-primary)" />
                  <span>{pendingBooking.slot.center.company_name} · {pendingBooking.slot.center.city}</span>
                </div>
                <div className="flex items-center gap-2 text-(--brc-text-secondary)">
                  <CalendarDaysIcon size={15} className="shrink-0 text-(--brc-primary)" />
                  {formatBookingDate(pendingBooking)}
                </div>
                {pendingBooking.reschedule_count > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-(--brc-warning-bg) px-2.5 py-1 text-[11px] font-bold text-[#795c00]">
                    <RotateCcwIcon size={12} />
                    Rescheduled {pendingBooking.reschedule_count} of {pendingBooking.slot.center.max_reschedules}
                  </span>
                )}
              </div>
            )}

            {renderPrimary()}

            {car.status === "inspection_pending" && pendingBooking && (
              isAppointmentToday ? (
                <p className="rounded-xl border border-(--brc-warning)/35 bg-white/70 px-3 py-2.5 text-xs font-bold leading-relaxed text-[#795c00]">
                  Your appointment is today. Contact the inspection center if you need assistance.
                </p>
              ) : (
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => run("reschedule")}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[10px] border border-(--brc-primary)/30 bg-white text-[13px] font-bold text-(--brc-primary) hover:bg-white/60"
                  >
                    <RotateCcwIcon size={15} />
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => run("cancel")}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[10px] border border-(--brc-danger)/35 bg-white text-[13px] font-bold text-(--brc-danger) hover:bg-(--brc-danger-bg)"
                  >
                    <AlertTriangleIcon size={15} />
                    Cancel
                  </button>
                </div>
              )
            )}

            {presentation.secondary && car.status !== "inspection_pending" && (
              <button
                type="button"
                onClick={() => run(presentation.secondary!.command)}
                disabled={statusUpdating}
                className={cn(
                  "mt-2.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border bg-white text-[13px] font-bold disabled:opacity-60",
                  presentation.secondary.danger
                    ? "border-(--brc-danger)/35 text-(--brc-danger)"
                    : "border-(--brc-primary)/25 text-(--brc-primary)",
                )}
              >
                <presentation.secondary.icon size={15} />
                {presentation.secondary.label}
              </button>
            )}
          </section>

          {car.status === "needs_clearance" && (
            <section className="rounded-2xl border border-(--brc-border) bg-white p-[18px]">
              <h2 className="mb-2.5 text-sm font-extrabold text-(--brc-text)">
                Reply to the inspection team
              </h2>
              <textarea
                value={clearanceMessage}
                onChange={(event) => onClearanceMessageChange(event.target.value)}
                placeholder="Describe how you addressed the concern..."
                rows={4}
                className="w-full resize-y rounded-[10px] border border-(--brc-border) p-3 text-[13px] leading-relaxed text-(--brc-text) outline-none focus:border-(--brc-primary)"
              />
              <button
                type="button"
                onClick={onClearanceSubmit}
                disabled={clearanceSubmitting || !clearanceMessage.trim()}
                className="mt-2.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-(--brc-primary) text-sm font-extrabold text-white disabled:opacity-50"
              >
                <SendIcon size={16} />
                Send response
              </button>
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border border-(--brc-border) bg-white px-[18px]">
            <div className="flex items-start justify-between gap-3 py-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-(--brc-text-muted)">
                  {isBuy ? "Sale price" : "Rental price"}
                </p>
                <p className="mt-1 text-[26px] font-extrabold leading-none text-(--brc-text) [font-family:var(--brc-font-display)]">
                  {price}
                </p>
              </div>
              {isBuy && car.is_negotiable && (
                <span className="shrink-0 rounded-full bg-(--brc-accent-bg) px-2.5 py-1 text-[11px] font-bold text-(--brc-accent)">
                  Negotiable
                </span>
              )}
            </div>

            {isBuy && car.is_negotiable && (car.min_price || car.max_price) && (
              <div className="border-t border-dashed border-(--brc-border) py-3.5">
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-(--brc-text-muted)">
                  <LockIcon size={13} />
                  Private range · you only
                </div>
                <p className="text-[17px] font-extrabold text-(--brc-text)">
                  {formatMoney(car.min_price, car.currency)} – {formatMoney(car.max_price, car.currency)}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-(--brc-text-muted)">
                  Customers never see this range. It helps you evaluate offers.
                </p>
              </div>
            )}

            <div className="border-t border-dashed border-(--brc-border) py-3.5">
              <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-(--brc-text-muted)">
                <LockIcon size={13} />
                Vehicle identity · you only
              </div>
              <dl className="space-y-2 text-[13px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-(--brc-text-muted)">VIN</dt>
                  <dd className="break-all text-right font-bold text-(--brc-text)">{car.vin || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-(--brc-text-muted)">Plate</dt>
                  <dd className="text-right font-bold text-(--brc-text)">{car.plate_number || "—"}</dd>
                </div>
              </dl>
            </div>
          </section>

          {(presentation.more?.length ?? 0) > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                aria-expanded={moreOpen}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-(--brc-border) bg-white text-sm font-bold text-(--brc-text-secondary) hover:bg-(--brc-bg-subtle)"
              >
                <EllipsisIcon size={18} />
                More options
              </button>
              {moreOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close options"
                    onClick={() => setMoreOpen(false)}
                    className="fixed inset-0 z-20 cursor-default"
                  />
                  <div className="absolute bottom-[52px] left-0 right-0 z-30 rounded-xl border border-(--brc-border) bg-white p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
                    {presentation.more?.map((command) => {
                      const item = COMMAND_LABELS[command];
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={command}
                          type="button"
                          onClick={() => run(command)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-bold hover:bg-(--brc-bg-subtle)",
                            item.danger ? "text-(--brc-danger)" : "text-(--brc-text-secondary)",
                          )}
                        >
                          <ItemIcon size={17} />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </aside>
      </div>

      {presentation.primary && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-(--brc-border) bg-white p-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(0,0,0,0.06)] lg:hidden">
          {renderPrimary(true)}
        </div>
      )}
    </>
  );
}
