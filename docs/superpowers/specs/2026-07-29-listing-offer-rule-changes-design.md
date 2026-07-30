# Spec 1 — Listing & Offer Rule Changes

**Date:** 2026-07-29
**Status:** Approved (design)
**Sub-project:** 1 of 5 in the 2026-07-29 requirements batch.

## Goal

A bundle of small, tightly-related rule and copy changes to the listing and offer
surfaces. No new subsystems — these are edits to existing models, serializers, and
components.

## Scope

Four independent changes:

1. Drop the private min/max price range; keep only the negotiable toggle. Lower the
   per-customer offer cap from 3 to 2.
2. Rename the `ListingFeature.value` field to `description`.
3. Rename the "Reserved" availability badge to "Ongoing negotiations" — but only for
   buy listings.
4. Show the seller's business/brand name on the public car detail page.

Out of scope: the contact-reveal / deal flow (Spec 2), pay-to-book inspection (Spec 3),
canonical brand list (Spec 4), VIN transfer & relist (Spec 5).

---

## 1. Drop the private range; offer cap 3 → 2

### Rationale
"Negotiable" should mean simply "open to offers." The private min/max range added
hidden state and an auto-reject floor that the owner can enforce themselves by
declining. With no floor, any positive offer is valid and the owner accepts, counters,
or declines each one.

### Backend
- **`apps/listings/models.py`** — remove `min_price` and `max_price` from `Car`.
  Keep `is_negotiable`. Generate a migration that drops both columns.
- **`apps/listings/serializers.py`** — remove `min_price` / `max_price` from the
  create/update and detail serializers, and any required-when-negotiable validation
  tied to them.
- **`apps/offers/serializers.py`** — delete the offer-floor check
  (`if car.min_price is not None and data["amount"] < car.min_price → BELOW_RANGE_MESSAGE`)
  and the now-unused `BELOW_RANGE_MESSAGE`. Keep the existing `amount > 0` validation.
- **`apps/offers/`** — delete the owner range endpoint (`/offers/cars/{id}/range`), its
  view, its serializer, and its URL entry. Remove range fields from
  `OwnerOfferSerializer` if present.
- **`apps/offers/models.py`** — `MAX_OFFERS_PER_CAR = 3 → 2`. The cap is already
  per-customer (`Offer.objects.filter(car=car, customer=user).count() >= MAX_OFFERS_PER_CAR`
  in `OfferCreateSerializer.validate`) and counts every attempt including
  withdrawn/expired, so no logic change — only the constant.
- **`seed_dev.py`** — stop setting `min_price` / `max_price` on seeded buy cars.

### Frontend
- **`negotiable-field.tsx`** — remove the min/max range sub-panel; keep only the
  `is_negotiable` toggle. Remove the private-pricing card and the "Private — only you
  can see this" pill. Keep the `formatDecimalInput` / `normalizeDecimalInput` helpers
  only if still used elsewhere; otherwise remove.
- Owner car detail / respond sheet — remove the range card and the `useCarRange` hook
  and `OwnerCarRange` type.
- **`make-offer-dialog.tsx`** — footer copy: "You can make up to **2** offers on this
  vehicle." and the `{remainingOffers} of 2 remaining` counter (currently hardcodes 3
  at line 245 and 249).

### Result
A negotiable buy car accepts any offer greater than zero. A single customer may make at
most 2 offers on it (a 3rd is blocked); the number of distinct bidders is unlimited.

---

## 2. `ListingFeature.value` → `description`

### Backend
- **`apps/listings/models.py`** — rename `ListingFeature.value` to `description`.
  Generate a rename migration (`RenameField`) so existing data is preserved.
- **`apps/listings/serializers.py`** — update the feature serializer field name in
  both the nested create and the read serializers.

### Frontend
- The listing form's features editor — feature rows become **name + description**
  instead of name + value.
- Car detail feature display — render `description`.

---

## 3. "Reserved" badge → "Ongoing negotiations" (buy only)

### Rationale
`availability_status == "reserved"` covers two cases: a buy deal in progress and a
reserved future rental. Renaming globally would mislabel rental reservations, so the
rename applies only when the car is a buy listing.

### Frontend
- **`availability-badge.tsx`** — when `status === "reserved"`, render
  "Ongoing negotiations" if the listing is a buy listing, else keep "Reserved" (and the
  "Reserved until {date}" variant stays for reserved rentals). The component receives
  the car / `listing_type`; pass it through if not already available.
- **`car-card.tsx`** (line ~210) — the reserved button/label text: show
  "Ongoing negotiations" for buy listings, "Reserved" otherwise.

No backend change — `availability_status` is unchanged.

---

## 4. Seller's business/brand on the public car detail page

### Rationale
Buyers should see who they're buying from. Item 3 clarified: this is the
seller/owner's brand on the **public car detail page** (not an admin page).

### Backend
- **`apps/listings/serializers.py`** — the public `CarDetailSerializer` owner block
  (`CarOwnerSerializer`) exposes the owner's display identity:
  - A fleet owner (`OwnerProfile.owner_type == fleet`) → the `fleet_name`.
  - An individual owner → their display name (first/last). Never "Private seller" —
    individuals show their real name.
  - Use `select_related("owner__owner_profile")` so no extra query per car.

### Frontend
- Public car detail (`/cars/[id]`) — render "Sold by {brand or name}" in the seller
  area.

---

## Testing

- **Offers:** update `apps/offers/tests.py` — the cap test now expects 2 (the current
  test at line ~78 asserts 2 offers exist for a car after the flow; verify against the
  new constant). Remove/adjust any test asserting the min_price floor rejection.
- **Listings:** a migration test / model test confirming `min_price` / `max_price` are
  gone and `ListingFeature.description` exists. Serializer test confirming the public
  detail exposes the seller brand for a fleet and the name for an individual.
- **Frontend:** build + lint clean; the offer dialog shows "2"; the negotiable field no
  longer renders a range.

## Migrations (order)

1. `listings`: drop `Car.min_price`, `Car.max_price`.
2. `listings`: rename `ListingFeature.value` → `description`.

Both are non-destructive to unrelated data; the min/max drop discards the private range
values (intended).
