# Listing Model v2 — Design

**Date:** 2026-07-19
**Status:** Approved (brainstorm with Namy)
**Scope:** Spec A of the July requirements batch (A → B → C → E → D). Foundation for Spec D (negotiation needs `is_negotiable`) and Spec E (suspension needs VIN/plate).

## Goal

A car is listed for **Rent OR Buy — never both**. Every listing carries a **VIN and plate number** (unique, staff/owner-visible only) for vehicle tracking and future suspension enforcement. Buy listings declare their price **negotiable or non-negotiable**. Reviews exist **only on rent listings**.

## 1. Schema & migration

- `ListingType`: remove `BOTH`. Choices become `rent` / `buy`.
- **Migration deletes all existing** `listing_type="both"` **cars** (9 dev-data rows; normal FK cascades remove their images, features, requests, reviews, and inspection bookings). No notifications — this is dev data by explicit decision.
- New `Car` fields:
  - `vin`: `CharField(max_length=17, null=True, blank=True, unique=True)` — nullable only so legacy rows don't collide; **required at serializer level for all new/edited listings**. Stored normalized (uppercase).
  - `plate_number`: `CharField(max_length=12, null=True, blank=True, unique=True)` — same nullable-for-legacy, required-going-forward rule. Stored normalized (uppercase, spaces/hyphens stripped).
  - `is_negotiable`: `BooleanField(null=True, blank=True)` — **NULL for rent listings**; required true/false for buy listings. UI toggle defaults to "Negotiable".
  - `min_price` / `max_price`: `DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)` — the owner's **private** acceptable range. Required (with `min_price <= max_price`, both `<= sale_price` sanity not enforced beyond ordering) only when `listing_type="buy"` AND `is_negotiable=True`; forced NULL otherwise. These columns are added now (with `is_negotiable`) so the Car model migrates once, but the offer/bidding workflow that consumes them is **Spec D** (out of scope here). Their sole use in Spec A is storage + listing-form validation + privacy.
- Pricing becomes strict XOR, enforced in the serializer:
  - `rent` → `rent_price_per_day` required, `sale_price` cleared to NULL.
  - `buy` → `sale_price` required, `rent_price_per_day` cleared to NULL.

Postgres unique constraints permit multiple NULLs, so legacy cars without VIN/plate coexist; any _new_ duplicate is rejected.

## 2. Validation & privacy

- VIN: must match `^[A-HJ-NPR-Z0-9]{17}$` after uppercasing (17 chars, letters I/O/Q invalid per ISO 3779).
- Plate: after normalization (uppercase, strip spaces and hyphens), 5–12 alphanumeric characters.
- Duplicate VIN or plate → generic error **"This vehicle is already registered on the platform."** Never reveal which listing/owner holds the duplicate. (A duplicate against a suspended vehicle is precisely the signal Spec E's enforcement consumes.)
- **Serializer exposure:** `vin`, `plate_number`, `min_price`, and `max_price` appear in owner-facing detail (`my-cars`) and staff serializers (admin list/detail, approvals). They appear in **no public serializer** (`CarListSerializer` public context, public `CarDetailSerializer`). A test asserts the public payloads never contain any of these values — the private range must never leak, or the "your offer is below range" message becomes reverse-engineerable.

## 3. Requests & reviews

- **Request/listing type match:** creating a rent request requires `car.listing_type == "rent"`; a buy request requires `"buy"`. (Today a `both` car accepted either; with `both` gone the check becomes a strict equality guard → 400 on mismatch.)
- **Review creation:** only for a completed **rent** request. A completed buy request can no longer open a review → 400 "Reviews are only available on rental listings."
- **Review display:** the reviews GET for a buy car returns an empty list (200).
- **Existing rows are deleted, not hidden.** (Revised during implementation — the original plan was to retain and display-gate them.) A data migration removes every review attached to a non-rent listing. Hiding was rejected because a hidden row still counts in aggregates, exports and any direct `Review` query, so "reviews are rent-only" would have been true of the UI but not of the data.
- **Frontend:** buy listings hide the reviews section, review CTA, and star/rating badges on cards. Rent listings unchanged.

## 4. Frontend

- **New-listing form:** Rent/Buy radio (no "Both"); a single conditional price field driven by the selection; VIN and plate inputs with inline validation + normalization hints; "Negotiable / Non-negotiable" toggle shown only when Buy is selected, defaulting to Negotiable.
- **Owner car detail:** shows VIN/plate (read-only after the usual edit-lockdown statuses, same as other text fields).
- **Admin approvals / staff views:** show VIN/plate.
- **Public pages:** never render VIN/plate; buy listings render price with a "Negotiable" badge when `is_negotiable` is true.

## 5. Ripple effects

- The sale-vs-future-rental conflict (a `both` car sold while carrying future rentals) becomes structurally impossible.
- Availability logic (`availability_annotations`, `find_request_approval_conflict`) keeps working unchanged; the `both` branch simply never occurs.
- Sale-car inspection document requirements (`sale_price` present) now map 1:1 to buy listings.
- `CarCreateSerializer.validate`'s conditional price logic simplifies to the XOR rule.

## 6. Testing

- Migration: `both` rows (and dependents) deleted; `rent`/`buy` rows untouched.
- XOR pricing: rent without rent price → 400; buy without sale price → 400; cross-field cleared on save.
- `listing_type="both"` on create/edit → 400.
- VIN/plate: format rejects (16 chars, I/O/Q, short plate), normalization (lowercase/spaced input stored normalized), uniqueness → 400 with the generic message, multiple legacy NULLs coexist.
- Privacy: public list + detail payloads contain neither `vin` nor `plate_number`; owner + staff payloads do.
- Requests: rent request on buy car → 400 (and vice versa).
- Reviews: completed rent request can review; completed buy request → 400; buy-car reviews GET → `[]`.
- `is_negotiable`: required for buy, forced NULL for rent.

## Out of scope (later specs)

- Bidding on negotiable cars, meetup scheduling, 5% commission (Spec D).
- VIN/plate-tied suspension toggle and flimsy-cancellation enforcement (Spec E).
- Company director verification (Spec B); booking fees/payment (Spec C).
