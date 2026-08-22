# Car-deletion feedback form — Design

On deleting (archiving) a listing, ask an **optional** "was this sold?" survey and
record the answer. Deletion still works if skipped.

## Flow

Dialog "Delete this listing?" → radio **"Was this vehicle sold?"** (none selected
by default):
- **On EverythingCars** → sale amount (₦) input + **"Prefer not to say"** checkbox
  (hides/clears the amount).
- **Somewhere else** → inline apology: *"Sorry to see it go — we'll take this on
  board and work on helping you market your cars better next time."*
- **Not sold / another reason** → nothing extra.

Confirm archives the car (unchanged soft-archive) and, **if an outcome was
picked**, records it. Skipping (no selection) still deletes.

## Backend

- New model **`CarDeletionFeedback`**: `car` FK (CASCADE, related_name
  `deletion_feedback`), `deleted_by` → User `SET_NULL` + `deleted_by_name`
  snapshot, `outcome` = `sold_platform | sold_elsewhere | not_sold`, `sale_amount`
  nullable Decimal, `amount_hidden` bool, `created_at`. Migration.
- `MyCarDetailView.delete` reads an **optional** JSON body
  `{ outcome, sale_amount, amount_hidden }`:
  - No/blank `outcome` → archive only (skip).
  - Valid `outcome` → create `CarDeletionFeedback`. `sale_amount` kept only when
    `outcome == sold_platform` and not `amount_hidden`, and it must be a positive
    number if present. Then archive.
  - Invalid `outcome` / bad amount → 400 (car not archived).

## Frontend

- `apiClient.delete` gains an optional `body` param (backward-compatible).
- `useDeleteCar` sends `{ carId, feedback? }`.
- New `DeleteListingDialog` replaces the archive `ConfirmDialog`: the outcome
  radios, conditional amount + prefer-not-to-say, and the apology text for
  "elsewhere". Confirm always deletes (with or without a selection).

## Testing

- Deleting with `outcome=sold_platform` + amount records the amount; with
  `amount_hidden` records `sale_amount=null`; `sold_elsewhere`/`not_sold` record
  no amount; no body still archives with no feedback row; invalid outcome → 400.
- Frontend: choosing "elsewhere" shows the apology; "on platform" shows the
  amount + prefer-not-to-say; delete works when skipped.
