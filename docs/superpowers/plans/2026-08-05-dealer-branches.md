# Dealer Organization & Branches (Spec A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give verified fleet (business) owners a `Branch` model with fleet-gated CRUD and a forced onboarding flow, so they can register their physical locations before listing cars.

**Architecture:** A `Branch` model hangs off the fleet `OwnerProfile` (which already holds `fleet_name` + `is_verified`). Owner-scoped DRF `APIView`s under `/api/v1/owner/branches/` expose list/create/detail/patch plus deactivate/reactivate actions, all gated to verified fleet profiles. The car-create endpoint gains a soft gate rejecting fleet owners with zero active branches. Frontend adds a `/owner/branches` management page + forced onboarding empty state.

**Tech Stack:** Django 5.2 + DRF, pytest-django (`--nomigrations`), Next.js 16 + React Query, shadcn + Tailwind v4 (`--brc-*` tokens), lucide.

**Workflow split:** Backend tasks (1–7) written by **Namy** with Claude guiding step-by-step TDD. Frontend tasks (8–14) implemented by **Claude** — after a handoff where Namy provides the imported Claude Design.

---

## File Structure

**Backend (`backend/`):**
- `apps/listings/models.py` — add `Branch` model (MODIFY).
- `apps/listings/serializers.py` — add `BranchSerializer` (MODIFY).
- `apps/listings/branch_views.py` — new file: branch APIViews (CREATE).
- `apps/listings/branch_urls.py` — new file: branch URL routes (CREATE).
- `config/urls.py` — mount `api/v1/owner/` (MODIFY).
- `apps/listings/views.py` — add zero-branch gate to `MyCarListCreateView.post` (MODIFY).
- `apps/listings/tests.py` — add `create_fleet_owner_profile` helper + `BranchTest`, gate tests (MODIFY).

**Frontend (`frontend/`):**
- `src/features/branches/api/types.ts`, `src/features/branches/api/branches-api.ts` — types + React Query hooks (CREATE).
- `src/features/branches/components/*` — page, card, dialog, empty state (CREATE, blended from the Claude Design import).
- `src/app/owner/branches/page.tsx` — route (CREATE).
- owner nav + list-car gate wiring (MODIFY, exact files confirmed at build time).

---

## BACKEND (Tasks 1–7 — Namy writes, Claude guides)

### Task 1: `Branch` model

**Files:**
- Modify: `backend/apps/listings/models.py`
- Test: `backend/apps/listings/tests.py`

- [ ] **Step 1: Add a fleet-owner test helper**

In `apps/listings/tests.py`, just below the existing `create_owner_profile` helper, add:

```python
def create_fleet_owner_profile(user, fleet_name="AutoKings Motors", is_verified=True):
    return OwnerProfile.objects.create(
        user=user,
        owner_type=OwnerProfile.OwnerType.FLEET,
        fleet_name=fleet_name,
        bank_account="1234567890",
        bank_name="Test Bank",
        is_verified=is_verified,
        national_id="12345678901",
        id_type="nin",
        id_document=create_test_image("id.jpg"),
    )
```

- [ ] **Step 2: Write the failing model test**

Add near the end of `apps/listings/tests.py`:

```python
class BranchModelTest(TestCase):
    def setUp(self):
        self.user = create_user("fleet@test.com", "owner")
        self.profile = create_fleet_owner_profile(self.user)

    def test_create_branch_and_business_name_reads_from_fleet(self):
        from apps.listings.models import Branch

        branch = Branch.objects.create(
            business=self.profile,
            name="Lagos — Amuwo Odofin Branch",
            state="Lagos",
            city="Amuwo Odofin",
            street_address="12 Trade Fair Rd",
            phone="+2348012345678",
            email="lagos@autokings.ng",
        )
        assert branch.is_active is True
        assert branch.business.fleet_name == "AutoKings Motors"

    def test_branch_name_unique_per_business(self):
        from django.db import IntegrityError
        from apps.listings.models import Branch

        Branch.objects.create(
            business=self.profile, name="HQ", state="Lagos", city="Ikeja",
            street_address="1 A", phone="+2348010000000", email="a@x.ng",
        )
        with self.assertRaises(IntegrityError):
            Branch.objects.create(
                business=self.profile, name="HQ", state="Lagos", city="Ikeja",
                street_address="2 B", phone="+2348010000001", email="b@x.ng",
            )
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd backend && uv run pytest apps/listings/tests.py::BranchModelTest -v`
Expected: FAIL — `ImportError: cannot import name 'Branch'`.

- [ ] **Step 4: Add the `Branch` model**

At the end of `apps/listings/models.py` (it already imports `models`, `uuid`, and `User`):

```python
class Branch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        "users.OwnerProfile", on_delete=models.CASCADE, related_name="branches"
    )
    name = models.CharField(max_length=200)
    state = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    street_address = models.CharField(max_length=300)
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "branches"
        ordering = ["-is_active", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "name"], name="unique_branch_name_per_business"
            )
        ]

    def __str__(self):
        return f"{self.name} — {self.business.fleet_name}"
```

> Note `uuid` is already imported at the top of `models.py`. Reference `"users.OwnerProfile"` as a string to avoid a new import.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && uv run pytest apps/listings/tests.py::BranchModelTest -v`
Expected: PASS (2 passed).

- [ ] **Step 6: Generate the migration**

Run: `cd backend && uv run python manage.py makemigrations listings`
Expected: a new migration creating the `Branch` model (e.g. `00XX_branch.py`).

- [ ] **Step 7: Commit**

```bash
git add backend/apps/listings/models.py backend/apps/listings/tests.py backend/apps/listings/migrations/
git commit -m "feat(branches): add Branch model with per-business unique name"
```

---

### Task 2: `BranchSerializer`

**Files:**
- Modify: `backend/apps/listings/serializers.py`
- Test: `backend/apps/listings/tests.py`

- [ ] **Step 1: Write the failing serializer test**

Add to `apps/listings/tests.py`:

```python
class BranchSerializerTest(TestCase):
    def setUp(self):
        self.user = create_user("fleet2@test.com", "owner")
        self.profile = create_fleet_owner_profile(self.user, fleet_name="AutoKings Motors")

    def test_serializes_business_name_readonly(self):
        from apps.listings.models import Branch
        from apps.listings.serializers import BranchSerializer

        branch = Branch.objects.create(
            business=self.profile, name="HQ", state="Lagos", city="Ikeja",
            street_address="1 A", phone="+2348010000000", email="a@x.ng",
        )
        data = BranchSerializer(branch).data
        assert data["business_name"] == "AutoKings Motors"
        assert data["name"] == "HQ"
        assert data["is_active"] is True

    def test_rejects_bad_email(self):
        from apps.listings.serializers import BranchSerializer

        s = BranchSerializer(data={
            "name": "HQ", "state": "Lagos", "city": "Ikeja",
            "street_address": "1 A", "phone": "+234801", "email": "not-an-email",
        })
        assert not s.is_valid()
        assert "email" in s.errors

    def test_ignores_business_name_on_write(self):
        from apps.listings.serializers import BranchSerializer

        s = BranchSerializer(data={
            "name": "HQ", "state": "Lagos", "city": "Ikeja",
            "street_address": "1 A", "phone": "+2348010000000",
            "email": "a@x.ng", "business_name": "HACKED",
        })
        assert s.is_valid(), s.errors
        assert "business_name" not in s.validated_data
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && uv run pytest apps/listings/tests.py::BranchSerializerTest -v`
Expected: FAIL — `cannot import name 'BranchSerializer'`.

- [ ] **Step 3: Add the serializer**

Add to `apps/listings/serializers.py` (it already imports `serializers` from `rest_framework`; add `Branch` to the existing `from apps.listings.models import (...)` block):

```python
class BranchSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source="business.fleet_name", read_only=True)

    class Meta:
        model = Branch
        fields = [
            "id", "name", "business_name", "state", "city", "street_address",
            "phone", "email", "is_active", "created_at",
        ]
        read_only_fields = ["id", "is_active", "created_at"]
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && uv run pytest apps/listings/tests.py::BranchSerializerTest -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/apps/listings/serializers.py backend/apps/listings/tests.py
git commit -m "feat(branches): add BranchSerializer with read-only business_name"
```

---

### Task 3: Branch list + create endpoint (fleet-verified gate)

**Files:**
- Create: `backend/apps/listings/branch_views.py`
- Create: `backend/apps/listings/branch_urls.py`
- Modify: `backend/config/urls.py`
- Test: `backend/apps/listings/tests.py`

- [ ] **Step 1: Write the failing API test**

Add to `apps/listings/tests.py`:

```python
class BranchListCreateApiTest(APITestCase):
    def setUp(self):
        self.fleet_user = create_user("fleetapi@test.com", "owner")
        self.fleet_profile = create_fleet_owner_profile(self.fleet_user)

        self.individual_user = create_user("indiv@test.com", "owner")
        create_owner_profile(self.individual_user)  # individual, verified

        self.unverified_user = create_user("unver@test.com", "owner")
        create_fleet_owner_profile(self.unverified_user, fleet_name="Later Ltd", is_verified=False)

        self.customer = create_user("cust@test.com", "customer")

    def _payload(self, **over):
        data = {
            "name": "Lagos Branch", "state": "Lagos", "city": "Ikeja",
            "street_address": "1 A", "phone": "+2348010000000", "email": "a@x.ng",
        }
        data.update(over)
        return data

    def test_customer_forbidden(self):
        self.client.force_authenticate(self.customer)
        r = self.client.post("/api/v1/owner/branches/", self._payload())
        assert r.status_code == 403

    def test_individual_owner_forbidden(self):
        self.client.force_authenticate(self.individual_user)
        r = self.client.post("/api/v1/owner/branches/", self._payload())
        assert r.status_code == 403

    def test_unverified_fleet_forbidden(self):
        self.client.force_authenticate(self.unverified_user)
        r = self.client.post("/api/v1/owner/branches/", self._payload())
        assert r.status_code == 403

    def test_verified_fleet_creates_and_lists(self):
        self.client.force_authenticate(self.fleet_user)
        r = self.client.post("/api/v1/owner/branches/", self._payload())
        assert r.status_code == 201, r.data
        assert r.data["business_name"] == "AutoKings Motors"

        r2 = self.client.get("/api/v1/owner/branches/")
        assert r2.status_code == 200
        results = r2.data["results"] if "results" in r2.data else r2.data
        assert len(results) == 1

    def test_duplicate_name_rejected(self):
        self.client.force_authenticate(self.fleet_user)
        self.client.post("/api/v1/owner/branches/", self._payload(name="HQ"))
        r = self.client.post("/api/v1/owner/branches/", self._payload(name="HQ"))
        assert r.status_code == 400

    def test_list_scoped_to_own_business(self):
        # another fleet's branch must not appear
        from apps.listings.models import Branch
        other = create_user("other@test.com", "owner")
        other_profile = create_fleet_owner_profile(other, fleet_name="Other Motors")
        Branch.objects.create(
            business=other_profile, name="Theirs", state="Oyo", city="Ibadan",
            street_address="9 Z", phone="+2348099999999", email="z@x.ng",
        )
        self.client.force_authenticate(self.fleet_user)
        r = self.client.get("/api/v1/owner/branches/")
        results = r.data["results"] if "results" in r.data else r.data
        assert all(b["name"] != "Theirs" for b in results)
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && uv run pytest apps/listings/tests.py::BranchListCreateApiTest -v`
Expected: FAIL — 404s (route not mounted).

- [ ] **Step 3: Create `branch_views.py`**

Create `backend/apps/listings/branch_views.py`:

```python
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPagination
from common.permissions import IsOwner

from apps.listings.models import Branch
from apps.listings.serializers import BranchSerializer


def _verified_fleet_profile(user):
    """Return the user's OwnerProfile iff it's a verified fleet, else None."""
    profile = getattr(user, "owner_profile", None)
    if profile and profile.is_verified and profile.owner_type == "fleet":
        return profile
    return None


class BranchListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        profile = _verified_fleet_profile(request.user)
        if not profile:
            return Response(
                {"detail": "Branch management is for verified business accounts."},
                status=status.HTTP_403_FORBIDDEN,
            )
        branches = Branch.objects.filter(business=profile)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(branches, request)
        return paginator.get_paginated_response(BranchSerializer(page, many=True).data)

    def post(self, request):
        profile = _verified_fleet_profile(request.user)
        if not profile:
            return Response(
                {"detail": "Branch management is for verified business accounts."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = BranchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(business=profile)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
```

- [ ] **Step 4: Create `branch_urls.py`**

Create `backend/apps/listings/branch_urls.py`:

```python
from django.urls import path

from apps.listings.branch_views import BranchListCreateView

urlpatterns = [
    path("branches/", BranchListCreateView.as_view(), name="owner-branches"),
]
```

- [ ] **Step 5: Mount the routes**

In `backend/config/urls.py`, add alongside the other `api/v1/*` includes:

```python
    path("api/v1/owner/", include("apps.listings.branch_urls")),
```

- [ ] **Step 6: Handle the duplicate-name IntegrityError as a 400**

The unique constraint raises `IntegrityError` (a 500) rather than a validation error. Add a `validate_name` to `BranchSerializer` in `apps/listings/serializers.py` so duplicates return `400`. Because the serializer doesn't know the business at validation time, enforce it in the view's `post` instead — replace the `serializer.save(business=profile)` line with:

```python
        if Branch.objects.filter(business=profile, name=serializer.validated_data["name"]).exists():
            return Response(
                {"name": ["You already have a branch with this name."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer.save(business=profile)
```

- [ ] **Step 7: Run to verify it passes**

Run: `cd backend && uv run pytest apps/listings/tests.py::BranchListCreateApiTest -v`
Expected: PASS (6 passed).

- [ ] **Step 8: Commit**

```bash
git add backend/apps/listings/branch_views.py backend/apps/listings/branch_urls.py backend/config/urls.py backend/apps/listings/tests.py
git commit -m "feat(branches): fleet-gated list + create branch endpoint"
```

---

### Task 4: Branch detail + patch (business-scoped, 404 on cross-business)

**Files:**
- Modify: `backend/apps/listings/branch_views.py`
- Modify: `backend/apps/listings/branch_urls.py`
- Test: `backend/apps/listings/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `apps/listings/tests.py`:

```python
class BranchDetailApiTest(APITestCase):
    def setUp(self):
        from apps.listings.models import Branch
        self.user = create_user("fleetd@test.com", "owner")
        self.profile = create_fleet_owner_profile(self.user)
        self.branch = Branch.objects.create(
            business=self.profile, name="HQ", state="Lagos", city="Ikeja",
            street_address="1 A", phone="+2348010000000", email="a@x.ng",
        )
        self.other = create_user("otherd@test.com", "owner")
        self.other_profile = create_fleet_owner_profile(self.other, fleet_name="Rivals")
        self.other_branch = Branch.objects.create(
            business=self.other_profile, name="Theirs", state="Oyo", city="Ibadan",
            street_address="9 Z", phone="+2348099999999", email="z@x.ng",
        )

    def test_patch_updates_fields(self):
        self.client.force_authenticate(self.user)
        r = self.client.patch(
            f"/api/v1/owner/branches/{self.branch.id}/", {"city": "Lekki"}
        )
        assert r.status_code == 200, r.data
        assert r.data["city"] == "Lekki"

    def test_business_name_not_writable(self):
        self.client.force_authenticate(self.user)
        r = self.client.patch(
            f"/api/v1/owner/branches/{self.branch.id}/", {"business_name": "HACKED"}
        )
        assert r.status_code == 200
        self.profile.refresh_from_db()
        assert self.profile.fleet_name == "AutoKings Motors"

    def test_cross_business_is_404(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(f"/api/v1/owner/branches/{self.other_branch.id}/")
        assert r.status_code == 404
        r2 = self.client.patch(
            f"/api/v1/owner/branches/{self.other_branch.id}/", {"city": "X"}
        )
        assert r2.status_code == 404
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && uv run pytest apps/listings/tests.py::BranchDetailApiTest -v`
Expected: FAIL — 404 route missing / method not allowed.

- [ ] **Step 3: Add the detail view**

Append to `backend/apps/listings/branch_views.py`:

```python
from django.http import Http404


class BranchDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def _get_branch(self, request, branch_id):
        profile = _verified_fleet_profile(request.user)
        if not profile:
            raise Http404
        try:
            return Branch.objects.get(id=branch_id, business=profile)
        except Branch.DoesNotExist:
            raise Http404

    def get(self, request, branch_id):
        branch = self._get_branch(request, branch_id)
        return Response(BranchSerializer(branch).data)

    def patch(self, request, branch_id):
        branch = self._get_branch(request, branch_id)
        serializer = BranchSerializer(branch, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        new_name = serializer.validated_data.get("name")
        if new_name and Branch.objects.filter(
            business=branch.business, name=new_name
        ).exclude(id=branch.id).exists():
            return Response(
                {"name": ["You already have a branch with this name."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer.save()
        return Response(serializer.data)
```

- [ ] **Step 4: Wire the route**

In `backend/apps/listings/branch_urls.py` add the import and path:

```python
from apps.listings.branch_views import BranchListCreateView, BranchDetailView

urlpatterns = [
    path("branches/", BranchListCreateView.as_view(), name="owner-branches"),
    path("branches/<uuid:branch_id>/", BranchDetailView.as_view(), name="owner-branch-detail"),
]
```

- [ ] **Step 5: Run to verify it passes**

Run: `cd backend && uv run pytest apps/listings/tests.py::BranchDetailApiTest -v`
Expected: PASS (3 passed).

- [ ] **Step 6: Commit**

```bash
git add backend/apps/listings/branch_views.py backend/apps/listings/branch_urls.py backend/apps/listings/tests.py
git commit -m "feat(branches): business-scoped branch detail + patch"
```

---

### Task 5: Deactivate + reactivate actions

**Files:**
- Modify: `backend/apps/listings/branch_views.py`
- Modify: `backend/apps/listings/branch_urls.py`
- Test: `backend/apps/listings/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `apps/listings/tests.py`:

```python
class BranchLifecycleApiTest(APITestCase):
    def setUp(self):
        from apps.listings.models import Branch
        self.user = create_user("fleetl@test.com", "owner")
        self.profile = create_fleet_owner_profile(self.user)
        self.branch = Branch.objects.create(
            business=self.profile, name="HQ", state="Lagos", city="Ikeja",
            street_address="1 A", phone="+2348010000000", email="a@x.ng",
        )

    def test_deactivate_then_reactivate(self):
        self.client.force_authenticate(self.user)
        r = self.client.post(f"/api/v1/owner/branches/{self.branch.id}/deactivate/")
        assert r.status_code == 200, r.data
        self.branch.refresh_from_db()
        assert self.branch.is_active is False

        r2 = self.client.post(f"/api/v1/owner/branches/{self.branch.id}/reactivate/")
        assert r2.status_code == 200
        self.branch.refresh_from_db()
        assert self.branch.is_active is True

    def test_deactivate_is_idempotent(self):
        self.client.force_authenticate(self.user)
        self.client.post(f"/api/v1/owner/branches/{self.branch.id}/deactivate/")
        r = self.client.post(f"/api/v1/owner/branches/{self.branch.id}/deactivate/")
        assert r.status_code == 200
        self.branch.refresh_from_db()
        assert self.branch.is_active is False
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && uv run pytest apps/listings/tests.py::BranchLifecycleApiTest -v`
Expected: FAIL — routes missing.

- [ ] **Step 3: Add the action views**

Append to `backend/apps/listings/branch_views.py`:

```python
class BranchDeactivateView(BranchDetailView):
    def post(self, request, branch_id):
        branch = self._get_branch(request, branch_id)
        branch.is_active = False
        branch.save(update_fields=["is_active", "updated_at"])
        return Response(BranchSerializer(branch).data)


class BranchReactivateView(BranchDetailView):
    def post(self, request, branch_id):
        branch = self._get_branch(request, branch_id)
        branch.is_active = True
        branch.save(update_fields=["is_active", "updated_at"])
        return Response(BranchSerializer(branch).data)
```

> Subclassing `BranchDetailView` reuses `_get_branch` (same 404 scoping) — DRY.

- [ ] **Step 4: Wire the routes**

Update `backend/apps/listings/branch_urls.py`:

```python
from apps.listings.branch_views import (
    BranchListCreateView,
    BranchDetailView,
    BranchDeactivateView,
    BranchReactivateView,
)

urlpatterns = [
    path("branches/", BranchListCreateView.as_view(), name="owner-branches"),
    path("branches/<uuid:branch_id>/", BranchDetailView.as_view(), name="owner-branch-detail"),
    path("branches/<uuid:branch_id>/deactivate/", BranchDeactivateView.as_view(), name="owner-branch-deactivate"),
    path("branches/<uuid:branch_id>/reactivate/", BranchReactivateView.as_view(), name="owner-branch-reactivate"),
]
```

- [ ] **Step 5: Run to verify it passes**

Run: `cd backend && uv run pytest apps/listings/tests.py::BranchLifecycleApiTest -v`
Expected: PASS (2 passed).

- [ ] **Step 6: Commit**

```bash
git add backend/apps/listings/branch_views.py backend/apps/listings/branch_urls.py backend/apps/listings/tests.py
git commit -m "feat(branches): deactivate + reactivate branch actions"
```

---

### Task 6: Soft listing gate — fleet owner needs an active branch to list

**Files:**
- Modify: `backend/apps/listings/views.py` (`MyCarListCreateView.post`, ~line 342)
- Test: `backend/apps/listings/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `apps/listings/tests.py`. Reuse an existing valid car-create payload builder if the file has one; otherwise this minimal shape exercises the gate before serializer validation:

```python
class ListingBranchGateTest(APITestCase):
    def setUp(self):
        self.fleet_user = create_user("gatefleet@test.com", "owner")
        self.fleet_profile = create_fleet_owner_profile(self.fleet_user)
        self.indiv_user = create_user("gateindiv@test.com", "owner")
        create_owner_profile(self.indiv_user)

    def test_fleet_owner_without_branch_blocked(self):
        self.client.force_authenticate(self.fleet_user)
        r = self.client.post("/api/v1/listings/my-cars", {}, format="json")
        assert r.status_code == 400
        assert "branch" in str(r.data).lower()

    def test_fleet_owner_with_branch_passes_gate(self):
        # With a branch, the gate is cleared and we fall through to serializer
        # validation (which 400s on the empty body for other reasons — NOT the
        # branch message).
        from apps.listings.models import Branch
        Branch.objects.create(
            business=self.fleet_profile, name="HQ", state="Lagos", city="Ikeja",
            street_address="1 A", phone="+2348010000000", email="a@x.ng",
        )
        self.client.force_authenticate(self.fleet_user)
        r = self.client.post("/api/v1/listings/my-cars", {}, format="json")
        assert "Create a branch before listing" not in str(r.data)

    def test_individual_owner_not_gated(self):
        self.client.force_authenticate(self.indiv_user)
        r = self.client.post("/api/v1/listings/my-cars", {}, format="json")
        assert "Create a branch before listing" not in str(r.data)
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && uv run pytest apps/listings/tests.py::ListingBranchGateTest -v`
Expected: FAIL — `test_fleet_owner_without_branch_blocked` fails (no gate yet; the body 400s but without a "branch" message, or the message differs).

- [ ] **Step 3: Add the gate**

In `apps/listings/views.py`, in `MyCarListCreateView.post`, right after the existing `is_verified` 403 block and before building `CarCreateSerializer`, add:

```python
        if owner_profile.owner_type == "fleet" and not owner_profile.branches.filter(
            is_active=True
        ).exists():
            return Response(
                {"detail": "Create a branch before listing a vehicle."},
                status=status.HTTP_400_BAD_REQUEST,
            )
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && uv run pytest apps/listings/tests.py::ListingBranchGateTest -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/apps/listings/views.py backend/apps/listings/tests.py
git commit -m "feat(branches): block car listing until a fleet owner has an active branch"
```

---

### Task 7: Full backend suite + lint green

**Files:** none (verification only)

- [ ] **Step 1: Run the whole suite**

Run: `cd backend && uv run pytest -q`
Expected: all pass (the new Branch tests plus the existing suite).

- [ ] **Step 2: Lint**

Run: `cd backend && uv run ruff check .`
Expected: no errors (no E402 mid-file imports, no F401 unused imports).

- [ ] **Step 3: Commit any lint fixes if needed**

```bash
git add -A && git commit -m "chore(branches): lint clean" || echo "nothing to fix"
```

---

## FRONTEND HANDOFF

**STOP.** Before frontend tasks, Claude asks Namy for the imported Claude Design (the Branches page mockup). Claude then blends it into the app using the components below, following the existing shadcn + `--brc-*` patterns. Tasks 8–14 are implemented by Claude.

---

## FRONTEND (Tasks 8–14 — Claude implements)

### Task 8: API types + React Query hooks

**Files:**
- Create: `frontend/src/features/branches/api/types.ts`
- Create: `frontend/src/features/branches/api/branches-api.ts`

- [ ] **Step 1:** Define `Branch` and `BranchInput` types mirroring `BranchSerializer` (`id`, `name`, `business_name`, `state`, `city`, `street_address`, `phone`, `email`, `is_active`, `created_at`).
- [ ] **Step 2:** Add hooks against `/owner/branches/` using the existing `apiClient` + React Query conventions (match an existing feature, e.g. `features/deals/api`): `useBranches()` (GET list), `useCreateBranch()`, `useUpdateBranch(id)` (PATCH), `useDeactivateBranch(id)`, `useReactivateBranch(id)` — each invalidating the `["branches"]` query key on success.
- [ ] **Step 3:** `tsc --noEmit` clean.
- [ ] **Step 4:** Commit `feat(branches): api types + react-query hooks`.

### Task 9: Branch card + management page

**Files:**
- Create: `frontend/src/features/branches/components/branch-card.tsx`
- Create: `frontend/src/features/branches/components/branches-page.tsx`
- Create: `frontend/src/app/owner/branches/page.tsx`

- [ ] **Step 1:** Build `BranchCard` from the imported design — name, business-name badge, address (`MapPin`), phone (`Phone`), email (`Mail`), active/retired status, overflow `DropdownMenu` (Edit / Retire, or Reactivate when retired). Retired cards dimmed with a "Retired" badge, mixed into the grid.
- [ ] **Step 2:** Build `BranchesPage` — header (title, subtitle, "Add branch"), business-name identity strip with "Verified business" badge, responsive card grid.
- [ ] **Step 3:** Route `page.tsx` renders `BranchesPage` inside the owner layout.
- [ ] **Step 4:** `tsc` + ESLint clean. Commit `feat(branches): management page + branch card`.

### Task 10: Add / Edit dialog with validation

**Files:**
- Create: `frontend/src/features/branches/components/branch-form-dialog.tsx`

- [ ] **Step 1:** shadcn Dialog with fields — **Business name (read-only/disabled, inherited)**, Branch name, State (searchable select, 36 states + FCT), City, Street address, Phone, Email. Real inline validation (required + email format). Wire to `useCreateBranch` / `useUpdateBranch`. Sonner toasts ("Branch created" / "Branch updated").
- [ ] **Step 2:** `tsc` + ESLint clean. Commit `feat(branches): add/edit branch dialog`.

### Task 11: Onboarding empty state + loading skeletons

**Files:**
- Create: `frontend/src/features/branches/components/branches-empty-state.tsx`
- Create: `frontend/src/features/branches/components/branch-card-skeleton.tsx`

- [ ] **Step 1:** Empty state (Store/Building2 accent circle, "Set up your first branch", "Add your first branch" → opens the create dialog). Shown only after the list loads to zero.
- [ ] **Step 2:** Skeleton cards during load. Commit `feat(branches): onboarding empty state + skeletons`.

### Task 12: Retire / reactivate confirm + toasts

**Files:**
- Modify: `frontend/src/features/branches/components/branch-card.tsx`

- [ ] **Step 1:** Retire uses the existing `ConfirmDialog` ("Retire this branch?" / "It'll be hidden from active use. You can reactivate it later." / destructive "Retire branch"). Reactivate is a direct action. Toasts on both. Commit `feat(branches): retire/reactivate confirm + toasts`.

### Task 13: Owner nav + list-car gate

**Files:**
- Modify: owner dashboard nav (confirm exact file at build time, e.g. `frontend/src/app/owner/layout.tsx` or a nav constants file)
- Modify: the "List a car" entry point (e.g. `frontend/src/app/owner/my-cars/new/page.tsx` or the my-cars page CTA)

- [ ] **Step 1:** Add a "Branches" nav item visible only to fleet owners (derive fleet vs individual from the profile in context / `me`).
- [ ] **Step 2:** On the list-car entry, if the owner is fleet and has zero active branches, redirect to `/owner/branches` with an inline notice instead of the form. Individual owners unaffected.
- [ ] **Step 3:** `tsc` + ESLint + `next build` clean. Commit `feat(branches): owner nav item + list-car branch gate`.

### Task 14: Final verification + manual testing doc

**Files:**
- Modify: `MANUAL_TESTING.md`

- [ ] **Step 1:** `cd frontend && npx tsc --noEmit && npm run lint && npm run build` — all clean.
- [ ] **Step 2:** `cd backend && uv run pytest -q && uv run ruff check .` — all green.
- [ ] **Step 3:** Add a "Spec A — Dealer branches" section to `MANUAL_TESTING.md` (onboarding gate, create/edit/retire/reactivate, business-name immutability, individual-owner-unaffected, cross-business 404). Commit `docs: manual testing for dealer branches`.
- [ ] **Step 4:** Use superpowers:finishing-a-development-branch to open the PR and merge once CI is green.

---

## Self-review notes

- **Spec coverage:** Branch model (T1) · serializer w/ read-only business_name (T2) · fleet-gated list/create (T3) · scoped detail/patch + immutable business name (T4) · deactivate/reactivate (T5) · soft listing gate (T6) · onboarding empty state + management UI + dialog + skeletons + nav + gate (T8–T13) · manual doc (T14). All spec sections mapped.
- **Deferred (out of scope, per spec):** `Car → Branch` FK, team members, staff sub-roles, offer fallback — none appear as tasks. Correct.
- **Type consistency:** `Branch` fields and `BranchSerializer` field list are identical across T1–T5; `business` FK → `OwnerProfile`; `business_name` read-only everywhere; route paths consistent (`/api/v1/owner/branches/…`).
