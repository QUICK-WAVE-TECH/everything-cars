# Inspection Flow Refinements (Phase 2) — Design

**Date:** 2026-07-14
**Status:** Approved
**Branch:** `feat/inspection-refinements` (off `jaydesign`)
**Prior art:** `docs/superpowers/specs/2026-07-08-inspection-flow-expansion-design.md`

## Summary

Nine refinements to the inspection flow shipped in phase 1: combined center+slot
creation, per-slot capacity, profile-driven booking defaults with a staff-assistance
fallback, smarter calendar defaults, day-of lockdown for cancel/reschedule, a
stricter owner edit policy, inspector-verified data on the public car page,
staff-visible audit names, and a booking confirmation email with a full
identity-verification chain (sign-up ID on file → attendee declaration →
inspector's day-of ID capture).

## Workflow Agreement

- **Backend:** Namy writes the code; Claude guides step-by-step with reasoning.
- **Frontend:** Claude implements directly.

## 1. Data Model Changes

### OwnerProfile (`apps/users`)
- `id_type` — choices: `intl_passport`, `nin`, `voters_card`, `drivers_licence`.
- `id_document` — image upload (`ImageField`), stored under a dedicated prefix.
- Existing `national_id` stays as the ID **number** field for whichever type;
  digits-only validation applies only when `id_type == nin`.
- Both new fields nullable/blank in the DB (existing accounts must not break),
  **required at sign-up** going forward, and **gated at booking**: an owner with
  no ID on file is prompted to complete verification before they can book.

### InspectionBooking (`apps.inspections`)
Attendee declaration captured at booking:
- `attendee_type` — `self` (default) | `representative`.
- `rep_name`, `rep_id_type` (same choices), `rep_id_number` — required when
  representative.
- `consent_accepted_at` — datetime, null; must be set (server timestamps it)
  when booking with a representative. Proves acceptance of the authorization
  text for legal protection. Consent copy is configurable content — placeholder
  until legal supplies the final text.

### PhysicalInspection (`apps.inspections`)
Day-of identity verification (inspector fills at the appointment):
- `presented_id_type` (choices as above), `presented_id_number`,
  `presented_id_document` (image upload).
- **Staff-only serialization.** ID numbers and images never appear in any
  owner- or public-facing response.

### AssistanceRequest (new, `apps.inspections`)
- `owner` (FK User), `car` (FK Car, nullable), `country`, `state`, `message`,
  `status` (`open` | `handled`), `handled_by` (FK User, nullable),
  `created_at`, `handled_at` (nullable).
- Backs the "no centers in your state" flow and the staff work queue.

### InspectionSlot
- **No model change.** Capacity already lives per slot row. Only the batch
  creation API/UI changes (§9).

## 2. Email Infrastructure

- Development: SMTP backend → Mailpit (`EMAIL_HOST=localhost`,
  `EMAIL_PORT=1025`, no auth/TLS) in `development.py`. Inbox at
  `http://localhost:8025`.
- Production: SMTP settings read from environment variables in
  `production.py` (provider-agnostic).
- New `apps/notifications/email_service.py` (or similar):
  `send_booking_confirmation(booking)` — subject, plain-text body, and
  `html_message` slot for Namy's template (plain placeholder until then).
  Content: appointment date/time/center/address, tracking ID, the
  **bring-a-valid-ID instruction**, addressed to the attendee (owner, or the
  declared representative by name, with a note that the rep must bring the
  declared ID).
- Sent via `transaction.on_commit` from the booking-create and
  staff-books-on-behalf paths (same discipline as WebSocket notifications).
  Reschedule sends an updated-appointment email.

## 3. Booking Modal (frontend) + Booking API

- **Location defaults:** country/state pre-selected from the owner's profile
  when those values exist in the locations tree.
- **No centers in the owner's state:** the modal shows a "Request staff
  assistance" panel (optional message → `POST /inspections/assistance/`).
  Creates an `AssistanceRequest`, notifies all staff (new notification type
  `assistance_requested`), toasts confirmation. Duplicate open requests for
  the same owner+car are rejected (400).
- **Calendar default month:** opens on the month of the earliest available
  date for the selected center (not the current month when it has nothing).
- **Attendee step:** new step between date/time and confirm — "Who will attend
  the inspection?" Self (default) or Representative (name, ID type, ID number,
  consent checkbox rendering the authorization text). `POST /inspections/bookings/`
  accepts and validates the attendee fields; consent required for reps.
- **ID-on-file gate:** if the owner's profile lacks `id_type`/`id_document`,
  the modal shows a "Complete your ID verification" panel linking to the
  profile page instead of the booking steps; the backend enforces the same
  gate on booking create (400).

## 4. Staff Books On Behalf

- `GET /inspections/admin/assistance/` — list requests (filter by status).
- `POST /inspections/admin/assistance/<id>/handle/` — mark handled.
- `POST /inspections/admin/bookings/book-for-owner/` — staff creates a booking
  for `{car_id, slot_id, attendee fields}`. Reuses the owner-booking rules
  (bookable statuses, capacity, tracking ID, cycle-scoped reschedule counts).
  `booked_by` = the owner; the history row records the **staff actor**, so the
  audit shows staff placed it. Confirmation email still goes to the owner.
- Admin UI: an "Assistance" view (tab or section on the approvals page) listing
  open requests with owner contact info, a "Book for owner" action that opens
  the booking flow pinned to that owner's car, and a "Mark handled" action.

## 5. Day-Of Lockdown (cancel + reschedule)

- Owner cancel and reschedule are allowed only **until the end of the day
  before** the appointment (`slot.date > today` required). On the day itself
  both endpoints return 400 with a clear message; absence becomes a
  staff-recorded no-show.
- Frontend hides the Cancel/Reschedule buttons on the day of the appointment
  and shows a hint ("Appointment is today — contact staff if you cannot make it").

## 6. Owner Edit Policy Tightening

- `EDITABLE_CAR_STATUSES = [NEEDS_CHANGES]` — the only state where owners can
  edit listing content (staff explicitly requested changes).
- Draft becomes read-only from the moment of submission (creation).
  `needs_clearance` is answered by clearance message; `inspection_rejected`
  is fixed on the physical car and resubmitted — neither reopens editing.
- The `inspection_rejected → draft` and `needs_changes → draft` owner
  transitions (resubmission) are unchanged.
- **Pre-submit confirmation modal** on the new-listing form: full summary of
  everything entered (details, prices, photos) with explicit "you will not be
  able to edit after submitting" copy; Confirm submits, Back returns to the form.
- Frontend Edit buttons render only for `needs_changes`.

## 7. Inspector-Verified Data on the Public Page

- Public list/detail serializers overlay data from the car's **latest passed
  inspection** (prefetched; no N+1):
  - `description` → inspector's `staff_notes`
  - `mileage`, `fuel_type`, `features` → inspector's values
  - New `verified_report` object: `condition`, `car_type`,
    `engine_condition`, `chassis_condition`, `ac_condition`, `is_flooded`,
    `has_accident_history`, `inspected_at`.
  - `is_verified: true` flag drives a "Verified" badge and an "Inspector's
    Report" presentation on the public car detail page.
- Owner-entered values remain untouched in the DB and continue to be what the
  owner sees on their own pages. No ID or staff-identity data leaks through
  this path.

## 8. Staff-Visible Audit Names

- A staff variant of the history serializer adds `actor_name` (first + last).
- Admin drawer timeline shows "Staff · Jane Doe"; booking detail keeps
  `inspector_name`. The approvals drawer's key moments read as "Approved by …",
  "Inspected by …".
- Owner-facing serializers are untouched; existing tests already pin that
  owners never see names.

## 9. Center Creation Wizard + Per-Slot Capacity

- "New Center" dialog becomes a two-step wizard: **step 1** center details
  (unchanged), **step 2** slot schedule — date range, weekday toggles, and
  time-slot rows where **each row has its own capacity**. Creating executes
  center create → slot batch create; step 2 is skippable ("create without
  slots").
- Slot batch API: `time_slots` rows accept `capacity` per row; the top-level
  `capacity` remains as the default for rows that omit it (backwards
  compatible).
- The standalone slot-management page stays for ongoing operations; its
  creation modal gains the same per-row capacity input.

## Already Done (verify only)

- **Owners cannot edit once approved for booking** — `listing_approved` has
  been non-editable client and server side since phase 1. §6 tightens further;
  regression tests keep both pinned.
- **Actor recording** — every transition and inspection already stores who
  acted; §8 only exposes names to staff.

## Testing

- Backend: per-feature tests in the phase-1 style — attendee validation,
  consent requirement, ID gate, day-of lockdown boundaries (day before OK,
  day of blocked), assistance request dedup + staff booking on behalf,
  per-row capacity creation, public serializer overlay (and that ID/staff
  data never leaks), edit-policy matrix update, email send on commit
  (Django's `mail.outbox`).
- Frontend: tsc + lint gates; manual checklist gains a phase-2 section.

## Out of Scope

- Consent legal text and the HTML email template (Namy supplies; placeholders ship).
- Payments for assisted bookings, SMS reminders, calendar invites.
