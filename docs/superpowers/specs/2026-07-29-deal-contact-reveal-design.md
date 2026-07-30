# Spec 2 — Deal & Contact Reveal

**Date:** 2026-07-29
**Status:** Approved (design)
**Sub-project:** 2 of 5 in the 2026-07-29 requirements batch.
**Supersedes:** `2026-07-26-sale-inspection-escrow-design.md` (Spec D2). That escrow /
office-inspection / staff-outcome / 5% commission model is **dropped**. This spec
replaces it with a peer-to-peer contact-reveal flow.

## Goal

When a buy offer is accepted, both parties immediately unlock each other's contact
details on a celebratory reveal page, then coordinate the inspection, handoff, and
payment **directly, off-platform**. EverythingCars does not touch the sale money and
takes no sale commission — it only tracks the outcome (completed / fell through) so the
car's availability stays correct. This covers item 8 (mutual contact on accept) and the
post-acceptance flow pivot.

## Non-goals

- No escrow, no platform payment for the sale, no payout, no commission.
- No office scheduling / staff-recorded inspection outcome.
- VIN ownership transfer + relisting a sold VIN is Spec 5 (hangs off completion here).

---

## Data model

New model `Deal` in `apps/sales`:

| Field | Type | Notes |
|---|---|---|
| `car` | FK → `Car` | CASCADE |
| `buyer` | FK → customer user | the accepted offer's customer |
| `seller` | FK → owner user | the car's owner |
| `offer` | OneToOne → `Offer` | the accepted offer |
| `agreed_amount` | Decimal | copied from the accepted offer |
| `currency` | Char | copied from the car/offer |
| `status` | Char (`DealStatus`) | `active` / `completed` / `cancelled` |
| `created_at` | DateTime | auto |
| `expires_at` | DateTime | `created_at` + 7 days |
| `completed_at` | DateTime, null | set on completion |
| `cancelled_at` | DateTime, null | set on cancel/expiry |
| `cancelled_by` | Char, null | `buyer` / `seller` / `system` |
| `cancel_reason` | Char, null | short reason / enum |

`DealStatus`: `active` → terminal `completed` or `cancelled`.

Only one `active` deal per car at a time (a car is reserved while a deal is active).

---

## Lifecycle

1. **Accept.** `accept_offer` (`apps/offers/services.py`) changes: instead of creating an
   APPROVED buy `Request`, it:
   - creates `Deal(status=active, expires_at=now+7d)`,
   - supersedes rival active offers on the car (existing behavior),
   - fires `DEAL_REACHED` to both buyer and seller (via `schedule_notification` on
     commit).
   The car's `status` stays `PUBLISHED`; its `availability_status` now *derives* to
   `reserved` from the active `Deal` (see "Availability derivation" below), which
   renders the "Ongoing negotiations" badge per Spec 1. The **rental** flow is
   unchanged — rentals still create a `Request`.

2. **Reveal.** `DealSerializer` exposes to **the two participants only** (buyer and
   seller): each other's name, business/brand (if any), phone, email, plus the car
   summary and agreed amount. A non-participant gets 404/403. Frontend renders the
   animated "Deal Reached · Contacts Unlocked" page at `/deals/[id]` (design brief
   below).

3. **Complete.** The **seller** taps "Mark as sold":
   - `Deal.status = completed`, `completed_at = now`,
   - car `status → ARCHIVED` (there is no `SOLD` status; "sold" is derived — see below),
   - `DEAL_COMPLETED` to both parties.
   This is the completion hook Spec 5 (VIN transfer) builds on.

4. **Fall through.** **Either party** taps "Deal fell through":
   - `Deal.status = cancelled`, `cancelled_by = buyer|seller`, `cancelled_at = now`,
   - no car `status` change — the car stayed `PUBLISHED` throughout; with the deal now
     cancelled, `availability_status` derives back to `available` automatically,
   - `CAR_AVAILABLE_AGAIN` to prior bidders on that car,
   - `DEAL_CANCELLED` to the other participant.
   No hard penalty: the buyer's attempt still counts against the per-customer 2-offer
   cap (Spec 1), so repeat no-shows naturally run out of chances.

5. **Auto-expire.** A management command (mirroring `expire_offers`) flips still-`active`
   deals past `expires_at` to `cancelled` with `cancelled_by = system` (no car status
   change — availability derives back to `available`), and fires `CAR_AVAILABLE_AGAIN`
   to prior bidders.

### Availability derivation (change to `get_availability_status`)

`apps/listings/serializers.py :: get_availability_status` currently derives buy-side
`reserved`/`sold` from `Request` rows. Repoint the buy path at `Deal`:

- **reserved (buy):** an `active` `Deal` exists for the car → `reserved`. Replaces the
  old "buy request in progress" check. Use an annotation (e.g. `_has_active_deal`) set
  in the list queryset to avoid N+1, mirroring the existing `_has_buy_in_progress`
  pattern.
- **sold:** car `ARCHIVED` **and** a `completed` `Deal` exists → `sold` (else
  `archived`). Replaces the old "COMPLETED buy request" check.
- Rental derivations (`rented`, reserved future rental) are untouched.

`car_is_reserved(car_id)` (the guard that blocks pause/close/new offers) must likewise
treat a car with an `active` `Deal` as reserved.

---

## API

- `GET /deals/{id}` — participant-only; returns the reveal payload (both contact blocks,
  car, agreed amount, status, timestamps).
- `POST /deals/{id}/complete` — seller-only; `active → completed`.
- `POST /deals/{id}/cancel` — buyer or seller; `active → cancelled` (body: optional
  reason).
- `GET /deals/` — list the current user's deals (as buyer or seller).

All querysets use `select_related("car", "buyer", "seller", "offer")` and any owner
profile needed for brand names, to avoid N+1.

Authorization: only `buyer` or `seller` may read or act on a deal; `complete` is
seller-only; `cancel` is either party.

---

## Notifications

New `NotificationType` values:
- `DEAL_REACHED` — to both, on accept.
- `DEAL_COMPLETED` — to both, on seller completion.
- `DEAL_CANCELLED` — to the other party, on manual cancel.
- `CAR_AVAILABLE_AGAIN` — to prior bidders, on cancel/expiry.

Each gets an `emails/<template_key>.html` template and is wired through the existing
`schedule_notification` / `send_email` path. Update `NOTIFICATION_QUERY_DEPS` /
WebSocket deps as the existing types do.

---

## Frontend — "Deal Reached · Contacts Unlocked" page

Route `/deals/[id]`. Entry animation: a smooth premium reveal (lock clicking open, or
cards fading/sliding in with a soft one-shot glow); instant under
`prefers-reduced-motion`.

Layout top → bottom:
- **Hero** — "It's a deal!" with the agreed amount (₦, tabular-nums).
- **Car strip** — thumbnail, title, agreed price.
- **Two contact cards** (side by side; stack on mobile) — *You* and *the other party*
  (buyer sees seller, seller sees buyer): avatar/initials, name, business/brand if any,
  tap-to-call phone, tap-to-email, role chip (Seller / Buyer).
- **Guidance** — "Reach out to arrange an inspection and complete the purchase — you're
  welcome to bring your own mechanic." + 2–3 safety tips (meet in a safe/public place;
  inspect the vehicle and its papers before paying).
- **Primary CTA** — seller sees **"Mark as sold"**; buyer sees a passive "Waiting for
  the seller to confirm the sale" state.
- **Secondary** — a quiet "Deal fell through?" link (both parties) → cancel flow with a
  confirmation dialog.

Stack: shadcn + `@base-ui/react`, Tailwind v4, `--brc-*` tokens, `lucide-react`,
`ConfirmDialog` for cancel, React Query mutations for complete/cancel.

Completed / cancelled deals render a terminal read-only state (contacts still visible on
a completed deal; a cancelled deal shows it fell through).

---

## Testing

- **Model / service:** accepting an offer creates a `Deal(active)` (not a Request) and
  reserves the car; rival offers superseded. Rental accept still creates a Request.
- **Permissions:** non-participant cannot read/complete/cancel; buyer cannot complete;
  either party can cancel.
- **Complete:** seller completes → car `ARCHIVED`, `availability_status` derives
  `sold`, `DEAL_COMPLETED` scheduled.
- **Cancel:** either party cancels → car stays `PUBLISHED`, `availability_status`
  derives back to `available`, prior bidders get `CAR_AVAILABLE_AGAIN`.
- **Expiry:** management command cancels a deal past `expires_at`, car derives back to
  `available`, notifies.
- **Availability:** a car with an `active` deal derives `reserved` (buy) and
  `car_is_reserved` returns True; a `completed` deal + archived car derives `sold`.
- **Contact reveal:** serializer returns both contact blocks only to participants.
- **Frontend:** build + lint clean; reveal page renders both cards; seller sees
  "Mark as sold", buyer sees the waiting state; reduced-motion path renders instantly.

---

## Migrations

1. `sales`: create `Deal` + `DealStatus`.
2. `offers`/services: change `accept_offer` (behavior change, covered by tests — no
   schema migration).
3. `notifications`: add the four new `NotificationType` values.
