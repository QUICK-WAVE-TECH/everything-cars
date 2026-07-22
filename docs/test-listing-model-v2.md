# Listing Model v2 — Manual Test Checklist

Covers Spec A: rent XOR buy, mandatory VIN/plate, negotiable + private range, rent-only reviews.
Spec: `docs/superpowers/specs/2026-07-19-listing-model-v2-design.md`

## Setup

- [ ] `cd backend && uv run python manage.py migrate` applies `0011`–`0013` cleanly
- [ ] `cd backend && uv run python manage.py runserver`; `cd frontend && npm run dev`
- [ ] Accounts: one verified owner, one customer, one staff/admin

## Migration

- [ ] No car anywhere has `listing_type="both"` (the data migration deleted them with their images/features/requests/reviews/bookings)
- [ ] Existing rent and buy cars survived untouched
- [ ] `vin` and `plate_number` each carry a unique index; legacy rows are NULL and coexist

## Listing form — type & pricing

- [ ] Listing type is a two-option Rent/Buy segmented control — no "Both" anywhere in the UI
- [ ] Selecting **Rent** shows only "Rental Price per Day"; the sale price field disappears
- [ ] Selecting **Buy** shows only "Sale Price"; the rent field disappears
- [ ] Submitting rent with no rent price → inline error; buy with no sale price → inline error
- [ ] Saving a rent listing that previously had a sale price clears `sale_price` to NULL server-side (and vice versa)
- [ ] API: `listing_type="both"` → 400

## Listing form — VIN & plate

- [ ] VIN and plate are required on every listing, rent or buy
- [ ] Typing lowercase VIN auto-uppercases; the counter reads `n/17`
- [ ] 16-character VIN → "VIN must be exactly 17 characters"; VIN containing I, O or Q → rejected
- [ ] Plate with spaces/hyphens (`abc 123`) normalizes to `ABC123`; 4-character plate → rejected
- [ ] Listing a VIN already on the platform → **"This vehicle is already registered on the platform."** shown beside the field, and the message never names the other listing or owner
- [ ] Same generic message for a duplicate plate

## Listing form — negotiable & private range

- [ ] The Negotiable toggle appears **only** when Buy is selected, defaulting to Negotiable
- [ ] Turning it on reveals the private min/max panel with the "Private — only you and our team can see this" pill
- [ ] Negotiable with a missing min or max → "Enter both a minimum and a maximum"
- [ ] Min greater than max → "Minimum must be less than or equal to maximum"
- [ ] Turning Negotiable off and saving clears min/max to NULL
- [ ] Saving a **rent** listing leaves `is_negotiable`, `min_price`, `max_price` all NULL
- [ ] Confirmation modal summarises listing type, price, negotiable state, private range, VIN and plate

## Privacy (the important one)

- [ ] Public car detail (`/api/v1/listings/cars/<id>`) payload contains **no** `vin`, `plate_number`, `min_price`, `max_price`
- [ ] Public car list rows contain none of those four either
- [ ] Public detail and list **do** include `is_negotiable` (it drives the badge)
- [ ] Owner `my-cars` detail shows VIN, plate and the private range
- [ ] Admin car detail shows the same to staff
- [ ] Nothing in the rendered public page (view source) exposes VIN, plate, or the range

## Requests

- [ ] Rent request against a buy car → 400 "This listing only accepts buy requests."
- [ ] Buy request against a rent car → 400
- [ ] Matching request type → succeeds

## Reviews (rent-only)

- [ ] Completed **rent** request → customer can leave a review (201)
- [ ] Completed **buy** request → review POST → 400 "Reviews are only available on rental listings."
- [ ] Buy car reviews GET → 200 with an empty list and `review_count: 0`
- [ ] Migration `reviews.0003` deleted every pre-existing review on a non-rent car; rent reviews untouched
- [ ] A completed **buy** request page shows no review section and no "Write a Review" CTA (owner and customer views)
- [ ] The buy car's detail page CTA reads "View Your Request", never "Write a Review"
- [ ] Public buy listing renders **no** reviews section, no write-review CTA, no star rating
- [ ] Public rent listing keeps reviews exactly as before

## Display

- [ ] Buy listing with `is_negotiable` shows the "Negotiable" badge on the detail page and on car cards
- [ ] Buy listing without it shows no badge
- [ ] Buy car cards omit the star rating entirely; rent cards keep it
- [ ] Owner detail shows a "Vehicle identity" card (VIN + plate) and, for negotiable buys, a "Private pricing" card
- [ ] Edit lockdown still holds: those fields are read-only unless the car is `needs_changes`

## Regression

- [ ] Editing an unrelated field (e.g. colour) on an existing buy car does NOT demand `is_negotiable`
- [ ] `cd backend && uv run python manage.py test apps.listings apps.reviews` — all green
- [ ] `cd frontend && npx tsc --noEmit && npm run lint && npm run build` — all clean
- [ ] Mobile: the form is usable at 375px; segmented control, range panel and VIN fields all reachable

## Notes / bugs found

-
