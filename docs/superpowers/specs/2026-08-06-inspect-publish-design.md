# Spec C — Two-Stage Inspect→Publish + Staff Sub-Roles (Design)

**Status:** approved, ready for implementation plan
**Date:** 2026-08-06
**Sub-project of:** Multi-Branch dealer platform (A–D). A + B shipped. Independent of D.

## Scope

Insert a **"Pending Publishing"** review stage between a passed physical inspection and a car going live, and split staff `is_staff` into **Inspector** (stage 1) vs **Publisher** (stage 2). Role management is lightweight (assigned in Django admin) — the spec's "detailed role permissions" are a future release.

**In scope:** `User.staff_role` (inspector/publisher/admin) + backfill; `CarStatus.PENDING_PUBLISHING`; repoint a PASSED inspection result to `PENDING_PUBLISHING`; publisher queue API (paginated, FIFO) with publish + send-back; permission gating (inspect → inspector/admin, publish → publisher/admin); `/admin/publishing` frontend page + role-aware nav.

**Out of scope:** self-serve staff-role management UI; changing payments/disputes/approval/requests permissions (stay any-`is_staff`); Spec D.

## Current flow (what changes)

Today (`apps/inspections/views.py`, `StaffInspectionSubmitView`), `RESULT_TO_STATUS` maps a **PASSED** result **straight to `PUBLISHED`**. `is_staff` is one undifferentiated flag — every staff member can do every `/admin/*` action.

Spec C forks the "passed" branch into a review queue and differentiates inspect vs publish. `NEEDS_CLEARANCE` and `FAILED` results are unchanged.

## Data model

**`User.StaffRole`** (new) + field on `User`:
```python
class StaffRole(models.TextChoices):
    INSPECTOR = "inspector", "Inspector"
    PUBLISHER = "publisher", "Publisher"
    ADMIN = "admin", "Admin"     # both stages + everything else

staff_role = models.CharField(max_length=20, choices=StaffRole.choices, blank=True, default="")
```
- Only meaningful when `is_staff=True`.
- **Data migration:** every existing `is_staff=True` user → `staff_role="admin"` (current staff keep full access).

**`CarStatus.PENDING_PUBLISHING`** (new): `"pending_publishing", "Pending Publishing"` — passed inspection, awaiting a publisher. **Not public** (only `PUBLISHED` is live).

No `PhysicalInspection` change — the publisher reads the existing inspection record + inspector notes.

## Permissions

Two DRF permissions (`common/permissions.py`):
```
IsInspector  → is_staff AND staff_role in ("inspector", "admin")
IsPublisher  → is_staff AND staff_role in ("publisher", "admin")
```

| Action | Today | Spec C |
|---|---|---|
| Start inspection / submit result | any `is_staff` | **Inspector or Admin** |
| PASSED result → status | → `PUBLISHED` | → **`PENDING_PUBLISHING`** |
| Publish (queue → live) | — | **Publisher or Admin** |
| Send back (queue → NEEDS_CHANGES) | — | **Publisher or Admin** |
| `AdminCarStatusView` "→ published" transition | any `is_staff` | **Publisher or Admin** |
| Payments, disputes, listing approval, requests | any `is_staff` | **unchanged (any `is_staff`)** |

## Transitions

- `INSPECTION_IN_PROGRESS` → (PASSED, Inspector) → **`PENDING_PUBLISHING`** — owner notified "inspection passed, publishing soon."
- `PENDING_PUBLISHING` → (Publish, Publisher) → **`PUBLISHED`** (set `published_at`; owner notified "live").
- `PENDING_PUBLISHING` → (Send back + note ≥15, Publisher) → **`NEEDS_CHANGES`** (reuses the existing changes-requested email/flow).

**Guardrails:**
- `PENDING_PUBLISHING` excluded from all public/browse querysets; treated like other pre-publish states for owner edit/delete rules and (Spec B) branch scoping.
- Publishing a car **not** in `PENDING_PUBLISHING` → 404/409.
- Inspector on a publish endpoint → 403; Publisher on inspection start/submit → 403.

## API surface

Under `/api/v1/inspections/staff/pending-publishing/`, **Publisher-or-Admin** only:

| Method | Path | Purpose |
|---|---|---|
| GET | `/staff/pending-publishing/` | **Paginated** queue (`StandardPagination`; `count`/`next`/`previous`/`results`). |
| GET | `/staff/pending-publishing/{car_id}/` | Review detail: car + inspection report + inspector notes/name/date. |
| POST | `/staff/pending-publishing/{car_id}/publish/` | → `PUBLISHED`. |
| POST | `/staff/pending-publishing/{car_id}/send-back/` | `{ note }` (min 15) → `NEEDS_CHANGES`. |

**Pagination & ordering:** `StandardPagination`; **ordered oldest-first** (by the `PENDING_PUBLISHING` status-change time / `updated_at`) — FIFO. `?search=` filters car title / business / branch; bad page or empty search → clean empty page. `select_related` owner/brand/branch/inspection + `prefetch` images (fixed query count per page). The nav "N waiting" pill reads `count`.

**List row payload:** `{ car_id, title, brand, model, year, thumbnail, business_name, branch_name, inspector_name, inspected_at }`. The heavy report loads only on detail.

**Also:** expose `staff_role` on `GET /users/me` for nav + page gating.

## Frontend

- **`/admin/publishing`** (imported Claude Design) inside `AdminLayout`: paginated queue rows (thumbnail, title, business + branch, inspector + date, "Inspection passed" badge), search, skeletons, "All caught up" empty state. Row → **review drawer** (Sheet) with car details + inspection report + inspector notes + **Publish live** / **Send back** (note ≥15) actions; toasts + React Query invalidation.
- **Role-aware admin nav:** a **"Publishing"** link shown to publisher/admin only (from `me.staff_role`); the page guards against non-publishers.
- **`staff_role`** added to the frontend `UserProfile` type + a small helper for nav/page gating.
- React Query: `usePendingPublishing()` (paginated + search), `usePublishingDetail(carId)`, `usePublishCar()`, `useSendBackCar()`.

## Testing

**Backend (pytest, TDD — Namy writes, Claude guides):**
- Model + migration: `staff_role` choices; backfill sets existing `is_staff` → `admin`.
- Permissions: `IsInspector`/`IsPublisher` allow the right roles + admin, 403 others.
- Transition: PASSED result now → `PENDING_PUBLISHING` (not `PUBLISHED`); inspector-gated.
- Queue: paginated + FIFO ordering + search; publisher-gated (inspector → 403).
- Publish: `PENDING_PUBLISHING` → `PUBLISHED` (+ `published_at`, notification); not-in-queue → 404/409.
- Send back: note ≥15 → `NEEDS_CHANGES` (+ notification); short note → 400.
- Public/browse excludes `PENDING_PUBLISHING`.
- `me` exposes `staff_role`.

**Frontend:** `tsc` + ESLint + `next build` clean; manual checklist added to `MANUAL_TESTING.md` + `TESTING_GUIDE.md`.

## Workflow

Backend written by Namy with Claude guiding step-by-step TDD. Frontend by Claude (Claude Design import blended). CI: `ruff check` + `pytest --nomigrations`; top-level imports (no E402), no unused imports (F401); `select_related`/`prefetch_related`.
