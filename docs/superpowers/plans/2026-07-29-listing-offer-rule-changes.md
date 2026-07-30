# Listing & Offer Rule Changes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Spec 1 bundle — drop the private min/max range (negotiable becomes "open to any positive offer"), lower the per-customer offer cap 3→2, rename `ListingFeature.value` to `description`, relabel the "Reserved" badge to "Ongoing negotiations" for buy listings, and surface the seller's business/brand name on the public car detail page.

**Architecture:** Small edits across existing Django models/serializers and Next.js components — no new subsystems. Backend removes two `Car` columns, renames one `ListingFeature` column, deletes the owner private-range endpoint, and adds a computed `business_name` to the public owner block. Frontend strips the range UI, updates copy, renames the feature field, and makes the availability badge listing-type-aware.

**Tech Stack:** Django 5.2 + DRF, pytest-django (`uv run pytest`), Next.js 16 + React Query, shadcn + `@base-ui/react`, Tailwind v4 (`--brc-*` tokens), lucide-react.

**Workflow split:** Backend tasks (1–5) are written **by Namy** with Claude guiding TDD step-by-step (failing test first, explain why, review). Frontend tasks (6–11) are implemented **directly by Claude**.

**Commands:** All backend commands run from `backend/`. Tests: `uv run pytest <path> -v`. Migrations: `uv run python manage.py makemigrations <app>`. Frontend commands run from `frontend/`: `pnpm build`, `pnpm lint` (or `npm`, match the repo lockfile).

---

## File Structure

**Backend**
- `backend/apps/offers/models.py` — `MAX_OFFERS_PER_CAR` constant (3→2).
- `backend/apps/offers/serializers.py` — remove `BELOW_RANGE_MESSAGE` + the floor check.
- `backend/apps/offers/views.py` — delete `OwnerCarRangeView`.
- `backend/apps/offers/urls.py` — delete the `car-range` route.
- `backend/apps/offers/tests.py` — cap test 3→2; delete floor + range-endpoint tests; drop min/max from the fixture.
- `backend/apps/listings/models.py` — drop `Car.min_price`/`max_price`; rename `ListingFeature.value`→`description`.
- `backend/apps/listings/serializers.py` — remove min/max from `CarCreateSerializer` (validation + fields) and `CarDetailSerializer` (fields + strip); rename the feature serializer field; add `business_name` to the owner block.
- `backend/apps/listings/migrations/0014_*`, `0015_*` — the schema changes.
- `backend/apps/listings/tests.py` — new assertions for the serializer changes.
- `backend/seed_dev.py` — stop setting min/max.

**Frontend**
- `frontend/src/features/offers/components/make-offer-dialog.tsx` — copy 3→2.
- `frontend/src/features/listings/components/negotiable-field.tsx` — toggle only.
- `frontend/src/features/listings/schemas.ts` — drop min/max + range refine; feature `value`→`description`.
- `frontend/src/app/owner/my-cars/new/page.tsx` + `frontend/src/app/owner/my-cars/[id]/page.tsx` — drop min/max wiring; feature editor `value`→`description`.
- `frontend/src/features/offers/api/types.ts` + `offers-api.ts` — delete `OwnerCarRange` + `useCarRange` + `offerKeys.range`.
- `frontend/src/app/owner/offers/page.tsx` + `frontend/src/features/offers/components/owner-respond-sheet.tsx` — remove range display.
- `frontend/src/features/listings/api/types.ts` — `ListingFeature.value`→`description`; drop `CarDetail.min_price`/`max_price`; add `CarOwner.business_name`.
- `frontend/src/features/listings/components/availability-badge.tsx` + `frontend/src/shared/components/car-card.tsx` + callers — "Reserved"→"Ongoing negotiations" (buy only).
- `frontend/src/features/listings/components/car-detail-page.tsx` — seller brand; feature `description`; pass listing type to the badge.

---

# BACKEND (Namy writes, TDD)

## Task 1: Offer cap 3→2, remove the price floor, delete the range endpoint

**Files:**
- Modify: `backend/apps/offers/models.py:20`
- Modify: `backend/apps/offers/serializers.py:15-21,69-70`
- Modify: `backend/apps/offers/views.py:166-191`
- Modify: `backend/apps/offers/urls.py:14`
- Test: `backend/apps/offers/tests.py`

No schema migration — these are constant/logic/route changes.

- [ ] **Step 1: Update the cap test to expect 2**

In `backend/apps/offers/tests.py`, replace `test_lifetime_cap_of_three` (currently lines 162–169) with a cap-of-two test:

```python
    def test_lifetime_cap_of_two(self):
        for _ in range(2):
            res = self._post()
            self.assertEqual(res.status_code, 201)
            Offer.objects.filter(
                car=self.car, customer=self.customer, status=OfferStatus.PENDING
            ).update(status=OfferStatus.REJECTED)
        self.assertEqual(self._post().status_code, 400)
```

- [ ] **Step 2: Delete the floor and range-endpoint tests, and the min/max fixture values**

In `backend/apps/offers/tests.py`:
- Delete `test_below_minimum_rejected_with_fixed_message`, `test_below_minimum_message_is_identical_regardless_of_distance`, and `test_response_never_leaks_the_range` (currently lines 111–127).
- Delete the entire `OwnerCarRangeTest` class (currently lines 486–507).
- In the `create_negotiable_car` helper (lines 26–36), remove the `min_price="16000000.00"` and `max_price="17000000.00"` kwargs, keeping `sale_price="18500000.00"`.

Why: the private range no longer exists, so a floor rejection and a range endpoint can't be tested — leaving them would fail to import `OwnerCarRangeView`/reference gone behaviour.

- [ ] **Step 3: Run the offers tests to see the expected failures**

Run: `uv run pytest apps/offers/tests.py -v`
Expected: `test_lifetime_cap_of_two` FAILS (a 3rd offer still returns 201 because the constant is still 3). The deleted tests are gone. Import of `OwnerCarRangeView` may still succeed (view not yet removed).

- [ ] **Step 4: Lower the cap constant**

In `backend/apps/offers/models.py:20`:

```python
MAX_OFFERS_PER_CAR = 2
```

- [ ] **Step 5: Remove the floor check and its message**

In `backend/apps/offers/serializers.py`, delete the `BELOW_RANGE_MESSAGE` constant (lines 15–21) and the floor check at the end of `OfferCreateSerializer.validate` (lines 69–70), so `validate` ends:

```python
        # Counts every offer ever made, including withdrawn and expired ones —
        # otherwise withdraw-and-resubmit would bypass the cap entirely.
        if existing.count() >= MAX_OFFERS_PER_CAR:
            raise serializers.ValidationError(
                {
                    "detail": (
                        f"You have reached the maximum of {MAX_OFFERS_PER_CAR} offers "
                        "on this vehicle."
                    )
                }
            )

        return data
```

Also remove the now-unused import of `BELOW_RANGE_MESSAGE` if it is imported at the top of any other module (grep first: `grep -rn BELOW_RANGE_MESSAGE backend/` — it should appear nowhere after this edit).

- [ ] **Step 6: Delete the range endpoint view and route**

In `backend/apps/offers/views.py`, delete the entire `OwnerCarRangeView` class (lines 166–191). In `backend/apps/offers/urls.py`, delete line 14 (the `cars/<uuid:car_id>/range` path) and remove `OwnerCarRangeView` from the imports in that file.

- [ ] **Step 7: Run the offers tests — all pass**

Run: `uv run pytest apps/offers/tests.py -v`
Expected: PASS. `test_lifetime_cap_of_two` passes; no import errors for the removed view.

- [ ] **Step 8: Commit**

```bash
git add backend/apps/offers/
git commit -m "feat(offers): cap offers at 2 per customer; drop private price floor + range endpoint"
```

---

## Task 2: Drop `Car.min_price` and `Car.max_price`

**Files:**
- Modify: `backend/apps/listings/models.py:125-130`
- Modify: `backend/apps/listings/serializers.py:485-528` (validation), `:474-476` (create fields), `:249-260` (detail fields + strip)
- Create: `backend/apps/listings/migrations/0014_remove_car_min_max_price.py` (via makemigrations)
- Test: `backend/apps/listings/tests.py`

- [ ] **Step 1: Add a failing test — a negotiable buy listing is valid with no range**

`XorPricingTest` (tests.py:1027) drives the create endpoint via `_post(**over)` → `POST /api/v1/listings/my-cars`. Add this method to that class:

```python
    def test_negotiable_buy_valid_without_range(self):
        res = self._post(
            listing_type="buy", sale_price="5000000.00", is_negotiable=True
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Car.objects.get(id=res.data["id"]).is_negotiable)

    def test_car_model_has_no_min_max_fields(self):
        field_names = {f.name for f in Car._meta.get_fields()}
        self.assertNotIn("min_price", field_names)
        self.assertNotIn("max_price", field_names)
```

- [ ] **Step 2: Run it to confirm failure**

Run: `uv run pytest apps/listings/tests.py::XorPricingTest -v`
Expected: `test_negotiable_buy_valid_without_range` FAILS with 400 ("Set a private minimum and maximum…"), and `test_car_model_has_no_min_max_fields` FAILS (fields still present). The existing `test_negotiable_buy_requires_min_max_400`, `test_min_greater_than_max_400`, and `test_negotiable_buy_stores_range` still pass for now.

- [ ] **Step 3: Remove the model fields**

In `backend/apps/listings/models.py`, delete lines 125–130 (the `min_price` and `max_price` `DecimalField` definitions). Leave `is_negotiable` (121–124) and `currency` (131–136) intact.

- [ ] **Step 4: Remove min/max from the create serializer**

In `backend/apps/listings/serializers.py`:
- In `CarCreateSerializer.Meta.fields`, delete the `"min_price"` and `"max_price"` entries (lines 474–476 area).
- In `CarCreateSerializer.validate`, delete the min/max handling. The RENT branch loses lines 500–501 (`data["min_price"]=None`, `data["max_price"]=None`). The BUY branch loses lines 513–528 (the `mn`/`mx` read and the negotiable range requirement + the `else` that nulls them). The `is_negotiable` required check (507–510) stays. The BUY branch becomes:

```python
        elif lt == ListingType.BUY:
            if sale is None:
                raise serializers.ValidationError(
                    {"sale_price": "Required for a buy listing."}
                )
            if self.instance is None and neg is None:
                raise serializers.ValidationError(
                    {"is_negotiable": "Choose negotiable or non-negotiable."}
                )
            data["rent_price_per_day"] = None
        return data
```

- [ ] **Step 5: Remove min/max from the detail serializer**

In `backend/apps/listings/serializers.py` `CarDetailSerializer.Meta.fields`, delete the `"min_price"` and `"max_price"` entries (lines 249–250). In `to_representation` (lines 256–261), drop them from the public-strip tuple so it reads:

```python
    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context.get("public"):
            for key in ("vin", "plate_number"):
                data.pop(key, None)
        return data
```

- [ ] **Step 6: Generate the migration**

Run: `uv run python manage.py makemigrations listings`
Expected: creates `0014_...` with two `RemoveField` operations (`min_price`, `max_price`). This is unambiguous — no interactive prompt.

- [ ] **Step 7: Fix/delete every existing test that references min/max**

`create_car(**extra)` forwards kwargs straight to `Car.objects.create`, so any `min_price=`/`max_price=` call now raises `TypeError`. Apply all of these edits in `backend/apps/listings/tests.py`:

- **Delete** three now-obsolete `XorPricingTest` methods: `test_negotiable_buy_requires_min_max_400` (1077–1083), `test_min_greater_than_max_400` (1085–1095), and `test_negotiable_buy_stores_range` (1097–~1122; it and the immediately following test assert stored/nulled `min_price`/`max_price` — delete both range-storage tests).
- **`test_direct_buy_request_rejected_on_negotiable_car`** (~91–100): remove the `min_price="16000000.00"` and `max_price="18500000.00"` kwargs from the `create_car(...)` call; keep `is_negotiable=True`.
- **`VinPlatePrivacyTest.setUp`** (1141–1148): remove `min_price=...`/`max_price=...` from `create_car(...)`.
- **`VinPlatePrivacyTest.PRIVATE`** (1150): change to `("vin", "plate_number")`.
- **`test_owner_detail_includes_private_fields`** (1164): delete the `self.assertIn("min_price", res.data)` line.
- **`test_admin_detail_includes_private_fields`** (1172): delete the `self.assertIn("min_price", res.data)` line.
- Re-grep to confirm none remain: `grep -n "min_price\|max_price" apps/listings/tests.py` → only the two new tests from Step 1 (which don't reference the columns) should be unrelated; expect zero `min_price=`/`max_price=` kwargs.

- [ ] **Step 8: Run the tests**

Run: `uv run pytest apps/listings/tests.py -v`
Expected: PASS, including the two new tests from Step 1.

- [ ] **Step 9: Commit**

```bash
git add backend/apps/listings/
git commit -m "feat(listings): drop Car.min_price/max_price; negotiable needs no range"
```

---

## Task 3: Rename `ListingFeature.value` → `description`

**Files:**
- Modify: `backend/apps/listings/models.py:226`
- Modify: `backend/apps/listings/serializers.py:65`
- Create: `backend/apps/listings/migrations/0015_rename_listingfeature_value_description.py` (hand-written RenameField)
- Test: `backend/apps/listings/tests.py`

Note: a hand-written `RenameField` migration is used deliberately — `makemigrations` would prompt interactively ("Did you rename … ?"), and a non-interactive run would answer *No* and generate a destructive remove+add. Hand-writing preserves data.

- [ ] **Step 1: Write a failing test**

Add a new test class to `backend/apps/listings/tests.py` (it uses the existing module-level helpers `create_user`/`create_owner_profile`/`create_car`). Add imports at the top if absent: `from apps.listings.models import ListingFeature` and `from apps.listings.serializers import ListingFeatureSerializer`.

```python
class ListingFeatureFieldTest(APITestCase):
    def setUp(self):
        self.owner = create_user("feat-owner@test.com", "owner")
        create_owner_profile(self.owner)
        self.car = create_car(self.owner)

    def test_listing_feature_uses_description_not_value(self):
        field_names = {f.name for f in ListingFeature._meta.get_fields()}
        self.assertIn("description", field_names)
        self.assertNotIn("value", field_names)

    def test_feature_serializer_exposes_description(self):
        ListingFeature.objects.create(car=self.car, name="GPS", description="Built-in")
        data = ListingFeatureSerializer(self.car.features.first()).data
        self.assertEqual(data["description"], "Built-in")
        self.assertNotIn("value", data)
```

Note: before the rename, `ListingFeature.objects.create(..., description=...)` raises (the field is still `value`) — that is the expected red state.

- [ ] **Step 2: Run it to confirm failure**

Run: `uv run pytest apps/listings/tests.py -k "description" -v`
Expected: FAIL — `ListingFeature` still has `value`, not `description`.

- [ ] **Step 3: Rename the model field**

In `backend/apps/listings/models.py:226`:

```python
    description = models.CharField(max_length=200, blank=True)
```

- [ ] **Step 4: Rename the serializer field**

In `backend/apps/listings/serializers.py:65`, change the `ListingFeatureSerializer.Meta.fields` entry from `"value"` to `"description"`:

```python
        fields = ["id", "name", "description", "sort_order"]
```

- [ ] **Step 5: Hand-write the rename migration**

Create `backend/apps/listings/migrations/0015_rename_listingfeature_value_description.py`:

```python
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0014_remove_car_min_max_price"),
    ]

    operations = [
        migrations.RenameField(
            model_name="listingfeature",
            old_name="value",
            new_name="description",
        ),
    ]
```

(Match the `0014_...` name to whatever Task 2 produced.)

- [ ] **Step 6: Run migrations check + tests**

Run: `uv run python manage.py makemigrations listings --check --dry-run`
Expected: "No changes detected" (the model matches the hand-written migration).
Run: `uv run pytest apps/listings/tests.py -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/listings/
git commit -m "feat(listings): rename ListingFeature.value to description"
```

---

## Task 4: Seller business/brand name on the public owner block

**Files:**
- Modify: `backend/apps/listings/serializers.py:69-87` (`CarOwnerSummarySerializer` / `CarOwnerSerializer`)
- Test: `backend/apps/listings/tests.py`

Add a computed `business_name`: the `fleet_name` for a fleet owner, empty string otherwise (individuals are shown by their real name on the frontend). The public querysets already `select_related("owner__owner_profile")` (views.py:597, 703), so no extra query.

- [ ] **Step 1: Write a failing test**

Add these two methods to the existing `VinPlatePrivacyTest` (tests.py:1137) — its `setUp` already builds `self.owner` with `create_owner_profile` (which defaults `owner_type` to `INDIVIDUAL`) and `self.car`, and the public detail URL is `/api/v1/listings/cars/{id}`:

```python
    def test_public_detail_exposes_fleet_business_name(self):
        self.owner.owner_profile.owner_type = OwnerProfile.OwnerType.FLEET
        self.owner.owner_profile.fleet_name = "SpeedyCars Ltd"
        self.owner.owner_profile.save(update_fields=["owner_type", "fleet_name"])
        res = self.client.get(f"/api/v1/listings/cars/{self.car.id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["owner"]["business_name"], "SpeedyCars Ltd")

    def test_public_detail_business_name_blank_for_individual(self):
        res = self.client.get(f"/api/v1/listings/cars/{self.car.id}")
        self.assertEqual(res.data["owner"]["business_name"], "")
```

`OwnerProfile` is already imported in the test module (used by `create_owner_profile`).

- [ ] **Step 2: Run it to confirm failure**

Run: `uv run pytest apps/listings/tests.py -k "business_name" -v`
Expected: FAIL — `business_name` is not a key in the owner payload.

- [ ] **Step 3: Add the field to the owner serializer**

In `backend/apps/listings/serializers.py`, add to `CarOwnerSummarySerializer` (so both it and `CarOwnerSerializer` inherit it):

```python
class CarOwnerSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField()
    date_joined = serializers.DateTimeField()
    is_verified = serializers.SerializerMethodField()
    business_name = serializers.SerializerMethodField()

    def get_is_verified(self, obj):
        owner_profile = getattr(obj, "owner_profile", None)
        return owner_profile.is_verified if owner_profile else False

    def get_business_name(self, obj):
        owner_profile = getattr(obj, "owner_profile", None)
        if owner_profile and owner_profile.owner_type == "fleet":
            return owner_profile.fleet_name
        return ""
```

- [ ] **Step 4: Run the tests**

Run: `uv run pytest apps/listings/tests.py -k "business_name" -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/listings/serializers.py backend/apps/listings/tests.py
git commit -m "feat(listings): expose seller business_name on public owner block"
```

---

## Task 5: Seeder cleanup

**Files:**
- Modify: `backend/seed_dev.py:67-101`

No test — the seeder is a dev convenience; verify by running it.

- [ ] **Step 1: Remove min/max from the buy branch and the save**

In `backend/seed_dev.py`:
- Delete `min_price = int(sale * 0.9)` and `max_price = sale` from the buy branch (lines 70–71) and `min_price = max_price = None` from the rent branch (line 74).
- Remove `min_price=min_price, max_price=max_price` from the create call (line 84).
- Remove `car.min_price = min_price` and `car.max_price = max_price` (lines 94–95).
- Remove `"min_price", "max_price"` from the `save(update_fields=[...])` list (line 100).

- [ ] **Step 2: Verify the seeder runs**

Run: `uv run python manage.py migrate && uv run python seed_dev.py`
Expected: completes with no error; buy cars are created with `is_negotiable=True` and no range.

- [ ] **Step 3: Commit**

```bash
git add backend/seed_dev.py
git commit -m "chore(seed): stop setting min/max on seeded buy cars"
```

---

# FRONTEND (Claude implements directly)

## Task 6: Make-offer dialog copy 3→2

**Files:**
- Modify: `frontend/src/features/offers/components/make-offer-dialog.tsx:245,249`

- [ ] **Step 1: Update the two hardcoded "3"s**

Replace lines 245 and 249:

```tsx
              Your offer is valid for 48 hours. You can make up to 2 offers on this vehicle.
              {typeof remainingOffers === "number" && (
                <>
                  {" "}
                  <span className="font-bold">{remainingOffers} of 2 remaining.</span>
                </>
              )}
```

- [ ] **Step 2: Build + lint**

Run: `pnpm build && pnpm lint`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/offers/components/make-offer-dialog.tsx
git commit -m "feat(offers): reflect 2-offer cap in the make-offer dialog copy"
```

---

## Task 7: Strip the private range from the listing form

**Files:**
- Modify: `frontend/src/features/listings/components/negotiable-field.tsx` (toggle only)
- Modify: `frontend/src/features/listings/schemas.ts:26-30,100-117,29-30`
- Modify: `frontend/src/app/owner/my-cars/new/page.tsx:288-289,319-320,353-359,529-535,653-654`
- Modify: `frontend/src/app/owner/my-cars/[id]/page.tsx:417-418`

Do these together so the tree keeps compiling.

- [ ] **Step 1: Reduce `NegotiableField` to the toggle only**

Replace the whole file `frontend/src/features/listings/components/negotiable-field.tsx` with:

```tsx
"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type NegotiableFieldProps = {
  isNegotiable: boolean;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Buy-only negotiable toggle. When on, buyers can make an offer of any positive
 * amount; the owner accepts, counters, or declines each one.
 */
export function NegotiableField({
  isNegotiable,
  onToggle,
  disabled,
  className,
}: NegotiableFieldProps) {
  return (
    <div
      className={cn(
        "col-span-full rounded-xl border border-(--brc-border) bg-(--brc-bg-subtle) p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-(--brc-text) sm:text-base">
            {isNegotiable ? "Negotiable" : "Non-negotiable"}
          </span>
          <span className="text-xs text-(--brc-text-muted) sm:text-sm">
            {isNegotiable
              ? "Buyers can make an offer. You accept, counter, or decline each one."
              : "The sale price is fixed. Buyers cannot make offers."}
          </span>
        </div>
        <Switch
          checked={isNegotiable}
          disabled={disabled}
          onCheckedChange={onToggle}
          aria-label="Negotiable"
          className="data-checked:bg-blue-600 focus-visible:border-blue-600 focus-visible:ring-blue-600/30 [&_[data-slot=switch-thumb]]:bg-white"
        />
      </div>
    </div>
  );
}
```

This removes the `MoneyInput` sub-component, the range panel, the `LockIcon`/`EyeOffIcon`/`AlertCircleIcon` imports, the decimal-input imports, and the `minPrice`/`maxPrice`/`onMinPriceChange`/`onMaxPriceChange`/`error` props.

- [ ] **Step 2: Remove min/max from the zod schema**

In `frontend/src/features/listings/schemas.ts`:
- Delete lines 29–30 (`min_price`/`max_price` `decimalString` fields) and the comment on 26–27 mentioning the private range (keep an accurate one-liner).
- In `createCarSchema`'s `superRefine`, delete the negotiable-range block (lines 100–117: from `if (data.is_negotiable !== true) return;` through the min>max check). The BUY section ends after the `sale_price` required check.

- [ ] **Step 3: Update the create page (`new/page.tsx`)**

- Delete the form defaults `min_price: ""` and `max_price: ""` (lines 288–289).
- Delete the range error derivation (lines 319–320 — the `form.formState.errors.min_price?.message ?? form.formState.errors.max_price?.message ??` fragment; keep whatever it was falling back to).
- In the payload-shaping block (lines 353–359), delete the `delete payload.min_price;` / `delete payload.max_price;` lines in both the rent and the non-negotiable branches (the fields no longer exist).
- Update the `NegotiableField` usage (lines 529–535) to the new props:

```tsx
                  <NegotiableField
                    isNegotiable={w.is_negotiable ?? false}
                    onToggle={(v) => form.setValue("is_negotiable", v)}
                  />
```

  (Match `isNegotiable`/`onToggle` to the exact expressions already in place for those two props on lines 530–531.)
- Delete the review-summary "Private range" row (lines 653–654).

- [ ] **Step 4: Update the edit page (`[id]/page.tsx`)**

Delete the form defaults `min_price: car.min_price ?? ""` and `max_price: car.max_price ?? ""` (lines 417–418). The edit page does not render `NegotiableField` or a range card, so no further UI change; if its `handleSave` spreads `...values`, the removed schema fields simply won't be present.

- [ ] **Step 5: Build + lint**

Run: `pnpm build && pnpm lint`
Expected: pass. TypeScript will surface any missed reference to `min_price`/`max_price` or the old `NegotiableField` props — fix each at the point flagged.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/listings/components/negotiable-field.tsx frontend/src/features/listings/schemas.ts "frontend/src/app/owner/my-cars/new/page.tsx" "frontend/src/app/owner/my-cars/[id]/page.tsx"
git commit -m "feat(listings): remove private min/max range from the listing form"
```

---

## Task 8: Remove the owner-side private range display

**Files:**
- Modify: `frontend/src/features/offers/api/types.ts:84-89` (delete `OwnerCarRange`)
- Modify: `frontend/src/features/offers/api/offers-api.ts:8,83-90` (delete `useCarRange`, its import, `offerKeys.range`)
- Modify: `frontend/src/app/owner/offers/page.tsx:25,433`
- Modify: `frontend/src/features/offers/components/owner-respond-sheet.tsx:23,219,427-468,521-525`

- [ ] **Step 1: Delete the hook, type, and query key**

- In `offers-api.ts`: delete the `useCarRange` function (lines 83–90), remove `OwnerCarRange` from the import on line 8, and delete the `range` entry from the `offerKeys` factory (search `range:` in that file).
- In `types.ts`: delete the `OwnerCarRange` type (lines 84–89).

- [ ] **Step 2: Remove the range usage in the owner offers page**

In `frontend/src/app/owner/offers/page.tsx`: delete the `useCarRange` import (line 25) and the `const { data: range } = useCarRange(...)` call (line 433). If `range` was passed down to `OwnerRespondSheet` as a prop, remove that prop too (the sheet will no longer read it — see next step).

- [ ] **Step 3: Remove the range card from the respond sheet**

In `frontend/src/features/offers/components/owner-respond-sheet.tsx`:
- Delete the `useCarRange` import (line 23) and the `const { data: range } = useCarRange(...)` call (line 219). If `range` came in as a prop instead, remove it from the props type.
- In the "Price comparison" section (lines 427–468), delete the two `range?.min_price` / `range?.max_price` `ComparisonRow`s and the private-range info banner (`{range && (range.min_price || range.max_price) ? (...) : null}`). Keep the Asking price / Buyer's offer / Proposed counter / Expected settlement rows.
- Delete the second range display near the counter input (lines 521–525).
- If `LockKeyholeIcon` is now unused, remove its import. `ComparisonRow`'s `privateValue` prop may become unused — leave the prop (harmless) or remove it if lint flags it.

- [ ] **Step 4: Build + lint**

Run: `pnpm build && pnpm lint`
Expected: pass. Fix any remaining reference to `useCarRange`/`OwnerCarRange`/`offerKeys.range` that TypeScript flags.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/offers/
git commit -m "feat(offers): remove the owner private-range display and endpoint client"
```

---

## Task 9: Feature `value` → `description` (frontend)

**Files:**
- Modify: `frontend/src/features/listings/api/types.ts:30-35`
- Modify: `frontend/src/features/listings/schemas.ts:61-68`
- Modify: `frontend/src/app/owner/my-cars/new/page.tsx:173-238,597-599`
- Modify: `frontend/src/app/owner/my-cars/[id]/page.tsx:207-...,435-436`
- Modify: `frontend/src/features/listings/components/car-detail-page.tsx:580-582`

- [ ] **Step 1: Rename in the type**

In `frontend/src/features/listings/api/types.ts` (lines 30–35):

```ts
export type ListingFeature = {
  id?: string;
  name: string;
  description: string;
  sort_order?: number;
};
```

- [ ] **Step 2: Rename in the zod schema**

In `frontend/src/features/listings/schemas.ts` (lines 61–68):

```ts
  features: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Feature name required"),
        description: z.string().trim().optional(),
      }),
    )
    .optional(),
```

- [ ] **Step 3: Rename in the `FeaturesField` editor on the create page**

In `frontend/src/app/owner/my-cars/new/page.tsx`, in the inline `FeaturesField` (lines 173–238):
- Change the props type to `{ name: string; description?: string }[]` and the `onChange` type to match.
- `addFeature`: `onChange([...features, { name: "", description: "" }]);`
- `updateFeature`: change the `field` param type to `"name" | "description"`.
- The second input (lines ~219–224): `value={f.description ?? ""}`, `onChange={(e) => updateFeature(i, "description", e.target.value)}`, and update the placeholder to `"Description (optional)"`.
- At the usage (lines 597–599): `features={(w.features ?? []) as { name: string; description?: string }[]}`.

- [ ] **Step 4: Rename in the `FeaturesField` editor on the edit page**

In `frontend/src/app/owner/my-cars/[id]/page.tsx`, apply the identical changes to its inline `FeaturesField` (starts line 207) and update the default-values mapping at lines 435–436:

```tsx
    features:
      car.features?.map((f) => ({ name: f.name, description: f.description ?? "" })) ?? [],
```

- [ ] **Step 5: Rename in the car detail display**

In `frontend/src/features/listings/components/car-detail-page.tsx` (lines 580–582), render the description:

```tsx
                            <strong style={{ color: "var(--brc-text)" }}>{f.name}</strong>{f.description ? `: ${f.description}` : ""}
```

- [ ] **Step 6: Build + lint**

Run: `pnpm build && pnpm lint`
Expected: pass. TypeScript flags any remaining `.value` on a feature — fix each.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/listings/ "frontend/src/app/owner/my-cars/new/page.tsx" "frontend/src/app/owner/my-cars/[id]/page.tsx"
git commit -m "feat(listings): rename feature value to description in the UI"
```

---

## Task 10: "Reserved" → "Ongoing negotiations" (buy listings only)

**Files:**
- Modify: `frontend/src/features/listings/components/availability-badge.tsx`
- Modify: `frontend/src/shared/components/car-card.tsx:210`
- Modify: callers passing the badge — `car-detail-page.tsx:282-285`, `services-listing.tsx:191`

The badge must know the listing type. Add an optional `listingType` prop; when `status === "reserved"` and `listingType === "buy"`, show "Ongoing negotiations". Rental reservations keep "Reserved" / "Reserved until {date}".

- [ ] **Step 1: Make the badge listing-type-aware**

In `frontend/src/features/listings/components/availability-badge.tsx`, extend the props and label logic:

```tsx
type AvailabilityBadgeProps = {
  status: "available" | "rented" | "reserved" | "sold" | "archived";
  availableFrom?: string | null;
  listingType?: "rent" | "buy" | null;
};
```

Then in the component body, after `let label = BADGE_LABELS[status];`:

```tsx
  if (status === "reserved" && listingType === "buy") {
    label = "Ongoing negotiations";
  } else if (status === "reserved" && availableFrom) {
    label = `Reserved until ${formatDate(availableFrom)}`;
  }
  if (status === "rented" && availableFrom) {
    label = `Rented until ${formatDate(availableFrom)}`;
  }
```

Replace the existing `if (status === "reserved" && availableFrom)` block with the above (destructure `listingType` from props alongside `status`/`availableFrom`).

- [ ] **Step 2: Update the car card label + CTA**

In `frontend/src/shared/components/car-card.tsx`:
- Pass the listing type to the badge at line 124: `<AvailabilityBadge status={car.availability_status} listingType={car.listing_type} />`.
- Update the CTA text (line 210). Add a derived flag near line 54 (`const isBuy = car.listing_type === "buy";`) and change the label:

```tsx
          {isSold ? "Sold" : isReserved ? (isBuy ? "Ongoing negotiations" : "Reserved") : "View Details"}
```

- [ ] **Step 3: Update the other badge callers**

- `frontend/src/features/listings/components/car-detail-page.tsx` (lines 282–285): add `listingType={car.listing_type}` to the `<AvailabilityBadge .../>`.
- `frontend/src/features/website/sections/services-listing.tsx` (line 191): add `listingType={car.listing_type}`. Line 321 (`status="sold"`) needs no change.

- [ ] **Step 4: Build + lint**

Run: `pnpm build && pnpm lint`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/listings/components/availability-badge.tsx frontend/src/shared/components/car-card.tsx frontend/src/features/listings/components/car-detail-page.tsx frontend/src/features/website/sections/services-listing.tsx
git commit -m "feat(listings): relabel reserved buy listings as 'Ongoing negotiations'"
```

---

## Task 11: Seller business/brand name on the public car detail page

**Files:**
- Modify: `frontend/src/features/listings/api/types.ts:10-19` (`CarOwner`)
- Modify: `frontend/src/features/listings/components/car-detail-page.tsx:303-319`

Depends on Task 4 (backend `business_name`).

- [ ] **Step 1: Add `business_name` to the owner type**

In `frontend/src/features/listings/api/types.ts` (lines 10–19), add to `CarOwner`:

```ts
export type CarOwner = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_joined: string;
  is_verified: boolean;
  listing_count: number;
  business_name: string;
};
```

- [ ] **Step 2: Show the brand in the owner area**

In `frontend/src/features/listings/components/car-detail-page.tsx` (the owner block, lines 303–319), render the business name as the primary line when present, with the person's name beneath; otherwise show the name as today. Replace the name `<span>` (lines 308–310) with:

```tsx
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--brc-text)" }}>
                {car.owner.business_name || `${car.owner.first_name} ${car.owner.last_name}`}
              </span>
```

Leave the verified pill and the "N listings · Member since" line as-is.

- [ ] **Step 3: Build + lint**

Run: `pnpm build && pnpm lint`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/listings/api/types.ts frontend/src/features/listings/components/car-detail-page.tsx
git commit -m "feat(listings): show seller business/brand name on the car detail page"
```

---

## Final verification

- [ ] Backend full suite: `cd backend && uv run pytest -q` — all pass.
- [ ] Migrations clean: `uv run python manage.py makemigrations --check --dry-run` — "No changes detected".
- [ ] Frontend: `cd frontend && pnpm build && pnpm lint` — pass.
- [ ] Manual smoke: create a negotiable buy listing (no range asked), make an offer (dialog says "up to 2"), a 3rd offer from the same customer is blocked, add a feature with a description, view a reserved buy car (badge reads "Ongoing negotiations"), and open a fleet-owned car detail (shows the business name).
