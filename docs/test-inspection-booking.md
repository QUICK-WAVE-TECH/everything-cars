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

Prereqs: `mailpit` running (inbox at [http://localhost:8025](http://localhost:8025)) for email checks.

## Identity chain

- [x] Owner sign-up requires ID type + ID number + ID document image; NIN rejects letters, passport accepts them.
- [x] Owner profile shows ID type / number / "On file" status and can upload/replace the ID document.
- [x] Booking modal blocks an owner with no ID on file → "Complete your ID verification" → profile link.
- [x] Booking attendee step: "Someone on my behalf" requires rep name + ID type + ID number + consent checkbox.
- [ ] Inspector form "Attendee identity": only two options — "The owner" / "Declared representative" (no "Someone else"). Required for passed/needs-clearance; not required for failed.
- [ ] Selecting "The owner" shows the "verified at sign-up" note and NO ID fields; submitting without an ID succeeds (owner's ID is already on file).
- [ ] Selecting "Declared representative" shows ID type + number (required, pre-filled from the booking's declared rep) + optional photo; submitting without them → blocked client-side and 400 via API.
- [ ] API: `presented_attendee=other` → 400 (choice removed).

## Emails (Mailpit)

- [x] Booking an inspection sends the confirmation email (HTML renders, "bring a valid ID", correct date/center/tracking ID).
- [x] Staff book-for-owner emails the owner (not the staff).

## Booking flow

- [x] Country/state pre-fill from the owner profile when the modal opens.
- [x] No centers in state → assistance panel → "Request staff assistance" → confirmation state.
- [x] Calendar opens on the first month that actually has availability.

## Assistance (staff)

- [x] Admin → Inspections shows the assistance queue (owner contact, state, message, age).
- [x] "Mark handled" removes it from the open list.
- [x] "Book for owner" (car-linked) picks center + slot, books, and auto-closes the request.

## Day-of lockdown

- [x] On the appointment day, owner detail hides Cancel/Reschedule and shows the "contact staff" hint.
- [x] Day-before still allows cancel + reschedule.

## Edit policy

- [x] Edit button shows only for `needs_changes`; draft/needs_clearance/rejected have no Edit.
- [x] New-listing "List Car" opens a confirmation modal summarizing fields + "locks after submit"; Confirm submits.

## Verified public data

- [x] Published car with a passed inspection: public detail shows Verified badge, "Inspector's Notes", and the verified report card; specs use inspector values.
- [x] Owner's own my-cars detail still shows their own description/mileage.
- [ ] Car cards show the small Verified badge.
- [x] No ID/staff-identity/presented-ID data anywhere in public responses.

## Audit (staff)

- [x] Admin timeline shows "Staff · " on staff actions; owner timeline never shows names.
- [ ] Per-row slot capacity: creating slots with different per-row capacities stores them (row overrides top-level default).

---

# Phase 2.1 — Hub, hardening & realtime (manual checklist)

## Unified Slots & Centers hub (`/admin/inspections`)

- [ ] Page shows two tabs: **Schedule** (calendar, stats, legend, Create Slots) and **Centers** (center cards + New Center).
- [ ] Old `/admin/inspections/centers` URL redirects to the hub.
- [ ] Center card → **Add slots** opens the slot creator with that center locked (shown read-only, not a dropdown); slots land on that center.
- [ ] Inactive center: "Add slots" disabled; Deactivate/Reactivate confirm dialog still works; Edit persists changes.
- [ ] Clicking a **date header** in the calendar opens the Day Activity sheet: attendees sorted by time, status chips, rep shown as "Jane Rep · for Owner", center line, "Start inspection" link on pending rows.
- [ ] Day with nothing scheduled → "No one is attending this day" empty state; cancelled/rejected bookings do NOT appear.
- [ ] Calendar chip counts include completed/no-show ("1/4 booked" persists after the inspection completes — matches the day sheet).

## Slot creation guardrails

- [ ] Batch over 90 days → 400 "Date range cannot exceed 90 days".
- [ ] More than 20 time rows → 400; more than 7 day toggles via API → 400.
- [ ] Re-running the exact same batch → "0 slots created" (no duplicates), and returned slots always have real ids.

## Available-slots hardening (API)

- [ ] `?center=not-a-uuid` → 400; `?date=13/07/2026` → 400; `date_from > date_to` → 400.
- [ ] Range wider than 180 days → 400; bare `?center=<id>` only returns slots within ~180 days.
- [ ] `GET /available-slots/summary/?center=<id>` returns tiny `{date, open_count}` rows (fully-booked days omitted); booking modal + staff book-for-owner calendars highlight days from it and fetch full slot rows only for the clicked day (check Network tab: no full-window slot fetch).
- [ ] Staff slot list + staff bookings list also reject malformed/reversed dates → 400.

## Reschedule + consent

- [ ] Rescheduling a **representative** booking keeps rep name/ID on the new booking (does not silently reset to owner).
- [ ] Reschedule flow for a rep booking shows the "Confirm authorization" re-consent checkbox; confirm disabled until ticked; API without `consent_accepted` → 400.
- [ ] Rescheduling a **self** booking shows no consent step and succeeds.

## Realtime (two browsers: owner + staff)

- [ ] Owner books → staff calendar chip count and available-slots update live (no refresh).
- [ ] Owner reschedules → old slot frees and new slot fills live.
- [ ] Owner **cancels** → staff gets an "Inspection cancelled" notification (links to `/admin/inspections`) and the calendar frees the slot live.
- [ ] Assistance queue shows a "Checking booking assistance requests…" loading row instead of popping in.

## Misc fixes

- [ ] Django admin: editing a rent-only car (no sale price) saves without "This field is required".
- [ ] Public car detail: "Description" card shows the OWNER's description (paragraph breaks kept); inspector notes appear only inside the verified-report card — no duplication.
- [ ] Owner sign-up / ID uploads accept PDF, PNG, JPEG only.
- [ ] `cd backend && uv run pytest` collects and passes (no app_label RuntimeError).
