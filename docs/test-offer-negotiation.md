# Offer & Negotiation System — Manual Test Checklist

Covers Spec D1: offers on negotiable buy listings, counter-offers, expiry, the
owner & customer hubs, notifications/emails, and the accept → purchase hand-off.

Spec: `docs/superpowers/specs/2026-07-22-offer-negotiation-design.md`
Plan: `docs/superpowers/plans/2026-07-22-offer-negotiation.md`

## Setup

- [ ] `cd backend && uv run python manage.py migrate` applies the `offers` migrations cleanly
- [ ] `cd backend && uv run python manage.py runserver`; `cd frontend && npm run dev`
- [ ] `mailpit` running (inbox at http://localhost:8025) for the email checks
- [ ] Accounts: one owner (with a **negotiable buy** listing — `listing_type=buy`, `is_negotiable=true`, a private min/max, published), one customer, a second customer (the "rival"), one staff/admin

## Placing an offer

- [ ] A **negotiable buy** car detail page shows **"Make an Offer"** (not "Request to Buy"), with "The seller is open to offers on this vehicle."
- [ ] A **non-negotiable** buy car still shows the normal buy request flow; a **rent** car is unchanged
- [ ] Make Offer dialog: large ₦ amount input with live thousands separators; −5% / −10% / Asking quick-picks fill the field; message counter turns amber at 350 chars; footer shows "valid for 48 hours" and "N of 3 remaining"
- [ ] Offer **below the owner's minimum** → inline message *"Your offer is below the acceptable range for this vehicle. Please submit a higher amount to continue."* — calm styling, no shake/flash, and the **entered amount is preserved**
- [ ] The rejection message is **identical** whether the offer is ₦1 below or millions below (never reveals the floor)
- [ ] A valid offer → success toast, dialog closes; the offer appears under `/customer/offers` → Active
- [ ] A second offer while one is still live → blocked ("You already have an active offer")
- [ ] After 3 offers on the same car (each closed) a 4th is blocked ("maximum of 3 offers")
- [ ] Trying to offer on your own listing → blocked

## Owner — respond

- [ ] `/owner/offers` (also reachable from the dashboard "Offers" quick-link) lists offers **grouped by car**, with a pending-count subtitle and the stat strip (Pending / Countered / Accepted / total live value)
- [ ] The highest **live** offer on each car carries the orange **"Best offer"** badge; the shimmer plays once, not on every render
- [ ] Filters (car / status / sort) and "Clear all" work; on mobile the filter bar collapses into a bottom sheet
- [ ] Opening **Respond** shows the buyer's name + offer + message, and the **private range card** ("only visible to you", min–max) — confirm this range appears **nowhere** in any customer view or network payload
- [ ] **Counter**: reveals an amount field (pre-filled midpoint) with "You get one counter-offer…"; submitting moves the offer to Countered and the row shows "Awaiting buyer"
- [ ] **Decline** (confirm dialog) → offer Declined
- [ ] **Accept** (confirm dialog states it reserves the car and declines the others) → brief "Vehicle reserved" state, sheet closes

## Customer — respond to a counter

- [ ] The countered offer is the **hero** state on `/customer/offers`: amber border, "You offered ₦X" vs "Owner countered ₦Y", "This is the seller's only counter-offer."
- [ ] **Accept counter** (confirm dialog "Accept ₦Y? … reserves the vehicle for you.") → offer Accepted; a "View your purchase" link appears
- [ ] **Decline** → offer Declined; no further counter is possible
- [ ] **Withdraw** shows only while Pending (quiet ghost link, confirmed); after a counter it is gone

## Accept → purchase hand-off

- [ ] Accepting creates an **Approved buy request** at the agreed amount (the counter amount if there was one), visible under `/customer/requests`
- [ ] The car now reads **Reserved** on its public detail / cards
- [ ] The customer request page shows the **provenance strip**: "Created from your accepted offer of ₦X" (and the "you offered / seller countered" line when a counter happened)
- [ ] Every **rival** offer on that car flips to **"Closed — vehicle sold"** (muted, not danger); the rival's card shows "Another buyer's offer was accepted." + "Browse similar vehicles"
- [ ] Two owners/tabs accepting different offers on the same car → exactly one wins; the other gets a clean 400

## Expiry

- [ ] An offer past 48h cannot be accepted / countered / withdrawn even if still shown as Pending (server rejects with "This offer has expired.")
- [ ] `cd backend && uv run python manage.py expire_offers` flips stale offers to **Expired** and prints the count; a second run is a no-op
- [ ] Countering **resets** the 48-hour window (the countdown restarts)
- [ ] Countdown UI: "Expires in 47h 12m", turns amber under 6h, red under 1h, "Expired" at zero; never reflows

## Notifications & emails

- [ ] Placing an offer → owner gets **"New offer received"** in-app; customer gets **"Offer submitted"** in-app **and** email (Mailpit)
- [ ] Counter → customer in-app + email; Accept → customer in-app + email; Decline → customer in-app + email (neutral tone); Expiry → customer in-app + email
- [ ] Customer answers a counter → owner gets "Counter-offer accepted/declined" in-app
- [ ] A superseded rival gets **"Vehicle no longer available"** in-app + email (uses the existing `car_sold` template)
- [ ] Each notification's icon, tint, and **deep link** are correct (offer_received → `/owner/offers?car=`; offer_accepted → the request; etc.)
- [ ] Realtime: with owner + customer in two browsers, placing/answering an offer updates the other side's list live (no refresh)

## Notification surfaces (redesign)

- [ ] The notification **dropdown** and **`/notifications` page** match the new design: tinted icon bubbles, unread accent, "Mark all read", empty + loading (skeleton) states
- [ ] Semantic tints render (accepted → success, declined/rejected → danger, offers → navy/amber, else neutral)
- [ ] All existing (non-offer) notification types still render and link correctly

## Privacy (must all hold)

- [ ] `min_price` / `max_price` appear **only** in the owner respond sheet's range card and `GET /offers/cars/{id}/range` (owner-only; 404 for anyone else)
- [ ] No customer-facing payload (`/my-offers`, offer create response, car detail) contains the private range
- [ ] A customer never sees competing bid amounts or how many rivals exist
- [ ] The owner sees the buyer's **name** on every offer, but **email/phone only after acceptance**

## Regression / gates

- [ ] Direct buy request on a **negotiable** car → 400 ("submit an offer instead"); on a **non-negotiable** buy car → still works
- [ ] `cd backend && uv run python manage.py test apps` — all green
- [ ] `cd backend && uv run ruff check .` — clean
- [ ] `cd frontend && npx tsc --noEmit && npm run lint && npm run build` — clean
- [ ] Mobile (375px): Make Offer dialog, both hubs, and the respond sheet are usable

## Notes / bugs found

-
