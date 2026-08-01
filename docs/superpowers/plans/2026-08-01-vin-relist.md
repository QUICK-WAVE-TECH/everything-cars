# VIN Transfer & Relist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the proven buyer of a completed peer-to-peer sale relist that same physical vehicle (same VIN) as a fresh listing.

**Architecture:** No new model — a completed `Deal` is the ownership proof. VIN/plate uniqueness relaxes to "one non-archived listing per VIN/plate" (partial unique constraints), and `CarCreateSerializer.validate_vin` allows re-registering a sold (archived) VIN only when the requester is the buyer of the latest completed `Deal` for that VIN. `complete_deal` is unchanged (sold car just archives). Frontend adds a "Relist this vehicle" link on the buyer's completed deal and a `?vin=` prefill on the Add-car form.

**Tech Stack:** Django 5.2 + DRF (backend; `uv`, `manage.py test`; CI runs `ruff check` + `pytest`), Next.js 16 + React Query (frontend).

**Workflow split:** Backend tasks (1–4) are written BY THE USER (Namy) with Claude guiding step-by-step TDD. Frontend task (5) Claude implements directly.

**Branch:** `feat/spec5-vin-relist` (already off `origin/main`, spec committed).

**Conventions:**
- Backend tests: `cd backend && uv run python manage.py test <path>`. Keep imports at top-of-file (CI ruff flags E402) and remove unused imports (F401).
- Apply migrations to the dev DB after `makemigrations`: `uv run python manage.py migrate`.
- `docs/` is gitignored — commit plan/spec with `git add -f`. No `Co-Authored-By`.

---

## File Structure

**Backend**
- `apps/listings/models.py` — **Modify.** Drop inline `unique=True` on `vin` + `plate_number`; add partial `UniqueConstraint`s to `Car.Meta`.
- `apps/sales/services.py` — **Modify.** Add `latest_completed_deal_for_vin(vin)`.
- `apps/listings/serializers.py` — **Modify.** Rewrite `validate_vin` / `validate_plate_number` in `CarCreateSerializer`.
- `apps/listings/views.py` — **Modify.** Pass `context={"request": request}` to the two `CarCreateSerializer` instantiations.
- `apps/sales/serializers.py` — **Modify.** Expose `vin` on `DealCarSerializer`.
- Tests: `apps/listings/tests.py`, `apps/sales/tests.py`.

**Frontend**
- `src/features/deals/api/types.ts` — add `vin` to `DealCar`.
- `src/features/deals/components/deal-reveal-page.tsx` — "Relist this vehicle" link.
- `src/app/owner/my-cars/new/page.tsx` — read `?vin=` and prefill.

---

## Task 1: Partial-unique VIN & plate constraints

**Files:**
- Modify: `backend/apps/listings/models.py`
- Test: `backend/apps/listings/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/listings/tests.py`:

```python
from django.db.utils import IntegrityError


class VinPartialUniqueTest(TestCase):
    def test_archived_car_frees_the_vin_but_one_live_only(self):
        owner = create_user("vinpu-owner@test.com", "owner")
        # An archived (sold) car keeps its VIN.
        create_car(owner, vin="1HGCM82633A004352", plate_number="OLD111AA",
                   status=CarStatus.ARCHIVED)
        # A new live listing may reuse that VIN.
        create_car(owner, vin="1HGCM82633A004352", plate_number="NEW222BB",
                   status=CarStatus.PUBLISHED)
        # But a SECOND live car with the same VIN violates the partial unique.
        with self.assertRaises(IntegrityError):
            create_car(owner, vin="1HGCM82633A004352", plate_number="NEW333CC",
                       status=CarStatus.PUBLISHED)
```

> `create_car` (in this test module) forwards `**extra` to `Car.objects.create`, so `vin=`, `plate_number=`, and `status=` all work. It already resolves the `brand` FK.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run python manage.py test apps.listings.tests.VinPartialUniqueTest -v 2`
Expected: FAIL — the current global `unique=True` on `vin` raises `IntegrityError` on the *second* create (the reuse), so the archived-frees-VIN line fails before reaching the assertion.

- [ ] **Step 3: Relax the fields and add partial constraints**

In `backend/apps/listings/models.py`, change the two fields (remove `unique=True`):

```python
    vin = models.CharField(max_length=17, blank=True, null=True)
    plate_number = models.CharField(max_length=12, blank=True, null=True)
```

Add `constraints` to `Car.Meta` (alongside the existing `ordering`/`indexes`):

```python
    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["listing_type", "status"]),
            models.Index(fields=["owner", "status"]),
            models.Index(fields=["state", "city"]),
        ]
        constraints = [
            # At most one live (non-archived) listing per VIN / plate. A sold car
            # is ARCHIVED, which frees its VIN/plate for the new owner to relist.
            models.UniqueConstraint(
                fields=["vin"],
                condition=models.Q(vin__isnull=False)
                & ~models.Q(status=CarStatus.ARCHIVED),
                name="one_active_listing_per_vin",
            ),
            models.UniqueConstraint(
                fields=["plate_number"],
                condition=models.Q(plate_number__isnull=False)
                & ~models.Q(status=CarStatus.ARCHIVED),
                name="one_active_listing_per_plate",
            ),
        ]
```

- [ ] **Step 4: Make & apply the migration**

Run:
```bash
cd backend && uv run python manage.py makemigrations listings && uv run python manage.py migrate
```
Expected: a migration that alters `vin`/`plate_number` (drop unique) and adds the two constraints, applied cleanly (existing VINs/plates are globally unique, so the partial constraints hold).

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && uv run python manage.py test apps.listings.tests.VinPartialUniqueTest -v 2`
Expected: PASS.

- [ ] **Step 6: Run the full listings suite (guard the VIN/plate change)**

Run: `cd backend && uv run python manage.py test apps.listings -v 1`
Expected: green. (The existing `VinPlateValidationTest` posts through the serializer, which still rejects duplicates — see Task 3 — so it stays valid.)

- [ ] **Step 7: Commit**

```bash
git add backend/apps/listings/models.py backend/apps/listings/migrations/ backend/apps/listings/tests.py
git commit -m "feat(listings): one active listing per VIN/plate (partial unique)"
```

---

## Task 2: `latest_completed_deal_for_vin` helper

**Files:**
- Modify: `backend/apps/sales/services.py`
- Test: `backend/apps/sales/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/sales/tests.py` (this module already has `make_owner`, `make_user`, `make_negotiable_car`, `make_accepted_offer`, `Deal`, `DealStatus`, `DEAL_TTL_DAYS`):

```python
class LatestCompletedDealForVinTest(APITestCase):
    def test_returns_latest_completed_deal_buyer_for_a_vin(self):
        from apps.sales.services import latest_completed_deal_for_vin

        owner = make_owner("lcd-owner@test.com")
        buyer = make_user("lcd-buyer@test.com")
        car = make_negotiable_car(owner)
        car.vin = "1HGCM82633A004352"
        car.save(update_fields=["vin"])
        offer = make_accepted_offer(car, buyer)
        deal = Deal.objects.create(
            car=car, buyer=buyer, seller=owner, offer=offer,
            agreed_amount="14000000.00", currency=car.currency,
            expires_at=timezone.now() + timedelta(days=DEAL_TTL_DAYS),
            status=DealStatus.COMPLETED, completed_at=timezone.now(),
        )
        found = latest_completed_deal_for_vin("1HGCM82633A004352")
        self.assertEqual(found.id, deal.id)
        self.assertEqual(found.buyer_id, buyer.id)

    def test_ignores_non_completed_and_unknown_vins(self):
        from apps.sales.services import latest_completed_deal_for_vin

        self.assertIsNone(latest_completed_deal_for_vin("1HGCM82633A004352"))
        self.assertIsNone(latest_completed_deal_for_vin(""))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run python manage.py test apps.sales.tests.LatestCompletedDealForVinTest -v 2`
Expected: FAIL — `cannot import name 'latest_completed_deal_for_vin'`.

- [ ] **Step 3: Implement the helper**

In `backend/apps/sales/services.py`, add (module already imports `Deal`-related names; add `DealStatus` if not already imported at top — it is imported via `.models`):

```python
def latest_completed_deal_for_vin(vin):
    """The most recent COMPLETED deal for a car with this VIN, or None. This is
    the ownership proof for relisting: its buyer is the vehicle's current owner.
    COMPLETED excludes reversed disputes (they become CANCELLED)."""
    if not vin:
        return None
    from .models import Deal, DealStatus

    return (
        Deal.objects.filter(car__vin=vin, status=DealStatus.COMPLETED)
        .select_related("buyer")
        .order_by("-completed_at")
        .first()
    )
```

> `services.py` already imports from `.models`; the inline import here is only to keep the function self-contained — if `Deal`/`DealStatus` are already imported at module top, use those and drop the inline import (avoid an unused-import/redefinition ruff flag).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && uv run python manage.py test apps.sales.tests.LatestCompletedDealForVinTest -v 2`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/apps/sales/services.py backend/apps/sales/tests.py
git commit -m "feat(sales): latest_completed_deal_for_vin ownership-proof helper"
```

---

## Task 3: Relist-aware VIN/plate validation

**Files:**
- Modify: `backend/apps/listings/serializers.py`
- Modify: `backend/apps/listings/views.py` (serializer `context`)
- Test: `backend/apps/listings/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/listings/tests.py`. This drives the create endpoint (like the existing `VinPlateValidationTest`). It needs a sold/archived car with a VIN and a completed deal for it.

```python
class RelistVinTest(APITestCase):
    VIN = "1HGCM82633A004352"

    def _make_sold_car(self, seller, buyer):
        # An archived car with a completed Deal (buyer proven owner).
        from apps.sales.models import Deal, DealStatus, DEAL_TTL_DAYS
        from apps.offers.models import Offer, OfferStatus

        car = create_car(seller, vin=self.VIN, plate_number="SOLD11AA",
                         status=CarStatus.ARCHIVED, listing_type=ListingType.BUY,
                         is_negotiable=True)
        offer = Offer.objects.create(
            car=car, customer=buyer, amount="14000000.00", currency=car.currency,
            status=OfferStatus.ACCEPTED, expires_at=timezone.now(),
        )
        Deal.objects.create(
            car=car, buyer=buyer, seller=seller, offer=offer,
            agreed_amount="14000000.00", currency=car.currency,
            expires_at=timezone.now() + timedelta(days=DEAL_TTL_DAYS),
            status=DealStatus.COMPLETED, completed_at=timezone.now(),
        )
        return car

    def _payload(self, **over):
        data = {
            "title": "Relisted ride", "listing_type": "buy",
            "sale_price": "9000000.00", "brand": "Toyota", "model": "Corolla",
            "year": 2019, "state": "Lagos", "city": "Ikeja",
            "vin": self.VIN, "plate_number": "NEW22BB",
        }
        data.update(over)
        return data

    def test_buyer_can_relist_a_sold_vin(self):
        seller = create_user("relist-seller@test.com", "owner")
        buyer = create_user("relist-buyer@test.com", "owner")
        create_owner_profile(buyer)
        self._make_sold_car(seller, buyer)
        self.client.force_authenticate(user=buyer)
        res = self.client.post("/api/v1/listings/my-cars", self._payload(), format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(Car.objects.get(id=res.data["id"]).vin, self.VIN)

    def test_non_buyer_cannot_relist_a_sold_vin(self):
        seller = create_user("relist-seller2@test.com", "owner")
        buyer = create_user("relist-buyer2@test.com", "owner")
        stranger = create_user("relist-stranger@test.com", "owner")
        create_owner_profile(stranger)
        self._make_sold_car(seller, buyer)
        self.client.force_authenticate(user=stranger)
        res = self.client.post("/api/v1/listings/my-cars", self._payload(), format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("relist a vehicle you bought", str(res.data).lower())

    def test_live_listing_blocks_the_vin(self):
        owner = create_user("relist-live@test.com", "owner")
        create_owner_profile(owner)
        create_car(owner, vin=self.VIN, plate_number="LIVE11AA",
                   status=CarStatus.PUBLISHED)
        self.client.force_authenticate(user=owner)
        res = self.client.post("/api/v1/listings/my-cars", self._payload(), format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already registered", str(res.data).lower())
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run python manage.py test apps.listings.tests.RelistVinTest -v 2`
Expected: FAIL — `test_buyer_can_relist_a_sold_vin` gets a 400 ("already registered") because the current validator rejects any existing VIN; and/or a `KeyError`/`AttributeError` because `CarCreateSerializer` has no `request` in context yet.

- [ ] **Step 3: Pass the request into the create serializer (both call sites)**

In `backend/apps/listings/views.py`, add `context={"request": request}` to both `CarCreateSerializer(...)` instantiations:

```python
        serializer = CarCreateSerializer(data=request.data, context={"request": request})
```
and (in the PATCH handler):
```python
            serializer = CarCreateSerializer(
                car, data=request.data, partial=True, context={"request": request}
            )
```

- [ ] **Step 4: Rewrite `validate_vin` (relist-aware) and `validate_plate_number`**

In `backend/apps/listings/serializers.py`, replace the two validators in `CarCreateSerializer`:

```python
    def validate_vin(self, value):
        if value in (None, ""):
            raise serializers.ValidationError("VIN is required.")
        v = value.strip().upper()
        if not self.VIN_RE.match(v):
            raise serializers.ValidationError("Enter a valid 17-character VIN.")

        others = Car.objects.filter(vin=v)
        if self.instance:
            others = others.exclude(pk=self.instance.pk)
        if not others.exists():
            return v  # brand-new VIN

        # A live listing already holds it → hard reject.
        if others.exclude(status=CarStatus.ARCHIVED).exists():
            raise serializers.ValidationError(
                "This vehicle is already registered on the platform."
            )

        # All matches are archived → only the proven buyer may relist.
        from apps.sales.services import latest_completed_deal_for_vin

        request = self.context.get("request")
        user = getattr(request, "user", None)
        deal = latest_completed_deal_for_vin(v)
        if deal is not None and user is not None and deal.buyer_id == user.id:
            return v
        raise serializers.ValidationError(
            "You can only relist a vehicle you bought through the platform."
        )

    def validate_plate_number(self, value):
        if value in (None, ""):
            raise serializers.ValidationError("Plate number is required.")
        p = re.sub(r"[\s-]", "", value).upper()
        if not (5 <= len(p) <= 12 and p.isalnum()):
            raise serializers.ValidationError(
                "Enter a valid plate number (5–12 letters/numbers)."
            )
        others = Car.objects.filter(plate_number=p)
        if self.instance:
            others = others.exclude(pk=self.instance.pk)
        # Only a live listing blocks the plate — relist authorization is carried
        # entirely by validate_vin (same physical car).
        if others.exclude(status=CarStatus.ARCHIVED).exists():
            raise serializers.ValidationError(
                "This vehicle is already registered on the platform."
            )
        return p
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && uv run python manage.py test apps.listings.tests.RelistVinTest -v 2`
Expected: PASS (3 tests).

- [ ] **Step 6: Run the full listings suite (guard the existing VIN/plate tests)**

Run: `cd backend && uv run python manage.py test apps.listings -v 1`
Expected: green. The existing `VinPlateValidationTest` duplicate cases still reject because those duplicates are non-archived (default `create_car` status is `PUBLISHED`) — the "live listing blocks" branch. If any existing dup test used an archived car, update its expectation to the relist rule.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/listings/serializers.py backend/apps/listings/views.py backend/apps/listings/tests.py
git commit -m "feat(listings): allow the proven buyer to relist a sold VIN"
```

---

## Task 4: Expose VIN on the deal detail

**Files:**
- Modify: `backend/apps/sales/serializers.py`
- Test: `backend/apps/sales/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/sales/tests.py` (the `DealEndpointTest` class already builds `self.deal` with `self.car`; subclass or add a method there). Add a standalone test:

```python
class DealCarVinTest(DealEndpointTest):
    def test_deal_detail_exposes_car_vin_to_participant(self):
        self.car.vin = "1HGCM82633A004352"
        self.car.save(update_fields=["vin"])
        self.client.force_authenticate(user=self.buyer)
        res = self.client.get(f"/api/v1/deals/{self.deal.id}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["car"]["vin"], "1HGCM82633A004352")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run python manage.py test apps.sales.tests.DealCarVinTest -v 2`
Expected: FAIL — `KeyError: 'vin'` (not serialized).

- [ ] **Step 3: Add `vin` to `DealCarSerializer`**

In `backend/apps/sales/serializers.py`, in `DealCarSerializer`:

```python
class DealCarSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    vin = serializers.CharField(allow_null=True)
    primary_image = serializers.SerializerMethodField()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && uv run python manage.py test apps.sales.tests.DealCarVinTest -v 2`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/sales/serializers.py backend/apps/sales/tests.py
git commit -m "feat(sales): expose car VIN on the deal detail (for relist)"
```

---

## Task 5: Frontend — "Relist this vehicle" + VIN prefill

**Files:**
- Modify: `frontend/src/features/deals/api/types.ts`
- Modify: `frontend/src/features/deals/components/deal-reveal-page.tsx`
- Modify: `frontend/src/app/owner/my-cars/new/page.tsx`

- [ ] **Step 1: Add `vin` to the DealCar type**

In `frontend/src/features/deals/api/types.ts`, in the `DealCar` type:

```ts
export type DealCar = {
  id: string;
  title: string;
  vin: string | null;
  primary_image: string | null;
};
```

- [ ] **Step 2: "Relist this vehicle" link on the buyer's completed deal**

In `frontend/src/features/deals/components/deal-reveal-page.tsx`, where the completed-deal actions render, add a link shown only when `deal.status === "completed"` **and** `deal.viewer_role === "buyer"` **and** `deal.car.vin`:

```tsx
{deal.status === "completed" && deal.viewer_role === "buyer" && deal.car.vin && (
  <Link
    href={`/owner/my-cars/new?vin=${encodeURIComponent(deal.car.vin)}`}
    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-(--brc-primary) px-5 text-sm font-bold text-white transition-all hover:brightness-95 [font-family:var(--brc-font-ui)]"
  >
    Relist this vehicle
  </Link>
)}
```

Import `Link` from `next/link` if not already imported. Place it near the seller's "Mark as sold" / buyer waiting block, styled to match the page's existing buttons (reuse the surrounding classes/tokens).

- [ ] **Step 3: Prefill the VIN on the Add-car form from `?vin=`**

In `frontend/src/app/owner/my-cars/new/page.tsx`, read the query param and set the initial VIN. Use `useSearchParams` from `next/navigation`:

```ts
import { useSearchParams } from "next/navigation";
// inside the component:
const searchParams = useSearchParams();
const prefillVin = searchParams.get("vin") ?? "";
```

Set the form default `vin` to `prefillVin` (in the `defaultValues`, change `vin: ""` to `vin: prefillVin`). Since `defaultValues` is evaluated once, this prefills on first render.

> If the page isn't already wrapped for `useSearchParams` (Next needs a Suspense boundary for client search params in some setups), and the build warns, wrap the page's default export body in `<Suspense>` or add `export const dynamic = "force-dynamic";` at the top of the route — match whatever the repo's other query-param pages do (e.g. `owner/offers` uses `useSearchParams`).

- [ ] **Step 4: Surface the relist VIN error**

The create flow already shows the API error message (the serializer returns the exact copy). Verify the new-car submit path surfaces `ApiError.message` (toast/field error) so a blocked relister sees "You can only relist a vehicle you bought…". If the VIN field maps server errors, no change is needed; otherwise ensure the top-level submit error toast shows it.

- [ ] **Step 5: Verify build + lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/deals frontend/src/app/owner/my-cars/new/page.tsx
git commit -m "feat(deals): relist a bought vehicle from the completed deal (VIN prefill)"
```

---

## Final verification

- [ ] `cd backend && uv run ruff check . && uv run pytest -q` → clean + green.
- [ ] `cd frontend && npm run build && npm run lint` → clean.
- [ ] Manual smoke (dev DB migrated): complete a buy deal (seller marks sold → car archived); as the buyer (verified owner) open `/deals/[id]` → "Relist this vehicle" → Add-car form opens with the VIN prefilled → submit succeeds; a different owner entering that VIN is rejected with the relist message.
- [ ] Then use **superpowers:finishing-a-development-branch** to open the PR against `main`.

---

## Self-Review notes

- **Spec coverage:** partial-unique VIN + plate (T1) ✓; ownership-proof helper (T2) ✓; relist-aware `validate_vin` + `validate_plate_number` + serializer context (T3) ✓; VIN exposed on deal detail (T4) ✓; frontend relist link + `?vin=` prefill + error copy (T5) ✓. `complete_deal` unchanged — no task, by design ✓. Identity gate reused (the create view already enforces verified owner) — no task needed ✓.
- **Placeholder scan:** the only "confirm/verify" steps (T5 Step 4, the Suspense note) are "check the existing pattern and match it" instructions, not vague TODOs; every code step has complete code.
- **Type consistency:** `latest_completed_deal_for_vin` (T2) is used verbatim in T3; `DealCar.vin` (T4 backend, T5 type) matches; the relist rejection copy ("relist a vehicle you bought") is asserted in T3's test and shown in T5.
