# Spec 3 — Pay-to-book Inspection (Design)

**Date:** 2026-07-30
**Status:** Approved — ready for implementation plan
**Supersedes:** item 6 of the deprecated D2 "sale inspection & escrow" spec, re-scoped now that the buy flow is peer-to-peer contact-reveal ([[2026-07-29-deal-contact-reveal-design]]).

## Goal

An owner pays a one-time, non-refundable fee (inspection fee + listing fee + VAT) to book a physical inspection for a car they are listing. Payment is manual bank-transfer + receipt upload, confirmed by staff. The owner selects an inspection slot **and** uploads the receipt in a single submit; the booking is held in a new payment-pending state until staff confirm.

This is entirely on the **owner-side listing flow**. It does not touch the buyer / offer / `Deal` flow.

## Context / current state

- The `apps/inspections` app is **owner-facing**: owners book *their own* car into a physical inspection (`OwnerBookingCreateView`) to get it verified before publishing. Today the only gate is "owner has ID on file". There is **no fee**.
- There is **no payment gateway**. The only existing payment path (`CustomerPaymentSubmitView` in `apps/listings`) is **manual bank transfer + receipt upload → staff confirmation** (`StaffConfirmPaymentView`). `PaymentMethod` lists Paystack/Opay but nothing is wired up.
- `InspectionBooking` starts in `BookingStatus.PENDING`. `ACTIVE_BOOKING_STATUSES = [PENDING, APPROVED]` drives the `one_active_booking_per_car` unique constraint (holds the slot). Reschedules are capped at `MAX_RESCHEDULES = 2`.

## Decisions (locked)

| Question | Decision |
|---|---|
| Who pays | The **owner**, as a gate before booking the inspection. |
| Payment method | **Manual bank transfer + receipt upload + staff confirmation** (reuse existing pattern). No gateway. |
| Fee configuration | **Global, admin-configurable** singleton: inspection fee, listing fee, VAT rate. |
| Fee lifecycle | **Non-refundable, per listing.** One payment covers the car's inspection incl. its allowed reschedules. Fail / no-show / cancel → pay again to retry. |
| Pay/book ordering | **Pick slot + pay together.** Booking created in a payment-pending state that holds the slot; staff confirm activates it. Payment attaches to the **booking**. |
| Applies to | **Every inspection booking** — both buy and rent listings. |

## Data model (`apps/inspections/models.py`)

### `FeeSetting` (admin-editable singleton)
- `inspection_fee` — `DecimalField(max_digits=12, decimal_places=2)`, NGN.
- `listing_fee` — `DecimalField(max_digits=12, decimal_places=2)`, NGN.
- `vat_rate` — `DecimalField(max_digits=5, decimal_places=4, default=Decimal("0.0750"))` (7.5%).
- `updated_at` — `auto_now`.
- `get_solo()` classmethod — returns the single row, creating it with defaults on first read (pk pinned to 1).
- `quote()` method — returns a dict:
  - `inspection_fee`, `listing_fee`
  - `subtotal = inspection_fee + listing_fee`
  - `vat_amount = (subtotal * vat_rate)` quantised to 2 dp (`ROUND_HALF_UP`)
  - `total = subtotal + vat_amount`
  - `currency = "NGN"`

### `InspectionPayment`
- `booking` — `OneToOneField(InspectionBooking, on_delete=CASCADE, related_name="payment")`.
- **Snapshotted amounts** (copied from `FeeSetting.quote()` at submit time so later fee edits never rewrite history): `inspection_fee`, `listing_fee`, `vat_amount`, `total` (all `DecimalField(max_digits=12, decimal_places=2)`), `currency` (`CharField`, default `"NGN"`).
- `receipt` — `FileField(upload_to="inspection_payments/")`.
- `payment_method` — `CharField(choices=[("transfer","Bank Transfer"),("card","Card")], default="transfer")` (mirrors buy flow; `card` is a label only, no gateway).
- `status` — `CharField(choices=[("submitted","Submitted"),("confirmed","Confirmed"),("rejected","Rejected")], default="submitted", db_index=True)`.
- `staff_note` — `CharField(max_length=400, blank=True)` (reason on reject).
- `submitted_at` — `auto_now_add`.
- `confirmed_at` — `DateTimeField(null=True, blank=True)`.
- `confirmed_by` — `ForeignKey(User, null=True, blank=True, on_delete=SET_NULL, related_name="+")`.

### `BookingStatus.AWAITING_PAYMENT`
- New value `AWAITING_PAYMENT = "awaiting_payment", "Awaiting payment"`, ordered before `PENDING`.
- Added to `ACTIVE_BOOKING_STATUSES` and `OCCUPIED_BOOKING_STATUSES` so it **holds the slot** and participates in `one_active_booking_per_car` (a car awaiting payment cannot start a second booking).

## Flow

1. Owner opens the booking flow. Frontend calls `GET /api/v1/inspections/fee-quote` → renders the **Summary**: inspection fee, listing fee, VAT, total, plus platform bank details.
2. Owner selects a slot, declares the attendee (existing `attendee_type` / rep fields), and uploads the payment receipt → **single submit** to the booking-create endpoint.
3. Server (atomic): validates the ID gate + receipt, creates the `InspectionBooking` in `AWAITING_PAYMENT` (slot held) and an `InspectionPayment(status=submitted)` snapshotting the current `quote()`. Staff are notified.
4. Staff review the receipt:
   - **Confirm** → `InspectionPayment.status = confirmed` (+ `confirmed_at`/`confirmed_by`); booking flips to `PENDING`; the normal flow resumes (owner confirmation email, inspection proceeds as today).
   - **Reject** → `InspectionPayment.status = rejected` (+ `staff_note`); booking → `CANCELLED`; slot freed; owner notified with the reason.

The existing **ID-on-file gate** in `OwnerBookingCreateView` stays. Non-refundable & per-listing: a failed / no-show / cancelled booking requires a **new** payment to retry.

## API (`apps/inspections`)

- `GET /api/v1/inspections/fee-quote` — owner-auth. Returns `FeeSetting.get_solo().quote()` for the Summary screen.
- **Modify** `OwnerBookingCreateView` (`POST /api/v1/inspections/owner/bookings`) — add `MultiPartParser`; accept `receipt` (required) + `payment_method`. Receipt validation matches `CustomerPaymentSubmitView`: content-type in `{image/jpeg, image/png, image/webp, application/pdf}`, size ≤ 5 MB. On success creates the booking in `AWAITING_PAYMENT` + `InspectionPayment`.
- `POST /api/v1/inspections/staff/bookings/{id}/confirm-payment` — staff-only. Guards `payment.status == submitted` and `booking.status == AWAITING_PAYMENT`; confirms payment; booking → `PENDING`; fires notifications.
- `POST /api/v1/inspections/staff/bookings/{id}/reject-payment` — staff-only. Body `{ "reason": "..." }`; rejects payment; booking → `CANCELLED`; slot freed; owner notified.

Serializers expose the payment summary on the booking detail (`InspectionBookingDetailSerializer`) so both owner and staff see the snapshotted amounts and status.

## Notifications (`apps/notifications`)

Reuse `schedule_notification` (`transaction.on_commit(..., robust=True)`) + `send_email`. New `NotificationType` values + email templates under `emails/`:
- `INSPECTION_PAYMENT_SUBMITTED` → all `is_staff` users (review link).
- `INSPECTION_PAYMENT_CONFIRMED` → owner (booking now active; includes slot details).
- `INSPECTION_PAYMENT_REJECTED` → owner (includes `staff_note` reason + how to retry).

## Frontend (`frontend/src`)

- **Booking wizard** gains a **Summary + payment step**: fee breakdown (from `fee-quote`), platform bank details, receipt upload — combined with slot selection into the single submit. Uses shadcn components + `--brc-*` tokens.
- Owner **bookings list** renders the new **"Awaiting payment confirmation"** state.
- Staff **bookings view** gains **Confirm payment** / **Reject payment** actions (reason dialog on reject), reusing the existing staff booking UI + a React Query mutation (`meta: { skipGlobalOverlay: true }`).
- `FeeSetting` and `InspectionPayment` registered in Django admin (`FeeSetting` editable; `InspectionPayment` read-mostly with the confirm/reject also available via the staff endpoints).

## Edge cases

- **Second booking while awaiting payment** — blocked by `one_active_booking_per_car` (now includes `AWAITING_PAYMENT`).
- **Reject frees the slot** — booking → `CANCELLED`, which is not in `OCCUPIED_BOOKING_STATUSES`, so the slot is available again.
- **Fee changed after submit** — the `InspectionPayment` snapshot is authoritative; the quote endpoint only reflects current settings for *new* bookings.
- **Missing/oversized/wrong-type receipt** — 400 with the same messages as the buy flow; no booking or payment created.
- **Card method** — accepted as a label; still requires a receipt (no gateway), same as the buy flow. Real Paystack is deferred to a later spec.

## Testing

- `FeeSetting.quote()` math including VAT rounding (`ROUND_HALF_UP`, 2 dp) and `subtotal`/`total`.
- `fee-quote` endpoint returns the current breakdown; owner-auth required.
- Booking-create **requires a receipt**; on success lands in `AWAITING_PAYMENT`, holds the slot, and creates an `InspectionPayment(submitted)` with **snapshotted** amounts.
- `one_active_booking_per_car` blocks a second booking while the first is `AWAITING_PAYMENT`.
- Staff **confirm** → payment `confirmed`, booking `PENDING`, owner notified.
- Staff **reject** → payment `rejected`, booking `CANCELLED`, slot freed, owner notified.
- Editing `FeeSetting` after a payment exists does **not** change that payment's snapshot.
- Receipt validation: wrong content-type and > 5 MB both 400 with no side effects.

## Out of scope

- Real payment-gateway (Paystack) integration — later spec.
- Refunds / credits — fee is non-refundable by decision.
- Buyer-paid pre-purchase inspections — not part of this spec.
