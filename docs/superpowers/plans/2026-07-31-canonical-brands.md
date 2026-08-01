# Canonical Brand List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace free-text `Car.brand` with a canonical, staff-managed `Brand` list so listings use consistent brand values and buyer filtering/facets are clean.

**Architecture:** A new `Brand` table is the source of truth (seeded from a bundled makes list). `Car.brand` stays a string but is validated on write to be a canonical `Brand.name`; unrecognised brands go into a new `Car.brand_other` field, flagged for staff. A data migration auto-matches existing free-text brands (normalize + alias map). The buyer filter-options facet reads from `Brand`. Frontend: the listing form brand field becomes a searchable Select with an "Other" escape hatch.

**Tech Stack:** Django 5.2 + DRF (backend, `uv`, `manage.py test`; CI runs `ruff check` + `pytest`), Next.js 16 + React Query + shadcn (frontend).

**Workflow split:** Backend tasks (1–7) are written BY THE USER (Namy) with Claude guiding step-by-step TDD. Frontend tasks (8–9) Claude implements directly.

**Branch:** `feat/spec4-canonical-brands` (already created off `origin/main`, spec committed).

**Conventions:**
- Run backend tests: `cd backend && uv run python manage.py test <path>`. Keep imports at top-of-file (CI's ruff flags E402) and remove unused imports (F401).
- Apply migrations to the dev DB after `makemigrations`: `uv run python manage.py migrate`.
- `docs/` is gitignored — commit plan/spec with `git add -f`.
- No `Co-Authored-By` trailer.

---

## File Structure

**Backend (`backend/apps/listings/`)**
- `brands_data.py` — **Create.** The bundled makes list (`WORLD_MAKES`), the Nigeria-popular subset (`POPULAR_NG`), the alias map (`BRAND_ALIASES`), and helpers (`normalize`, `match_brand`).
- `models.py` — **Modify.** Add `Brand` model; add `Car.brand_other` + `needs_brand_review` property.
- `admin.py` — **Modify.** Register `Brand`.
- `management/commands/seed_brands.py` — **Create.** Idempotent seed command.
- `serializers.py` — **Modify.** `BrandSerializer`; brand validation in `CarCreateSerializer`.
- `views.py` — **Modify.** `BrandListView`; filter-options `brands` facet from `Brand`.
- `urls.py` — **Modify.** Add `cars/brands` route.
- `migrations/` — the schema migrations + one data migration for existing cars.
- `tests.py` (or `tests/`) — new tests per task.

**Frontend (`frontend/src`)**
- `features/listings/api/*` — `useBrands` hook + `Brand` type.
- `app/owner/my-cars/new/page.tsx` + `features/listings/schemas.ts` — brand Select + "Other" field.
- Buyer filter already consumes `useFilterOptions().brands` — verify only.

---

## Task 1: `Brand` model

**Files:**
- Modify: `backend/apps/listings/models.py`
- Modify: `backend/apps/listings/admin.py`
- Test: `backend/apps/listings/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/listings/tests.py`:

```python
from django.test import TestCase

from apps.listings.models import Brand


class BrandModelTest(TestCase):
    def test_slug_is_derived_from_name(self):
        b = Brand.objects.create(name="Mercedes-Benz")
        self.assertEqual(b.slug, "mercedes-benz")
        self.assertTrue(b.is_active)

    def test_ordering_is_display_order_then_name(self):
        Brand.objects.create(name="Zonda", display_order=1000)
        Brand.objects.create(name="Toyota", display_order=10)
        Brand.objects.create(name="Acura", display_order=1000)
        names = list(Brand.objects.values_list("name", flat=True))
        self.assertEqual(names, ["Toyota", "Acura", "Zonda"])
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run python manage.py test apps.listings.tests.BrandModelTest -v 2`
Expected: FAIL — `ImportError: cannot import name 'Brand'`.

- [ ] **Step 3: Implement `Brand`**

In `backend/apps/listings/models.py`, ensure `slugify` is imported at the top:

```python
from django.utils.text import slugify
```

Add the model (place it near the top of the file, before `Car`):

```python
class Brand(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    is_active = models.BooleanField(default=True)
    # Lower sorts first — Nigeria-common brands get a low value so they float
    # to the top of the picker; ties break alphabetically.
    display_order = models.PositiveSmallIntegerField(default=1000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["display_order", "name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
```

> `uuid` is already imported in this file (used by `Car`). If not, add `import uuid` at the top.

- [ ] **Step 4: Make & apply the migration**

Run:
```bash
cd backend && uv run python manage.py makemigrations listings && uv run python manage.py migrate
```
Expected: a migration adding `Brand`, applied cleanly.

- [ ] **Step 5: Register in admin**

In `backend/apps/listings/admin.py`, add:

```python
from .models import Brand


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "display_order")
    list_editable = ("is_active", "display_order")
    search_fields = ("name", "slug")
    ordering = ("display_order", "name")
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && uv run python manage.py test apps.listings.tests.BrandModelTest -v 2`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/apps/listings/models.py backend/apps/listings/admin.py backend/apps/listings/migrations/ backend/apps/listings/tests.py
git commit -m "feat(listings): Brand model (canonical brand list)"
```

---

## Task 2: Brands dataset + `seed_brands` command

**Files:**
- Create: `backend/apps/listings/brands_data.py`
- Create: `backend/apps/listings/management/commands/seed_brands.py` (+ `management/__init__.py`, `management/commands/__init__.py` if missing)
- Test: `backend/apps/listings/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/listings/tests.py`:

```python
class SeedBrandsCommandTest(TestCase):
    def test_seed_is_idempotent_and_includes_local_brands(self):
        from django.core.management import call_command
        from apps.listings.models import Brand

        call_command("seed_brands")
        first = Brand.objects.count()
        self.assertGreaterEqual(first, 100)
        # Nigeria-relevant makes are present.
        self.assertTrue(Brand.objects.filter(name="Innoson").exists())
        self.assertTrue(Brand.objects.filter(name="Toyota").exists())
        # A curated popular brand floats to the top.
        self.assertLess(Brand.objects.get(name="Toyota").display_order, 100)

        call_command("seed_brands")  # idempotent
        self.assertEqual(Brand.objects.count(), first)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run python manage.py test apps.listings.tests.SeedBrandsCommandTest -v 2`
Expected: FAIL — `Unknown command: 'seed_brands'`.

- [ ] **Step 3: Create the dataset module**

Create `backend/apps/listings/brands_data.py`:

```python
import re

# Curated set that should sort to the top of the picker (common on NG roads).
POPULAR_NG = [
    "Toyota", "Lexus", "Honda", "Mercedes-Benz", "Lexus", "Hyundai", "Kia",
    "Ford", "Nissan", "Volkswagen", "BMW", "Peugeot", "Land Rover", "Mazda",
    "Mitsubishi", "Acura", "Innoson", "IVM",
]

# Broad world make-list (majors + a wide long tail). Staff can add more in admin.
WORLD_MAKES = [
    "Toyota", "Lexus", "Honda", "Acura", "Nissan", "Infiniti", "Mazda",
    "Mitsubishi", "Subaru", "Suzuki", "Isuzu", "Daihatsu", "Hyundai", "Kia",
    "Genesis", "Ssangyong", "Daewoo", "Ford", "Lincoln", "Chevrolet", "GMC",
    "Cadillac", "Buick", "Dodge", "Ram", "Chrysler", "Jeep", "Tesla", "Rivian",
    "Lucid", "Volkswagen", "Audi", "Porsche", "BMW", "Mini", "Mercedes-Benz",
    "Smart", "Maybach", "Opel", "Volvo", "Polestar", "Saab", "Peugeot",
    "Citroen", "DS", "Renault", "Dacia", "Alpine", "Fiat", "Alfa Romeo",
    "Lancia", "Ferrari", "Maserati", "Lamborghini", "Pagani", "Iveco",
    "Land Rover", "Range Rover", "Jaguar", "Aston Martin", "Bentley",
    "Rolls-Royce", "Lotus", "McLaren", "MG", "Vauxhall", "Seat", "Cupra",
    "Skoda", "Koenigsegg", "Bugatti", "Abarth", "Chery", "Geely", "BYD",
    "Great Wall", "Haval", "GAC", "JAC", "Changan", "Dongfeng", "Foton",
    "Baic", "Hongqi", "Nio", "Xpeng", "Li Auto", "Wuling", "Tata", "Mahindra",
    "Maruti Suzuki", "Proton", "Perodua", "VinFast", "Innoson", "IVM",
    "Nord", "Holden", "Hummer", "Pontiac", "Saturn", "Scion", "Fisker",
    "Rimac", "Zotye", "Brilliance", "Lifan", "Roewe", "Datsun", "Morgan",
    "Caterham", "TVR", "Noble", "Spyker", "Ariel", "Rezvani",
]

BRAND_ALIASES = {
    "benz": "Mercedes-Benz",
    "mercedes": "Mercedes-Benz",
    "mercedes benz": "Mercedes-Benz",
    "merc": "Mercedes-Benz",
    "vw": "Volkswagen",
    "chevy": "Chevrolet",
    "range rover": "Land Rover",
    "landrover": "Land Rover",
    "rangerover": "Land Rover",
    "rolls royce": "Rolls-Royce",
    "alfa": "Alfa Romeo",
    "vw golf": "Volkswagen",
    "toyata": "Toyota",
    "innoson motors": "Innoson",
    "ivm": "IVM",
}


def normalize(raw):
    """Lowercase, trim, collapse internal whitespace, drop punctuation gaps."""
    return re.sub(r"\s+", " ", (raw or "").strip().lower())


def match_brand(raw):
    """Return the canonical Brand.name for a free-text value, or None.

    Tries: exact (case-insensitive) name, slug, then the alias map. Import Brand
    lazily so this module has no app-loading side effects.
    """
    from apps.listings.models import Brand
    from django.utils.text import slugify

    key = normalize(raw)
    if not key:
        return None
    alias = BRAND_ALIASES.get(key)
    if alias:
        return alias
    brand = (
        Brand.objects.filter(name__iexact=key).first()
        or Brand.objects.filter(slug=slugify(key)).first()
    )
    return brand.name if brand else None
```

- [ ] **Step 4: Create the command package (if missing) and the command**

```bash
cd backend
mkdir -p apps/listings/management/commands
touch apps/listings/management/__init__.py apps/listings/management/commands/__init__.py
```

Create `backend/apps/listings/management/commands/seed_brands.py`:

```python
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.listings.brands_data import POPULAR_NG, WORLD_MAKES
from apps.listings.models import Brand


class Command(BaseCommand):
    help = "Seed the canonical Brand list (idempotent)."

    def handle(self, *args, **options):
        popular = {name: i * 10 for i, name in enumerate(POPULAR_NG, start=1)}
        created = 0
        # De-dupe the make list while preserving order.
        seen = set()
        for name in WORLD_MAKES:
            if name in seen:
                continue
            seen.add(name)
            _, was_created = Brand.objects.get_or_create(
                slug=slugify(name),
                defaults={
                    "name": name,
                    "display_order": popular.get(name, 1000),
                },
            )
            created += int(was_created)
        self.stdout.write(
            self.style.SUCCESS(f"Seeded {created} new brand(s); total {Brand.objects.count()}.")
        )
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && uv run python manage.py test apps.listings.tests.SeedBrandsCommandTest -v 2`
Expected: PASS.

- [ ] **Step 6: Seed the dev DB + commit**

```bash
cd backend && uv run python manage.py seed_brands
cd .. && git add backend/apps/listings/brands_data.py backend/apps/listings/management/ backend/apps/listings/tests.py
git commit -m "feat(listings): seed_brands command + bundled makes dataset"
```

---

## Task 3: `Car.brand_other` field

**Files:**
- Modify: `backend/apps/listings/models.py`
- Test: `backend/apps/listings/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/listings/tests.py`:

```python
class BrandOtherFieldTest(TestCase):
    def test_needs_brand_review_reflects_brand_other(self):
        from apps.listings.tests import make_min_car  # add if missing (see note)

        car = make_min_car(brand="", brand_other="Koenigsegg")
        self.assertTrue(car.needs_brand_review)
        car2 = make_min_car(brand="Toyota", brand_other="")
        self.assertFalse(car2.needs_brand_review)
```

> **Note:** if the test module has no minimal-car factory, add a small `make_min_car(**over)` helper that creates a `Car` with the required fields (owner via the existing user factory, `title`, `listing_type`, a price, `year`, `vin`, `plate_number`, `state`). Mirror the setUp of existing listings tests.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run python manage.py test apps.listings.tests.BrandOtherFieldTest -v 2`
Expected: FAIL — `Car() got unexpected keyword 'brand_other'` / `no attribute 'needs_brand_review'`.

- [ ] **Step 3: Add the field + property**

In `backend/apps/listings/models.py`, in the `Car` model just after the `model` field:

```python
    # The owner's typed brand when it isn't on the canonical list. Non-empty
    # ⇒ needs staff review (folded into the Brand table during approval).
    brand_other = models.CharField(max_length=100, blank=True, default="")
```

Add a property on `Car`:

```python
    @property
    def needs_brand_review(self):
        return bool(self.brand_other)
```

- [ ] **Step 4: Make & apply the migration**

Run:
```bash
cd backend && uv run python manage.py makemigrations listings && uv run python manage.py migrate
```
Expected: migration adding `brand_other`, applied.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && uv run python manage.py test apps.listings.tests.BrandOtherFieldTest -v 2`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/listings/models.py backend/apps/listings/migrations/ backend/apps/listings/tests.py
git commit -m "feat(listings): Car.brand_other for unrecognised brands"
```

---

## Task 4: Brand validation in `CarCreateSerializer`

**Files:**
- Modify: `backend/apps/listings/serializers.py`
- Test: `backend/apps/listings/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/listings/tests.py`:

```python
class BrandValidationTest(TestCase):
    def setUp(self):
        from django.core.management import call_command
        call_command("seed_brands")

    def _payload(self, **over):
        # Minimal valid CarCreateSerializer payload; adjust field names to match
        # the existing create tests in this module if they differ.
        data = {
            "title": "Clean ride",
            "listing_type": "buy",
            "sale_price": "5000000.00",
            "brand": "Toyota",
            "model": "Corolla",
            "year": 2018,
            "vin": "1HGCM82633A004352",
            "plate_number": "ABC123DE",
            "state": "Lagos",
        }
        data.update(over)
        return data

    def _serializer(self, **over):
        from apps.listings.serializers import CarCreateSerializer
        return CarCreateSerializer(data=self._payload(**over))

    def test_known_brand_stored_canonical(self):
        s = self._serializer(brand="toyota")  # lowercase → canonical
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data["brand"], "Toyota")
        self.assertEqual(s.validated_data.get("brand_other", ""), "")

    def test_other_brand_goes_to_brand_other(self):
        s = self._serializer(brand="", brand_other="Koenigsegg")
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data["brand"], "")
        self.assertEqual(s.validated_data["brand_other"], "Koenigsegg")

    def test_unknown_brand_without_other_is_rejected(self):
        s = self._serializer(brand="Definitely Not A Brand")
        self.assertFalse(s.is_valid())
        self.assertIn("brand", s.errors)
```

> Match the payload keys to the existing `CarCreateSerializer` create tests in this file (e.g. rent vs buy price fields). Reuse the module's existing helper if one builds a create payload.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run python manage.py test apps.listings.tests.BrandValidationTest -v 2`
Expected: FAIL — lowercase "toyota" is stored as-is / "Other" not handled / unknown brand accepted.

- [ ] **Step 3: Add `brand_other` to fields + validate**

In `backend/apps/listings/serializers.py`, add `"brand_other"` to `CarCreateSerializer.Meta.fields` (right after `"model"`), and make it optional:

```python
        extra_kwargs = {
            "vin": {"validators": []},
            "plate_number": {"validators": []},
            "brand": {"required": False},
            "brand_other": {"required": False},
        }
```

Add brand normalization at the **start** of the existing `validate(self, data)` method (before the price logic):

```python
        from apps.listings.brands_data import match_brand

        brand_other = (data.get("brand_other") or "").strip()
        brand = (data.get("brand") or "").strip()
        if brand_other:
            data["brand"] = ""
            data["brand_other"] = brand_other
        elif brand:
            canonical = match_brand(brand)
            if canonical is None:
                raise serializers.ValidationError(
                    {"brand": "Pick a brand from the list, or choose 'Other'."}
                )
            data["brand"] = canonical
            data["brand_other"] = ""
        elif not self.instance:
            raise serializers.ValidationError({"brand": "Brand is required."})
```

> On edit (`self.instance` set) with neither field provided, leave the existing brand untouched — the last `elif not self.instance` guard only requires a brand on create.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && uv run python manage.py test apps.listings.tests.BrandValidationTest -v 2`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full listings suite (guard against create-flow regressions)**

Run: `cd backend && uv run python manage.py test apps.listings -v 1`
Expected: green. If an existing create test used a non-canonical brand string, update it to a real brand (e.g. "Toyota") — that's the new contract.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/listings/serializers.py backend/apps/listings/tests.py
git commit -m "feat(listings): validate brand against the canonical list (+ Other)"
```

---

## Task 5: `GET /listings/cars/brands` endpoint

**Files:**
- Modify: `backend/apps/listings/serializers.py`
- Modify: `backend/apps/listings/views.py`
- Modify: `backend/apps/listings/urls.py`
- Test: `backend/apps/listings/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/listings/tests.py`:

```python
from rest_framework.test import APITestCase


class BrandListEndpointTest(APITestCase):
    def setUp(self):
        from django.core.management import call_command
        from apps.listings.models import Brand
        call_command("seed_brands")
        Brand.objects.filter(name="Datsun").update(is_active=False)

    def test_lists_active_brands_ordered(self):
        res = self.client.get("/api/v1/listings/cars/brands")
        self.assertEqual(res.status_code, 200)
        names = [b["name"] for b in res.data]
        self.assertIn("Toyota", names)
        self.assertNotIn("Datsun", names)  # inactive hidden
        self.assertEqual(names[0], "Toyota")  # lowest display_order first
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run python manage.py test apps.listings.tests.BrandListEndpointTest -v 2`
Expected: FAIL — 404 (route missing).

- [ ] **Step 3: Add the serializer**

In `backend/apps/listings/serializers.py`, add (and import `Brand` in the existing `from .models import (...)` block):

```python
class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ["id", "name", "slug"]
```

- [ ] **Step 4: Add the view**

In `backend/apps/listings/views.py`, import `Brand` (add to the existing `from .models import (...)` block) and `BrandSerializer` (add to the `from .serializers import (...)` block), then add:

```python
@method_decorator(cache_page(60 * 30), name="dispatch")
class BrandListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        brands = Brand.objects.filter(is_active=True)
        return Response(BrandSerializer(brands, many=True).data)
```

- [ ] **Step 5: Register the route**

In `backend/apps/listings/urls.py`, add `BrandListView` to the import block and add this path **above** any `cars/<uuid:...>` detail route so it isn't shadowed:

```python
    path("cars/brands", BrandListView.as_view(), name="car-brands"),
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && uv run python manage.py test apps.listings.tests.BrandListEndpointTest -v 2`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/listings/serializers.py backend/apps/listings/views.py backend/apps/listings/urls.py backend/apps/listings/tests.py
git commit -m "feat(listings): GET cars/brands (active canonical brands)"
```

---

## Task 6: Filter-options brands facet from `Brand`

**Files:**
- Modify: `backend/apps/listings/views.py` (`PublicCarFilterOptionsView`)
- Test: `backend/apps/listings/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/listings/tests.py`:

```python
class FilterOptionsBrandsTest(APITestCase):
    def test_brands_facet_is_canonical(self):
        from django.core.management import call_command
        call_command("seed_brands")
        res = self.client.get("/api/v1/listings/cars/filter-options")
        self.assertEqual(res.status_code, 200)
        brands = res.data["brands"]
        self.assertIn("Toyota", brands)
        self.assertIn("Mercedes-Benz", brands)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run python manage.py test apps.listings.tests.FilterOptionsBrandsTest -v 2`
Expected: FAIL — with no published cars, `distinct_values("brand")` returns `[]`, so "Toyota" is absent.

- [ ] **Step 3: Read brands from the Brand table**

In `PublicCarFilterOptionsView.get`, replace the `"brands"` value so it comes from the canonical `Brand` list (active), leaving the other facets as-is:

```python
        from apps.listings.models import Brand

        return Response(
            {
                "states": distinct_values("state"),
                "cities": distinct_values("city"),
                "body_types": distinct_values("body_type"),
                "brands": list(
                    Brand.objects.filter(is_active=True).values_list("name", flat=True)
                ),
            }
        )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && uv run python manage.py test apps.listings.tests.FilterOptionsBrandsTest -v 2`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/listings/views.py backend/apps/listings/tests.py
git commit -m "feat(listings): filter-options brands facet from canonical Brand list"
```

---

## Task 7: Data migration — auto-match existing brands

**Files:**
- Create: `backend/apps/listings/migrations/XXXX_backfill_car_brands.py` (via `makemigrations --empty`)
- Test: `backend/apps/listings/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/listings/tests.py`:

```python
class BrandBackfillHelperTest(TestCase):
    def setUp(self):
        from django.core.management import call_command
        call_command("seed_brands")

    def test_backfill_canonicalizes_and_flags(self):
        from apps.listings.brands_data import canonicalize_car_brand

        self.assertEqual(canonicalize_car_brand("benz"), ("Mercedes-Benz", ""))
        self.assertEqual(canonicalize_car_brand("Mercedes Benz"), ("Mercedes-Benz", ""))
        self.assertEqual(canonicalize_car_brand("toyota"), ("Toyota", ""))
        # Unmatched → moved to brand_other, brand blanked.
        self.assertEqual(canonicalize_car_brand("Kiaa"), ("", "Kiaa"))
        self.assertEqual(canonicalize_car_brand(""), ("", ""))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run python manage.py test apps.listings.tests.BrandBackfillHelperTest -v 2`
Expected: FAIL — `cannot import name 'canonicalize_car_brand'`.

- [ ] **Step 3: Add the helper**

In `backend/apps/listings/brands_data.py`, add:

```python
def canonicalize_car_brand(raw):
    """Return (brand, brand_other) for an existing free-text brand value:
    a canonical match → (canonical, ""); no match → ("", raw). Empty → ("", "")."""
    raw = (raw or "").strip()
    if not raw:
        return "", ""
    canonical = match_brand(raw)
    if canonical:
        return canonical, ""
    return "", raw
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && uv run python manage.py test apps.listings.tests.BrandBackfillHelperTest -v 2`
Expected: PASS.

- [ ] **Step 5: Write the data migration**

Create an empty migration:
```bash
cd backend && uv run python manage.py makemigrations listings --empty --name backfill_car_brands
```

Fill it in:

```python
from django.db import migrations


def forwards(apps, schema_editor):
    from apps.listings.brands_data import canonicalize_car_brand
    from django.core.management import call_command

    # Ensure the canonical list exists before matching against it.
    call_command("seed_brands")

    Car = apps.get_model("listings", "Car")
    for car in Car.objects.all().only("id", "brand", "brand_other"):
        brand, other = canonicalize_car_brand(car.brand)
        if brand != car.brand or other != car.brand_other:
            car.brand = brand
            car.brand_other = other
            car.save(update_fields=["brand", "brand_other"])


class Migration(migrations.Migration):
    dependencies = [
        # Point at the migration from Task 3 (adds brand_other) — the latest
        # listings migration at this point.
        ("listings", "XXXX_previous"),
    ]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
```

> Replace `XXXX_previous` with the actual latest listings migration name (`ls backend/apps/listings/migrations`). `match_brand` uses the real `Brand` model (not the historical one) via a lazy import — fine for a data migration that also seeds.

- [ ] **Step 6: Apply + verify + run the full suite**

Run:
```bash
cd backend && uv run python manage.py migrate
uv run python manage.py test apps.listings -v 1
```
Expected: migration applies; suite green.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/listings/brands_data.py backend/apps/listings/migrations/ backend/apps/listings/tests.py
git commit -m "feat(listings): backfill existing car brands to the canonical list"
```

---

## Task 8: Frontend — listing form brand Select + "Other"

**Files:**
- Modify: `frontend/src/features/listings/api/types.ts` + `listings-api.ts` (Brand type + `useBrands`)
- Modify: `frontend/src/features/listings/schemas.ts` (add `brand_other`)
- Modify: `frontend/src/app/owner/my-cars/new/page.tsx` (brand field)

- [ ] **Step 1: Add the Brand type + hook**

In `frontend/src/features/listings/api/types.ts`:

```ts
export type Brand = { id: string; name: string; slug: string };
```

In `frontend/src/features/listings/api/listings-api.ts` (reuse the existing `carKeys`/query style):

```ts
export function useBrands() {
  return useQuery({
    queryKey: ["cars", "brands"] as const,
    queryFn: () => apiClient.get<Brand[]>("/listings/cars/brands"),
    staleTime: 30 * 60 * 1000,
  });
}
```

Export `useBrands` from the feature barrel (`frontend/src/features/listings/api/index.ts`).

- [ ] **Step 2: Add `brand_other` to the form schema + create payload**

In `frontend/src/features/listings/schemas.ts`, add an optional `brand_other: z.string().optional()` (or the file's equivalent) alongside `brand`, and ensure the new-car create payload forwards `brand_other`. In `frontend/src/app/owner/my-cars/new/page.tsx`, add `brand_other: ""` to the form's initial values (near `brand: ""` at ~line 291) and include it in the submit payload.

- [ ] **Step 3: Replace the brand TextField with a Select + "Other"**

In `frontend/src/app/owner/my-cars/new/page.tsx`, replace the brand `TextField` (~line 536) with a searchable brand picker driven by `useBrands()`:
- Render a searchable Select (reuse the app's shadcn `Select`/`Command` combobox pattern already used elsewhere in the form; if the form uses a custom `SelectField`, use that) with options = `brands.map(b => ({ value: b.name, label: b.name }))`, plus a final **"Other (not listed)"** option with a sentinel value `"__other__"`.
- When the user picks `"__other__"`, set `form.setValue("brand", "")` and reveal a `TextField` bound to `brand_other` ("Enter the brand"). Otherwise set `brand` to the chosen name and clear `brand_other`.
- Keep the **Model** field as the existing free-text `TextField`.

Follow the existing field styling (`--brc-*` tokens, `[font-family:var(--brc-font-ui)]`), matching the surrounding fields.

- [ ] **Step 4: Verify build + lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/listings frontend/src/app/owner/my-cars/new/page.tsx
git commit -m "feat(listings): brand picker (canonical list + Other) on the listing form"
```

---

## Task 9: Frontend — verify buyer brand filter

**Files:**
- Read/verify: the buyer browse filter that consumes `useFilterOptions().brands`.

- [ ] **Step 1: Confirm the buyer filter reads the canonical facet**

The buyer browse filter already renders `useFilterOptions().brands`. Locate it (`grep -rn "useFilterOptions\|\.brands" frontend/src/app frontend/src/features/listings/components`) and confirm the brand dropdown maps over that array. Since Task 6 makes that facet canonical, no data change is needed — just verify the dropdown renders the values (no client-side transform that assumed free-text).

- [ ] **Step 2: Verify build + lint (no code change expected)**

Run: `cd frontend && npm run build && npm run lint`
Expected: clean. If the filter component needed a tweak (e.g. it hard-coded a brand list), make it read `useFilterOptions().brands` and re-run.

- [ ] **Step 3: Commit (only if changed)**

```bash
git add frontend/src/features/listings frontend/src/app
git commit -m "chore(listings): buyer brand filter reads canonical facet"
```

---

## Final verification

- [ ] `cd backend && uv run ruff check . && uv run python manage.py test apps.listings -v 1` → clean + green.
- [ ] `cd frontend && npm run build && npm run lint` → clean.
- [ ] Manual smoke (dev DB seeded + migrated): list a car → Brand picker shows canonical brands, "Other" reveals a text field; a known brand saves canonically; buyer browse brand filter shows the clean list.
- [ ] Then use **superpowers:finishing-a-development-branch** to open the PR against `main`.

---

## Self-Review notes

- **Spec coverage:** Brand model (T1) ✓; seed + dataset + Nigeria brands + popular ordering (T2) ✓; `brand_other` + review flag (T3) ✓; write-time validation incl. Other/reject (T4) ✓; brands endpoint (T5) ✓; filter-options facet from Brand (T6) ✓; migration auto-match + alias + flag (T7) ✓; frontend form picker + Other (T8) ✓; buyer filter (T9) ✓. Admin registration in T1. "Model stays free-text" — untouched throughout ✓.
- **Placeholder scan:** the only intentional fill-ins are `XXXX_previous` (real migration name, resolved at T7) and matching the create payload keys to existing tests (T4) — both are "use the real value here" instructions, not vague TODOs.
- **Type consistency:** `match_brand`, `canonicalize_car_brand`, `POPULAR_NG`, `WORLD_MAKES`, `BRAND_ALIASES` in `brands_data.py` are defined in T2/T7 and used consistently; `Brand` fields (name/slug/is_active/display_order) and `Car.brand_other` are consistent across model, serializer, endpoint, migration, and frontend type.
