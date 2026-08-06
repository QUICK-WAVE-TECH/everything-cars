# Spec B — Team Members & Branch-Scoped RBAC (Design)

**Status:** approved, ready for implementation plan
**Date:** 2026-08-06
**Sub-project of:** Multi-Branch dealer platform (A–D). Depends on **Spec A** (branches, shipped).

## Scope (reshaped)

Spec B's branch-scoped inventory/offers require cars to be *tagged with a branch* — which originally lived in Spec C. Decision: **fold the `Car → Branch` attribution into Spec B** so it's self-contained. The two-stage inspect→publish pipeline + Inspector/Publisher internal-staff roles become a separate later spec.

**In scope:** `team_member` role + `TeamMembership` model + `Car → Branch` FK ("pick a branch when listing") + branch-scoped inventory/offers/deals via a scope resolver + team-management CRUD + team page and branch picker on the frontend.

**Out of scope:** inspect→publish pipeline, Inspector/Publisher sub-roles (later spec); Spec D offer fallback.

## Data model

**`User.Role`** gains a third value:
```python
CUSTOMER = "customer", "Customer"
OWNER = "owner", "Owner"
TEAM_MEMBER = "team_member", "Team Member"
```
Widen `role` to `max_length=20`.

**`TeamMembership`** (new, `apps/users/models.py`):
```
user       OneToOneField → User (related_name="team_membership", on_delete=CASCADE)
business   ForeignKey → OwnerProfile (related_name="team", on_delete=CASCADE)   # ONE business (FK, not M2M)
branches   ManyToManyField → Branch (related_name="team_memberships")            # M2M takes NO on_delete
title      CharField(max_length=200, blank=True, default="")
is_active  BooleanField(default=True)
created_at / updated_at
db_table = "team_memberships"
__str__  → f"{user.get_full_name()} @ {business.fleet_name}"
```
Assigned `branches` must belong to `business` (validated in the serializer/service). A member belongs to exactly one business (OneToOne user; FK business).

**`Car.branch`** (new, `apps/listings/models.py`):
```python
branch = models.ForeignKey(Branch, null=True, blank=True, on_delete=models.PROTECT, related_name="cars")
```
- Nullable (individual owners have no branch). `PROTECT` — branches are soft-retired, never hard-deleted, so a car should never orphan its branch silently.
- **`Car.owner` stays the business's primary owner User.** A team member listing a car sets `owner` = business owner, `branch` = a chosen assigned branch.

**Scope resolver** `resolve_business_scope(user)` (new, e.g. `apps/users/services.py` or `common/`):
- primary **owner** → `(business_owner=user, branch_ids=None)`  # None = all branches
- active **team member** → `(business_owner=membership.business.user, branch_ids=<assigned active branch ids>)`
- inactive membership / no membership → raises / returns no-access sentinel

Owner-side querysets filter `owner=business_owner` and, when `branch_ids is not None`, `branch__in=branch_ids`.

## Permissions

| Capability | Primary Owner | Team Member | Customer |
|---|---|---|---|
| Manage branches | ✅ | ❌ 403 | — |
| Manage team members | ✅ | ❌ 403 | — |
| View/manage inventory | ✅ all | ✅ assigned branches | — |
| List a new car | ✅ any branch | ✅ must pick an assigned branch | — |
| View/respond/**accept** offers | ✅ all | ✅ assigned-branch cars | — |
| Complete/cancel deals | ✅ | ✅ assigned-branch cars | — |
| Transactions / fee settings | ✅ | ❌ 403 | — |

- Action-level owner-only endpoints → `403` for team members.
- Inventory/offer/deal access → **scoped queryset** (out-of-branch rows don't exist → `404` on direct access).
- New permission `IsOwnerOrTeamMember` for shared endpoints; `IsOwner` stays for owner-only ones.
- A disabled membership (`is_active=False`) → no access.

**Endpoints made branch-aware** (replace `filter(owner=request.user)` with the resolver):
`MyCarListCreateView` (GET+POST), `MyCarDetailView`, `MyCarStatusView`, `CarImageUploadView`, `MyCarHistoryView`, `OwnerOfferListView`, `OfferRespondView` (respond/accept), owner-side deal list/complete/cancel.

**Guardrails:**
- Retiring a branch unassigns it from memberships (a member left with zero active branches sees an empty dashboard, not an error).
- Listing gate generalizes: a team member with no assigned active branch can't list.

## API surface

**Team management (owner-only, verified fleet)** — `/api/v1/owner/team/`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/owner/team/` | List members. |
| POST | `/owner/team/` | Add: `email`, `first_name`, `last_name`, `title?`, `branch_ids[]`. Creates `User(role=team_member, is_active=True)` + `TeamMembership`, emails a heads-up. |
| GET | `/owner/team/{id}/` | Detail. |
| PATCH | `/owner/team/{id}/` | Update `title` / reassign `branch_ids`. |
| POST | `/owner/team/{id}/deactivate/` · `/reactivate/` | Toggle `is_active`. |

Validation: non-verified-fleet owner → 403; duplicate email → 400; `branch_ids` must belong to the business → 400; ≥1 branch required → 400; team member on `/owner/team/…` → 403.

**Car endpoints gain `branch`:** `CarCreateSerializer` accepts `branch` (id) — required for fleet listers; for a team member must be an assigned branch; `owner` resolved to the business owner; individual owners omit it. Read serializers expose branch (id, name, city, state, phone, email) so the **public listing shows the branch's location & contact**.

**`GET /api/v1/owner/me/scope`** → `{ is_team_member, business_name, branches: [{id,name}], can_manage_team }` for the frontend.

## Frontend

- **`/owner/team`** (owner-only, fleet; new dashboard tile): member list (name, email, title, assigned-branch chips, active), add/edit dialog (email create-only, name, title, **branch multi-select**), deactivate/reactivate, toasts. shadcn + `--brc-*`; design imported from Claude Design.
- **Branch picker on `/owner/my-cars/new`**: required "Branch" select for fleet listers from `/owner/me/scope` (owner → all active; team member → assigned only). Individual owners never see it. Spec A redirect-gate stays.
- **Team-member experience — reuse the scoped `/owner` pages** (no parallel `/team` area): allow `team_member` on `/owner/dashboard`, `/owner/my-cars`, `/owner/offers`, `/owner/deals`; keep `/owner/branches`, `/owner/team`, `/owner/transactions` owner-only. Dashboard hides owner-only tiles for team members and shows a "Viewing: {branch chips}" scope indicator.
- **Branch on listings:** car cards/detail show the branch; public car detail surfaces the branch's city/state + contact.

## Testing

**Backend (pytest, TDD — Namy writes, Claude guides):**
- Models: `TeamMembership` (branches must belong to business); `Car.branch`.
- Scope resolver: owner → all; team member → assigned; inactive membership → no access.
- Team CRUD: create (dup email 400, cross-business branch 400, no-branch 400), list, patch (reassign), deactivate/reactivate, team-member 403.
- Branch-scoped inventory/offers/deals: team member sees only assigned-branch cars/offers; out-of-branch detail → 404; accept offer on assigned-branch car works, on other branch 404.
- Listing: team member must pick an assigned branch (400 otherwise); `owner` resolves to business owner; car gets the branch.
- Branch retire unassigns from memberships.

**Frontend:** `tsc` + ESLint + `next build` clean; manual checklist added to `MANUAL_TESTING.md`.

## Workflow

Backend written by Namy with Claude guiding step-by-step TDD (failing test first, reference, why). Frontend by Claude (Claude Design import blended). CI runs `ruff check` + `pytest --nomigrations`; top-level imports (no E402), no unused imports (F401); `select_related`/`prefetch_related`.
