# Delete an inspection centre — Design

Admin can delete a centre. Past bookings are kept; upcoming ones are cancelled
and their owners notified to rebook; then the centre is removed.

## Behaviour

On `DELETE /admin/centers/{id}/` (staff):
1. **Upcoming active bookings** — `slot.center == centre`, `slot.date >= today`,
   status in `ACTIVE_BOOKING_STATUSES`: set `CANCELLED`; if the car is
   `INSPECTION_PENDING`, revert it to `LISTING_APPROVED` (rebookable); email +
   notify the owner (`booked_by`); notify staff (existing).
2. **Past / terminal bookings** are left intact as records.
3. `centre.delete()`.

## Records survive the delete

`InspectionSlot.center` is `CASCADE` today (and `InspectionBooking.slot` is
`CASCADE`), so deleting a centre would erase its slots and every booking. Change
`InspectionSlot.center` → **`null=True, on_delete=SET_NULL`** (migration) so the
centre's slots — and their bookings — survive; only the centre row is deleted.
Guard serializers that read `slot.center` for `None`.

## Backend

- Model + migration: `InspectionSlot.center` nullable, `SET_NULL`.
- `StaffCenterDetailView.delete()` — the flow above, atomic, returns `204` with
  `{cancelled, kept}` counts.
- `notify_inspection_center_removed(booking)` — in-app (`INSPECTION_CANCELLED`)
  + email via new `inspection_center_removed.html`.
- `InspectionCenterSerializer` gains a read-only `booking_count` (upcoming active)
  so the UI can warn.

## Frontend

- Destructive **Delete** action on the centre card + confirm dialog: "Upcoming
  appointments will be cancelled and those owners notified to rebook. Past
  inspection records are kept." Success → toast + refresh. `useDeleteCenter` hook.

## Testing

- Deleting a centre with a future PENDING booking cancels it, reverts the car,
  emails/notifies the owner, and removes the centre while a *past* booking on the
  same centre survives (slot orphaned). Non-staff → 403.
