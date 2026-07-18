# Inspection Flow — Manual Test Checklist (v2, new approval-first flow)

## Setup

- [ ] Backend: `cd backend && uv run python manage.py runserver`
- [ ] Frontend: `cd frontend && npm run dev`
- [ ] Accounts: one owner, one staff/admin

---

## Admin — Inspection Centers

- [ ] Go to `/admin/inspections/centers` → create a center (e.g. "Car 45", Nigeria → Lagos → Lagos, codes NG / LOS, max reschedules 2)
  - Verify: codes auto-uppercase; 4-letter city code rejected
- [ ] Create a second center in another city (e.g. Abuja, ABJ)
- [ ] Deactivate the second center → verify it disappears from owner-facing location dropdowns (check later in booking modal)
- [ ] Edit the first center (phone/email) → verify changes persist

## Admin — Slots

- [ ] `/admin/inspections` → create slots: pick the center from the dropdown (no free-text location), date range, days, times
- [ ] Verify slot list shows center name + city
- [ ] Try deactivating a slot with an active booking later → expect 409

---

## Owner — Listing & Approval Gate

- [ ] Create a new car listing as owner → status "Draft"
- [ ] Car detail page: shows "Awaiting review by our team" (NO Book Inspection button on draft)
- [ ] Try booking via API anyway → 400 (gate works)

## Admin — Listing Review

- [ ] `/admin/approvals` → "Pending Review" tab shows the draft
- [ ] Open drawer → "Request Changes" with note → car becomes "Needs Changes"; owner sees note; owner can edit
- [ ] Approve the (re-submitted) listing → car becomes "Approved for Booking" (`listing_approved`)
- [ ] Owner receives "Listing approved — book your inspection" notification

## Owner — Booking (location cascade)

- [ ] Car detail now shows "Book Inspection" → modal opens with 4 steps
- [ ] Step 1: country → state → city (only locations with active centers appear; deactivated Abuja center's city absent)
- [ ] Step 2: pick a center (card shows name + address)
- [ ] Step 3: calendar shows only that center's available slots; slot cards show spots remaining
- [ ] Step 4: confirm → summary correct → book
- [ ] Verify: car → "Inspection Pending", tracking ID `NG-LOS-######` visible on car detail
- [ ] Timeline on car detail shows: Car Listed → Listing Approved → Inspection Booked
- [ ] Verify dates render correctly everywhere — owner table, booking modal, admin approvals drawer, inspection form header (no off-by-one)

## Owner — Cancel / Reschedule

- [ ] Cancel booking → car returns to "Approved for Booking" (NOT draft); tracking ID unchanged after rebooking
- [ ] Rebook, then reschedule to another slot → reschedule count increments
- [ ] Exceed center's max reschedules → blocked with clear message
- [ ] Try cancel+rebook repeatedly → blocked once cap reached (bypass closed)

## Staff — Physical Inspection

- [ ] `/admin/approvals` → "Awaiting Inspection" tab → drawer shows booking card (center, date, time, tracking ID)
- [ ] "Start Inspection" → car → "In Progress"; owner notified; owner can no longer cancel/reschedule (400)
- [ ] Staff cannot mark no-show once started (400)
- [ ] Inspection form page: fill vehicle fields, condition selects, toggles
- [ ] Sale car: documents section visible (uploads, custom duty, receipt type); rental-only car: section hidden
- [ ] Sale car: submit stays DISABLED until both uploads + custom duty + receipt type are filled (for Pass / Needs Clearance results)
- [ ] Sale car via API (curl/Postman): submit "passed" WITHOUT document fields → 400, and the car stays in_progress (backend enforces docs atomically, not just the UI)
- [ ] Sale car with result "Fail": documents NOT required — submit works without them
- [ ] Result "Needs Clearance" without note → blocked
- [ ] Submit "Pass" → car → "Published" with timestamp; owner notified; booking completed
- [ ] Repeat with another car: submit "Needs Clearance" with note → car → "Needs Clearance"; owner sees reason on timeline + banner
- [ ] Repeat with another car: submit "Fail" with note → car → "Inspection Failed"; owner sees red "Inspection Failed" banner with the reason
- [ ] Failed car: owner can Edit, then "Resubmit for Review" → back to Pending Review → admin re-approves → owner books a fresh inspection

## Clearance Loop

- [ ] Owner (needs_clearance car): banner shows staff reason; owner can edit listing; submit "I've addressed this" with message
- [ ] Staff notified; owner's response appears on the timeline as an annotation
- [ ] Staff: approvals drawer (Needs Clearance tab) shows the clearance reason + resolution panel
- [ ] "Clear & Publish" → car live with timestamp
- [ ] "Reject" with empty note → button disabled; with note → "Inspection Failed"

## No-Show Flow

- [ ] Staff marks a pending booking no-show → car → "Missed Appointment"; owner notified
- [ ] Owner rebooks from no-show → goes through the RESCHEDULE flow (owner gets "rescheduled" notification, reschedule count increments, counts toward the cap)
- [ ] Staff cannot mark no-show after the inspection has started (400)

---

## Permissions & Privacy

- [ ] Non-staff: `/admin/inspections`, centers CRUD, start/submit/no-show/clearance endpoints → all 403
- [ ] Owner A cannot cancel/reschedule/respond on owner B's booking (404)
- [ ] Owner timeline NEVER shows a staff name — role labels only (You / Staff / System)
- [ ] Tracking ID visible to owner + staff only (not on public car pages)

## Regression

- [ ] Published car: pause/unpause/archive still work; archive appears on timeline
- [ ] Suspend/unsuspend from admin still works
- [ ] Public listing pages unaffected
- [ ] Mobile: booking modal 4-step flow usable at 375px; timeline renders; admin tables scroll

---

## Notes / bugs found

-

---

# Phase 2 — Inspection Refinements (manual checklist)

Prereqs: `mailpit` running (inbox at http://localhost:8025) for email checks.

## Identity chain
- [ ] Owner sign-up requires ID type + ID number + ID document image; NIN rejects letters, passport accepts them.
- [ ] Owner profile shows ID type / number / "On file" status and can upload/replace the ID document.
- [ ] Booking modal blocks an owner with no ID on file → "Complete your ID verification" → profile link.
- [ ] Booking attendee step: "Someone on my behalf" requires rep name + ID type + ID number + consent checkbox.
- [ ] Inspector form "Attendee identity" section required for passed/needs-clearance; optional photo; not required for failed.

## Emails (Mailpit)
- [ ] Booking an inspection sends the confirmation email (HTML renders, "bring a valid ID", correct date/center/tracking ID).
- [ ] Staff book-for-owner emails the owner (not the staff).

## Booking flow
- [ ] Country/state pre-fill from the owner profile when the modal opens.
- [ ] No centers in state → assistance panel → "Request staff assistance" → confirmation state.
- [ ] Calendar opens on the first month that actually has availability.

## Assistance (staff)
- [ ] Admin → Inspections shows the assistance queue (owner contact, state, message, age).
- [ ] "Mark handled" removes it from the open list.
- [ ] "Book for owner" (car-linked) picks center + slot, books, and auto-closes the request.

## Day-of lockdown
- [ ] On the appointment day, owner detail hides Cancel/Reschedule and shows the "contact staff" hint.
- [ ] Day-before still allows cancel + reschedule.

## Edit policy
- [ ] Edit button shows only for `needs_changes`; draft/needs_clearance/rejected have no Edit.
- [ ] New-listing "List Car" opens a confirmation modal summarizing fields + "locks after submit"; Confirm submits.

## Verified public data
- [ ] Published car with a passed inspection: public detail shows Verified badge, "Inspector's Notes", and the verified report card; specs use inspector values.
- [ ] Owner's own my-cars detail still shows their own description/mileage.
- [ ] Car cards show the small Verified badge.
- [ ] No ID/staff-identity/presented-ID data anywhere in public responses.

## Audit (staff)
- [ ] Admin timeline shows "Staff · <name>" on staff actions; owner timeline never shows names.
- [ ] Per-row slot capacity: creating slots with different per-row capacities stores them (row overrides top-level default).
