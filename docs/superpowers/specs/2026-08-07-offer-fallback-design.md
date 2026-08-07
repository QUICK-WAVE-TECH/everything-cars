# Spec D — Offer Negotiation Fallback (Design)

**Status:** approved, ready for implementation plan
**Date:** 2026-08-07
**Sub-project of:** Multi-Branch dealer platform (A–D). A + B + C shipped. D is the last and is independent.

## Scope

Preserve losing offers when a seller accepts one, and — if that deal falls through — revive them so the seller can accept a fallback **without the buyer re-submitting**. Builds entirely on the existing `Offer`/`Deal` flow; no new endpoints.

**In scope:** a new `OfferStatus.STANDBY`; `Offer.revived_at`; accept/complete/cancel/reverse service changes to preserve-then-revive; the "on standby" / "available again" emails; offer-list status labels + a "Re-opened" badge.

**Out of scope:** any new deal/offer endpoints; changing the offer cap or the deal lifecycle itself.

## Current state (what's already there vs the gap)

- **accept_offer** already sets rival active offers → `SUPERSEDED` ("Closed — vehicle sold") and emails each `notify_car_no_longer_available`.
- **cancel_deal** / **reverse_deal** already find `SUPERSEDED` offers and email `notify_car_available_again` — **but leave them `SUPERSEDED` (terminal)**, so the seller can't re-accept them; the buyer would have to re-submit.

**The gap Spec D closes:** a non-terminal **standby** state, and **revival to an acceptable state** on cancel/reverse.

## Data model & transitions

**New `OfferStatus.STANDBY`** = `"standby", "On standby — deal in progress"`. Non-terminal, preserved. `ACTIVE_OFFER_STATUSES` stays `[PENDING, COUNTERED]` (standby is not directly acceptable — it revives to PENDING first).

**New `Offer.revived_at`** = nullable `DateTimeField`, set when an offer is revived (drives the "Re-opened" UI badge). Migration adds the column.

**Transition map:**

| Trigger | Rival offers |
|---|---|
| **Accept** an offer (deal opens) | active rivals (`PENDING`/`COUNTERED`) → **`STANDBY`** |
| **Complete** the deal (sale done) | `STANDBY` → **`SUPERSEDED`** (terminal — car sold) |
| **Cancel** the deal (fell through) | `STANDBY` → **`PENDING`** + `expires_at = now + OFFER_TTL_HOURS` + `revived_at = now` |
| **Reverse** the deal (dispute upheld) | same as cancel — `STANDBY` → revived `PENDING` |

**Revival TTL:** a revived offer gets a **fresh `OFFER_TTL_HOURS` (48h)** expiry — its original window has long passed (deals live up to 7 days), so without this it'd be dead-on-arrival. This is what makes "accept without re-submitting" work.

**Self-consistency:** when the seller accepts a *revived* offer, the normal accept flow runs again → the other revived offers go back to `STANDBY`. The per-customer offer cap is unaffected (a revived offer is the same offer reverting, not a new one). No new offers can be made while a deal is active (car reserved), so standby offers are the complete set to revive.

## Service-layer changes

- **`accept_offer`** (`apps/offers/services.py`): rival transition `SUPERSEDED` → **`STANDBY`**; keep the notification, reword its template to "your offer is on standby while another sale is in progress" (not "no longer available").
- **`complete_deal`** (`apps/sales/services.py`): add a step — that car's `STANDBY` offers → **`SUPERSEDED`** (terminal). No email.
- **`cancel_deal`**: change the "prior" query from `SUPERSEDED` → `STANDBY`; **revive** each → `PENDING`, fresh `expires_at`, `revived_at=now`; email `notify_car_available_again` (wording: "the seller is reviewing your previously submitted offer").
- **`reverse_deal`**: add the same revival (today it only notifies).

**Auto-expiry safety:** the offer-expiry command filters on `ACTIVE_OFFER_STATUSES` (which excludes `STANDBY`), so a standby offer is never auto-expired mid-deal by its stale timestamp — a test will lock this.

**Notifications:** reuse `notify_car_available_again` (revival). Reword the accept-time rival template to the "on standby" message. No new `NotificationType`.

## Frontend

- **Offer status formatter** (owner + customer views): map `STANDBY` → "On standby" with a neutral/amber pill.
- **Seller's offers** (`/owner/offers`): revived offers reappear in the active list (they're `PENDING` again) and are acceptable with no new flow. Add a subtle **"Re-opened"** badge where `revived_at` is set, with subtext "The buyer's earlier deal fell through — you can accept this again."
- **Buyer's My-offers**: a `STANDBY` offer shows a muted **"On standby"** state (not "rejected"); on revival it flips back to active/pending.
- **Types:** add `"standby"` to the frontend `OfferStatus` union and `revived_at` to the offer type; surface the badge in the offer card/row.
- No new pages, no design import. `tsc` + ESLint + `next build` clean.

## Testing

**Backend (pytest, TDD — Namy writes, Claude guides):**
- Accept: rivals → `STANDBY` (not `SUPERSEDED`); the accepted offer → `ACCEPTED`; a Deal opens.
- Complete: standby offers → `SUPERSEDED`.
- Cancel: standby offers → `PENDING` with a future `expires_at` and `revived_at` set; the accepted (now cancelled-deal) offer path unchanged; emails scheduled.
- Reverse (dispute upheld): standby offers revived the same way.
- Seller can **accept a revived offer** end-to-end (opens a new Deal; the other revived offers go back to `STANDBY`).
- Expiry: a `STANDBY` offer is **not** auto-expired by the offer-expiry command.
- Serializer exposes `status="standby"` and `revived_at`.

**Frontend:** `tsc` + ESLint + `next build` clean; manual checklist added to `MANUAL_TESTING.md` + `TESTING_GUIDE.md`.

## Workflow

Backend written by Namy with Claude guiding step-by-step TDD. Frontend by Claude. CI: `ruff check` + `pytest --nomigrations`; top-level imports (no E402), no unused imports (F401); `select_related`/`prefetch_related`.
