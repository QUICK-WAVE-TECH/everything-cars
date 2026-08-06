# Spec A — Dealer Organization & Branches (Design)

**Status:** approved, ready for implementation plan
**Date:** 2026-08-05
**Sub-project of:** "Multi-Branch Operations, Vehicle Lifecycle & Offer Management" (decomposed into A–D)

## Context & scope

The larger feature request decomposes into four independently-shippable sub-projects:

- **A — Dealer org & branches** (this spec): stand up a `Branch` model, fleet-gated CRUD, and a forced onboarding flow. Foundation everything else scopes against.
- **B — Team members & branch-scoped RBAC** (depends on A).
- **C — Branch attribution on listings + two-stage inspect→publish pipeline** (depends on A; adds `Car → Branch` FK and internal staff sub-roles).
- **D — Offer negotiation fallback** (mostly independent).

This spec covers **A only**. The `Car → Branch` attachment, team members, and staff sub-roles are explicitly **out of scope** here.

### Role mapping (why A needs no new top-level user role)

| Spec role | Today | This spec |
|---|---|---|
| Verified Owner (business owner) | `Role.OWNER` + `OwnerProfile(owner_type=fleet, is_verified=True)` | Already exists — the business/org. Owns branches. |
| Buyer / Bidder | `Role.CUSTOMER` | Unchanged. |
| Team Member | — | **Deferred to Spec B** (modeled as a membership, not a new `User.Role`). |
| Inspector / Publisher staff | `is_staff` | **Deferred to Spec C** (staff sub-roles). |

A fleet `OwnerProfile` **is** the business: it already holds `fleet_name` (the business name) and `is_verified` (the listing gate at `apps/listings/views.py`). Branches hang off it — no separate `Organization` table.

## Data model

New model `Branch` in `apps/listings/models.py` (or a dedicated `apps/branches` — see plan; recommendation: keep in `listings` since it's listing-adjacent and Spec C attaches cars to it).

```
Branch
  id             UUID pk
  business       FK → OwnerProfile (related_name="branches", on_delete=CASCADE)
  name           CharField(max_length=200)        # "Lagos — Amuwo Odofin Branch"  (required)
  state          CharField(max_length=100)        # required
  city           CharField(max_length=100)        # required
  street_address CharField(max_length=300)        # required
  phone          CharField(max_length=20)         # required (branch-dedicated)
  email          EmailField()                     # required (branch-dedicated)
  is_active      BooleanField(default=True)        # soft-retire; no hard delete
  created_at     DateTimeField(auto_now_add=True)
  updated_at     DateTimeField(auto_now=True)

  Meta:
    db_table = "branches"
    constraints = [UniqueConstraint(fields=["business", "name"], name="unique_branch_name_per_business")]
    ordering = ["-is_active", "name"]
```

**Invariants:**
- `business_name` is **never stored on Branch** — always read through `business.fleet_name`. Immutable at branch level.
- Only a **verified fleet** `OwnerProfile` may own branches (enforced in the API layer, not the model).
- Retire = `is_active=False`. Reactivate = `is_active=True`. No destructive delete.

**Migration:** create the table only. No data backfill / auto-seeding (per decision: zero-to-onboarding — verified fleet owners start with no branches and are forced through onboarding). Existing listings are not touched (they gain a branch in Spec C).

## API surface

All under the authenticated owner namespace. Base path suggestion: `/api/v1/owner/branches/`.

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET` | `/owner/branches/` | verified fleet owner | List my branches (active first, then by name). |
| `POST` | `/owner/branches/` | verified fleet owner | Create a branch. |
| `GET` | `/owner/branches/{id}/` | owner of that branch | Branch detail. |
| `PATCH` | `/owner/branches/{id}/` | owner of that branch | Edit fields; `business_name` read-only. |
| `POST` | `/owner/branches/{id}/deactivate/` | owner of that branch | Soft-retire (`is_active=False`). |
| `POST` | `/owner/branches/{id}/reactivate/` | owner of that branch | Set `is_active=True`. |

**Response shape:**
```json
{
  "id": "…",
  "name": "Lagos — Amuwo Odofin Branch",
  "business_name": "AutoKings Motors",
  "state": "Lagos", "city": "Amuwo Odofin", "street_address": "12 Trade Fair Rd",
  "phone": "+234…", "email": "lagos@autokings.ng",
  "is_active": true,
  "created_at": "…"
}
```

**Permission & validation rules (pinned by tests):**
- Unauthenticated → `401`.
- Customer or non-owner → `403`.
- Owner whose profile is `individual` **or** `is_verified=False` → `403` on create ("Branch management is for verified business accounts").
- A branch belonging to another business is invisible: `GET`/`PATCH`/actions on it → `404` (scoped queryset).
- Missing any required field → `400` with field errors.
- Invalid `email` format → `400`.
- Duplicate `name` within the same business → `400` (unique constraint surfaced as a validation error).
- `business_name` in a write payload is ignored (read-only).
- Deactivate / reactivate are idempotent.

## Listing gate (soft, this spec)

A verified **fleet** owner with **zero active branches** cannot list a car:
- **Frontend:** the "List a car" entry point checks branch count; a fleet owner with no active branch is redirected to `/owner/branches` with an inline notice instead of the list-car form.
- **Backend:** the car-create endpoint rejects a verified fleet owner who has no active branch with a `400` ("Create a branch before listing a vehicle.").
- **Individual owners are unaffected** — they never see branches and list as before.

The hard `Car → Branch` FK + "pick a branch when listing" lands in **Spec C**; this spec only enforces existence of ≥1 branch.

## Frontend

Owner-dashboard area, fleet owners only. shadcn + `--brc-*` tokens, lucide icons, React Query.

- **`/owner/branches` — management page:** page header (title, subtitle, "Add branch" primary button), an inherited **business-name** identity strip with a "Verified business" badge, and a responsive grid of **branch cards** (name, business-name badge, address with `MapPin`, phone/`Phone` + email/`Mail`, active/retired status, overflow menu → Edit / Retire, or Reactivate for retired). Retired cards render dimmed with a "Retired" badge, mixed into the grid.
- **Onboarding empty state (forced):** welcoming hero (Store/Building2 icon in an accent circle), "Set up your first branch" + "Add your first branch" primary button. Shown when the loaded list has zero branches.
- **Add / Edit dialog:** shadcn Dialog; fields — **Business name (read-only/disabled, inherited)**, Branch name, State (searchable select, 36 states + FCT), City, Street address, Phone, Email. Real inline validation. Footer Cancel / Save. Toasts on success.
- **Retire confirm:** ConfirmDialog — "Retire this branch?" / "It'll be hidden from active use. You can reactivate it later." / destructive "Retire branch".
- **Loading:** skeleton branch cards (not a spinner); empty state only after load resolves to zero.
- **Visibility:** individual owners and customers never see the Branches nav item or page.

React Query hooks: `useBranches`, `useCreateBranch`, `useUpdateBranch`, `useDeactivateBranch`, `useReactivateBranch`.

## Testing

**Backend (pytest, TDD — written by Namy, guided by Claude):**
- Model: create a branch; `business_name` reads from `fleet_name`; unique name-per-business constraint; retire/reactivate toggles `is_active`.
- Permissions: customer `403`; individual owner `403`; unverified fleet owner `403`; cross-business access `404`.
- Validation: missing required fields `400`; bad email `400`; duplicate name `400`; write to `business_name` ignored.
- Listing gate: verified fleet owner with zero active branches → car-create `400`; with ≥1 active branch → passes; individual owner unaffected.

**Frontend:** `tsc` + ESLint + `next build` clean; manual smoke via `MANUAL_TESTING.md` checklist (added on completion).

## Out of scope (explicit)

- `Car → Branch` attachment and "pick a branch when listing" (Spec C).
- Team members / branch-scoped RBAC (Spec B).
- Internal staff sub-roles, inspect→publish pipeline (Spec C).
- Offer negotiation fallback (Spec D).
- Any "primary branch" concept or per-branch vehicle counts.

## Workflow

Backend written by Namy with Claude guiding step-by-step TDD (failing test first, reference code, why). Frontend implemented directly by Claude (blending the Claude Design import). CI runs `ruff check` + `pytest --nomigrations`; keep imports top-level (no E402), no unused imports (F401); use `select_related`/`prefetch_related`.
