# Inspection Schedule Console — Design

**Date:** 2026-08-28
**Status:** Approved
**Surface:** `/admin/inspections` (staff)

## Goal

Redesign the admin inspection **Schedule** page to match the approved mockup: a
three-region console (left sub-nav rail · main calendar column · right day
panel) that is more scannable and premium, wired to the **real** slot/booking
data we already have. No fabricated data.

## Scope decisions (agreed)

- Redesign with **real data** (frontend rebuild + one small backend field).
- Sidebar shows **Schedule + Centers only** — Inspectors/Availability/Settings
  from the mockup are omitted (no such features exist).
- Customer **photos** don't exist → initials avatars. **Plate** does exist on the
  Car → add it to the booking payload.

## Layout

Desktop (`lg+`): three columns.

1. **Left rail** (sticky, collapsible): "INSPECTION OPERATIONS" eyebrow + vertical
   nav — **Schedule** (active) and **Centers**. Collapse control at the bottom.
2. **Main column:**
   - Header: "Schedule" title, subtitle "Manage capacity, bookings and center
     availability", and a **Live sync** dot wired to React Query's background
     fetch (`isFetching` / `dataUpdatedAt`) — green when recently synced.
   - **KPI row:** Total slots · Open · Partial · Full · Bookings, all computed
     from the current week's slots.
   - **Toolbar:** `‹ ›` week nav, week-range label, Today, All-centers select,
     All-statuses select, **Week/Day** toggle, **Create slots** button.
   - **Week grid:** Mon–Sun columns. Each day lists its slot cards: time range,
     center name, `X/Y booked`, and a **capacity bar** colored by status
     (open / partial / full). Selected day column highlighted; clicking a day
     selects it for the right panel.
   - Footer: legend (Open/Partial/Full) + totals.
3. **Right day panel** (sticky): selected-day header (`Friday, Aug 28` ·
   `N slots · M bookings`), slots grouped with a status pill, each booking row
   showing an initials avatar, attendee name, car title, **plate**, and time.
   **View day** button opens the full day activity (existing `DayActivitySheet`).

## Status model (already exists)

Per slot from `bookings_count` / `capacity`:
`open` (0 booked) · `partial` (0 < booked < capacity) · `full` (booked ≥ capacity).

KPIs: Total = slots.length; Open/Partial/Full = counts by status;
Bookings = Σ bookings_count. (All over the filtered week.)

## Components (new)

`src/features/inspections/components/schedule-console/`
- `schedule-console.tsx` — layout + state (week, selected day, filters, view).
- `schedule-sidebar.tsx` — left rail (Schedule/Centers, collapse).
- `schedule-kpis.tsx` — KPI row.
- `schedule-toolbar.tsx` — week nav + filters + Week/Day + Create slots.
- `week-grid.tsx` + `slot-card.tsx` — the calendar and slot cards with bars.
- `day-panel.tsx` — right day detail.

`page.tsx` becomes a thin wrapper rendering `<ScheduleConsole />`. The Centers
view reuses `CentersPanel`. `CreateSlotsModal`, `DayActivitySheet`,
`AssistanceQueue`, deactivate-slot, and all data hooks are reused.

**AssistanceQueue** is preserved as a collapsible banner above the grid, shown
only when there are open assistance requests.

## Reused data / logic

`useStaffSlots` (week slots), `useStaffBookings` (day panel), existing status/
color helpers, week-nav date helpers (extended Mon–Sat → Mon–Sun),
`useDeactivateSlot`.

## Backend change

Add `car_plate` to the `InspectionBooking` serializer (read-only, from
`car.plate_number`, blank-safe). This is the only backend change. Covered by a
serializer/endpoint test.

## Responsive

Below `lg`: left rail collapses to a compact segmented switch; the right day
panel falls back to the existing `DayActivitySheet` drawer on tap; the week grid
scrolls horizontally. Motion stays restrained (KPI stagger, panel reveal) via the
existing `shared/motion` primitives; all reduced-motion aware.

## Out of scope

Inspectors / Availability / Settings sections; any change to booking/slot
business logic; customer photos.
