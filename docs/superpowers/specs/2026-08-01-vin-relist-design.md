# Spec 5 — VIN Transfer & Relist a Sold VIN (Design)

**Date:** 2026-08-01
**Status:** Approved — ready for implementation plan

## Goal

Let the buyer of a peer-to-peer sale (a completed `Deal`, Spec 2) relist the same
physical vehicle later. Today `complete_deal` only flips the car to `ARCHIVED`
(still owned by the original seller) and `Car.vin` is globally unique, so the
buyer can neither re-register that VIN ("already registered") nor take ownership.

## Core idea

Ownership is **not** tracked by a new table. A **completed `Deal` is the proof of
ownership**: whoever is the buyer of the *latest* completed deal for a VIN is its
current owner. A sold car stays archived (records intact); the proven buyer
registers the same VIN as a **fresh listing**. No row transfer, no new model.

## Decisions (locked)

| Question | Decision |
|---|---|
| Core mechanism | **Release the VIN** — sold car archived (kept for records); the proven buyer lists fresh. Not a row-transfer, not a VIN registry. |
| VIN uniqueness | **At most one non-archived listing per VIN** (partial unique). Archived cars may share a VIN across resales. |
| Relist authorization | The registrant must be the **buyer of the latest completed Deal** for that VIN. |
| Identity | Relisting uses the existing gate — `role == "owner"` + verified `OwnerProfile`. Reuse existing onboarding; Spec 5 builds no upgrade UI. |
| Entry point | Normal Add-car flow + a **"Relist this vehicle"** link on the buyer's completed deal (VIN prefilled). |

## Data model (`apps/listings/models.py`)

- `Car.vin`: drop the inline `unique=True`. Add a **partial `UniqueConstraint`**:
  `fields=["vin"]`, `condition=Q(vin__isnull=False) & ~Q(status=CarStatus.ARCHIVED)`,
  name `one_active_listing_per_vin`. VIN stays `blank=True, null=True`.
- `Car.plate_number`: same treatment — a partial `UniqueConstraint` on
  `plate_number` among non-archived cars (name `one_active_listing_per_plate`),
  so a relist doesn't trip the plate check. (`plate_number` has no DB `unique`
  today — uniqueness is enforced only in the serializer — so this *adds* a
  partial DB constraint consistent with the new VIN rule.)
- **No data migration risk:** existing VINs/plates are globally unique today, which
  trivially satisfies the looser partial constraints.

## Backend — relist authorization

### Ownership-proof helper (`apps/listings` or `apps/sales`)
```
def latest_completed_deal_for_vin(vin) -> Deal | None:
    return (Deal.objects
            .filter(car__vin=vin, status=DealStatus.COMPLETED)
            .select_related("buyer")
            .order_by("-completed_at")
            .first())
```
`status=COMPLETED` automatically excludes reversed disputes (they become
`CANCELLED`); a dismissed dispute stays `COMPLETED`, so the buyer keeps the right.

### `CarCreateSerializer.validate_vin` (and `validate_plate_number`)
Rewrite the duplicate check so it distinguishes "live" from "relist":
1. Find existing cars with this VIN (excluding `self.instance` on edit).
2. **None** → brand-new VIN, allow.
3. **Any non-archived** exists → reject `"This vehicle is already registered on the platform."` (a live listing holds it).
4. **All archived** → look up `latest_completed_deal_for_vin`. If its `buyer_id ==`
   the requesting user → **allow** (a relist of a vehicle they bought). Else reject
   with `"You can only relist a vehicle you bought through the platform."`.

The serializer needs the request user — read it from `self.context["request"].user`.

`validate_plate_number` uses a **simpler** rule: reject only if a **non-archived**
car already has the plate; allow it if every match is archived. Authorization for a
relist is fully carried by `validate_vin` (the buyer-proof check above) — the plate
belongs to the same physical car, so it doesn't need its own ownership proof, just
the "no live duplicate" guard.

### `complete_deal` — unchanged
The car still goes `ARCHIVED`, recorded under the seller. No row transfer, no
automatic relist. The completed `Deal` is the durable proof.

## Identity gate

Relisting reuses the existing listing rules unchanged: `IsOwner` (`role == "owner"`)
+ a **verified `OwnerProfile`** (the create view already enforces
`owner_profile.is_verified`). A buyer who is still a `customer` goes through the
existing owner sign-up + verification first. No new upgrade flow in Spec 5.

## Frontend (`frontend/src`)

- **Deal page** (`/deals/[id]`, buyer view of a **completed** deal): add a
  **"Relist this vehicle"** link → `/owner/my-cars/new?vin=<vin>`. (The buyer's
  own VIN isn't otherwise exposed here; the deal already identifies the car, so the
  link carries the car's VIN.) If the user isn't a verified owner, the existing
  owner gate handles it.
- **Add-car form** (`/owner/my-cars/new`): read a `?vin=` query param and prefill
  the VIN field.
- **VIN error copy:** when the create call returns the relist-specific rejection,
  surface the helpful message (already provided by the serializer) rather than a
  bare "already registered."

## Edge cases (handled)

- **Resale chain** (A → Bob → Carol): only the latest completed-deal buyer can
  relist; earlier owners and the original seller are blocked (latest-deal check).
- **A live listing already exists** for the VIN → blocked (partial unique +
  validation step 3).
- **Disputed & reversed** sale → deal is `CANCELLED`, so no relist right (correct —
  ownership was undone). **Dismissed** dispute → deal stays `COMPLETED`, buyer keeps
  the right.
- **Brand-new VIN** (no deal) → normal first registration, unaffected.
- **Edit of an existing car** (`self.instance` set) → excluded from the duplicate
  scan, so editing your own live listing never trips the relist logic.

## Testing

- Partial unique: an archived car's VIN can be reused by a new listing; a second
  **non-archived** car with the same VIN is rejected at the DB/serializer.
- Relist: the buyer of a completed deal can register the sold VIN; a non-buyer and
  the original seller cannot.
- Resale chain: after Bob resells to Carol, only Carol can relist; Bob is blocked.
- Reversed-deal buyer loses the right; dismissed-dispute buyer keeps it.
- `complete_deal` still archives and leaves the sold car's relations intact.
- Frontend: Add-car prefills from `?vin=`; the completed-deal buyer sees "Relist
  this vehicle"; the relist error copy renders.

## Out of scope

- Customer → owner upgrade UI (reuse existing onboarding).
- A `Vehicle`/VIN registry entity or ownership-history table (deferred; the
  completed-Deal chain is sufficient).
- Transferring the sold car's photos/inspection/history to the buyer (the relist is
  a fresh listing by design).
