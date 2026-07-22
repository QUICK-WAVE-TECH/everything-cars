# Offer & Negotiation System — Design

**Date:** 2026-07-22
**Status:** Approved (brainstorm with Namy)
**Scope:** Spec D1 of the July requirements batch. Depends on Spec A (`2026-07-19-listing-model-v2-design.md`), which shipped `is_negotiable`, `min_price` and `max_price`.

## Goal

A customer can make a price offer on a negotiable buy listing. The owner accepts, declines, or sends **one** counter-offer; the customer answers that counter. An accepted offer reserves the vehicle and feeds the existing purchase flow. The owner's private price range is never discoverable by a buyer.

## Decomposition

The original "module 4" bundled two subsystems. This spec is the first only:

- **D1 (this spec)** — the negotiation: offers, counter-offer, expiry, withdrawal, statuses, notifications, owner offer-management UI.
- **D2 (later spec)** — sale completion: the owner's 5 proposed meetup slots, inspector on-site prompts ("available for purchase?", "pay now?"), company account details + email, and the 5% commission.

D1 produces working software on its own: an accepted offer hands off to the existing buy `Request` flow, which already carries a purchase to paid and archived.

## 1. Data model

New app `apps/offers`.

```python
class OfferStatus(models.TextChoices):
    PENDING = "pending"          # awaiting the owner
    COUNTERED = "countered"      # owner countered, awaiting the customer
    ACCEPTED = "accepted"        # deal struck
    REJECTED = "rejected"        # owner declined, or customer declined the counter
    WITHDRAWN = "withdrawn"      # customer pulled it before the owner responded
    EXPIRED = "expired"          # passed its 48-hour window
    SUPERSEDED = "superseded"    # auto-closed because another offer on the car was accepted

ACTIVE_OFFER_STATUSES = [OfferStatus.PENDING, OfferStatus.COUNTERED]
```

`Offer` fields: `id` (UUID pk), `car` FK→`Car` CASCADE `related_name="offers"`, `customer` FK→`User` CASCADE `related_name="offers_made"`, `amount` Decimal(14,2), `currency` (copied from the car), `message` TextField(max 400, blank), `status` (indexed, default `PENDING`), `counter_amount` Decimal(14,2) null, `counter_message` TextField blank, `countered_at` null, `expires_at`, `responded_at` null, `resulting_request` FK→`Request` null (set on acceptance), `created_at`, `updated_at`.

**`Sold` is deliberately not an offer status.** Sold describes the *car*, not an offer. The winning offer is `ACCEPTED`; the losers become `SUPERSEDED` and render as "Closed — vehicle sold". This keeps one fact in one place. (Deviation from the original brief, which listed Sold among offer statuses.)

## 2. Placing an offer

Permitted only when: the car is `listing_type="buy"` **and** `is_negotiable=True`, `car.status == PUBLISHED`, the car has no active buy `Request` (i.e. `availability_status` is `available`, not `reserved`/`sold`), and the requester is not the owner.

**Offers replace the direct buy request on negotiable listings.** A negotiable buy car exposes *only* the offer path; its "Request to Buy" action is removed. A non-negotiable buy car keeps the existing direct `Request` flow untouched. This resolves two problems at once: buyers get one obvious way to transact, and we never collide with `Request`'s `UniqueConstraint(car, customer, request_type)` on active statuses — which would otherwise reject the auto-created request in §4 for a customer who already had a direct buy request open.

- **Below the floor:** `amount < car.min_price` → 400 with exactly
  *"Your offer is below the acceptable range for this vehicle. Please submit a higher amount to continue."*
- The response must be **identical regardless of how far below** the floor the amount falls, and `min_price`/`max_price` must never appear in a customer-facing payload. Otherwise the floor is recoverable by bisection in a handful of requests.
- **One live offer per customer per car**, enforced by a DB `UniqueConstraint(fields=["car", "customer"], condition=Q(status__in=ACTIVE_OFFER_STATUSES))` — not serializer-only, so concurrent submissions can't slip through.
- **`MAX_OFFERS_PER_CAR = 3`** per customer per car. The cap counts **every offer row the customer has ever created for that car, whatever its outcome** — including withdrawn and expired ones. Counting only declines would let a buyer withdraw-and-resubmit indefinitely, which is the loophole the cap exists to close. The remaining count is shown to the buyer before they submit.

`max_price` has **no enforced behaviour**. It is the owner's private target, shown only to them, used for labelling (e.g. flagging an offer that meets their target). It never auto-accepts — every acceptance stays an explicit owner decision.

## 3. State machine

| From | Actor | Action | To |
|---|---|---|---|
| `PENDING` | owner | accept / decline / counter | `ACCEPTED` / `REJECTED` / `COUNTERED` |
| `PENDING` | customer | withdraw | `WITHDRAWN` |
| `COUNTERED` | customer | accept / decline | `ACCEPTED` / `REJECTED` |
| any active | system | another offer accepted | `SUPERSEDED` |
| any active | system | past `expires_at` | `EXPIRED` |

The **single counter-offer** is structural, not a counter field: countering is legal only from `PENDING` and moves the row to `COUNTERED`, from which no further counter transition exists. Withdrawal is allowed only from `PENDING` — once the owner has responded, the customer answers rather than retreats.

## 4. Acceptance and hand-off

No new `CarStatus` is required. The existing pipeline already derives the states we need:
`Request(PENDING) → APPROVED` (car reads **reserved** via `availability_status`) `→ PAYMENT_SUBMITTED → PAID` (Transaction created, competing requests auto-rejected) `→ COMPLETED` (car auto-archived, reads **sold**).

Accepting runs in one atomic block with `select_for_update` on the car:

1. Re-check the car is still available and no other offer is already `ACCEPTED` (guards the double-accept race).
2. Mark the offer `ACCEPTED`, stamp `responded_at`.
3. Create a buy `Request` at the agreed amount with status **`APPROVED`** — the owner's approval is implicit in accepting — and link it as `resulting_request`. Record a `RequestStatusEvent` so the request's history explains where it came from.
4. Move every other active offer on the car to `SUPERSEDED` and notify those customers.

The vehicle is then reserved, and the existing payment → confirm → complete path finishes the sale untouched.

## 5. Expiry

`expires_at = created_at + 48h`, reset to `now + 48h` when the owner counters (the ball has changed court).

**Lazy expiry is the source of truth.** An offer past `expires_at` is treated as expired everywhere — it cannot be accepted, countered, withdrawn or responded to — regardless of the stored status. Correctness therefore requires no scheduler, which matters because this project has **no running one**: Celery is a dependency with settings but was never bootstrapped (no `config/celery.py`, no app in `config/__init__.py`, no tasks).

A `manage.py expire_offers` command flips stale rows to `EXPIRED` and sends the notifications. Run it from cron now; promote it to a Celery beat task later with no model or API change.

## 6. Notifications

Nine new `NotificationType` values. Customers receive in-app **and** email; owners receive in-app.

| Event | → Customer | → Owner |
|---|---|---|
| Offer submitted | `offer_submitted` | `offer_received` |
| Owner counters | `offer_countered` | — |
| Owner accepts / declines | `offer_accepted` / `offer_rejected` | — |
| Customer answers the counter | — | `counter_accepted` / `counter_rejected` |
| Another offer won the car | `car_no_longer_available` | — |
| Offer expired | `offer_expired` | — |

`car_no_longer_available` finally wires up the existing but unused `car_sold.html` template. Email tone for declines stays neutral and non-judgemental.

Notifications are scheduled with the existing `schedule_notification` / `transaction.on_commit` helper, and the WebSocket `NOTIFICATION_QUERY_DEPS` map gains the offer query keys so both dashboards update live without polling.

## 7. API

**Customer:** `POST /cars/{id}/offers` · `GET /my-offers` · `POST /offers/{id}/withdraw` · `POST /offers/{id}/respond` (accept/decline a counter).
**Owner:** `GET /owner-offers?car=&status=` · `POST /offers/{id}/respond` (accept/decline/counter).

Every list endpoint uses `select_related`/`prefetch_related` on car, customer and resulting request.

## 8. Frontend

Two new pages plus five modified surfaces:

- **`/owner/offers`** — Offer Management. Offers grouped by car (owners think per vehicle), filters by car/status/sort, "Best offer" flag on each car's highest live bid, a live expiry countdown, and a right-hand sheet to accept, decline or counter. The private range appears **only** in that sheet.
- **`/customer/offers`** — Active/Closed segments; a countered offer is the hero state, comparing their offer against the counter with accept/decline and copy making the finality clear.
- Modified: public car detail (Make Offer entry), owner car detail (per-car offers), owner dashboard (stat + recent), customer request detail (provenance link back to the originating offer), and the notification surfaces.

Destructive and irreversible actions use the existing `ConfirmDialog`; the accept dialog states that other offers will be declined. Motion is restrained — a per-minute countdown, staggered list entrance, an accordion for the counter field, and a single pulse when a realtime offer arrives. All of it no-ops under `prefers-reduced-motion`.

## 9. Privacy

- `min_price`/`max_price` are owner/staff-only (already enforced by Spec A) and surface in exactly one screen.
- A customer never learns the competing bid amounts, or how many rivals exist.
- **Buyer contact:** the owner always sees the buyer's name; email and phone are revealed only once an offer is accepted. This is narrower than the original brief, which showed contact details on every pending offer — the narrower default avoids handing a buyer's contact details to a seller who then declines them. Flagged for the product owner; widening it later touches only the respond sheet's serializer.

## 10. Testing

- Floor: an offer a naira below `min_price` and one far below return byte-identical 400 bodies; no payload anywhere leaks `min_price`/`max_price`.
- Constraints: a second live offer from the same customer on the same car is rejected by the DB constraint; a fourth lifetime offer is rejected.
- Eligibility: offers on rent cars, non-negotiable buy cars, unpublished cars, and own listings all 400.
- State machine: every legal transition; every illegal one 400 (counter twice, withdraw after a counter, respond to someone else's offer, act on an expired offer).
- Acceptance: creates an `APPROVED` buy request at the agreed amount, links `resulting_request`, supersedes exactly the other active offers, and leaves the car reading `reserved`; two concurrent accepts produce one winner.
- Expiry: an offer past `expires_at` cannot be acted on even while stored as `PENDING`; `expire_offers` flips it and notifies once, and is idempotent on a second run.
- Notifications: each of the nine types fires to the right recipient exactly once, via `captureOnCommitCallbacks`.

## Out of scope (Spec D2 and later)

- Meetup scheduling (owner proposes 5 slots, customer confirms one), inspector on-site prompts, company account payment details, 5% commission.
- Bidding on rent listings, auto-accept thresholds, bulk offer actions, offer analytics.
