# Two-Stage Inspect→Publish + Staff Sub-Roles (Spec C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insert a Publisher-reviewed "Pending Publishing" stage between a passed inspection and going live, and split `is_staff` into Inspector vs Publisher (Admin = both).

**Architecture:** Add `User.staff_role` (existing staff → `admin` via migration) and `CarStatus.PENDING_PUBLISHING`. A PASSED inspection result now lands the car in `PENDING_PUBLISHING` (was `PUBLISHED`); a paginated, FIFO publisher queue exposes publish + send-back. `IsInspector`/`IsPublisher` gate the two stages.

**Tech Stack:** Django 5.2 + DRF, pytest-django (`--nomigrations`), Next.js 16 + React Query, shadcn + Tailwind v4 (`--brc-*`), lucide.

**Workflow split:** Backend (Tasks 1–9) written by **Namy** with Claude guiding TDD. Frontend (Tasks 10–14) by **Claude** (design import ready).

---

## File Structure

**Backend:**
- `apps/users/models.py` — `User.StaffRole` + `staff_role` (MODIFY) + data migration.
- `apps/users/serializers.py` — `MeSerializer` add `staff_role` (MODIFY).
- `apps/listings/models.py` — `CarStatus.PENDING_PUBLISHING` (MODIFY).
- `common/permissions.py` — `IsInspector`, `IsPublisher` (MODIFY).
- `apps/inspections/views.py` — repoint PASSED result + gate start/submit to `IsInspector` (MODIFY).
- `apps/inspections/publishing_views.py` — queue list/detail/publish/send-back (CREATE).
- `apps/inspections/publishing_serializers.py` — queue row + review serializers (CREATE).
- `apps/inspections/urls.py` — publishing routes (MODIFY).
- `apps/listings/views.py` — gate `AdminCarStatusView` "→ published" to `IsPublisher`/admin (MODIFY).
- `apps/inspections/tests.py`, `apps/users/tests.py`, `apps/listings/tests.py` — tests.

**Frontend:**
- `src/features/publishing/api/{types,publishing-api}.ts` (CREATE).
- `src/features/publishing/components/*` (CREATE, from design import).
- `src/app/admin/publishing/page.tsx` (CREATE); admin nav + `staff_role` on `UserProfile` (MODIFY).

---

## BACKEND (Tasks 1–9 — Namy writes, Claude guides)

### Task 1: `staff_role` on User + backfill migration

**Files:** `apps/users/models.py`, migration; Test: `apps/users/tests.py`.

- [ ] **Step 1: Failing test**

```python
class StaffRoleModelTest(TestCase):
    def test_staff_role_choices_and_default(self):
        from apps.users.models import User
        u = User.objects.create_user(email="sr@test.com", first_name="S", last_name="R",
            password="x", role="customer", is_staff=True)
        assert u.staff_role == ""                      # default blank
        u.staff_role = User.StaffRole.INSPECTOR
        u.save()
        u.refresh_from_db()
        assert u.staff_role == "inspector"
```

- [ ] **Step 2: Run** `cd backend && uv run pytest apps/users/tests.py::StaffRoleModelTest -v` → FAIL (`staff_role` absent).
- [ ] **Step 3: Implement** — in `apps/users/models.py`, add to `User`:

```python
    class StaffRole(models.TextChoices):
        INSPECTOR = "inspector", "Inspector"
        PUBLISHER = "publisher", "Publisher"
        ADMIN = "admin", "Admin"

    staff_role = models.CharField(
        max_length=20, choices=StaffRole.choices, blank=True, default=""
    )
```

- [ ] **Step 4: Generate the schema migration** `uv run python manage.py makemigrations users`.
- [ ] **Step 5: Add a data migration** backfilling existing staff. Create a second migration:

```python
from django.db import migrations


def backfill_admin(apps, schema_editor):
    User = apps.get_model("users", "User")
    User.objects.filter(is_staff=True).exclude(staff_role="admin").update(staff_role="admin")


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [("users", "<the schema migration from step 4>")]
    operations = [migrations.RunPython(backfill_admin, noop)]
```

- [ ] **Step 6: Run** → PASS. **Step 7: Commit** `feat(publish): User.staff_role + backfill existing staff to admin`.

---

### Task 2: `PENDING_PUBLISHING` status

**Files:** `apps/listings/models.py`, migration; Test: `apps/listings/tests.py`.

- [ ] **Step 1: Failing test**

```python
def test_pending_publishing_status_exists():
    from apps.listings.models import CarStatus
    assert CarStatus.PENDING_PUBLISHING == "pending_publishing"
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** — add to `CarStatus` (after `NEEDS_CHANGES`, before `PUBLISHED`):

```python
    PENDING_PUBLISHING = "pending_publishing", "Pending Publishing"
```

- [ ] **Step 4:** `uv run python manage.py makemigrations listings` (a `Car.status` choices alter). **Step 5: Run** → PASS. **Step 6: Commit** `feat(publish): add PENDING_PUBLISHING car status`.

---

### Task 3: `IsInspector` / `IsPublisher` permissions

**Files:** `common/permissions.py`; Test: `apps/users/tests.py`.

- [ ] **Step 1: Failing test**

```python
class InspectPublishPermsTest(TestCase):
    def _req(self, u):
        class R:
            user = u
        return R()

    def test_permissions(self):
        from common.permissions import IsInspector, IsPublisher
        from apps.users.models import User

        def staff(role):
            return User.objects.create_user(email=f"{role or 'x'}@t.com", first_name="A",
                last_name="B", password="x", role="customer", is_staff=True, staff_role=role)

        insp = staff("inspector"); pub = staff("publisher"); adm = staff("admin")
        none = staff("")
        customer = User.objects.create_user(email="c@t.com", first_name="C", last_name="D",
            password="x", role="customer")
        assert IsInspector().has_permission(self._req(insp), None) is True
        assert IsInspector().has_permission(self._req(adm), None) is True
        assert IsInspector().has_permission(self._req(pub), None) is False
        assert IsPublisher().has_permission(self._req(pub), None) is True
        assert IsPublisher().has_permission(self._req(adm), None) is True
        assert IsPublisher().has_permission(self._req(insp), None) is False
        assert IsInspector().has_permission(self._req(customer), None) is False
        assert IsPublisher().has_permission(self._req(none), None) is False
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** — append to `common/permissions.py`:

```python
class IsInspector(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(
            u and u.is_authenticated and u.is_staff and u.staff_role in ("inspector", "admin")
        )


class IsPublisher(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(
            u and u.is_authenticated and u.is_staff and u.staff_role in ("publisher", "admin")
        )
```

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat(publish): IsInspector / IsPublisher permissions`.

---

### Task 4: PASSED result → PENDING_PUBLISHING, gated to Inspector

**Files:** `apps/inspections/views.py`; Test: `apps/inspections/tests.py`.

- [ ] **Step 1: Failing test** — a PASSED inspection now lands the car in `PENDING_PUBLISHING` (not `PUBLISHED`); a **publisher** submitting an inspection → 403. (Mirror an existing green inspection-submit test for the setup — booking in PENDING, car in INSPECTION_IN_PROGRESS — and change the final assertion to `PENDING_PUBLISHING`; add a role assertion.)

- [ ] **Step 2: Run** → FAIL (car goes to PUBLISHED today).
- [ ] **Step 3: Implement**:
  - In `RESULT_TRANSITIONS`, change `InspectionResult.PASSED: (CarStatus.PUBLISHED, notify_inspection_passed)` → `(CarStatus.PENDING_PUBLISHING, notify_inspection_passed)`.
  - Change `StaffInspectionStartView` and `StaffInspectionSubmitView` `permission_classes = [IsStaff]` → `[IsInspector]` (import it).
  - (Wording) `notify_inspection_passed`'s template can stay — "inspection passed" is still true; the "you're live" mail is sent later on publish. Optionally tweak the copy to "passed — we're preparing it to go live."
- [ ] **Step 4: Run** → PASS + full inspections suite (`uv run pytest apps/inspections/tests.py -q`) to catch tests that asserted PUBLISHED. Update those to `PENDING_PUBLISHING`. **Step 5: Commit** `feat(publish): passed inspection routes to pending-publishing (inspector-gated)`.

---

### Task 5: Publisher queue — list + detail

**Files:** Create `apps/inspections/publishing_serializers.py`, `apps/inspections/publishing_views.py`; modify `apps/inspections/urls.py`; Test: `apps/inspections/tests.py`.

- [ ] **Step 1: Failing API test**

```python
class PendingPublishingListTest(APITestCase):
    def setUp(self):
        from apps.users.models import User
        from apps.listings.models import Car, CarStatus
        # reuse the inspections-app helpers for making a staff user + a car
        self.publisher = make_staff("pub@t.com", "publisher")
        self.inspector = make_staff("insp@t.com", "inspector")
        self.car = make_car_in_status(CarStatus.PENDING_PUBLISHING)  # owner/brand set

    def test_publisher_lists_pending(self):
        self.client.force_authenticate(self.publisher)
        r = self.client.get("/api/v1/inspections/staff/pending-publishing/")
        assert r.status_code == 200
        ids = [row["car_id"] for row in r.data["results"]]
        assert str(self.car.id) in ids

    def test_inspector_forbidden(self):
        self.client.force_authenticate(self.inspector)
        r = self.client.get("/api/v1/inspections/staff/pending-publishing/")
        assert r.status_code == 403

    def test_detail_returns_inspection_report(self):
        self.client.force_authenticate(self.publisher)
        r = self.client.get(f"/api/v1/inspections/staff/pending-publishing/{self.car.id}/")
        assert r.status_code == 200
        assert "inspection" in r.data  # report block present
```

> Add small helpers `make_staff(email, role)` and `make_car_in_status(status)` to the test module (or reuse existing inspection-test factories that already build a booking + PhysicalInspection).

- [ ] **Step 2: Run** → FAIL (routes missing).
- [ ] **Step 3: Serializers** — `apps/inspections/publishing_serializers.py`: a lean `PendingPublishingRowSerializer` (`car_id`, `title`, `brand`, `model`, `year`, `thumbnail`, `business_name`, `branch_name`, `inspector_name`, `inspected_at`) and a `PendingPublishingDetailSerializer` (car detail fields + an `inspection` block from the car's `PhysicalInspection` incl. inspector notes/name/date). Pull `business_name` from `car.owner.owner_profile.fleet_name`, `branch_name` from `car.branch.name`.
- [ ] **Step 4: Views** — `apps/inspections/publishing_views.py`:

```python
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPagination
from common.permissions import IsPublisher
from apps.listings.models import Car, CarStatus


def _queue_qs():
    return (
        Car.objects.filter(status=CarStatus.PENDING_PUBLISHING)
        .select_related("owner__owner_profile", "brand", "branch")
        .prefetch_related("images")
        .order_by("updated_at")  # FIFO — longest-waiting first
    )


class PendingPublishingListView(APIView):
    permission_classes = [IsAuthenticated, IsPublisher]

    def get(self, request):
        qs = _queue_qs()
        search = request.query_params.get("search")
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(owner__owner_profile__fleet_name__icontains=search)
                | Q(branch__name__icontains=search)
            )
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(
            PendingPublishingRowSerializer(page, many=True, context={"request": request}).data
        )


class PendingPublishingDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPublisher]

    def get(self, request, car_id):
        try:
            car = _queue_qs().get(id=car_id)
        except Car.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PendingPublishingDetailSerializer(car, context={"request": request}).data)
```

- [ ] **Step 5: URLs** — in `apps/inspections/urls.py`:

```python
path("staff/pending-publishing/", PendingPublishingListView.as_view(), name="pending-publishing"),
path("staff/pending-publishing/<uuid:car_id>/", PendingPublishingDetailView.as_view(), name="pending-publishing-detail"),
```

- [ ] **Step 6: Run** → PASS. **Step 7: Commit** `feat(publish): paginated FIFO pending-publishing queue + detail`.

---

### Task 6: Publish action

**Files:** `apps/inspections/publishing_views.py`, `apps/inspections/urls.py`; Test: `apps/inspections/tests.py`.

- [ ] **Step 1: Failing test** — publisher publishes a `PENDING_PUBLISHING` car → 200, car → `PUBLISHED` with `published_at`; publishing a car **not** in the queue → 404/409; inspector → 403.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** — append:

```python
from django.db import transaction
from django.utils import timezone
from apps.inspections.services import record_status_change
from apps.inspections.views import schedule_notification  # or import the notif helper
from apps.notifications.service import notify_listing_approved


class PublishCarView(APIView):
    permission_classes = [IsAuthenticated, IsPublisher]

    def post(self, request, car_id):
        with transaction.atomic():
            try:
                car = Car.objects.select_for_update().get(
                    id=car_id, status=CarStatus.PENDING_PUBLISHING
                )
            except Car.DoesNotExist:
                return Response(
                    {"detail": "This car isn't awaiting publishing."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            record_status_change(car, CarStatus.PUBLISHED, actor=request.user)
            car.published_at = timezone.now()
            car.save(update_fields=["status", "published_at"])
            transaction.on_commit(lambda: notify_listing_approved(car))
        return Response({"status": car.status})
```

> Confirm `record_status_change`'s signature when implementing (it may already save `status`); if so drop the redundant `save`. Match how `AdminCarStatusView` sets `published_at`.

- [ ] **Step 4: URL** `path("staff/pending-publishing/<uuid:car_id>/publish/", PublishCarView.as_view(), name="pending-publishing-publish")`.
- [ ] **Step 5: Run** → PASS. **Step 6: Commit** `feat(publish): publisher publish action → live`.

---

### Task 7: Send-back action

**Files:** `apps/inspections/publishing_views.py`, `apps/inspections/urls.py`; Test: `apps/inspections/tests.py`.

- [ ] **Step 1: Failing test** — publisher sends back with a note ≥15 → 200, car → `NEEDS_CHANGES`; note < 15 → 400; not-in-queue → 404.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**:

```python
from apps.notifications.service import notify_changes_requested

MIN_SENDBACK_NOTE = 15


class SendBackCarView(APIView):
    permission_classes = [IsAuthenticated, IsPublisher]

    def post(self, request, car_id):
        note = (request.data.get("note") or "").strip()
        if len(note) < MIN_SENDBACK_NOTE:
            return Response(
                {"note": [f"Add a note of at least {MIN_SENDBACK_NOTE} characters."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            try:
                car = Car.objects.select_for_update().get(
                    id=car_id, status=CarStatus.PENDING_PUBLISHING
                )
            except Car.DoesNotExist:
                return Response({"detail": "This car isn't awaiting publishing."},
                                status=status.HTTP_404_NOT_FOUND)
            car.admin_note = note
            record_status_change(car, CarStatus.NEEDS_CHANGES, actor=request.user, note=note)
            car.save(update_fields=["status", "admin_note"])
            transaction.on_commit(lambda: notify_changes_requested(car))
        return Response({"status": car.status})
```

> Match how `AdminCarStatusView` / the existing changes-requested path sets `admin_note` and calls `record_status_change` (arg names).

- [ ] **Step 4: URL** `path("staff/pending-publishing/<uuid:car_id>/send-back/", SendBackCarView.as_view(), name="pending-publishing-send-back")`.
- [ ] **Step 5: Run** → PASS. **Step 6: Commit** `feat(publish): publisher send-back → changes requested`.

---

### Task 8: Lock direct publish to Publisher + `staff_role` on `me` + public-exclusion test

**Files:** `apps/listings/views.py`, `apps/users/serializers.py`; Test: `apps/listings/tests.py`, `apps/users/tests.py`.

- [ ] **Step 1: Failing tests** —
  - `AdminCarStatusView` transition to `PUBLISHED` by a **non-publisher** staff (inspector) → 403; by publisher/admin → 200. (If `AdminCarStatusView` allows a `published` target, gate that specific transition.)
  - `GET /users/me` includes `staff_role`.
  - Public browse (`/api/v1/listings/cars`) excludes a `PENDING_PUBLISHING` car.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**:
  - `MeSerializer.Meta.fields` += `"staff_role"`.
  - In `AdminCarStatusView.post`, when `new_status == CarStatus.PUBLISHED`, require `request.user.staff_role in ("publisher", "admin")` else 403. (Leave other transitions as any-staff.)
  - Confirm the public list already filters `status=CarStatus.PUBLISHED` (it does) — the test just locks it so a future change can't leak `PENDING_PUBLISHING`.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat(publish): gate direct publish to publisher, expose staff_role, lock public exclusion`.

---

### Task 9: Full suite + lint

- [ ] **Step 1:** `cd backend && uv run pytest -q` → all green (update any older inspection tests that asserted `PUBLISHED` on pass).
- [ ] **Step 2:** `uv run ruff check .` → clean.
- [ ] **Step 3: Commit** any fixes `chore(publish): suite green + lint`.

---

## FRONTEND HANDOFF

**STOP.** Claude asks Namy for the imported Claude Design (the Publishing queue). Tasks 10–14 (Claude).

---

## FRONTEND (Tasks 10–14 — Claude)

### Task 10: `staff_role` plumbing
- [ ] Add `staff_role?: "inspector" | "publisher" | "admin" | ""` to the frontend `UserProfile` type (fed by `me`). A small helper `canPublish(user)` = `staff_role` in (`publisher`,`admin`). `tsc` clean. Commit.

### Task 11: publishing API layer
- [ ] `src/features/publishing/api/{types,publishing-api}.ts` — `PendingPublishingRow`, `PublishingDetail` types; hooks `usePendingPublishing(search?, page?)`, `usePublishingDetail(carId)`, `usePublishCar()`, `useSendBackCar()` (mirror `features/team/api`). Query key `["publishing"]`; invalidate on publish/send-back. Commit.

### Task 12: Publishing queue page (after design import)
- [ ] `/admin/publishing` inside `AdminLayout`: paginated queue rows (thumbnail, title, business + branch, inspector + date, "Inspection passed" badge), search, skeletons, "All caught up" empty state. Row → review **drawer** (Sheet) with car details + inspection report + inspector notes + **Publish live** / **Send back** (note ≥15) actions; toasts + invalidation. Blend the Claude Design import. `tsc`+lint. Commit.

### Task 13: Role-aware admin nav + page guard
- [ ] Add a **"Publishing"** admin-nav link shown to publisher/admin (`canPublish`). Guard `/admin/publishing` against non-publishers (notice/redirect). `tsc`+lint. Commit.

### Task 14: Verify + docs + PR
- [ ] `cd frontend && npx tsc --noEmit && npm run lint && npm run build` green; `cd backend && uv run pytest -q && uv run ruff check .` green.
- [ ] Add a **Spec C** section to `MANUAL_TESTING.md` and update `TESTING_GUIDE.md` (queue pagination/FIFO, publish, send-back, role gating, public-exclusion edge cases).
- [ ] Use superpowers:finishing-a-development-branch to open the PR.

---

## Self-review notes

- **Spec coverage:** staff_role + backfill (T1) · PENDING_PUBLISHING (T2) · permissions (T3) · passed→queue gated (T4) · queue list/detail paginated+FIFO (T5) · publish (T6) · send-back (T7) · direct-publish lock + me.staff_role + public exclusion (T8) · frontend page/nav/plumbing (T10–T13) · docs/PR (T14). All spec sections mapped.
- **Type consistency:** `staff_role` values `inspector|publisher|admin|""` identical across backend + frontend; `IsInspector`/`IsPublisher` from `common/permissions`; all queue routes under `/api/v1/inspections/staff/pending-publishing/`.
- **Deferred (out of scope):** staff-role management UI; other staff-permission changes; Spec D.
