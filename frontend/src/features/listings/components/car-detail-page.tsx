"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Icon } from "@/features/auth/components/icon";
import { Star } from "@/shared/components/star";
import { CarCard } from "@/shared/components/car-card";
import { AuthButton } from "@/features/auth/components/auth-button";
import { PhoneField } from "@/features/auth/components/phone-field";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Car } from "@/shared/components/car-card";
import {
  DETAIL_CAR,
  REVIEWS,
  RATING_DIST,
  GALLERY_IMAGES,
  GALLERY_ALTS,
} from "./car-detail-data";

// ---------------------------------------------------------------------------
// "You may also like" data (client-only, not needed for SSR metadata)
// ---------------------------------------------------------------------------

const ALSO_LIKE: Car[] = [
  { id: 1, name: "Lexus NX 300h", type: "SUV", location: "Lagos, Nigeria", price: "₦35,000/day", rating: 4, mode: "rent" },
  { id: 2, name: "Toyota RAV4", type: "SUV", location: "Abuja, Nigeria", price: "₦42,000/day", rating: 5, mode: "rent" },
  { id: 3, name: "Mercedes GLE", type: "Luxury", location: "Lagos, Nigeria", price: "₦80,000/day", rating: 5, mode: "rent" },
  { id: 4, name: "Honda CR-V", type: "SUV", location: "Ibadan, Nigeria", price: "₦40,000/day", rating: 4, mode: "rent" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNaira(amount: number): string {
  return "₦" + amount.toLocaleString("en-NG");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StarRow({ rating }: { rating: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} filled={i <= Math.round(rating)} />
      ))}
    </span>
  );
}

function ReviewCard({ name, date, rating, text }: (typeof REVIEWS)[number]) {
  return (
    <article
      style={{
        padding: "20px 0",
        borderBottom: "1px solid var(--brc-border)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            aria-hidden="true"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "var(--brc-primary-tint)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--brc-font-ui)",
              fontWeight: 700,
              fontSize: 16,
              color: "var(--brc-primary)",
              flexShrink: 0,
            }}
          >
            {name.charAt(0)}
          </div>
          <div>
            <p style={{ fontFamily: "var(--brc-font-ui)", fontWeight: 700, fontSize: 14, color: "var(--brc-text)", margin: 0 }}>
              {name}
            </p>
            <p style={{ fontSize: 12, color: "var(--brc-text-muted)", margin: 0 }}>{date}</p>
          </div>
        </div>
        <StarRow rating={rating} />
      </div>
      <p style={{ fontSize: 14, color: "var(--brc-text-secondary)", lineHeight: 1.6, margin: 0 }}>{text}</p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CarDetailPage() {
  const [mode, setMode] = useState<"rent" | "buy">("rent");
  const [activeImage, setActiveImage] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentMessage, setRentMessage] = useState("");
  const [buyMessage, setBuyMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("+234");
  const [reviewText, setReviewText] = useState("");
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const totalRatingCount = RATING_DIST.reduce((s, [, c]) => s + c, 0);

  function prevImage() {
    setActiveImage((i) => (i === 0 ? GALLERY_IMAGES.length - 1 : i - 1));
  }
  function nextImage() {
    setActiveImage((i) => (i === GALLERY_IMAGES.length - 1 ? 0 : i + 1));
  }

  function scrollCarousel(dir: "left" | "right") {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: dir === "right" ? 320 : -320, behavior: "smooth" });
  }

  const fieldLabelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "var(--brc-text-secondary)" };

  // Shared contact fields used by both the rent and buy forms.
  const contactFields = (
    <>
      <div className="car-detail-name-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="contact-firstname" style={fieldLabelStyle}>First Name</label>
          <Input id="contact-firstname" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ height: 44, fontSize: 14 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="contact-lastname" style={fieldLabelStyle}>Last Name</label>
          <Input id="contact-lastname" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ height: 44, fontSize: 14 }} />
        </div>
      </div>
      <div className="car-detail-contact-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="contact-email" style={fieldLabelStyle}>Email Address</label>
          <Input id="contact-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ height: 44, fontSize: 14 }} />
        </div>
        <PhoneField value={phone} onChange={setPhone} code={phoneCode} onCodeChange={setPhoneCode} />
      </div>
    </>
  );

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: DETAIL_CAR.name,
    description: DETAIL_CAR.intro,
    image: "/car-lexus.png",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: String(DETAIL_CAR.rating),
      reviewCount: String(DETAIL_CAR.reviewCount),
    },
  };

  return (
    <>
      {/*
        JSON-LD structured data for SEO.
        Safe: `structuredData` is a hardcoded object — no user-supplied input
        is ever interpolated here, so there is no XSS risk.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

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
        {/* ------------------------------------------------------------------ */}
        {/* Breadcrumb + Mode Toggle                                            */}
        {/* ------------------------------------------------------------------ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <nav aria-label="Breadcrumb">
            <ol
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 6,
                listStyle: "none",
                margin: 0,
                padding: 0,
                fontSize: 14,
                color: "var(--brc-text-secondary)",
              }}
            >
              <li>
                <a
                  href={mode === "rent" ? "/services" : "/services"}
                  style={{ color: "var(--brc-text-secondary)", textDecoration: "none" }}
                >
                  {mode === "rent" ? "Rent Car" : "Buy Car"}
                </a>
              </li>
              <li aria-hidden="true" style={{ color: "var(--brc-text-muted)" }}>
                <Icon name="chevright" size={14} stroke="var(--brc-text-muted)" />
              </li>
              <li aria-current="page" style={{ color: "var(--brc-text)", fontWeight: 600 }}>
                {DETAIL_CAR.name}
              </li>
            </ol>
          </nav>

          {/* Mode toggle pill */}
          <div
            role="group"
            aria-label="View mode"
            style={{
              display: "inline-flex",
              background: "var(--brc-bg-muted)",
              borderRadius: "var(--brc-radius-pill)",
              padding: 4,
              gap: 4,
            }}
          >
            {(["rent", "buy"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className="brc-button-motion"
                style={{
                  height: 36,
                  padding: "0 20px",
                  borderRadius: "var(--brc-radius-pill)",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--brc-font-ui)",
                  fontWeight: 700,
                  fontSize: 14,
                  background: mode === m ? "var(--brc-primary)" : "transparent",
                  color: mode === m ? "#fff" : "var(--brc-text-secondary)",
                  transition: "background 180ms ease, color 180ms ease",
                }}
              >
                {m === "rent" ? "Rent" : "Buy"}
              </button>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Two-column layout: Gallery + Request Panel                          */}
        {/* ------------------------------------------------------------------ */}
        <div
          className="car-detail-two-col"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 504px) 1fr",
            gap: 40,
            alignItems: "start",
            marginBottom: 56,
          }}
        >
          {/* ---- Gallery ---- */}
          <section aria-label="Car gallery" style={{ minWidth: 0 }}>
            {/* Main image */}
            <div
              className="car-detail-main-image"
              style={{
                position: "relative",
                height: "clamp(300px, 58vw, 460px)",
                borderRadius: "var(--brc-radius-lg)",
                background: "var(--brc-bg-subtle)",
                overflow: "hidden",
                border: "1px solid var(--brc-border)",
              }}
            >
              <Image
                src={GALLERY_IMAGES[activeImage] ?? "/car-lexus.png"}
                alt={GALLERY_ALTS[activeImage] ?? DETAIL_CAR.name}
                fill
                style={{ objectFit: "contain", padding: 24 }}
                priority
                sizes="(max-width: 768px) 100vw, 504px"
              />

              {/* Prev arrow */}
              <button
                onClick={prevImage}
                aria-label="Previous image"
                className="brc-button-motion-icon"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "#fff",
                  border: "1px solid var(--brc-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "var(--brc-shadow-md)",
                }}
              >
                <Icon name="chevleft" size={18} stroke="var(--brc-text)" />
              </button>

              {/* Next arrow */}
              <button
                onClick={nextImage}
                aria-label="Next image"
                className="brc-button-motion-icon"
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "#fff",
                  border: "1px solid var(--brc-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "var(--brc-shadow-md)",
                }}
              >
                <Icon name="chevright" size={18} stroke="var(--brc-text)" />
              </button>
            </div>

            {/* Thumbnail strip */}
            <div
              style={{ display: "flex", gap: 10, marginTop: 12, overflowX: "auto", paddingBottom: 4 }}
              role="list"
              aria-label="Image thumbnails"
            >
              {GALLERY_IMAGES.slice(0, 3).map((src, i) => (
                <button
                  key={i}
                  role="listitem"
                  onClick={() => setActiveImage(i)}
                  aria-label={`View ${GALLERY_ALTS[i]}`}
                  aria-current={activeImage === i}
                  style={{
                    flex: 1,
                    height: 90,
                    borderRadius: "var(--brc-radius-md)",
                    border: activeImage === i
                      ? "2px solid var(--brc-primary)"
                      : "2px solid var(--brc-border)",
                    background: "var(--brc-bg-subtle)",
                    overflow: "hidden",
                    cursor: "pointer",
                    padding: 0,
                    position: "relative",
                    transition: "border-color 180ms ease",
                  }}
                >
                  <Image
                    src={src}
                    alt={GALLERY_ALTS[i] ?? DETAIL_CAR.name}
                    fill
                    style={{ objectFit: "contain", padding: 8 }}
                    sizes="160px"
                  />
                </button>
              ))}
            </div>
          </section>

          {/* ---- Request Panel ---- */}
          <section aria-label="Car details and request" style={{ minWidth: 0 }}>
            {/* Product label */}
            <p
              style={{
                display: "inline-block",
                background: "var(--brc-primary-tint)",
                color: "var(--brc-primary)",
                borderRadius: "var(--brc-radius-pill)",
                padding: "4px 14px",
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 12,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {mode === "rent" ? "Available for Rent" : "Available for Purchase"}
            </p>

            {/* Car name */}
            <h1
              style={{
                fontFamily: "var(--brc-font-display)",
                fontSize: "clamp(24px, 4vw, 32px)",
                fontWeight: 800,
                color: "var(--brc-text)",
                margin: "0 0 8px",
                lineHeight: 1.2,
              }}
            >
              {DETAIL_CAR.name}
            </h1>

            {/* Meta */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14, color: "var(--brc-text-secondary)", marginBottom: 12 }}>
              <span>Colour: <strong style={{ color: "var(--brc-text)" }}>{DETAIL_CAR.colour}</strong></span>
              <span>Model: <strong style={{ color: "var(--brc-text)" }}>{DETAIL_CAR.model}</strong></span>
            </div>

            {/* Rating */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <StarRow rating={DETAIL_CAR.rating} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--brc-text)" }}>
                {DETAIL_CAR.rating}
              </span>
              <span style={{ fontSize: 13, color: "var(--brc-text-muted)" }}>
                ({DETAIL_CAR.reviewCount} reviews)
              </span>
            </div>

            {/* Price */}
            <p
              style={{
                fontFamily: "var(--brc-font-display)",
                fontSize: "clamp(26px, 4vw, 34px)",
                fontWeight: 800,
                color: "var(--brc-text)",
                margin: "0 0 24px",
              }}
            >
              {mode === "rent"
                ? `${formatNaira(DETAIL_CAR.rentPrice)}/day`
                : formatNaira(DETAIL_CAR.buyPrice)}
            </p>

            {/* ---- Rent form ---- */}
            {mode === "rent" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {contactFields}
                <div className="car-detail-date-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label
                      htmlFor="start-date"
                      style={{ fontSize: 13, fontWeight: 600, color: "var(--brc-text-secondary)" }}
                    >
                      Start Date
                    </label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ height: 44, fontSize: 14 }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label
                      htmlFor="end-date"
                      style={{ fontSize: 13, fontWeight: 600, color: "var(--brc-text-secondary)" }}
                    >
                      End Date
                    </label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ height: 44, fontSize: 14 }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label
                    htmlFor="rent-message"
                    style={{ fontSize: 13, fontWeight: 600, color: "var(--brc-text-secondary)" }}
                  >
                    Message (optional)
                  </label>
                  <textarea
                    id="rent-message"
                    placeholder="Add any special requests or notes..."
                    value={rentMessage}
                    onChange={(e) => setRentMessage(e.target.value)}
                    rows={3}
                    style={{
                      width: "100%",
                      borderRadius: "var(--brc-radius-sm)",
                      border: "1px solid var(--brc-border)",
                      padding: "10px 12px",
                      fontSize: 14,
                      fontFamily: "var(--brc-font-ui)",
                      color: "var(--brc-text)",
                      resize: "vertical",
                      outline: "none",
                      background: "transparent",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <AuthButton variant="primary" full type="button">
                  Request to Rent
                </AuthButton>

                {/* Chauffeur note */}
                <div
                  style={{
                    background: "var(--brc-accent-bg)",
                    borderRadius: "var(--brc-radius-md)",
                    padding: "14px 16px",
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <Icon name="user" size={18} stroke="var(--brc-accent)" />
                  <p style={{ fontSize: 13, color: "var(--brc-text-secondary)", margin: 0, lineHeight: 1.5 }}>
                    <strong style={{ color: "var(--brc-accent-deep)" }}>Chauffeur service available.</strong>{" "}
                    A professional driver can be arranged at an additional fee. Mention it in your message.
                  </p>
                </div>
              </div>
            )}

            {/* ---- Buy form ---- */}
            {mode === "buy" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {contactFields}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label
                    htmlFor="buy-message"
                    style={{ fontSize: 13, fontWeight: 600, color: "var(--brc-text-secondary)" }}
                  >
                    Message (optional)
                  </label>
                  <textarea
                    id="buy-message"
                    placeholder="Any questions or details for the seller..."
                    value={buyMessage}
                    onChange={(e) => setBuyMessage(e.target.value)}
                    rows={3}
                    style={{
                      width: "100%",
                      borderRadius: "var(--brc-radius-sm)",
                      border: "1px solid var(--brc-border)",
                      padding: "10px 12px",
                      fontSize: 14,
                      fontFamily: "var(--brc-font-ui)",
                      color: "var(--brc-text)",
                      resize: "vertical",
                      outline: "none",
                      background: "transparent",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Total amount bar */}
                <div
                  style={{
                    background: "var(--brc-bg-subtle)",
                    border: "1px solid var(--brc-border)",
                    borderRadius: "var(--brc-radius-md)",
                    padding: "14px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 14, color: "var(--brc-text-secondary)", fontWeight: 600 }}>
                    Total Amount
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--brc-font-display)",
                      fontWeight: 800,
                      fontSize: 22,
                      color: "var(--brc-text)",
                    }}
                  >
                    {formatNaira(DETAIL_CAR.buyPrice)}
                  </span>
                </div>

                <AuthButton variant="primary" full type="button">
                  Buy Car
                </AuthButton>
              </div>
            )}
          </section>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Description / Reviews Tabs                                          */}
        {/* ------------------------------------------------------------------ */}
        <section aria-label="Car details and reviews" style={{ marginBottom: 64 }}>
          <Tabs defaultValue="description">
            <TabsList
              variant="line"
              style={{
                width: "100%",
                borderBottom: "2px solid var(--brc-border)",
                borderRadius: 0,
                paddingBottom: 0,
                height: "auto",
                marginBottom: 32,
                gap: 0,
                maxWidth: "100%",
                overflowX: "auto",
              }}
            >
              {(["description", "reviews"] as const).map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="car-detail-tab-trigger"
                  style={{
                    fontFamily: "var(--brc-font-ui)",
                    fontWeight: 700,
                    fontSize: 15,
                    padding: "10px 24px",
                    textTransform: "capitalize",
                    borderRadius: 0,
                    flex: "none",
                  }}
                >
                  {tab === "description" ? "Description" : `Reviews (${DETAIL_CAR.reviewCount})`}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ---- Description tab ---- */}
            <TabsContent value="description">
              <div
                className="car-detail-desc-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr minmax(0, 320px)",
                  gap: 40,
                  alignItems: "start",
                }}
              >
                {/* Left: intro + features */}
                <div>
                  <h2
                    style={{
                      fontFamily: "var(--brc-font-display)",
                      fontSize: 22,
                      fontWeight: 800,
                      color: "var(--brc-text)",
                      margin: "0 0 16px",
                    }}
                  >
                    About This Car
                  </h2>
                  <p
                    style={{
                      fontSize: 15,
                      lineHeight: 1.7,
                      color: "var(--brc-text-secondary)",
                      marginBottom: 32,
                    }}
                  >
                    {DETAIL_CAR.intro}
                  </p>

                  <h3
                    style={{
                      fontFamily: "var(--brc-font-display)",
                      fontSize: 18,
                      fontWeight: 700,
                      color: "var(--brc-text)",
                      margin: "0 0 16px",
                    }}
                  >
                    Key Features
                  </h3>
                  <ul
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    {DETAIL_CAR.features.map(([title, desc]) => (
                      <li
                        key={title}
                        style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: "var(--brc-success-bg)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        >
                          <Icon name="check" size={12} stroke="var(--brc-success)" strokeWidth={2.5} />
                        </span>
                        <span style={{ fontSize: 14, color: "var(--brc-text-secondary)", lineHeight: 1.6 }}>
                          <strong style={{ color: "var(--brc-text)" }}>{title}:</strong> {desc}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right: Specifications card */}
                <Card>
                  <CardContent style={{ padding: "20px 20px" }}>
                    <h3
                      style={{
                        fontFamily: "var(--brc-font-display)",
                        fontSize: 16,
                        fontWeight: 700,
                        color: "var(--brc-text)",
                        margin: "0 0 16px",
                      }}
                    >
                      Specifications
                    </h3>
                    <dl style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {DETAIL_CAR.specs.map(([label, value], idx) => (
                        <div
                          key={label}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "11px 0",
                            borderBottom:
                              idx < DETAIL_CAR.specs.length - 1
                                ? "1px solid var(--brc-border)"
                                : "none",
                            gap: 12,
                          }}
                        >
                          <dt style={{ fontSize: 13, color: "var(--brc-text-muted)", flexShrink: 0 }}>
                            {label}
                          </dt>
                          <dd
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--brc-text)",
                              textAlign: "right",
                              margin: 0,
                            }}
                          >
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ---- Reviews tab ---- */}
            <TabsContent value="reviews">
              <div
                className="car-detail-reviews-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 340px) 1fr",
                  gap: 48,
                  alignItems: "start",
                }}
              >
                {/* Rating summary */}
                <div>
                  <h2
                    style={{
                      fontFamily: "var(--brc-font-display)",
                      fontSize: 22,
                      fontWeight: 800,
                      color: "var(--brc-text)",
                      margin: "0 0 20px",
                    }}
                  >
                    Customer Reviews
                  </h2>

                  {/* Big score */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      marginBottom: 20,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--brc-font-display)",
                        fontSize: 52,
                        fontWeight: 900,
                        color: "var(--brc-text)",
                        lineHeight: 1,
                      }}
                    >
                      {DETAIL_CAR.rating}
                    </span>
                    <div>
                      <StarRow rating={DETAIL_CAR.rating} />
                      <p style={{ fontSize: 13, color: "var(--brc-text-muted)", margin: "4px 0 0" }}>
                        out of 5.0 · {DETAIL_CAR.reviewCount} reviews
                      </p>
                    </div>
                  </div>

                  {/* Distribution bars */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {RATING_DIST.map(([stars, count]) => {
                      const pct = Math.round((count / totalRatingCount) * 100);
                      return (
                        <div
                          key={stars}
                          style={{ display: "flex", alignItems: "center", gap: 8 }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--brc-text-secondary)",
                              width: 10,
                              flexShrink: 0,
                              fontWeight: 600,
                            }}
                          >
                            {stars}
                          </span>
                          <Star filled />
                          <div
                            style={{
                              flex: 1,
                              height: 8,
                              borderRadius: 99,
                              background: "var(--brc-bg-muted)",
                              overflow: "hidden",
                            }}
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${stars} star: ${pct}%`}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: "100%",
                                background: "var(--brc-accent-bright)",
                                borderRadius: 99,
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--brc-text-muted)",
                              width: 28,
                              textAlign: "right",
                              flexShrink: 0,
                            }}
                          >
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Write a Review */}
                  <div
                    style={{
                      marginTop: 32,
                      padding: 20,
                      border: "1px solid var(--brc-border)",
                      borderRadius: "var(--brc-radius-md)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: "var(--brc-font-display)",
                        fontSize: 16,
                        fontWeight: 700,
                        color: "var(--brc-text)",
                        margin: 0,
                      }}
                    >
                      Write a Review
                    </h3>

                    {/* Star picker */}
                    <div style={{ display: "flex", gap: 4 }} role="group" aria-label="Your rating">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          aria-label={`${s} star`}
                          aria-pressed={reviewRating >= s}
                          onMouseEnter={() => setReviewHover(s)}
                          onMouseLeave={() => setReviewHover(0)}
                          onClick={() => setReviewRating(s)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 2,
                          }}
                        >
                          <Star filled={(reviewHover || reviewRating) >= s} />
                        </button>
                      ))}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label
                        htmlFor="review-name"
                        style={{ fontSize: 13, fontWeight: 600, color: "var(--brc-text-secondary)" }}
                      >
                        Your Name
                      </label>
                      <Input
                        id="review-name"
                        placeholder="John Doe"
                        value={reviewName}
                        onChange={(e) => setReviewName(e.target.value)}
                        style={{ height: 40 }}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label
                        htmlFor="review-text"
                        style={{ fontSize: 13, fontWeight: 600, color: "var(--brc-text-secondary)" }}
                      >
                        Your Review
                      </label>
                      <textarea
                        id="review-text"
                        placeholder="Share your experience..."
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        rows={3}
                        style={{
                          width: "100%",
                          borderRadius: "var(--brc-radius-sm)",
                          border: "1px solid var(--brc-border)",
                          padding: "10px 12px",
                          fontSize: 14,
                          fontFamily: "var(--brc-font-ui)",
                          color: "var(--brc-text)",
                          resize: "vertical",
                          outline: "none",
                          background: "transparent",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <AuthButton variant="primary" type="button">
                      Submit Review
                    </AuthButton>
                  </div>
                </div>

                {/* Reviews list */}
                <div>
                  <div>
                    {REVIEWS.map((review) => (
                      <ReviewCard key={review.name + review.date} {...review} />
                    ))}
                  </div>

                  {/* Pagination */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      marginTop: 32,
                    }}
                    role="navigation"
                    aria-label="Reviews pagination"
                  >
                    <button
                      aria-label="Previous page"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "var(--brc-radius-sm)",
                        border: "1px solid var(--brc-border)",
                        background: "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name="chevleft" size={16} stroke="var(--brc-text)" />
                    </button>
                    {[1, 2, 3].map((pg) => (
                      <button
                        key={pg}
                        aria-label={`Page ${pg}`}
                        aria-current={pg === 1 ? "page" : undefined}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "var(--brc-radius-sm)",
                          border: pg === 1 ? "none" : "1px solid var(--brc-border)",
                          background: pg === 1 ? "var(--brc-primary)" : "#fff",
                          color: pg === 1 ? "#fff" : "var(--brc-text)",
                          cursor: "pointer",
                          fontFamily: "var(--brc-font-ui)",
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {pg}
                      </button>
                    ))}
                    <button
                      aria-label="Next page"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "var(--brc-radius-sm)",
                        border: "1px solid var(--brc-border)",
                        background: "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name="chevright" size={16} stroke="var(--brc-text)" />
                    </button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* You May Also Like Carousel                                          */}
        {/* ------------------------------------------------------------------ */}
        <section aria-label="You may also like">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              marginBottom: 24,
              gap: 12,
            }}
          >
            <h2
              style={{
                fontFamily: "var(--brc-font-display)",
                fontSize: 22,
                fontWeight: 800,
                color: "var(--brc-text)",
                margin: 0,
              }}
            >
              You May Also Like
            </h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => scrollCarousel("left")}
                aria-label="Scroll left"
                className="brc-button-motion-icon"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: "1px solid var(--brc-border)",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Icon name="chevleft" size={18} stroke="var(--brc-text)" />
              </button>
              <button
                onClick={() => scrollCarousel("right")}
                aria-label="Scroll right"
                className="brc-button-motion-icon"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: "1px solid var(--brc-border)",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Icon name="chevright" size={18} stroke="var(--brc-text)" />
              </button>
            </div>
          </div>

          <div
            ref={carouselRef}
            style={{
              display: "flex",
              gap: 24,
              overflowX: "auto",
              paddingBottom: 8,
              scrollbarWidth: "none",
            }}
          >
            {ALSO_LIKE.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        </section>
      </article>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .car-detail-two-col {
            grid-template-columns: 1fr !important;
          }
          .car-detail-desc-grid {
            grid-template-columns: 1fr !important;
          }
          .car-detail-reviews-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          .car-detail-main-image {
            height: clamp(260px, 72vw, 340px) !important;
          }

          .car-detail-date-grid,
          .car-detail-name-grid,
          .car-detail-contact-grid {
            grid-template-columns: 1fr !important;
          }

          .car-detail-tab-trigger {
            padding-left: 14px !important;
            padding-right: 14px !important;
            font-size: 14px !important;
          }
        }
      `}</style>
    </>
  );
}
