# Quick-wins bundle — Design

Three small, independent features shipped together.

## QW1 — Non-negotiable buy = fixed price (no offer)

A non-negotiable buy listing must be purchased at the **set sale price** — no
price offer. (The `Offer` flow is already blocked server-side for
non-negotiable; this is the Request-to-Buy path.)

- **Frontend** (`car-detail-page.tsx`): for a non-negotiable buy, the purchase
  form shows the **sale price read-only** (no editable price field) and submits
  `price_offered = car.sale_price`. Heading "Purchase Request". Negotiable buy
  (Make an Offer) and rent (per-day) unchanged.
- **Backend** (`RequestCreateSerializer.validate`): for a buy request on a
  non-negotiable car, **force `price_offered = car.sale_price`**, ignoring any
  submitted value.

## QW2 — Company name in transaction details

- **Backend** (`TransactionDetailSerializer` + `TransactionListSerializer`): add
  `company_name` = the fleet business behind the transaction's car
  (`car.owner.owner_profile.fleet_name` when the owner is a fleet; `null` for
  individual owners). Car resolved via `request.car` or `inspection_booking.car`.
- **Frontend**: show "Company" in the transaction detail view when present.

## QW3 — Delete a team member (full account delete)

- **Model change**: `RequestStatusEvent.actor` → `null=True, on_delete=SET_NULL`
  (+ migration). A team member can be the actor on request status events;
  deleting them must **anonymize** those rows ("System"), not cascade-delete the
  request's history. `CarStatusHistory.actor` is already `SET_NULL`.
  `RequestStatusEventSerializer` handles a null actor.
- **Backend**: new `DELETE /owner/team/{id}/` (`TeamDeleteView`, owner +
  verified-fleet scoped) that deletes the membership's **User** (which cascades
  the `TeamMembership`, tokens, notifications). History actor references become
  null. Returns 204.
- **Frontend** (team page ⋯ menu): destructive **Delete** item + confirm dialog
  ("Remove {name} from your team? This permanently deletes their account and
  can't be undone."), separate from Deactivate. On success → toast + refresh.

## Testing

- QW1: backend forces sale_price for a non-negotiable buy request even if a lower
  value is submitted; negotiable/rent unchanged. Frontend renders read-only price.
- QW2: transaction detail exposes `company_name` for a fleet-owned car, `null`
  for an individual owner.
- QW3: deleting a member removes the membership + user; a request status event
  they authored survives with a null actor; the member can no longer sign in;
  non-owner can't delete; cross-business delete is 404.
