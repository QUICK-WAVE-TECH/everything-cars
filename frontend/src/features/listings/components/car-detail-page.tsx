"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { CoverflowCarousel } from "@/shared/components/coverflow-carousel";
import Link from "next/link";
import { Icon } from "@/features/auth/components/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { usePublicCarDetail } from "@/features/listings/api";
import { VerifiedReport, VerifiedBadge } from "@/features/listings/components/verified-report";
import { NegotiableBadge } from "@/features/listings/components/negotiable-badge";
import { useCarReviews } from "@/features/reviews/api";
import { StarRating } from "@/features/reviews/components/star-rating";
import { useAuthStore } from "@/features/auth/store";
import { useMe } from "@/features/auth/api";
import { useCustomerRequests, useCreateRequest } from "@/features/requests/api";
import { toast } from "sonner";
import { AvailabilityBadge } from "./availability-badge";
import { MakeOfferDialog } from "@/features/offers/components/make-offer-dialog";

const ACTIVE_REQUEST_STATUSES = [
  "pending",
  "approved",
  "payment_submitted",
  "paid",
  "active",
];

const AvailabilityCalendar = dynamic(
  () => import("./availability-calendar").then((mod) => mod.AvailabilityCalendar),
  {
    ssr: false,
    loading: () => <Skeleton className="h-44 w-full rounded-xl" />,
  },
);

const CarReviewsSection = dynamic(
  () =>
    import("@/features/reviews/components/car-reviews-section").then(
      (mod) => mod.CarReviewsSection,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full rounded-xl" />,
  },
);

// ── Helpers ──

function currencySymbol(code: string) {
  const map: Record<string, string> = { NGN: "\u20A6", USD: "$", GBP: "\u00A3", EUR: "\u20AC" };
  return map[code] ?? code;
}

function fmtMoney(amount: string | number, currency: string) {
  return `${currencySymbol(currency)}${Number(amount).toLocaleString("en-NG")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Main Component ──

export function CarDetailPage({ carId }: { carId: string }) {
  const { data: car, isLoading, isError } = usePublicCarDetail(carId);
  // Skip the request entirely on buy listings — reviews are rent-only.
  const { data: reviewsData } = useCarReviews(carId, {
    enabled: car ? car.listing_type === "rent" : false,
  });
  const carouselRef = useRef<HTMLDivElement>(null);

  const { isAuthenticated, userRole } = useAuthStore();
  const { data: me } = useMe();
  const shouldFetchCustomerRequests =
    isAuthenticated && userRole === "customer";
  const { data: myRequests } = useCustomerRequests(undefined, {
    enabled: shouldFetchCustomerRequests,
  });

  const createRequest = useCreateRequest();

  const isBuyListing = car?.listing_type === "buy";
  const isNegotiableBuy = isBuyListing && !!car?.is_negotiable;
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [reqPrice, setReqPrice] = useState("");
  const [reqDays, setReqDays] = useState("");
  const [reqStartDate, setReqStartDate] = useState("");
  const [reqMessage, setReqMessage] = useState("");

  // Determine the user's relationship to this car
  const isOwner = isAuthenticated && me && car && car.owner.id === me.id;
  const isCustomer = isAuthenticated && userRole === "customer";

  // Find existing ACTIVE request for this car from the current customer
  // Cancelled/rejected/completed requests don't block new requests
  const customerRequests = myRequests?.results ?? [];
  const myRequestForCar =
    isCustomer && car
      ? (customerRequests.find(
          (r) =>
            r.car.id === car.id && ACTIVE_REQUEST_STATUSES.includes(r.status),
        ) ??
        customerRequests.find(
          (r) => r.car.id === car.id && r.status === "completed",
        ) ??
        null)
      : null;

  const isSold = car?.availability_status === "sold";
  const isReserved = car?.availability_status === "reserved";

  // A car is listed for rent XOR buy, so the listing type IS the mode.
  const effectiveMode: "rent" | "buy" = isBuyListing ? "buy" : "rent";

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 80px" }}>
        <Skeleton className="mb-8 h-8 w-64" />
        <div className="grid gap-10" style={{ gridTemplateColumns: "minmax(0, 504px) 1fr" }}>
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-80" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-12 w-56" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // A sold/removed listing is no longer public (404) — show a clear state
  // instead of an endless skeleton.
  if (isError || !car) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-24 text-center [font-family:var(--brc-font-ui)]">
        <Icon name="car" size={48} stroke="var(--brc-border)" />
        <h1 className="m-0 text-xl font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">
          This car isn&apos;t available
        </h1>
        <p className="m-0 text-sm text-(--brc-text-muted)">
          It may have been sold or removed from the marketplace.
        </p>
        <Link
          href="/services"
          className="mt-2 inline-flex h-10 items-center rounded-lg bg-(--brc-primary) px-5 text-sm font-bold text-white no-underline transition-all hover:brightness-95"
        >
          Browse other cars
        </Link>
      </div>
    );
  }

  const images = car.images ?? [];
  const primaryIdx = images.findIndex((img) => img.is_primary);
  const sortedImages = primaryIdx > 0
    ? [images[primaryIdx], ...images.filter((_, i) => i !== primaryIdx)]
    : images;

  const avgRating = reviewsData?.avg_rating ?? null;
  const reviewCount = reviewsData?.review_count ?? 0;

  const specs: [string, string][] = [
    ["Brand", car.brand],
    ["Model", car.model],
    ["Year", String(car.year)],
    ["Body Type", car.body_type || "—"],
    ["Transmission", car.transmission || "—"],
    ["Fuel Type", car.fuel_type || "—"],
    ["Seats", String(car.seats)],
    ["Mileage", car.mileage ? `${car.mileage.toLocaleString()} km` : "—"],
    ["Colour", car.color || "—"],
    ["Location", `${car.state}${car.city ? `, ${car.city}` : ""}`],
  ];

  void carouselRef; // reserved for "You May Also Like" carousel

  return (
    <article
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "clamp(24px, 5vw, 32px) clamp(16px, 5vw, 24px) 80px",
        fontFamily: "var(--brc-font-ui)",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Breadcrumb + Mode Toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
        <nav aria-label="Breadcrumb">
          <ol style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, listStyle: "none", margin: 0, padding: 0, fontSize: 14, color: "var(--brc-text-secondary)" }}>
            <li><Link href="/services" style={{ color: "var(--brc-text-secondary)", textDecoration: "none" }}>Browse Cars</Link></li>
            <li aria-hidden="true"><Icon name="chevright" size={14} stroke="var(--brc-text-muted)" /></li>
            <li aria-current="page" style={{ color: "var(--brc-text)", fontWeight: 600 }}>{car.title}</li>
          </ol>
        </nav>

        {/* The rent/buy mode switcher lived here for "both" listings. A car is
            now listed for rent XOR buy, so the mode is fully determined by
            listing_type and there is nothing to switch between. */}
      </div>

      {/* Two-column: Gallery + Info */}
      <div className="car-detail-two-col" style={{ display: "grid", gridTemplateColumns: "minmax(0, 504px) 1fr", gap: 40, alignItems: "start", marginBottom: 56 }}>
        {/* Gallery — 3D coverflow of the car's photos */}
        <section aria-label="Car gallery" style={{ minWidth: 0 }}>
          {sortedImages.length > 0 ? (
            <CoverflowCarousel
              variant="bare"
              overlay={false}
              autoplay={false}
              imageFit="contain"
              glass
              stageHeight="clamp(300px, 44vw, 440px)"
              cardWidth="clamp(200px, 62%, 320px)"
              items={sortedImages
                .filter(Boolean)
                .map((img) => ({ id: img!.id, img: img!.image, title: car.title }))}
            />
          ) : (
            <div
              style={{
                position: "relative",
                height: "clamp(300px, 58vw, 460px)",
                borderRadius: "var(--brc-radius-lg)",
                background: "var(--brc-bg-subtle)",
                border: "1px solid var(--brc-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="car" size={64} stroke="var(--brc-border)" />
            </div>
          )}
        </section>

        {/* Info Panel */}
        <section aria-label="Car details" style={{ minWidth: 0 }}>
          <p style={{ display: "inline-block", background: "var(--brc-primary-tint)", color: "var(--brc-primary)", borderRadius: "var(--brc-radius-pill)", padding: "4px 14px", fontSize: 12, fontWeight: 700, marginBottom: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {effectiveMode === "rent" ? "Available for Rent" : "Available for Purchase"}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "0 0 8px" }}>
            <h1 style={{ fontFamily: "var(--brc-font-display)", fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, color: "var(--brc-text)", margin: 0, lineHeight: 1.2 }}>
              {car.title}
            </h1>
            {car.is_verified && <VerifiedBadge />}
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14, color: "var(--brc-text-secondary)", marginBottom: 12 }}>
            <span>Colour: <strong style={{ color: "var(--brc-text)" }}>{car.color || "—"}</strong></span>
            <span>Model: <strong style={{ color: "var(--brc-text)" }}>{car.model}</strong></span>
            <span>Year: <strong style={{ color: "var(--brc-text)" }}>{car.year}</strong></span>
          </div>

          {/* Rating — rent listings only; reviews don't exist for buy cars */}
          {!isBuyListing && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <StarRating rating={avgRating ?? 0} size={18} />
              {avgRating ? (
                <>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--brc-text)" }}>{avgRating}</span>
                  <span style={{ fontSize: 13, color: "var(--brc-text-muted)" }}>({reviewCount} {reviewCount === 1 ? "review" : "reviews"})</span>
                </>
              ) : (
                <span style={{ fontSize: 13, color: "var(--brc-text-muted)" }}>No reviews yet</span>
              )}
            </div>
          )}

          {/* Price */}
          <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: "clamp(24px, 4vw, 30px)", fontWeight: 700, color: "var(--brc-text)", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {effectiveMode === "rent" && car.rent_price_per_day
              ? `${fmtMoney(car.rent_price_per_day, car.currency)}/day`
              : car.sale_price
                ? fmtMoney(car.sale_price, car.currency)
                : "—"}
            {effectiveMode === "buy" && <NegotiableBadge isNegotiable={car.is_negotiable} />}
          </p>

          {/* Availability badge */}
          <div style={{ marginBottom: 20 }}>
            <AvailabilityBadge
              status={car.availability_status}
              availableFrom={car.available_from}
              listingType={car.listing_type}
            />
          </div>

          {/* Availability calendar */}
          {car.booked_periods && car.booked_periods.length > 0 && car.availability_status !== "sold" && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontFamily: "var(--brc-font-display)", fontSize: 16, fontWeight: 700, color: "var(--brc-text)", margin: "0 0 8px" }}>
                Availability
              </h3>
              {car.available_from && (
                <p style={{ fontFamily: "var(--brc-font-ui)", fontSize: 13, color: "var(--brc-text-secondary)", margin: "0 0 10px" }}>
                  Available from {formatDate(car.available_from)}
                </p>
              )}
              <AvailabilityCalendar bookedPeriods={car.booked_periods} />
            </div>
          )}

          {/* Owner info */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "var(--brc-bg-subtle)", borderRadius: "var(--brc-radius-md)", border: "1px solid var(--brc-border)", marginBottom: 20 }}>
            <span style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--brc-primary-tint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "var(--brc-primary)", flexShrink: 0 }}>
              {car.owner.first_name[0]}{car.owner.last_name[0]}
            </span>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--brc-text)" }}>
                {car.owner.business_name || `${car.owner.first_name} ${car.owner.last_name}`}
              </span>
              {car.owner.is_verified && (
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: "var(--brc-success)", background: "var(--brc-success-bg)", padding: "2px 8px", borderRadius: "var(--brc-radius-pill)" }}>Verified</span>
              )}
              <span style={{ display: "block", fontSize: 12, color: "var(--brc-text-muted)" }}>
                {car.owner.listing_count} listing{car.owner.listing_count !== 1 ? "s" : ""} · Member since {new Date(car.owner.date_joined).getFullYear()}
              </span>
            </div>
          </div>

          {/* Location */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--brc-text-secondary)", marginBottom: 20 }}>
            <Icon name="pin" size={16} stroke="var(--brc-accent)" />
            {car.city && <span>{car.city},</span>} <span>{car.state}</span> {car.country && <span>· {car.country.length === 2 ? (new Intl.DisplayNames(["en"], { type: "region" }).of(car.country.toUpperCase()) ?? car.country) : car.country}</span>}
          </div>

          {/* Branch — inherited location & contact for dealer listings */}
          {car.branch && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 14, marginBottom: 20, borderRadius: "var(--brc-radius-md)", border: "1px solid var(--brc-border)", background: "var(--brc-bg-subtle)", fontFamily: "var(--brc-font-ui)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "var(--brc-text)" }}>
                <Icon name="pin" size={15} stroke="var(--brc-primary)" />
                {car.branch.name}
              </div>
              <div style={{ fontSize: 13, color: "var(--brc-text-secondary)" }}>
                {car.branch.city}, {car.branch.state}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", fontSize: 13, color: "var(--brc-text-secondary)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="phone" size={14} stroke="var(--brc-text-muted)" />
                  {car.branch.phone}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="mail" size={14} stroke="var(--brc-text-muted)" />
                  {car.branch.email}
                </span>
              </div>
            </div>
          )}

          {/* CTA — context-aware */}
          {isSold ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 52, width: "100%", borderRadius: "var(--brc-radius-sm)", background: "var(--brc-bg-muted)", color: "var(--brc-text-muted)", fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 15 }}>
              <Icon name="check" size={17} stroke="var(--brc-text-muted)" />
              This car has been sold
            </div>
          ) : isReserved && !myRequestForCar ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 52, width: "100%", borderRadius: "var(--brc-radius-sm)", background: "var(--brc-accent-bg)", border: "1px solid var(--brc-accent)", color: "var(--brc-accent)", fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 15 }}>
              <Icon name="clock" size={17} stroke="var(--brc-accent)" />
              This car is currently reserved
            </div>
          ) : isOwner ? (
            <Link
              href={`/owner/my-cars/${car.id}`}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 52, width: "100%", borderRadius: "var(--brc-radius-sm)", background: "var(--brc-bg-subtle)", border: "1px solid var(--brc-border)", color: "var(--brc-text)", fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 15, textDecoration: "none" }}
            >
              This is your listing
              <Icon name="arrow" size={17} stroke="var(--brc-text)" />
            </Link>
          ) : myRequestForCar ? (
            <Link
              href={`/customer/requests/${myRequestForCar.id}`}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 52, width: "100%", borderRadius: "var(--brc-radius-sm)", background: myRequestForCar.status === "completed" ? "var(--brc-success)" : "var(--brc-primary)", color: "#fff", fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 15, textDecoration: "none" }}
            >
              {myRequestForCar.status === "completed" && !isBuyListing
                ? "Write a Review"
                : `View Your Request (${myRequestForCar.status.replace("_", " ")})`}
              <Icon name="arrow" size={17} stroke="#fff" />
            </Link>
          ) : !isAuthenticated ? (
            <Link
              href="/get-started"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 52, width: "100%", borderRadius: "var(--brc-radius-sm)", background: "var(--brc-primary)", color: "#fff", fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 15, textDecoration: "none" }}
            >
              {effectiveMode === "rent" ? "Request to Rent" : "Request to Buy"}
              <Icon name="arrow" size={17} stroke="#fff" />
            </Link>
          ) : isNegotiableBuy ? (
            <>
              <button
                type="button"
                onClick={() => setOfferDialogOpen(true)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 52, width: "100%", borderRadius: "var(--brc-radius-sm)", background: "var(--brc-primary)", color: "#fff", fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer" }}
              >
                Make an Offer
                <Icon name="arrow" size={17} stroke="#fff" />
              </button>
              <p style={{ fontSize: 13, color: "var(--brc-text-muted)", margin: "10px 0 0", textAlign: "center" }}>
                The seller is open to offers on this vehicle.
              </p>
              <MakeOfferDialog
                carId={car.id}
                carTitle={car.title}
                salePrice={car.sale_price ?? "0"}
                currency={car.currency}
                primaryImage={sortedImages[0]?.image ?? null}
                open={offerDialogOpen}
                onOpenChange={setOfferDialogOpen}
              />
            </>
          ) : !showRequestForm ? (
            <button
              type="button"
              onClick={() => setShowRequestForm(true)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 52, width: "100%", borderRadius: "var(--brc-radius-sm)", background: "var(--brc-primary)", color: "#fff", fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer" }}
            >
              {effectiveMode === "rent" ? "Request to Rent" : "Request to Buy"}
              <Icon name="arrow" size={17} stroke="#fff" />
            </button>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!car) return;
                try {
                  await createRequest.mutateAsync({
                    car: car.id,
                    request_type: effectiveMode,
                    // A non-negotiable buy is pinned to the set sale price; only
                    // rentals carry a user-entered price.
                    price_offered:
                      effectiveMode === "rent" ? reqPrice : car.sale_price ?? "",
                    ...(effectiveMode === "rent" ? {
                      duration_days: Number(reqDays),
                      start_date: reqStartDate,
                    } : {}),
                    message: reqMessage || undefined,
                  });
                  toast.success("Request submitted successfully!");
                  setShowRequestForm(false);
                  setReqPrice("");
                  setReqDays("");
                  setReqStartDate("");
                  setReqMessage("");
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : "Failed to submit request";
                  toast.error(msg);
                }
              }}
              style={{ display: "flex", flexDirection: "column", gap: 12, padding: 20, border: "1px solid var(--brc-border)", borderRadius: "var(--brc-radius-md)", background: "var(--brc-bg-subtle)" }}
            >
              <h3 style={{ fontFamily: "var(--brc-font-display)", fontSize: 16, fontWeight: 700, color: "var(--brc-text)", margin: 0 }}>
                {effectiveMode === "rent" ? "Rental Request" : "Purchase Request"}
              </h3>

              {effectiveMode === "rent" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--brc-text-secondary)", fontFamily: "var(--brc-font-ui)" }}>
                    Price Offered (per day)
                  </label>
                  <input
                    type="number"
                    required
                    value={reqPrice}
                    onChange={(e) => setReqPrice(e.target.value)}
                    placeholder={car.rent_price_per_day ?? ""}
                    style={{ height: 44, borderRadius: "var(--brc-radius-sm)", border: "1px solid var(--brc-border)", padding: "0 12px", fontSize: 14, fontFamily: "var(--brc-font-ui)", color: "var(--brc-text)", outline: "none", background: "#fff" }}
                  />
                </div>
              ) : (
                // Non-negotiable buy — the price is fixed at the set sale price.
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--brc-text-secondary)", fontFamily: "var(--brc-font-ui)" }}>
                    Set Price (not negotiable)
                  </label>
                  <div style={{ height: 44, display: "flex", alignItems: "center", borderRadius: "var(--brc-radius-sm)", border: "1px solid var(--brc-border)", padding: "0 12px", fontSize: 15, fontWeight: 700, fontFamily: "var(--brc-font-ui)", color: "var(--brc-text)", background: "var(--brc-bg-muted)" }}>
                    {car.currency} {Number(car.sale_price ?? 0).toLocaleString()}
                  </div>
                </div>
              )}

              {effectiveMode === "rent" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--brc-text-secondary)", fontFamily: "var(--brc-font-ui)" }}>Start Date</label>
                      <input
                        type="date"
                        required
                        value={reqStartDate}
                        onChange={(e) => setReqStartDate(e.target.value)}
                        style={{ height: 44, borderRadius: "var(--brc-radius-sm)", border: "1px solid var(--brc-border)", padding: "0 12px", fontSize: 14, fontFamily: "var(--brc-font-ui)", color: "var(--brc-text)", outline: "none", background: "#fff" }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--brc-text-secondary)", fontFamily: "var(--brc-font-ui)" }}>Duration (days)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={365}
                        value={reqDays}
                        onChange={(e) => setReqDays(e.target.value)}
                        placeholder="e.g. 7"
                        style={{ height: 44, borderRadius: "var(--brc-radius-sm)", border: "1px solid var(--brc-border)", padding: "0 12px", fontSize: 14, fontFamily: "var(--brc-font-ui)", color: "var(--brc-text)", outline: "none", background: "#fff" }}
                      />
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--brc-text-secondary)", fontFamily: "var(--brc-font-ui)" }}>Message (optional)</label>
                <textarea
                  value={reqMessage}
                  onChange={(e) => setReqMessage(e.target.value)}
                  placeholder="Any notes for the owner..."
                  rows={3}
                  style={{ borderRadius: "var(--brc-radius-sm)", border: "1px solid var(--brc-border)", padding: "10px 12px", fontSize: 14, fontFamily: "var(--brc-font-ui)", color: "var(--brc-text)", resize: "vertical", outline: "none", background: "#fff" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="submit"
                  disabled={createRequest.isPending}
                  style={{ flex: 1, height: 48, borderRadius: "var(--brc-radius-sm)", border: "none", background: "var(--brc-primary)", color: "#fff", fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 15, cursor: createRequest.isPending ? "not-allowed" : "pointer", opacity: createRequest.isPending ? 0.7 : 1 }}
                >
                  {createRequest.isPending ? "Submitting..." : "Submit Request"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  style={{ height: 48, padding: "0 20px", borderRadius: "var(--brc-radius-sm)", border: "1px solid var(--brc-border)", background: "#fff", color: "var(--brc-text)", fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      {/* Description / Reviews Tabs — reviews are rent-only */}
      <section aria-label="Car details and reviews" style={{ marginBottom: 64 }}>
        <Tabs defaultValue="description">
          <TabsList variant="line" style={{ width: "100%", borderBottom: "2px solid var(--brc-border)", borderRadius: 0, paddingBottom: 0, height: "auto", marginBottom: 32, gap: 0, maxWidth: "100%", overflowX: "auto" }}>
            {(isBuyListing ? (["description"] as const) : (["description", "reviews"] as const)).map((tab) => (
              <TabsTrigger key={tab} value={tab} className="car-detail-tab-trigger" style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 15, padding: "10px 24px", textTransform: "capitalize", borderRadius: 0, flex: "none" }}>
                {tab === "description" ? "Description" : `Reviews (${reviewCount})`}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Description tab */}
          <TabsContent value="description">
            <div className="car-detail-desc-grid" style={{ display: "grid", gridTemplateColumns: "1fr minmax(0, 320px)", gap: 40, alignItems: "start" }}>
              <div>
                {car.verified_report && (
                  <div style={{ marginBottom: 28 }}>
                    <VerifiedReport report={car.verified_report} />
                  </div>
                )}

                <div
                  style={{
                    background: "white",
                    border: "1px solid var(--brc-border)",
                    borderRadius: 20,
                    padding: "26px 28px",
                    boxShadow: "0 14px 40px rgba(18,18,18,0.06)",
                    marginBottom: 32,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                    <span
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: "var(--brc-primary-tint)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name="file" size={19} stroke="var(--brc-primary)" />
                    </span>
                    <h2 style={{ fontFamily: "var(--brc-font-display)", fontSize: 22, fontWeight: 800, color: "var(--brc-text)", margin: 0 }}>
                      Description
                    </h2>
                  </div>
                  <p
                    style={{
                      fontSize: 15,
                      lineHeight: 1.8,
                      color: "var(--brc-text-secondary)",
                      margin: 0,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {car.description || "No description provided."}
                  </p>
                </div>

                {car.features.length > 0 && (
                  <>
                    <h3 style={{ fontFamily: "var(--brc-font-display)", fontSize: 18, fontWeight: 700, color: "var(--brc-text)", margin: "0 0 16px" }}>
                      Features
                    </h3>
                    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                      {car.features.map((f) => (
                        <li key={f.name} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--brc-success-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                            <Icon name="check" size={12} stroke="var(--brc-success)" strokeWidth={2.5} />
                          </span>
                          <span style={{ fontSize: 14, color: "var(--brc-text-secondary)", lineHeight: 1.6 }}>
                            <strong style={{ color: "var(--brc-text)" }}>{f.name}</strong>{f.description ? `: ${f.description}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <Card>
                <CardContent style={{ padding: "20px 20px" }}>
                  <h3 style={{ fontFamily: "var(--brc-font-display)", fontSize: 16, fontWeight: 700, color: "var(--brc-text)", margin: "0 0 16px" }}>
                    Specifications
                  </h3>
                  <dl style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {specs.map(([label, value], idx) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: idx < specs.length - 1 ? "1px solid var(--brc-border)" : "none", gap: 12 }}>
                        <dt style={{ fontSize: 13, color: "var(--brc-text-muted)", flexShrink: 0 }}>{label}</dt>
                        <dd style={{ fontSize: 13, fontWeight: 600, color: "var(--brc-text)", textAlign: "right", margin: 0 }}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reviews tab — rent-only; the tab trigger above is hidden for buy listings */}
          {!isBuyListing && (
            <TabsContent value="reviews">
              <h2 style={{ fontFamily: "var(--brc-font-display)", fontSize: 22, fontWeight: 800, color: "var(--brc-text)", margin: "0 0 24px" }}>
                Customer Reviews
              </h2>
              <CarReviewsSection carId={carId} />
            </TabsContent>
          )}
        </Tabs>
      </section>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .car-detail-two-col { grid-template-columns: 1fr !important; }
          .car-detail-desc-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .car-detail-main-image { height: clamp(260px, 72vw, 340px) !important; }
          .car-detail-tab-trigger { padding-left: 14px !important; padding-right: 14px !important; font-size: 14px !important; }
        }
      `}</style>
    </article>
  );
}
