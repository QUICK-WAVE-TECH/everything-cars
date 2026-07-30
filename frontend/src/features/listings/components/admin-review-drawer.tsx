"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  Loader2Icon,
  MapPinIcon,
  ShieldCheckIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminCarDetail,
  useAdminCarHistory,
  useApproveListing,
  useRequestChanges,
} from "@/features/listings/api/admin-api";
import {
  useMarkNoShow,
  useResolveClearance,
  useStaffBookings,
  useStartInspection,
} from "@/features/inspections/api/inspections-api";
import type { InspectionBooking } from "@/features/inspections/api/types";
import { InspectionRecordPanel } from "@/features/inspections/components/inspection-record-panel";
import { cn } from "@/lib/utils";
import {
  AdminStatusBadge,
  formatAdminDate,
  formatAdminTime,
} from "./admin-approval-ui";
import { CarStatusTimeline } from "./car-status-timeline";
import { VehicleIdentityCard } from "./vehicle-identity-card";

type ReviewPanel = "overview" | "inspection" | "history";

type AdminReviewDrawerProps = {
  carId: string | null;
  open: boolean;
  onClose: () => void;
  onAction: (carId: string, status: string, note?: string) => void;
  isActing: boolean;
};

const CHECKLIST = [
  "Photos clearly show the actual car",
  "Listing details match uploaded documents",
  "Price is within a reasonable market range",
  "Owner identity and contact are verified",
];

function ReviewSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-3", className)}>
      <h3 className="m-0 text-[11px] font-bold uppercase text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function InspectionBookingSummary({
  booking,
  trackingId,
  loading,
}: {
  booking: InspectionBooking | null;
  trackingId: string | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 border border-(--brc-border) bg-(--brc-bg-subtle) p-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-12 rounded-md" />
        ))}
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="border border-(--brc-border) bg-(--brc-bg-subtle) p-4 text-sm font-semibold text-(--brc-text-muted)">
        No inspection booking was found for this listing.
      </div>
    );
  }

  const { slot } = booking;

  return (
    <div className="border border-[#d0dcff] bg-[#f4f6ff]">
      <div className="flex items-center justify-between gap-3 border-b border-[#d0dcff] px-4 py-3">
        <span className="text-xs font-bold uppercase text-[#4338ca]">
          Inspection booking
        </span>
        {trackingId ? (
          <span className="rounded-md bg-white px-2 py-1 text-[11px] font-bold">
            #{trackingId}
          </span>
        ) : null}
      </div>
      <dl className="grid grid-cols-2 gap-px bg-[#d0dcff]">
        <div className="bg-white p-3">
          <dt className="text-[11px] text-(--brc-text-muted)">Date</dt>
          <dd className="mt-1 text-sm font-bold">
            {formatAdminDate(slot.date)}
          </dd>
        </div>
        <div className="bg-white p-3">
          <dt className="text-[11px] text-(--brc-text-muted)">Time</dt>
          <dd className="mt-1 text-sm font-bold">
            {formatAdminTime(slot.start_time)} -{" "}
            {formatAdminTime(slot.end_time)}
          </dd>
        </div>
        <div className="col-span-2 bg-white p-3">
          <dt className="text-[11px] text-(--brc-text-muted)">
            Inspection center
          </dt>
          <dd className="mt-1 text-sm font-bold">
            {slot.center.company_name}
          </dd>
          <dd className="mt-0.5 text-xs text-(--brc-text-muted)">
            {slot.center.address}, {slot.center.city}
          </dd>
        </div>
        <div className="bg-white p-3">
          <dt className="text-[11px] text-(--brc-text-muted)">Booked by</dt>
          <dd className="mt-1 truncate text-sm font-bold">
            {booking.booked_by_name}
          </dd>
        </div>
        <div className="bg-white p-3">
          <dt className="text-[11px] text-(--brc-text-muted)">Reschedules</dt>
          <dd className="mt-1 text-sm font-bold">
            {booking.reschedule_count}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function AdminReviewDrawer({
  carId,
  open,
  onClose,
  onAction,
  isActing,
}: AdminReviewDrawerProps) {
  const router = useRouter();
  const { data: car } = useAdminCarDetail(open ? carId : null);
  const { data: carHistory, isLoading: historyLoading } =
    useAdminCarHistory(open ? carId : null);
  const [activePanel, setActivePanel] = useState<ReviewPanel>("overview");
  const [activeImage, setActiveImage] = useState(0);
  const [checks, setChecks] = useState<number[]>([]);
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [staffNote, setStaffNote] = useState("");

  const approveListing = useApproveListing();
  const requestChanges = useRequestChanges();
  const startInspection = useStartInspection();
  const markNoShow = useMarkNoShow();
  const resolveClearance = useResolveClearance();

  const { data: bookingsData, isLoading: bookingLoading } = useStaffBookings({
    car: carId ?? undefined,
  });
  const booking = useMemo(
    () =>
      bookingsData?.results.find((item) => item.car_id === carId) ?? null,
    [bookingsData?.results, carId],
  );

  const { data: completedData } = useStaffBookings({
    status: "completed",
    car: carId ?? undefined,
  });
  const clearanceBooking = useMemo(
    () =>
      completedData?.results.find((item) => item.car_id === carId) ?? null,
    [completedData?.results, carId],
  );

  const clearanceResponses = useMemo(
    () =>
      (carHistory ?? []).filter(
        (entry) =>
          entry.actor_role === "owner" &&
          entry.from_status === "needs_clearance" &&
          entry.to_status === "needs_clearance" &&
          entry.note,
      ),
    [carHistory],
  );

  const isDraft = car?.status === "draft";
  const isListingApproved = car?.status === "listing_approved";
  const isInspectionPending = car?.status === "inspection_pending";
  const isInspectionInProgress = car?.status === "inspection_in_progress";
  const isNeedsClearance = car?.status === "needs_clearance";
  const allChecked = checks.length === CHECKLIST.length;
  const images = car?.images ?? [];
  const mutationPending =
    approveListing.isPending ||
    requestChanges.isPending ||
    startInspection.isPending ||
    markNoShow.isPending ||
    resolveClearance.isPending;
  const anyActing = isActing || mutationPending;

  function toggleCheck(index: number) {
    setChecks((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index],
    );
  }

  async function handleApproveListing() {
    if (!car) return;
    try {
      await approveListing.mutateAsync(car.id);
      toast.success("Listing approved - owner can now book an inspection");
      onClose();
    } catch {
      toast.error("Failed to approve listing");
    }
  }

  async function handleRequestChanges() {
    if (!car || !staffNote.trim()) return;
    try {
      await requestChanges.mutateAsync({
        carId: car.id,
        note: staffNote.trim(),
      });
      toast.success("Changes requested - owner will be notified");
      onClose();
    } catch {
      toast.error("Failed to request changes");
    }
  }

  async function handleStartInspection() {
    if (!booking) return;
    try {
      await startInspection.mutateAsync(booking.id);
      toast.success("Inspection started");
      onClose();
      router.push(`/admin/inspections/${booking.id}/inspect`);
    } catch {
      toast.error("Failed to start inspection");
    }
  }

  function handleContinueInspection() {
    if (!booking) return;
    onClose();
    router.push(`/admin/inspections/${booking.id}/inspect`);
  }

  async function handleNoShow() {
    if (!booking) return;
    try {
      await markNoShow.mutateAsync({ bookingId: booking.id });
      toast.success("Marked as no-show");
      onClose();
    } catch {
      toast.error("Failed to mark no-show");
    }
  }

  async function handleResolveClearance(action: "publish" | "reject") {
    if (!clearanceBooking) return;
    if (action === "reject" && !staffNote.trim()) return;

    try {
      await resolveClearance.mutateAsync({
        bookingId: clearanceBooking.id,
        action,
        staff_note: staffNote.trim() || undefined,
      });
      toast.success(
        action === "publish"
          ? "Clearance resolved - listing published"
          : "Clearance rejected - inspection failed",
      );
      onClose();
    } catch {
      toast.error("Failed to resolve clearance");
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      swipeDirection="right"
    >
      <DrawerContent
        className="[font-family:var(--brc-font-ui)] data-[swipe-direction=right]:rounded-none"
        style={
          {
            "--drawer-content-width": "min(960px, 100vw)",
          } as CSSProperties
        }
      >
        {!car ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 p-5 sm:p-6">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden sm:grid-cols-2">
              <Skeleton className="h-full min-h-72 rounded-md" />
              <Skeleton className="h-full min-h-72 rounded-md" />
            </div>
          </div>
        ) : (
          <>
            <DrawerHeader className="gap-0 border-b border-(--brc-border) p-0 text-left">
              <div className="flex min-w-0 items-center gap-4 px-5 py-5 sm:px-8">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-(--brc-primary-tint) text-(--brc-primary)">
                  <ClipboardCheckIcon size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <DrawerTitle className="truncate text-base font-bold text-(--brc-text) sm:text-lg [font-family:var(--brc-font-ui)]">
                    {car.title}
                  </DrawerTitle>
                  <DrawerDescription className="mt-0.5 truncate text-xs text-(--brc-text-muted)">
                    {car.year} / {car.body_type || car.brand} / submitted{" "}
                    {formatAdminDate(car.created_at)}
                    {car.tracking_id ? ` / #${car.tracking_id}` : ""}
                  </DrawerDescription>
                </div>
                <AdminStatusBadge status={car.status} />
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close vehicle review"
                  className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-(--brc-border) bg-white text-(--brc-text) transition-colors hover:bg-(--brc-bg-subtle)"
                >
                  <XIcon size={17} />
                </button>
              </div>
              <div
                role="tablist"
                aria-label="Vehicle review sections"
                className="flex gap-7 overflow-x-auto px-5 sm:px-8"
              >
                {(
                  [
                    ["overview", "Overview"],
                    ["inspection", "Inspection"],
                    ["history", "History"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={activePanel === key}
                    onClick={() => setActivePanel(key)}
                    className={cn(
                      "relative h-10 shrink-0 cursor-pointer border-none bg-transparent px-0 text-xs font-bold uppercase transition-colors",
                      activePanel === key
                        ? "text-(--brc-primary)"
                        : "text-(--brc-text-muted) hover:text-(--brc-text)",
                    )}
                  >
                    {label}
                    {activePanel === key ? (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-(--brc-primary)" />
                    ) : null}
                  </button>
                ))}
              </div>
            </DrawerHeader>

            <div className="min-h-0 flex-1 overflow-y-auto bg-white p-5 sm:p-8">
              {activePanel === "overview" ? (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-8">
                    {images.length > 0 ? (
                      <ReviewSection title="Vehicle photos">
                        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle)">
                          <Image
                            src={images[activeImage]?.image ?? ""}
                            alt={car.title}
                            fill
                            className="object-cover"
                          />
                          {images.length > 1 ? (
                            <>
                              <button
                                type="button"
                                aria-label="Previous photo"
                                onClick={() =>
                                  setActiveImage((index) =>
                                    index === 0 ? images.length - 1 : index - 1,
                                  )
                                }
                                className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-(--brc-border) bg-white/95 text-(--brc-text) shadow-sm"
                              >
                                <ChevronLeftIcon size={16} />
                              </button>
                              <button
                                type="button"
                                aria-label="Next photo"
                                onClick={() =>
                                  setActiveImage((index) =>
                                    index === images.length - 1 ? 0 : index + 1,
                                  )
                                }
                                className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-(--brc-border) bg-white/95 text-(--brc-text) shadow-sm"
                              >
                                <ChevronRightIcon size={16} />
                              </button>
                            </>
                          ) : null}
                          <span className="absolute right-2 bottom-2 rounded-md bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
                            {activeImage + 1} / {images.length}
                          </span>
                        </div>
                        {images.length > 1 ? (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {images.map((image, index) => (
                              <button
                                key={image.id}
                                type="button"
                                aria-label={`View photo ${index + 1}`}
                                onClick={() => setActiveImage(index)}
                                className={cn(
                                  "relative h-12 w-16 shrink-0 overflow-hidden rounded-md border-2 bg-(--brc-bg-subtle)",
                                  index === activeImage
                                    ? "border-(--brc-primary)"
                                    : "border-transparent opacity-65 hover:opacity-100",
                                )}
                              >
                                <Image
                                  src={image.thumbnail ?? image.image}
                                  alt=""
                                  fill
                                  className="object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </ReviewSection>
                    ) : null}

                    <ReviewSection title="Pricing">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1">
                        {car.rent_price_per_day ? (
                          <div className="border border-(--brc-primary)/15 bg-(--brc-primary-tint) p-4">
                            <span className="text-[11px] font-bold text-(--brc-primary)">
                              Rental price
                            </span>
                            <strong className="mt-1 block text-xl text-(--brc-primary) [font-family:var(--brc-font-display)]">
                              {car.currency === "NGN" ? "₦" : car.currency}
                              {Number(
                                car.rent_price_per_day,
                              ).toLocaleString("en-NG")}
                              <span className="text-xs">/day</span>
                            </strong>
                          </div>
                        ) : null}
                        {car.sale_price ? (
                          <div className="border border-(--brc-primary)/15 bg-(--brc-primary-tint) p-4">
                            <span className="text-[11px] font-bold text-(--brc-primary)">
                              Sale price
                            </span>
                            <strong className="mt-1 block text-xl text-(--brc-primary) [font-family:var(--brc-font-display)]">
                              {car.currency === "NGN" ? "₦" : car.currency}
                              {Number(car.sale_price).toLocaleString("en-NG")}
                            </strong>
                          </div>
                        ) : null}
                      </div>
                    </ReviewSection>

                    <ReviewSection title="Vehicle specifications">
                      <dl className="grid grid-cols-2 gap-px overflow-hidden border border-(--brc-border) bg-(--brc-border)">
                        {[
                          ["Brand", car.brand],
                          ["Model", car.model],
                          ["Year", String(car.year)],
                          ["Body", car.body_type || "-"],
                          ["Transmission", car.transmission || "-"],
                          ["Fuel", car.fuel_type || "-"],
                          ["Seats", String(car.seats)],
                          [
                            "Mileage",
                            car.mileage
                              ? `${car.mileage.toLocaleString()} km`
                              : "-",
                          ],
                          ["Colour", car.color || "-"],
                        ].map(([label, value]) => (
                          <div key={label} className="min-w-0 bg-white p-3">
                            <dt className="text-[10px] text-(--brc-text-muted)">
                              {label}
                            </dt>
                            <dd className="mt-1 truncate text-sm font-bold text-(--brc-text)">
                              {value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </ReviewSection>
                  </div>

                  <div className="flex min-w-0 flex-col gap-8">
                    <ReviewSection title="Identity control">
                      <VehicleIdentityCard
                        vin={car.vin}
                        plateNumber={car.plate_number}
                      />
                    </ReviewSection>

                    <ReviewSection title="Owner">
                      <div className="border border-(--brc-border) p-4">
                        <div className="flex items-center gap-3">
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-(--brc-primary-tint) text-sm font-bold text-(--brc-primary)">
                            {car.owner.first_name[0]}
                            {car.owner.last_name[0]}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="truncate text-sm">
                                {car.owner.first_name} {car.owner.last_name}
                              </strong>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase",
                                  car.owner.is_verified
                                    ? "bg-(--brc-success-bg) text-(--brc-success)"
                                    : "bg-(--brc-warning-bg) text-[#8a6800]",
                                )}
                              >
                                <ShieldCheckIcon size={11} />
                                {car.owner.is_verified
                                  ? "Verified"
                                  : "Unverified"}
                              </span>
                            </div>
                            <span className="mt-1 block truncate text-xs text-(--brc-text-muted)">
                              {car.owner.email}
                            </span>
                            <span className="block truncate text-xs text-(--brc-text-muted)">
                              {car.owner.phone || "No phone number"}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 border-t border-(--brc-border) pt-3 text-xs text-(--brc-text-muted)">
                          {car.owner.listing_count} listing
                          {car.owner.listing_count === 1 ? "" : "s"} / member
                          since {new Date(car.owner.date_joined).getFullYear()}
                        </div>
                      </div>
                    </ReviewSection>

                    <ReviewSection title="Location">
                      <div className="flex items-start gap-2 border-b border-(--brc-border) pb-3 text-sm text-(--brc-text-secondary)">
                        <MapPinIcon
                          size={17}
                          className="mt-0.5 shrink-0 text-(--brc-accent)"
                        />
                        <span>
                          {car.state}
                          {car.city ? `, ${car.city}` : ""}
                          {car.country ? `, ${car.country}` : ""}
                        </span>
                      </div>
                    </ReviewSection>

                    {car.description ? (
                      <ReviewSection title="Description">
                        <p className="m-0 text-sm leading-6 text-(--brc-text-secondary)">
                          {car.description}
                        </p>
                      </ReviewSection>
                    ) : null}

                    {car.features.length > 0 ? (
                      <ReviewSection title="Features">
                        <div className="flex flex-wrap gap-2">
                          {car.features.map((feature) => (
                            <span
                              key={feature.id ?? feature.name}
                              className="rounded-md border border-(--brc-border) bg-(--brc-bg-subtle) px-2.5 py-1.5 text-xs font-semibold"
                            >
                              {feature.name}
                              {feature.description ? `: ${feature.description}` : ""}
                            </span>
                          ))}
                        </div>
                      </ReviewSection>
                    ) : null}

                    {isDraft ? (
                      <ReviewSection
                        title={`Review checklist (${checks.length}/${CHECKLIST.length})`}
                      >
                        <div className="flex flex-col gap-2">
                          {CHECKLIST.map((item, index) => {
                            const checked = checks.includes(index);
                            return (
                              <button
                                key={item}
                                type="button"
                                aria-pressed={checked}
                                onClick={() => toggleCheck(index)}
                                className={cn(
                                  "flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors",
                                  checked
                                    ? "border-(--brc-success) bg-(--brc-success-bg)"
                                    : "border-(--brc-border) bg-white hover:bg-(--brc-bg-subtle)",
                                )}
                              >
                                <span
                                  className={cn(
                                    "flex size-5 shrink-0 items-center justify-center rounded-md",
                                    checked
                                      ? "bg-(--brc-success) text-white"
                                      : "border border-(--brc-border) bg-white",
                                  )}
                                >
                                  {checked ? (
                                    <CheckIcon size={13} strokeWidth={3} />
                                  ) : null}
                                </span>
                                {item}
                              </button>
                            );
                          })}
                        </div>
                      </ReviewSection>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {activePanel === "inspection" ? (
                <div className="flex flex-col gap-7">
                  <ReviewSection title="Booking">
                    <InspectionBookingSummary
                      booking={booking}
                      trackingId={car.tracking_id}
                      loading={bookingLoading}
                    />
                  </ReviewSection>

                  <ReviewSection title="Inspection record">
                    <InspectionRecordPanel
                      bookingId={
                        clearanceBooking?.id ?? booking?.id ?? null
                      }
                    />
                  </ReviewSection>

                  {isNeedsClearance ? (
                    <ReviewSection title="Clearance">
                      {car.admin_note ? (
                        <div className="border border-[#f0c4a1] bg-[#fff7ed] p-4 text-sm text-[#9a4700]">
                          <strong className="block text-xs uppercase">
                            Staff note
                          </strong>
                          <p className="mt-1 mb-0">{car.admin_note}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-(--brc-text-muted)">
                          No clearance note recorded.
                        </span>
                      )}
                      {clearanceResponses.map((entry) => (
                        <div
                          key={entry.id}
                          className="border border-(--brc-primary)/20 bg-(--brc-primary-tint) p-4"
                        >
                          <p className="m-0 text-sm">{entry.note}</p>
                          <span className="mt-2 block text-[11px] font-bold text-(--brc-text-muted)">
                            Owner / {formatAdminDate(entry.created_at)}
                          </span>
                        </div>
                      ))}
                    </ReviewSection>
                  ) : null}
                </div>
              ) : null}

              {activePanel === "history" ? (
                <ReviewSection title="Status timeline">
                  <CarStatusTimeline
                    entries={carHistory ?? []}
                    loading={historyLoading}
                    viewer="staff"
                  />
                </ReviewSection>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-(--brc-border) bg-white px-5 py-5 sm:px-8">
              {isDraft && requestingChanges ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <strong className="text-sm">What needs to change?</strong>
                    <p className="mt-1 mb-0 text-xs text-(--brc-text-muted)">
                      The owner will receive this note with the requested
                      changes.
                    </p>
                  </div>
                  <textarea
                    value={staffNote}
                    onChange={(event) => setStaffNote(event.target.value)}
                    rows={3}
                    placeholder="Describe the exact corrections the owner should make."
                    className="w-full resize-none rounded-lg border border-(--brc-border) bg-(--brc-bg-subtle) p-3 text-sm outline-none focus:border-(--brc-primary)"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRequestingChanges(false);
                        setStaffNote("");
                      }}
                      className="h-11 flex-1 rounded-lg border border-(--brc-border) bg-white text-sm font-bold hover:bg-(--brc-bg-subtle)"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={anyActing || !staffNote.trim()}
                      onClick={handleRequestChanges}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-(--brc-warning) text-sm font-bold text-[#121212] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {requestChanges.isPending ? (
                        <Loader2Icon size={16} className="animate-spin" />
                      ) : null}
                      Send to owner
                    </button>
                  </div>
                </div>
              ) : isDraft ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={anyActing}
                      onClick={() => setRequestingChanges(true)}
                      className="h-11 flex-1 rounded-lg border border-(--brc-border) bg-white text-sm font-bold hover:bg-(--brc-bg-subtle) disabled:opacity-50"
                    >
                      Request changes
                    </button>
                    <button
                      type="button"
                      disabled={anyActing || !allChecked}
                      onClick={handleApproveListing}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-(--brc-success) text-sm font-bold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {approveListing.isPending ? (
                        <Loader2Icon size={16} className="animate-spin" />
                      ) : null}
                      Approve for inspection
                    </button>
                  </div>
                  {!allChecked ? (
                    <span className="text-center text-[11px] font-semibold text-(--brc-text-muted)">
                      Complete all checklist items to enable approval.
                    </span>
                  ) : null}
                </div>
              ) : isListingApproved ? (
                <p className="m-0 text-center text-sm text-(--brc-text-muted)">
                  Waiting for the owner to book an inspection slot.
                </p>
              ) : isInspectionPending ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={anyActing || !booking}
                      onClick={handleNoShow}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-[#f97316] bg-white text-sm font-bold text-[#b34700] hover:bg-[#fff7ed] disabled:opacity-50"
                    >
                      {markNoShow.isPending ? (
                        <Loader2Icon size={16} className="animate-spin" />
                      ) : null}
                      Mark no-show
                    </button>
                    <button
                      type="button"
                      disabled={anyActing || !booking}
                      onClick={handleStartInspection}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-(--brc-primary) text-sm font-bold text-white hover:bg-(--brc-primary-hover) disabled:opacity-50"
                    >
                      {startInspection.isPending ? (
                        <Loader2Icon size={16} className="animate-spin" />
                      ) : null}
                      Start inspection
                    </button>
                  </div>
                  {!booking ? (
                    <span className="text-center text-[11px] text-(--brc-text-muted)">
                      No active booking was found for this car.
                    </span>
                  ) : null}
                </div>
              ) : isInspectionInProgress ? (
                <button
                  type="button"
                  disabled={!booking}
                  onClick={handleContinueInspection}
                  className="group flex min-h-14 w-full items-center justify-between gap-3 rounded-lg bg-(--brc-primary) px-4 text-left text-white hover:bg-(--brc-primary-hover) disabled:bg-(--brc-bg-muted) disabled:text-(--brc-text-muted)"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                      <ClipboardCheckIcon size={18} />
                    </span>
                    <span>
                      <strong className="block text-sm">
                        Continue inspection
                      </strong>
                      <span className="block text-xs text-white/70">
                        Resume the physical inspection form
                      </span>
                    </span>
                  </span>
                  <ArrowRightIcon size={18} />
                </button>
              ) : isNeedsClearance ? (
                <div className="flex flex-col gap-3">
                  <textarea
                    value={staffNote}
                    onChange={(event) => setStaffNote(event.target.value)}
                    rows={2}
                    placeholder="Resolution note (required when rejecting)"
                    className="w-full resize-none rounded-lg border border-(--brc-border) p-3 text-sm outline-none focus:border-(--brc-primary)"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={
                        anyActing ||
                        !clearanceBooking ||
                        !staffNote.trim()
                      }
                      onClick={() => handleResolveClearance("reject")}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-(--brc-danger) bg-white text-sm font-bold text-(--brc-danger) hover:bg-(--brc-danger-bg) disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={anyActing || !clearanceBooking}
                      onClick={() => handleResolveClearance("publish")}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-(--brc-success) text-sm font-bold text-white disabled:opacity-50"
                    >
                      {resolveClearance.isPending ? (
                        <Loader2Icon size={16} className="animate-spin" />
                      ) : null}
                      Clear and publish
                    </button>
                  </div>
                </div>
              ) : car.status === "inspection_no_show" ? (
                <p className="m-0 text-center text-sm text-(--brc-text-muted)">
                  The owner missed the appointment. Waiting for a new booking.
                </p>
              ) : car.status === "inspection_rejected" ? (
                <p className="m-0 text-center text-sm text-(--brc-text-muted)">
                  Inspection failed. Waiting for the owner to resolve the
                  issues.
                </p>
              ) : car.status === "needs_changes" ? (
                <div className="border border-(--brc-warning)/30 bg-(--brc-warning-bg) p-3 text-sm text-[#8a6800]">
                  <strong className="block text-xs uppercase">
                    Changes requested
                  </strong>
                  <p className="mt-1 mb-0">
                    {car.admin_note ||
                      "Waiting for the owner to update and resubmit the listing."}
                  </p>
                </div>
              ) : car.status === "suspended" ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-(--brc-text-muted)">
                    This listing is suspended.
                  </span>
                  <button
                    type="button"
                    disabled={anyActing}
                    onClick={() => onAction(car.id, "published")}
                    className="h-11 rounded-lg bg-(--brc-success) px-5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    Reinstate
                  </button>
                </div>
              ) : car.status === "published" ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-(--brc-text-muted)">
                    This listing is live.
                  </span>
                  <button
                    type="button"
                    disabled={anyActing}
                    onClick={() => onAction(car.id, "suspended")}
                    className="h-11 rounded-lg border border-(--brc-danger) bg-white px-5 text-sm font-bold text-(--brc-danger) hover:bg-(--brc-danger-bg) disabled:opacity-50"
                  >
                    Suspend listing
                  </button>
                </div>
              ) : (
                <p className="m-0 text-center text-sm text-(--brc-text-muted)">
                  This listing has already been processed.
                </p>
              )}
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
