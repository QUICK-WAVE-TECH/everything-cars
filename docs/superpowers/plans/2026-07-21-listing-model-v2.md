# Listing Model v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Workflow for this batch:** Backend tasks (1–6) are written BY THE USER (Namy) with Claude guiding step-by-step — failing test first, explain why, review the code Namy writes. Frontend tasks (7–8) Claude implements directly.

**Goal:** A car is listed for Rent XOR Buy (never both), carries a unique staff/owner-only VIN + plate, buy listings declare negotiable/non-negotiable, and reviews exist only on rent listings.

**Architecture:** Schema change on `Car` (drop `both`, add `vin`/`plate_number`/`is_negotiable`) plus a data migration deleting the 9 dev `both`-cars. All new invariants (XOR pricing, VIN/plate format + uniqueness + privacy, request/review gating) live in the DRF serializer/view layer — the model stays permissive (nullable) so legacy rows and the Django admin keep working.

**Tech Stack:** Django 5.2, DRF, Postgres (partial-null unique constraints), pytest. Frontend: Next.js 16, React Query, base-ui/shadcn.

**Spec:** `docs/superpowers/specs/2026-07-19-listing-model-v2-design.md`

---

### Task 1: Schema — drop `both`, add VIN/plate/negotiable, delete `both`-cars

**Files:**
- Modify: `backend/apps/listings/models.py:8-11` (ListingType), `:93-116` (Car fields)
- Create: `backend/apps/listings/migrations/0011_car_vin_plate_negotiable.py` (autogen)
- Create: `backend/apps/listings/migrations/0012_delete_both_cars.py` (data migration)
- Test: `backend/apps/listings/tests.py`

- [ ] **Step 1: Write the failing test** (data migration deletes `both`, leaves rent/buy)

```python
# in apps/listings/tests.py — uses django_test_migrations if available, else a plain
# RunPython-behaviour test that calls the migration's forward function directly.
from apps.listings.migrations import _both_cleanup  # helper we will expose

class DeleteBothCarsMigrationTest(TestCase):
    def test_both_cars_and_dependents_deleted(self):
        owner = User.objects.create_user(email="o@x.com", password="p", national_id="12345678901")
        both = Car.objects.create(owner=owner, title="B", listing_type="both",
                                  rent_price_per_day=10, sale_price=20, brand="T", model="C",
                                  year=2020, state="Lagos")
        rent = Car.objects.create(owner=owner, title="R", listing_type="rent",
                                  rent_price_per_day=10, brand="T", model="C", year=2020, state="Lagos")
        _both_cleanup(Car)
        self.assertFalse(Car.objects.filter(id=both.id).exists())
        self.assertTrue(Car.objects.filter(id=rent.id).exists())
```

- [ ] **Step 2: Run it, expect ImportError / fail**

Run: `cd backend && uv run python manage.py test apps.listings.tests.DeleteBothCarsMigrationTest -v2`
Expected: FAIL (no `_both_cleanup`).

- [ ] **Step 3: Edit the model** — remove `BOTH` from `ListingType`, add three fields on `Car` (after `sale_price`):

```python
class ListingType(models.TextChoices):
    RENT = "rent", "Rent"
    BUY = "buy", "Buy"

# on Car, after sale_price:
    vin = models.CharField(max_length=17, null=True, blank=True, unique=True)
    plate_number = models.CharField(max_length=12, null=True, blank=True, unique=True)
    is_negotiable = models.BooleanField(null=True, blank=True)
    min_price = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    max_price = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
```

`min_price`/`max_price` are the owner's private acceptable range — added now so the Car
model migrates once. The offer/bidding workflow that consumes them is Spec D; in Spec A
they only get storage + listing-form validation (Task 3) + privacy (Task 4).

- [ ] **Step 4: Generate schema migration**

Run: `cd backend && uv run python manage.py makemigrations listings`
Expected: creates `0011_...`. If it prompts about `both` choice removal, that's a no-op on a CharField — accept.

- [ ] **Step 5: Write the data migration** `0012_delete_both_cars.py`

```python
from django.db import migrations

def _both_cleanup(Car):
    Car.objects.filter(listing_type="both").delete()  # FK cascades remove dependents

def forwards(apps, schema_editor):
    _both_cleanup(apps.get_model("listings", "Car"))

class Migration(migrations.Migration):
    dependencies = [("listings", "0011_car_vin_plate_negotiable")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
```

Expose `_both_cleanup` for the test by importing it in the migration module and re-exporting from a tiny helper the test imports (or import the migration module in the test). Simplest: `from apps.listings.migrations import 0012_delete_both_cars` isn't valid (leading digit) — instead put `_both_cleanup` in `apps/listings/migration_helpers.py`, import it in both the migration and the test.

- [ ] **Step 6: Run migrations + test**

Run: `cd backend && uv run python manage.py migrate listings && uv run python manage.py test apps.listings.tests.DeleteBothCarsMigrationTest -v2`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/listings/models.py backend/apps/listings/migrations/ backend/apps/listings/migration_helpers.py backend/apps/listings/tests.py
git commit -m "feat(listings): drop both listing type, add vin/plate/negotiable fields, delete both-cars"
```

---

### Task 2: VIN + plate normalization, format & uniqueness validation

**Files:**
- Modify: `backend/apps/listings/serializers.py` — `CarCreateSerializer` (fields list ~409, add `validate_vin`/`validate_plate_number`)
- Test: `backend/apps/listings/tests.py`

- [ ] **Step 1: Failing tests**

```python
class VinPlateValidationTest(APITestCase):
    # helper posts a minimal valid rent car with the given vin/plate
    def test_vin_normalized_uppercase(self): ...   # "1hgcm82633a004352" -> stored upper
    def test_vin_bad_length_400(self): ...          # 16 chars -> 400
    def test_vin_illegal_letter_400(self): ...      # contains I/O/Q -> 400
    def test_plate_normalized_strip(self): ...      # "abc 123" -> "ABC123"
    def test_plate_too_short_400(self): ...         # 4 chars -> 400
    def test_duplicate_vin_generic_message(self):   # second car same vin -> 400 generic
        ...
        self.assertIn("already registered on the platform", str(resp.data))
        self.assertNotIn(other_owner_email, str(resp.data))
```

- [ ] **Step 2: Run, expect fail** — `uv run python manage.py test apps.listings.tests.VinPlateValidationTest`

- [ ] **Step 3: Add `vin` + `plate_number` to `CarCreateSerializer.Meta.fields`, add validators**

```python
import re
VIN_RE = re.compile(r"^[A-HJ-NPR-Z0-9]{17}$")

def validate_vin(self, value):
    if value in (None, ""):
        raise serializers.ValidationError("VIN is required.")
    v = value.strip().upper()
    if not VIN_RE.match(v):
        raise serializers.ValidationError("Enter a valid 17-character VIN.")
    qs = Car.objects.filter(vin=v)
    if self.instance:
        qs = qs.exclude(pk=self.instance.pk)
    if qs.exists():
        raise serializers.ValidationError("This vehicle is already registered on the platform.")
    return v

def validate_plate_number(self, value):
    if value in (None, ""):
        raise serializers.ValidationError("Plate number is required.")
    p = re.sub(r"[\s-]", "", value).upper()
    if not (5 <= len(p) <= 12 and p.isalnum()):
        raise serializers.ValidationError("Enter a valid plate number (5–12 letters/numbers).")
    qs = Car.objects.filter(plate_number=p)
    if self.instance:
        qs = qs.exclude(pk=self.instance.pk)
    if qs.exists():
        raise serializers.ValidationError("This vehicle is already registered on the platform.")
    return p
```

- [ ] **Step 4: Run, expect pass. Step 5: commit** `feat(listings): validate + normalize VIN and plate with generic duplicate error`

---

### Task 3: Strict XOR pricing + is_negotiable rules

**Files:** Modify `CarCreateSerializer.validate` (`serializers.py:431-452`). Test: `tests.py`

- [ ] **Step 1: Failing tests**

```python
class XorPricingTest(APITestCase):
    def test_rent_requires_rent_price_clears_sale(self):   # rent + sale_price set -> saved sale_price None
    def test_rent_without_rent_price_400(self):
    def test_buy_requires_sale_price_clears_rent(self):
    def test_buy_without_sale_price_400(self):
    def test_buy_requires_is_negotiable(self):             # buy, is_negotiable omitted -> 400
    def test_rent_forces_is_negotiable_null(self):         # rent + is_negotiable=true -> stored None
    def test_listing_type_both_rejected(self):             # listing_type="both" -> 400 (choice gone)
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Rewrite `validate`** — resolve effective values from instance on PATCH, then:

```python
def validate(self, data):
    lt = data.get("listing_type", getattr(self.instance, "listing_type", None))
    rent = data.get("rent_price_per_day", getattr(self.instance, "rent_price_per_day", None))
    sale = data.get("sale_price", getattr(self.instance, "sale_price", None))
    neg = data.get("is_negotiable", getattr(self.instance, "is_negotiable", None))

    if lt == ListingType.RENT:
        if rent is None:
            raise serializers.ValidationError({"rent_price_per_day": "Required for a rent listing."})
        data["sale_price"] = None
        data["is_negotiable"] = None
    elif lt == ListingType.BUY:
        if sale is None:
            raise serializers.ValidationError({"sale_price": "Required for a buy listing."})
        if neg is None and "is_negotiable" not in data:
            raise serializers.ValidationError({"is_negotiable": "Choose negotiable or non-negotiable."})
        data["rent_price_per_day"] = None
        mn = data.get("min_price", getattr(self.instance, "min_price", None))
        mx = data.get("max_price", getattr(self.instance, "max_price", None))
        if neg:
            if mn is None or mx is None:
                raise serializers.ValidationError(
                    {"min_price": "Set a private minimum and maximum for a negotiable listing."})
            if mn > mx:
                raise serializers.ValidationError(
                    {"min_price": "Minimum cannot be greater than maximum."})
        else:
            data["min_price"] = None
            data["max_price"] = None
    return data
```

Add `is_negotiable`, `min_price`, `max_price` to `CarCreateSerializer.Meta.fields`. Extend the
test class with: `test_negotiable_buy_requires_min_max_400`, `test_min_greater_than_max_400`,
`test_non_negotiable_buy_clears_min_max`.

`listing_type="both"` now fails DRF ChoiceField validation automatically (400) — the test asserts it.

- [ ] **Step 4: Run pass. Step 5: commit** `feat(listings): enforce rent-XOR-buy pricing and buy-only negotiable flag`

---

### Task 4: VIN/plate privacy (owner + staff only, never public)

**Files:** Modify `CarDetailSerializer` (`serializers.py:192-246`). Test: `tests.py`

- [ ] **Step 1: Failing tests**

```python
class VinPlatePrivacyTest(APITestCase):
    def test_public_detail_omits_vin_plate(self):   # GET public detail -> no "vin"/"plate_number" keys
    def test_owner_detail_includes_vin_plate(self): # GET my-cars detail -> keys present
    def test_admin_detail_includes_vin_plate(self): # GET admin detail -> keys present
    def test_public_list_omits_vin_plate(self):     # public list rows never contain them
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3:** Add `"vin"` and `"plate_number"` to `CarDetailSerializer.Meta.fields`, then strip them in a `to_representation` override when the context is public:

```python
def to_representation(self, instance):
    data = super().to_representation(instance)
    if self.context.get("public"):
        for key in ("vin", "plate_number", "min_price", "max_price"):
            data.pop(key, None)
    return data
```

Add `"min_price"` and `"max_price"` to `CarDetailSerializer.Meta.fields` alongside `vin`/`plate_number`.
Do NOT add any of them to `CarListSerializer` (shared by public list) — the list-omission test passes for free.
Extend the privacy test to assert public payloads also omit `min_price`/`max_price`, and owner/admin payloads include them.

- [ ] **Step 4: Run pass. Step 5: commit** `feat(listings): expose vin/plate to owner+staff, never in public payloads`

---

### Task 5: Request/listing type strict match

**Files:** Modify `RequestCreateSerializer.validate` (`serializers.py:634-644`). Test: `tests.py`

- [ ] **Step 1: Failing tests**

```python
class RequestTypeMatchTest(APITestCase):
    def test_rent_request_on_buy_car_400(self):
    def test_buy_request_on_rent_car_400(self):
    def test_matching_request_ok(self):
```

- [ ] **Step 2: Run, expect fail** (today a mismatch may pass because of the removed `both` guard).

- [ ] **Step 3:** Drop the `!= ListingType.BOTH` guard — the check becomes unconditional equality:

```python
if car and request_type and request_type != car.listing_type:
    raise serializers.ValidationError({"request_type": (
        f"This listing only accepts {car.get_listing_type_display().lower()} requests.")})
```

- [ ] **Step 4: Run pass. Step 5: commit** `feat(listings): request type must match listing type`

---

### Task 6: Reviews only on rent listings

**Files:** Modify `apps/reviews/views.py` (`CarReviewListCreateView.get` ~28, `.post` ~47). Test: `apps/reviews/tests.py`

- [ ] **Step 1: Failing tests**

```python
class RentOnlyReviewTest(APITestCase):
    def test_buy_car_reviews_get_returns_empty(self):   # GET buy-car reviews -> 200, results == []
    def test_review_post_on_buy_car_400(self):          # completed buy request -> 400 "rental listings"
    def test_review_post_on_rent_car_ok(self):          # completed rent request -> 201
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3a:** In `get`, short-circuit buy cars:

```python
car = Car.objects.filter(id=car_id).first()
if car and car.listing_type != ListingType.RENT:
    paginator = StandardPagination()
    page = paginator.paginate_queryset(Review.objects.none(), request)
    response = paginator.get_paginated_response([])
    response.data["avg_rating"] = None
    response.data["review_count"] = 0
    return response
```

- [ ] **Step 3b:** In `post`, after fetching the car, reject non-rent:

```python
if car.listing_type != ListingType.RENT:
    return Response({"detail": "Reviews are only available on rental listings."},
                    status=status.HTTP_400_BAD_REQUEST)
```

- [ ] **Step 4: Run pass. Step 5: commit** `feat(reviews): gate review create + display to rent listings`

---

### Task 7: New-listing form (Rent/Buy, VIN/plate, negotiable) — Claude implements

**Files:** Modify the owner new-listing form + edit form under `frontend/src/features/listings/` (locate the car form component); types under the listings api module.

- [ ] Rent/Buy radio (remove "Both"); single conditional price input driven by selection.
- [ ] VIN + plate inputs with inline normalization hints and client-side format checks mirroring Task 2.
- [ ] "Negotiable / Non-negotiable" toggle rendered only when Buy, default Negotiable.
- [ ] Surface the server's generic duplicate message on 400.
- [ ] `npm run build` + `tsc` + eslint clean. Commit.

---

### Task 8: VIN/plate display + review/negotiable UI — Claude implements

**Files:** owner car detail, admin approvals/detail, public car detail + car cards under `frontend/src/features/`.

- [ ] Owner + admin detail render VIN/plate (read-only, same edit-lockdown rules as other fields).
- [ ] Public pages never render VIN/plate; buy listings show a "Negotiable" badge when `is_negotiable`.
- [ ] Buy listings hide reviews section, review CTA, and rating badges on cards.
- [ ] `npm run build` + `tsc` + eslint clean. Commit.

---

## Verification (whole plan)

- [ ] `cd backend && uv run pytest -q` — all green.
- [ ] `cd backend && uv run ruff check .` — clean.
- [ ] `cd frontend && npm run build` — clean.
- [ ] Update `docs/test-inspection-booking.md` (or a new listing-v2 checklist) with manual checks: both-cars gone, VIN/plate format + duplicate + privacy, XOR pricing, negotiable badge, rent-only reviews.
