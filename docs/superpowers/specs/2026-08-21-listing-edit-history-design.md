# Car-listing edit-history timeline — Design

Record edits to a car listing (field changes, old → new) alongside status
changes, in the one timeline the owner/staff car pages already render.

## Approach

Reuse `CarStatusHistory` + its `CarStatusTimeline`. An edit is an **annotation
row** (`from_status == to_status == current`) carrying the changed fields. Status
rows are unchanged. Staff don't edit listing fields (only status, already
tracked), so all edit rows are business-side (`actor_role = owner`).

## Backend

- Add nullable **`changed_fields`** JSONField to `CarStatusHistory` (+ migration).
  For edit rows it holds a list of `{field, label, old, new}` (display strings);
  null on normal status rows.
- New module `apps/listings/edit_history.py`:
  - `LISTING_FIELD_LABELS` — the tracked fields and their labels: title, listing
    type, prices, negotiable, brand, model, color, year, body/transmission/fuel/
    seats, mileage, branch, country/state/city, description (truncated), features.
    (VIN/plate are locked identity — excluded.)
  - `listing_snapshot(car)` → `{field: display_value}` (brand/branch → name,
    features → joined names, booleans → Yes/No, description truncated).
  - `record_listing_edit(car, before, after, actor, request)` — diffs the two
    snapshots and, if anything changed, writes a `CarStatusHistory` annotation
    row (actor = editor, `actor_role = owner`, snapshotted name, `changed_fields`).
- `MyCarDetailView.patch`: snapshot **before** save and **after** `refresh_from_db`,
  then `record_listing_edit`, all inside the existing transaction.
- History serializers gain `changed_fields`. The owner serializer
  (`CarStatusHistorySerializer`) also surfaces **`actor_name` only for
  `owner`-role rows** (so the owner sees which team member edited), staying blank
  for staff/system — platform-staff identity is never shown to owners. The staff
  serializer already carries `actor_name`.

## Frontend

- Extend the timeline entry type with `changed_fields` + `actor_name`.
- `CarStatusTimeline`: an entry with `changed_fields` renders as **"Listing
  updated"** with each change as `Label: old → new`. Actor label prefers
  `actor_name` when present, else the role label. Shows on the owner car-detail
  page and the staff review drawer (both already use this component).

## Testing

- Editing a listing field writes an edit row with the right `changed_fields`
  (old → new); editing nothing writes no row.
- A team member's edit records their name; the owner history exposes `actor_name`
  for it but not for staff status rows.
- Frontend renders an edit entry with the old → new values.
