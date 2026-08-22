# Tracking-ID redesign + transaction linking — Design (PR 1)

## Tracking-ID format

`generate_tracking_id(center)` now returns `{country_code}-XXXXXX`:
- `XXXXXX` = 6 chars from an **unambiguous** alphabet: `A–Z` + `2–9` minus
  `I O L 0 1` → `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (31 chars). e.g. `NG-A7K3P9`.
- Uniqueness-checked in the existing retry loop (`MAX_TRACKING_ATTEMPTS`).
- City code dropped; `center.country_code` stays the prefix.
- **Existing** tracking IDs are immutable — no backfill; only new inspections
  mint the new format.

## Transactions carry the car + tracking ID

- `TransactionListSerializer` + `TransactionDetailSerializer` gain `car_id` and
  `tracking_id` (from the transaction's car via the existing `_transaction_car`
  helper).
- `TransactionListView` gains a `car` filter: `?car=<car_id>` →
  `Q(request__car_id=car_id) | Q(inspection_booking__car_id=car_id)`.

## Frontend

- Transaction list type gains `car_id` + `tracking_id`; each row shows its
  tracking ID (car title already shown).
- `useTransactions` accepts a `car` param; the owner transactions page reads
  `?car=<id>` and filters, with a header (e.g. "Transactions for NG-A7K3P9") and
  a clear-filter affordance.
- The tracking ID on the owner car-detail page links to
  `/owner/transactions?car=<carId>`.

## Testing

- New tracking IDs match `^[A-Z]{2}-[A-Z2-9]{6}$` (no I/O/L/0/1) and are unique.
- Transaction list/detail expose `tracking_id`; the `car` filter returns only
  that car's transactions.
- Frontend: row renders the tracking ID; the page filters on `?car=`.
