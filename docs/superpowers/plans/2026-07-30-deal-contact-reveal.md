# Deal & Contact Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a buy offer is accepted, create a lightweight `Deal` (instead of a buy `Request`), reveal both parties' contact details to each other on an animated `/deals/[id]` page, and track the outcome (seller marks sold → car archived/sold; either party or a 7-day timeout cancels → car back on the market, prior bidders re-notified). Payment happens peer-to-peer, off-platform.

**Architecture:** New `apps/sales` app owning the `Deal` model and its endpoints. `accept_offer` swaps its buy-`Request` creation for a `Deal`. Buy-side availability (`reserved`/`sold`) and the `car_is_reserved` guard repoint from `Request` to `Deal`; rentals keep using `Request` untouched. Four new notification types + email templates. A `/deals/[id]` Next.js page renders the reveal.

**Tech Stack:** Django 5.2 + DRF, pytest-django (`uv run pytest`), Next.js 16 + React Query, shadcn + `@base-ui/react`, Tailwind v4 (`--brc-*`), lucide-react, `tw-animate-css` + CSS keyframes.

**Workflow split:** Backend tasks (1–8) written **by Namy** with Claude guiding TDD (failing test first, why, review). Frontend tasks (9–11) implemented **directly by Claude**.

**Commands:** Backend from `backend/`: tests `uv run pytest <path> -v`; migrations `uv run python manage.py makemigrations <app>`. Frontend from `frontend/`: `npm run build`, `npm run lint`.

**Supersedes:** `docs/superpowers/specs/2026-07-26-sale-inspection-escrow-design.md` (D2 escrow — dropped). Builds on the Spec 1 branch (PR #46).

---

## File Structure

**Backend (new `apps/sales`)**
- `backend/apps/sales/__init__.py`, `apps.py` — app config (label `sales`).
- `backend/apps/sales/models.py` — `Deal`, `DealStatus`, constants (`DEAL_TTL_DAYS = 7`).
- `backend/apps/sales/services.py` — `create_deal_from_offer`, `complete_deal`, `cancel_deal`, `expire_deals` (pure functions; notifications after commit).
- `backend/apps/sales/serializers.py` — `DealSerializer` (participant reveal) + `DealPartySerializer`.
- `backend/apps/sales/views.py` — `DealDetailView`, `DealCompleteView`, `DealCancelView`, `MyDealListView`.
- `backend/apps/sales/urls.py` — routes; included at `/api/v1/deals/`.
- `backend/apps/sales/management/commands/expire_deals.py` — 7-day timeout sweep.
- `backend/apps/sales/tests.py` — the app's tests.
- `backend/apps/sales/migrations/0001_initial.py` — the `Deal` table.

**Backend (modified)**
- `backend/apps/offers/services.py` — `accept_offer` creates a `Deal` (not a `Request`).
- `backend/apps/offers/serializers.py` — expose `resulting_deal` id on `OfferSerializer` + `OwnerOfferSerializer`.
- `backend/apps/offers/tests.py` — `AcceptOfferTest` now asserts a Deal.
- `backend/apps/listings/views.py` — `sold_annotation`, `availability_annotations`, `car_is_reserved`, archive guard repointed to `Deal`.
- `backend/apps/listings/serializers.py` — the two `get_availability_status` buy fallbacks repointed to `Deal`.
- `backend/apps/notifications/models.py` — 4 new `NotificationType` values.
- `backend/apps/notifications/service.py` — `notify_deal_reached`, `notify_deal_completed`, `notify_deal_cancelled`, `notify_car_available_again` + `_deal_data`.
- `backend/apps/notifications/templates/emails/` — `deal_reached.html`, `deal_completed.html`, `deal_cancelled.html`, `car_available_again.html`.
- `backend/config/settings/base.py` — add `"apps.sales"` to INSTALLED_APPS.
- `backend/config/urls.py` — `path("api/v1/deals/", include("apps.sales.urls"))`.

**Frontend (new)**
- `frontend/src/features/deals/api/types.ts`, `deals-api.ts`, `index.ts` — `Deal` type + hooks.
- `frontend/src/app/deals/[id]/page.tsx` — route (delegates to the feature component).
- `frontend/src/features/deals/components/deal-reveal-page.tsx` — the animated reveal.

**Frontend (modified)**
- `frontend/src/features/offers/api/types.ts` — add `resulting_deal: string | null` to `OfferBase`.
- `frontend/src/features/offers/components/owner-respond-sheet.tsx` — navigate to `/deals/[id]` on accept.
- `frontend/src/features/offers/components/counter-response-card.tsx` — navigate on customer accept-of-counter.
- `frontend/src/features/offers/components/customer-offer-card.tsx` — accepted-offer link → `/deals/[id]`.
- `frontend/src/app/globals.css` — a `deal-reveal` keyframe (if not reusing `scaleIn`).

---

# BACKEND (Namy writes, TDD)

## Task 1: The `apps/sales` app and `Deal` model

**Files:**
- Create: `backend/apps/sales/__init__.py` (empty), `backend/apps/sales/apps.py`, `backend/apps/sales/models.py`, `backend/apps/sales/tests.py`
- Modify: `backend/config/settings/base.py:54` (INSTALLED_APPS)
- Create: `backend/apps/sales/migrations/__init__.py`, `.../0001_initial.py` (via makemigrations)

- [ ] **Step 1: Scaffold the app files**

`backend/apps/sales/apps.py`:

```python
from django.apps import AppConfig


class SalesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.sales"
```

`backend/apps/sales/__init__.py` and `backend/apps/sales/migrations/__init__.py`: empty files.

- [ ] **Step 2: Register the app**

In `backend/config/settings/base.py`, add to the `# Local` block after `"apps.offers"`:

```python
    "apps.offers",
    "apps.sales",
]
```

- [ ] **Step 3: Write the failing model test**

`backend/apps/sales/tests.py`:

```python
from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.listings.models import Car, CarStatus, ListingType
from apps.offers.models import Offer, OfferStatus
from apps.sales.models import Deal, DealStatus, DEAL_TTL_DAYS
from apps.users.models import OwnerProfile, User


def make_user(email, role="customer"):
    return User.objects.create_user(
        email=email, first_name="A", last_name="B", password="securepass123",
        role=role, is_active=True,
    )


def make_owner(email="deal-owner@test.com"):
    owner = make_user(email, role="owner")
    OwnerProfile.objects.create(
        user=owner, owner_type=OwnerProfile.OwnerType.INDIVIDUAL,
        bank_account="1234567890", bank_name="Bank", is_verified=True,
    )
    return owner


def make_negotiable_car(owner):
    return Car.objects.create(
        owner=owner, title="Lexus RX", listing_type=ListingType.BUY,
        sale_price="15000000.00", is_negotiable=True, brand="Lexus", model="RX",
        year=2022, state="Lagos", city="Lekki", status=CarStatus.PUBLISHED,
    )


def make_accepted_offer(car, buyer, amount="14000000.00"):
    return Offer.objects.create(
        car=car, customer=buyer, amount=amount, currency=car.currency,
        status=OfferStatus.PENDING, expires_at=timezone.now(),
    )


class DealModelTest(APITestCase):
    def setUp(self):
        self.owner = make_owner()
        self.buyer = make_user("deal-buyer@test.com")
        self.car = make_negotiable_car(self.owner)
        self.offer = make_accepted_offer(self.car, self.buyer)

    def test_deal_defaults_to_active_with_a_7_day_expiry(self):
        deal = Deal.objects.create(
            car=self.car, buyer=self.buyer, seller=self.owner, offer=self.offer,
            agreed_amount=Decimal("14000000.00"), currency=self.car.currency,
            expires_at=timezone.now() + timezone.timedelta(days=DEAL_TTL_DAYS),
        )
        self.assertEqual(deal.status, DealStatus.ACTIVE)
        self.assertEqual(self.offer.deal, deal)  # reverse OneToOne
        self.assertEqual(self.car.deals.count(), 1)

    def test_only_one_active_deal_per_car(self):
        Deal.objects.create(
            car=self.car, buyer=self.buyer, seller=self.owner, offer=self.offer,
            agreed_amount=Decimal("1.00"), currency=self.car.currency,
            expires_at=timezone.now(),
        )
        other = make_accepted_offer(self.car, make_user("b2@test.com"), "1.00")
        with self.assertRaises(Exception):  # IntegrityError from the partial unique constraint
            Deal.objects.create(
                car=self.car, buyer=self.buyer, seller=self.owner, offer=other,
                agreed_amount=Decimal("1.00"), currency=self.car.currency,
                expires_at=timezone.now(),
            )
```

- [ ] **Step 4: Run it to confirm failure**

Run: `uv run pytest apps/sales/tests.py::DealModelTest -v`
Expected: import error / FAIL — `Deal` doesn't exist yet.

- [ ] **Step 5: Write the model**

`backend/apps/sales/models.py`:

```python
import uuid

from django.db import models

from apps.listings.models import Car, Currency
from apps.offers.models import Offer
from apps.users.models import User

DEAL_TTL_DAYS = 7


class DealStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class DealCancelledBy(models.TextChoices):
    BUYER = "buyer", "Buyer"
    SELLER = "seller", "Seller"
    SYSTEM = "system", "System"


class Deal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="deals")
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="deals_as_buyer")
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name="deals_as_seller")
    offer = models.OneToOneField(Offer, on_delete=models.CASCADE, related_name="deal")
    agreed_amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.NGN)
    status = models.CharField(
        max_length=10, choices=DealStatus.choices, default=DealStatus.ACTIVE, db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.CharField(max_length=10, choices=DealCancelledBy.choices, blank=True)
    cancel_reason = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["car"],
                condition=models.Q(status="active"),
                name="one_active_deal_per_car",
            )
        ]

    def __str__(self):
        return f"Deal on {self.car.title} — {self.status}"
```

- [ ] **Step 6: Make the migration + run tests**

Run: `uv run python manage.py makemigrations sales`
Expected: creates `0001_initial.py` with the `Deal` model (no prompt).
Run: `uv run pytest apps/sales/tests.py::DealModelTest -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/sales/ backend/config/settings/base.py
git commit -m "feat(sales): add Deal model + apps.sales app"
```

---

## Task 2: `accept_offer` creates a `Deal` instead of a buy `Request`

**Files:**
- Modify: `backend/apps/offers/services.py:61-136` (`accept_offer`)
- Modify: `backend/apps/offers/tests.py` (`AcceptOfferTest`)

The winner-side notification changes from `notify_offer_accepted`/`notify_counter_accepted` to `notify_deal_reached` (both parties). Rivals keep `notify_car_no_longer_available`. `notify_deal_reached` is written in Task 5 — for this task, add a **temporary stub** in `apps/notifications/service.py` so the import resolves, then Task 5 fills it in.

- [ ] **Step 1: Add a stub notify function** (so Task 2 can import it before Task 5 is done)

In `backend/apps/notifications/service.py`, near the other offer notifies, add:

```python
def notify_deal_reached(deal):
    """Both parties: contacts unlocked, coordinate the sale. Filled in Task 5."""
    return None
```

- [ ] **Step 2: Rewrite the `AcceptOfferTest` expectations**

In `backend/apps/offers/tests.py`, replace the body of `AcceptOfferTest::test_accept_creates_approved_buy_request_at_agreed_amount` (it asserts a `Request`) with a Deal assertion, and update `test_car_reads_reserved_after_acceptance` if it inspects a Request. New/updated tests:

```python
    def test_accept_creates_a_deal_at_the_agreed_amount(self):
        from apps.sales.models import Deal, DealStatus
        res = self._accept()  # existing helper that POSTs the owner accept
        self.assertEqual(res.status_code, 200)
        deal = Deal.objects.get(offer=self.offer)
        self.assertEqual(deal.status, DealStatus.ACTIVE)
        self.assertEqual(str(deal.agreed_amount), "14000000.00")  # match your fixture amount
        self.assertEqual(deal.buyer, self.offer.customer)
        self.assertEqual(deal.seller, self.car.owner)
        # No buy Request is created any more.
        from apps.listings.models import Request, ListingType
        self.assertFalse(Request.objects.filter(car=self.car, request_type=ListingType.BUY).exists())
```

(Use the class's existing accept helper/fixtures — match `self.offer`, `self.car`, and the accepted amount to what `setUp` builds. If `test_accepting_a_counter_uses_the_counter_amount` asserts a Request's `price_offered`, repoint it to `deal.agreed_amount`.)

- [ ] **Step 3: Run to confirm failure**

Run: `uv run pytest apps/offers/tests.py::AcceptOfferTest -v`
Expected: FAIL — `accept_offer` still creates a `Request`, no `Deal` exists.

- [ ] **Step 4: Rewrite `accept_offer`**

In `backend/apps/offers/services.py`, replace the `Request`/`RequestStatusEvent` creation and the winner notification. New imports at top: remove the now-unused `Request, RequestStatus, RequestStatusEvent, ListingType` if nothing else in the file uses them (check first), add `from apps.sales.models import Deal, DealStatus, DEAL_TTL_DAYS` and `from datetime import timedelta` (already imported), and swap the notify import. The function body:

```python
def accept_offer(offer, accepted_by="owner"):
    """
    Accept an offer and open a Deal. Both parties then coordinate the sale and
    payment off-platform via the revealed contact details.

    One transaction under a row lock on the car so two offers on the same
    vehicle can't both be accepted.
    """
    with transaction.atomic():
        car = Car.objects.select_for_update().get(id=offer.car_id)

        if (
            Offer.objects.filter(car=car, status=OfferStatus.ACCEPTED)
            .exclude(id=offer.id)
            .exists()
        ):
            raise ValidationError("Another offer on this vehicle was already accepted.")
        if offer.status not in ACTIVE_OFFER_STATUSES:
            raise ValidationError("This offer is no longer open.")

        offer.status = OfferStatus.ACCEPTED
        offer.responded_at = timezone.now()
        offer.save(update_fields=["status", "responded_at", "updated_at"])

        deal = Deal.objects.create(
            car=car,
            buyer=offer.customer,
            seller=car.owner,
            offer=offer,
            agreed_amount=offer.agreed_amount,
            currency=car.currency,
            expires_at=timezone.now() + timedelta(days=DEAL_TTL_DAYS),
        )

        rivals = list(
            Offer.objects.filter(car=car, status__in=ACTIVE_OFFER_STATUSES)
            .exclude(id=offer.id)
            .select_related("car", "customer")
        )
        Offer.objects.filter(id__in=[r.id for r in rivals]).update(
            status=OfferStatus.SUPERSEDED,
            responded_at=timezone.now(),
        )

    schedule_notification(notify_deal_reached, lambda d=deal: d)
    for rival in rivals:
        schedule_notification(notify_car_no_longer_available, lambda o=rival: o)
    return offer
```

Update the import block: replace `notify_counter_accepted, notify_offer_accepted` usage — keep importing `notify_car_no_longer_available`; add `notify_deal_reached`. (Leave `notify_counter_rejected`, `notify_offer_countered`, `notify_offer_rejected` imports as `owner_respond`/`customer_respond` still use them.)

- [ ] **Step 5: Run the tests**

Run: `uv run pytest apps/offers/tests.py -v`
Expected: PASS. If `test_car_reads_reserved_after_acceptance` fails, it depends on the availability change in Task 3 — mark it and move on, or temporarily assert via `Deal` existence; it goes green after Task 3.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/offers/ backend/apps/notifications/service.py
git commit -m "feat(offers): accepting an offer opens a Deal (not a buy request)"
```

---

## Task 3: Repoint availability + reservation guard to `Deal`

**Files:**
- Modify: `backend/apps/listings/views.py` — `sold_annotation` (171-181), `availability_annotations` (144-168), `car_is_reserved` (191-199), archive guards (431, 783)
- Modify: `backend/apps/listings/serializers.py` — `get_availability_status` buy branches (list 147-157/159-169, detail 289-326)
- Test: `backend/apps/listings/tests.py`

- [ ] **Step 1: Write failing tests**

Add to `backend/apps/listings/tests.py` (reuse module helpers; import `Deal`):

```python
class DealAvailabilityTest(APITestCase):
    def setUp(self):
        from apps.offers.models import Offer, OfferStatus
        self.owner = create_user("da-owner@test.com", "owner")
        create_owner_profile(self.owner)
        self.buyer = create_user("da-buyer@test.com", "customer")
        self.car = create_car(self.owner, is_negotiable=True)
        self.offer = Offer.objects.create(
            car=self.car, customer=self.buyer, amount="1.00", currency=self.car.currency,
            status=OfferStatus.PENDING, expires_at=timezone.now(),
        )

    def _make_active_deal(self):
        from apps.sales.models import Deal, DEAL_TTL_DAYS
        return Deal.objects.create(
            car=self.car, buyer=self.buyer, seller=self.owner, offer=self.offer,
            agreed_amount="1.00", currency=self.car.currency,
            expires_at=timezone.now() + timedelta(days=DEAL_TTL_DAYS),
        )

    def test_active_deal_makes_public_detail_reserved(self):
        self._make_active_deal()
        res = self.client.get(f"/api/v1/listings/cars/{self.car.id}")
        self.assertEqual(res.data["availability_status"], "reserved")

    def test_completed_deal_on_archived_car_reads_sold(self):
        from apps.sales.models import Deal, DealStatus
        deal = self._make_active_deal()
        deal.status = DealStatus.COMPLETED
        deal.save(update_fields=["status"])
        self.car.status = CarStatus.ARCHIVED
        self.car.save(update_fields=["status"])
        res = self.client.get(f"/api/v1/listings/cars/{self.car.id}")
        self.assertEqual(res.data["availability_status"], "sold")

    def test_reserved_car_cannot_be_paused(self):
        self._make_active_deal()
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(
            f"/api/v1/listings/my-cars/{self.car.id}/status", {"status": "paused"}, format="json",
        )
        self.assertEqual(res.status_code, 409)
```

- [ ] **Step 2: Run to confirm failure**

Run: `uv run pytest apps/listings/tests.py::DealAvailabilityTest -v`
Expected: FAIL — availability still derives from `Request`, so an active `Deal` doesn't reserve the car.

- [ ] **Step 3: Repoint the annotations + guard (views.py)**

Add `from apps.sales.models import Deal, DealStatus` to `backend/apps/listings/views.py` imports. Replace the three helpers:

```python
def availability_annotations():
    today = timezone.localdate()
    buy_in_progress = Deal.objects.filter(
        car_id=OuterRef("id"),
        status=DealStatus.ACTIVE,
    )
    active_current_rental = (
        Request.objects.filter(
            car_id=OuterRef("id"),
            request_type=ListingType.RENT,
            status=RequestStatus.ACTIVE,
            start_date__lte=today,
        )
        .annotate(end_date=request_end_date_expression())
        .filter(end_date__gt=today)
    )
    reserved_future_rental = Request.objects.none()
    return {
        "_has_buy_in_progress": Exists(buy_in_progress),
        "_has_active_current_rental": Exists(active_current_rental),
        "_has_reserved_future_rental": Exists(reserved_future_rental),
    }


def sold_annotation():
    """True when a Deal on the car completed (the car was genuinely sold)."""
    return Exists(
        Deal.objects.filter(car_id=OuterRef("id"), status=DealStatus.COMPLETED)
    )


def car_is_reserved(car_id):
    """True when an active Deal holds the car — it can't be paused/closed mid-sale."""
    return Deal.objects.filter(car_id=car_id, status=DealStatus.ACTIVE).exists()
```

- [ ] **Step 4: Also block archive/close while a Deal is active**

The archive guards currently only check `car_has_active_requests` (rentals). A buy car with an active Deal has no Request, so add a Deal check. At both archive sites — `MyCarDetailView.delete` (~431) and `MyCarStatusView.post` archived branch (~783) — change the guard to also reject when reserved:

```python
        if car_has_active_requests(car.id) or car_is_reserved(car.id):
            return active_request_archive_response()
```

- [ ] **Step 5: Repoint the serializer fallbacks (serializers.py)**

In `backend/apps/listings/serializers.py`, both `get_availability_status` methods have inline fallbacks that query `obj.requests` for buy. Repoint the buy parts to `obj.deals`. Add `from apps.sales.models import DealStatus` at the top.

- **CarListSerializer** (ARCHIVED "is_sold" fallback, ~152-156):

```python
            is_sold = getattr(obj, "_is_sold", None)
            if is_sold is None:
                is_sold = obj.deals.filter(status=DealStatus.COMPLETED).exists()
            return "sold" if is_sold else "archived"
```

  and the buy branch of the non-annotated fallback (the `for req in in_progress` loop, ~183-186) — remove the `if req.request_type == "buy": return "reserved"` line, since buy is no longer a Request; add a Deal check just before the loop:

```python
        if obj.deals.filter(status=DealStatus.ACTIVE).exists():
            return "reserved"
        today = date.today()
        for req in in_progress:
            if (
                req.status == RequestStatus.ACTIVE
                and req.start_date
                and req.duration_days
            ):
                end = req.start_date + timedelta(days=req.duration_days)
                if req.start_date <= today < end:
                    return "rented"
        return "available"
```

- **CarDetailSerializer** (ARCHIVED "is_sold" fallback ~294-298 → same `obj.deals` swap; the `_buy_in_progress` block ~314-326 → replace with):

```python
        if obj.deals.filter(status=DealStatus.ACTIVE).exists():
            return "reserved"
```

  (Delete the dead `_buy_in_progress`/`obj.requests.filter(request_type="buy"...)` fallback entirely — buy reservation is a Deal now.)

Note: the annotated path (`_has_buy_in_progress`, `_is_sold`) is what the 4 real views hit; these fallbacks only fire for un-annotated instances (e.g. tests hitting the serializer directly), but keep them correct.

- [ ] **Step 6: Run tests**

Run: `uv run pytest apps/listings/tests.py apps/offers/tests.py -v`
Expected: PASS — including `DealAvailabilityTest` and the previously-deferred `AcceptOfferTest::test_car_reads_reserved_after_acceptance`.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/listings/
git commit -m "feat(listings): derive buy reserved/sold + reservation guard from Deal"
```

---

## Task 4: Deal endpoints + reveal serializer

**Files:**
- Create: `backend/apps/sales/serializers.py`, `backend/apps/sales/views.py`, `backend/apps/sales/urls.py`
- Modify: `backend/config/urls.py:31` (add include)
- Test: `backend/apps/sales/tests.py`

- [ ] **Step 1: Write failing endpoint tests**

Add to `backend/apps/sales/tests.py`:

```python
class DealEndpointTest(APITestCase):
    def setUp(self):
        from datetime import timedelta
        from apps.sales.models import Deal, DEAL_TTL_DAYS
        self.owner = make_owner("de-owner@test.com")
        self.owner.phone = "08011112222"; self.owner.save(update_fields=["phone"])
        self.buyer = make_user("de-buyer@test.com")
        self.buyer.phone = "08033334444"; self.buyer.save(update_fields=["phone"])
        self.stranger = make_user("de-stranger@test.com")
        self.car = make_negotiable_car(self.owner)
        self.offer = make_accepted_offer(self.car, self.buyer)
        self.offer.status = "accepted"; self.offer.save(update_fields=["status"])
        self.deal = Deal.objects.create(
            car=self.car, buyer=self.buyer, seller=self.owner, offer=self.offer,
            agreed_amount="14000000.00", currency=self.car.currency,
            expires_at=timezone.now() + timedelta(days=DEAL_TTL_DAYS),
        )

    def _url(self):
        return f"/api/v1/deals/{self.deal.id}"

    def test_buyer_sees_both_contacts(self):
        self.client.force_authenticate(user=self.buyer)
        res = self.client.get(self._url())
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["viewer_role"], "buyer")
        self.assertEqual(res.data["seller"]["phone"], "08011112222")
        self.assertEqual(res.data["seller"]["email"], self.owner.email)
        self.assertEqual(res.data["buyer"]["phone"], "08033334444")

    def test_seller_sees_both_contacts(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(self._url())
        self.assertEqual(res.data["viewer_role"], "seller")

    def test_non_participant_gets_404(self):
        self.client.force_authenticate(user=self.stranger)
        self.assertEqual(self.client.get(self._url()).status_code, 404)

    def test_anonymous_rejected(self):
        self.assertIn(self.client.get(self._url()).status_code, (401, 403))
```

- [ ] **Step 2: Run to confirm failure**

Run: `uv run pytest apps/sales/tests.py::DealEndpointTest -v`
Expected: FAIL (404 — no route/view yet).

- [ ] **Step 3: Write the serializer**

`backend/apps/sales/serializers.py`:

```python
from rest_framework import serializers

from .models import Deal


class DealPartySerializer(serializers.Serializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField()
    business_name = serializers.SerializerMethodField()

    def get_business_name(self, user):
        profile = getattr(user, "owner_profile", None)
        if profile and profile.owner_type == "fleet":
            return profile.fleet_name
        return ""


class DealCarSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    primary_image = serializers.SerializerMethodField()

    def get_primary_image(self, car):
        image = next((i for i in car.images.all() if i.is_primary), None)
        image = image or next(iter(car.images.all()), None)
        if not image:
            return None
        file = image.thumbnail or image.image
        request = self.context.get("request")
        return request.build_absolute_uri(file.url) if request else file.url


class DealSerializer(serializers.ModelSerializer):
    car = DealCarSerializer(read_only=True)
    seller = DealPartySerializer(read_only=True)
    buyer = DealPartySerializer(read_only=True)
    viewer_role = serializers.SerializerMethodField()

    class Meta:
        model = Deal
        fields = [
            "id", "status", "agreed_amount", "currency",
            "created_at", "expires_at", "completed_at", "cancelled_at",
            "car", "seller", "buyer", "viewer_role",
        ]
        read_only_fields = fields

    def get_viewer_role(self, deal):
        user = self.context["request"].user
        return "seller" if deal.seller_id == user.id else "buyer"
```

- [ ] **Step 4: Write the views**

`backend/apps/sales/views.py`:

```python
from django.db.models import Q
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Deal
from .serializers import DealSerializer


def _deal_queryset():
    return Deal.objects.select_related(
        "car", "buyer", "seller", "offer", "seller__owner_profile",
    ).prefetch_related("car__images")


def _participant_deal_or_404(user, deal_id):
    return (
        _deal_queryset()
        .filter(Q(buyer=user) | Q(seller=user))
        .filter(id=deal_id)
        .first()
    )


class DealDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, deal_id):
        deal = _participant_deal_or_404(request.user, deal_id)
        if deal is None:
            return Response({"detail": "Deal not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(DealSerializer(deal, context={"request": request}).data)


class MyDealListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DealSerializer

    def get_queryset(self):
        u = self.request.user
        return _deal_queryset().filter(Q(buyer=u) | Q(seller=u))

    def get_serializer_context(self):
        return {"request": self.request}
```

- [ ] **Step 5: Wire URLs**

`backend/apps/sales/urls.py`:

```python
from django.urls import path

from .views import DealDetailView, MyDealListView

urlpatterns = [
    path("", MyDealListView.as_view(), name="deal-list"),
    path("<uuid:deal_id>", DealDetailView.as_view(), name="deal-detail"),
]
```

In `backend/config/urls.py`, add after the offers include:

```python
    path("api/v1/offers/", include("apps.offers.urls")),
    path("api/v1/deals/", include("apps.sales.urls")),
]
```

- [ ] **Step 6: Run tests**

Run: `uv run pytest apps/sales/tests.py::DealEndpointTest -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/sales/ backend/config/urls.py
git commit -m "feat(sales): deal detail + list endpoints with participant-only contact reveal"
```

---

## Task 5: Complete / cancel services + endpoints, and the notifications

**Files:**
- Modify: `backend/apps/notifications/models.py:49` (4 new types)
- Modify: `backend/apps/notifications/service.py` (4 notify functions + `_deal_data`; fill the Task 2 stub)
- Create: 4 templates under `backend/apps/notifications/templates/emails/`
- Create: `backend/apps/sales/services.py`; add `DealCompleteView`, `DealCancelView` to `views.py` + routes
- Test: `backend/apps/sales/tests.py`
- Migration: `alter_notification_notification_type` (via makemigrations)

- [ ] **Step 1: Add the notification types**

In `backend/apps/notifications/models.py`, after `CAR_NO_LONGER_AVAILABLE` (line 49):

```python
    DEAL_REACHED = "deal_reached", "Deal reached"
    DEAL_COMPLETED = "deal_completed", "Deal completed"
    DEAL_CANCELLED = "deal_cancelled", "Deal cancelled"
    CAR_AVAILABLE_AGAIN = "car_available_again", "Vehicle available again"
```

Run: `uv run python manage.py makemigrations notifications` → creates an `AlterField` migration (no prompt).

- [ ] **Step 2: Write the notify functions** (replace the Task 2 stub)

In `backend/apps/notifications/service.py`, add `_deal_data` and the four functions, following the `notify_offer_accepted` pattern (use `_create_notification`, `_money`, `_fe`, `send_email`):

```python
def _deal_data(deal):
    return {"deal_id": str(deal.id), "car_id": str(deal.car_id), "car_title": deal.car.title}


def notify_deal_reached(deal):
    """Both parties: contacts unlocked; coordinate the sale off-platform."""
    url = _fe(f"/deals/{deal.id}")
    amount = _money(deal.agreed_amount, deal.currency)
    for recipient, other in ((deal.buyer, "seller"), (deal.seller, "buyer")):
        _create_notification(
            recipient=recipient,
            notification_type=NotificationType.DEAL_REACHED,
            title="Deal reached — contacts unlocked",
            message=f"You've agreed on {deal.car.title} at {amount}. Open the deal to see the {other}'s contact details.",
            data=_deal_data(deal),
        )
        send_email(
            recipient=recipient.email,
            subject="Deal reached — contacts unlocked",
            template_key="deal_reached",
            context={"car_title": deal.car.title, "amount": amount, "action_url": url},
        )


def notify_deal_completed(deal):
    url = _fe(f"/deals/{deal.id}")
    for recipient in (deal.buyer, deal.seller):
        _create_notification(
            recipient=recipient,
            notification_type=NotificationType.DEAL_COMPLETED,
            title="Sale completed",
            message=f"The sale of {deal.car.title} is marked complete.",
            data=_deal_data(deal),
        )
        send_email(
            recipient=recipient.email, subject="Sale completed",
            template_key="deal_completed",
            context={"car_title": deal.car.title, "action_url": url},
        )


def notify_deal_cancelled(deal, recipient):
    """The party who did NOT cancel."""
    _create_notification(
        recipient=recipient,
        notification_type=NotificationType.DEAL_CANCELLED,
        title="Deal cancelled",
        message=f"The deal on {deal.car.title} was cancelled.",
        data=_deal_data(deal),
    )
    send_email(
        recipient=recipient.email, subject="Deal cancelled",
        template_key="deal_cancelled",
        context={"car_title": deal.car.title},
    )


def notify_car_available_again(offer):
    """A prior bidder: the car they bid on is back on the market."""
    _create_notification(
        recipient=offer.customer,
        notification_type=NotificationType.CAR_AVAILABLE_AGAIN,
        title="Vehicle available again",
        message=f"{offer.car.title} is back on the market. Make a new offer if you're still interested.",
        data=_offer_data(offer),
    )
    send_email(
        recipient=offer.customer.email, subject="A vehicle you bid on is available again",
        template_key="car_available_again",
        context={"car_title": offer.car.title, "action_url": _fe(f"/cars/{offer.car_id}")},
    )
```

- [ ] **Step 3: Create the four email templates**

Model them on an existing one (open `apps/notifications/templates/emails/offer_accepted.html` for the house layout). Minimal working bodies — `deal_reached.html`:

```html
{% extends "emails/_base.html" %}
{% block content %}
<h1>Deal reached</h1>
<p>You've agreed on <strong>{{ car_title }}</strong> at {{ amount }}.</p>
<p>Open the deal to see the other party's contact details and arrange the sale.</p>
<p><a href="{{ action_url }}">Open the deal</a></p>
{% endblock %}
```

`deal_completed.html`, `deal_cancelled.html`, `car_available_again.html`: same structure with the matching copy (completed → "The sale of {{ car_title }} is complete."; cancelled → "The deal on {{ car_title }} was cancelled."; available_again → "{{ car_title }} is back on the market." + `action_url`). **First confirm the base template name** — open one existing template and copy its exact `{% extends %}` line (it may be `emails/base.html` not `_base.html`); use whatever the existing ones use.

- [ ] **Step 4: Write failing complete/cancel tests**

Add to `backend/apps/sales/tests.py`:

```python
class DealActionTest(DealEndpointTest):
    def test_seller_completes_deal_and_car_reads_sold(self):
        from apps.sales.models import DealStatus
        from apps.listings.models import CarStatus
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(f"/api/v1/deals/{self.deal.id}/complete")
        self.assertEqual(res.status_code, 200)
        self.deal.refresh_from_db(); self.car.refresh_from_db()
        self.assertEqual(self.deal.status, DealStatus.COMPLETED)
        self.assertEqual(self.car.status, CarStatus.ARCHIVED)

    def test_buyer_cannot_complete(self):
        self.client.force_authenticate(user=self.buyer)
        self.assertEqual(self.client.post(f"/api/v1/deals/{self.deal.id}/complete").status_code, 403)

    def test_either_party_can_cancel_and_car_returns_to_available(self):
        from apps.sales.models import DealStatus
        self.client.force_authenticate(user=self.buyer)
        res = self.client.post(f"/api/v1/deals/{self.deal.id}/cancel")
        self.assertEqual(res.status_code, 200)
        self.deal.refresh_from_db()
        self.assertEqual(self.deal.status, DealStatus.CANCELLED)
        self.assertEqual(self.deal.cancelled_by, "buyer")
        # car stayed PUBLISHED → derives available again
        detail = self.client.get(f"/api/v1/listings/cars/{self.car.id}")
        self.assertEqual(detail.data["availability_status"], "available")
```

- [ ] **Step 5: Run to confirm failure**

Run: `uv run pytest apps/sales/tests.py::DealActionTest -v`
Expected: FAIL (404 — no complete/cancel routes).

- [ ] **Step 6: Write the services**

`backend/apps/sales/services.py`:

```python
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.listings.models import CarStatus
from apps.notifications.notifications import schedule_notification
from apps.notifications.service import (
    notify_car_available_again,
    notify_deal_cancelled,
    notify_deal_completed,
)
from apps.offers.models import Offer, OfferStatus
from .models import Deal, DealStatus, DealCancelledBy


def complete_deal(deal):
    if deal.status != DealStatus.ACTIVE:
        raise ValidationError("This deal is already closed.")
    with transaction.atomic():
        car = deal.car
        deal.status = DealStatus.COMPLETED
        deal.completed_at = timezone.now()
        deal.save(update_fields=["status", "completed_at"])
        car.status = CarStatus.ARCHIVED
        car.save(update_fields=["status"])
    schedule_notification(notify_deal_completed, lambda d=deal: d)
    return deal


def cancel_deal(deal, cancelled_by):
    if deal.status != DealStatus.ACTIVE:
        raise ValidationError("This deal is already closed.")
    with transaction.atomic():
        deal.status = DealStatus.CANCELLED
        deal.cancelled_at = timezone.now()
        deal.cancelled_by = cancelled_by
        deal.save(update_fields=["status", "cancelled_at", "cancelled_by"])
        # Prior bidders (superseded when this offer won) — invite them back.
        prior = list(
            Offer.objects.filter(car=deal.car, status=OfferStatus.SUPERSEDED)
            .select_related("car", "customer")
        )
    if cancelled_by in (DealCancelledBy.BUYER, DealCancelledBy.SELLER):
        other = deal.seller if cancelled_by == DealCancelledBy.BUYER else deal.buyer
        schedule_notification(notify_deal_cancelled, lambda d=deal, r=other: (d, r))
    for offer in prior:
        schedule_notification(notify_car_available_again, lambda o=offer: o)
    return deal
```

Note the two-arg payload for `notify_deal_cancelled`: change `schedule_notification` usage to unpack — since the shared `schedule_notification` calls `notify_func(get_payload())`, wrap so it receives a tuple and the notify takes `(deal, recipient)`. Simplest: make `notify_deal_cancelled(payload)` accept a tuple, OR add a small inline lambda: `transaction.on_commit(lambda: notify_deal_cancelled(deal, other), robust=True)` directly instead of `schedule_notification`. Use the direct `transaction.on_commit` form here to keep the two-arg signature clean:

```python
        transaction.on_commit(lambda d=deal, r=other: notify_deal_cancelled(d, r), robust=True)
```

(Put it inside the function after the atomic block; import `transaction` at top.)

- [ ] **Step 7: Add the views + routes**

In `backend/apps/sales/views.py`, add:

```python
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import DealCancelledBy, DealStatus
from .services import cancel_deal, complete_deal


class DealCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, deal_id):
        deal = _participant_deal_or_404(request.user, deal_id)
        if deal is None:
            return Response({"detail": "Deal not found."}, status=status.HTTP_404_NOT_FOUND)
        if deal.seller_id != request.user.id:
            return Response({"detail": "Only the seller can mark the sale complete."}, status=status.HTTP_403_FORBIDDEN)
        try:
            complete_deal(deal)
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(DealSerializer(deal, context={"request": request}).data)


class DealCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, deal_id):
        deal = _participant_deal_or_404(request.user, deal_id)
        if deal is None:
            return Response({"detail": "Deal not found."}, status=status.HTTP_404_NOT_FOUND)
        by = DealCancelledBy.SELLER if deal.seller_id == request.user.id else DealCancelledBy.BUYER
        try:
            cancel_deal(deal, cancelled_by=by)
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(DealSerializer(deal, context={"request": request}).data)
```

Add routes in `backend/apps/sales/urls.py`:

```python
    path("<uuid:deal_id>/complete", DealCompleteView.as_view(), name="deal-complete"),
    path("<uuid:deal_id>/cancel", DealCancelView.as_view(), name="deal-cancel"),
```

(Import the two new views.)

- [ ] **Step 8: Run tests**

Run: `uv run pytest apps/sales/tests.py -v`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/apps/sales/ backend/apps/notifications/
git commit -m "feat(sales): complete/cancel deal endpoints + deal notifications"
```

---

## Task 6: Auto-expire management command

**Files:**
- Create: `backend/apps/sales/management/__init__.py`, `.../commands/__init__.py`, `.../commands/expire_deals.py`
- Test: `backend/apps/sales/tests.py`

- [ ] **Step 1: Write the failing test**

```python
class ExpireDealsCommandTest(DealEndpointTest):
    def test_command_cancels_stale_active_deals(self):
        from django.core.management import call_command
        from apps.sales.models import DealStatus, DealCancelledBy
        self.deal.expires_at = timezone.now() - timezone.timedelta(minutes=1)
        self.deal.save(update_fields=["expires_at"])
        call_command("expire_deals")
        self.deal.refresh_from_db()
        self.assertEqual(self.deal.status, DealStatus.CANCELLED)
        self.assertEqual(self.deal.cancelled_by, DealCancelledBy.SYSTEM)

    def test_command_leaves_live_deals_alone(self):
        from django.core.management import call_command
        from apps.sales.models import DealStatus
        call_command("expire_deals")
        self.deal.refresh_from_db()
        self.assertEqual(self.deal.status, DealStatus.ACTIVE)
```

- [ ] **Step 2: Run to confirm failure**

Run: `uv run pytest apps/sales/tests.py::ExpireDealsCommandTest -v`
Expected: FAIL — `Unknown command: 'expire_deals'`.

- [ ] **Step 3: Write the command**

`backend/apps/sales/management/commands/expire_deals.py`:

```python
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.sales.models import Deal, DealCancelledBy, DealStatus
from apps.sales.services import cancel_deal


class Command(BaseCommand):
    help = "Cancel Deals past their expiry and put the cars back on the market."

    def handle(self, *args, **options):
        stale = list(
            Deal.objects.filter(status=DealStatus.ACTIVE, expires_at__lte=timezone.now())
            .select_related("car", "buyer", "seller")
        )
        for deal in stale:
            cancel_deal(deal, cancelled_by=DealCancelledBy.SYSTEM)
        self.stdout.write(self.style.SUCCESS(f"Expired {len(stale)} deal(s)."))
```

- [ ] **Step 4: Run tests + full backend suite**

Run: `uv run pytest apps/sales/tests.py -v && uv run pytest -q`
Expected: PASS across the board. Migrations clean: `uv run python manage.py makemigrations --check --dry-run` → "No changes detected".

- [ ] **Step 5: Commit**

```bash
git add backend/apps/sales/
git commit -m "feat(sales): expire_deals management command (7-day timeout)"
```

---

## Task 7: Expose the deal id on offers + fix the accepted deep-link

**Files:**
- Modify: `backend/apps/offers/serializers.py` (`OfferSerializer`, `OwnerOfferSerializer`)
- Modify: `backend/apps/notifications/service.py` (`notify_offer_accepted` deep-link — now unused by accept, but keep it correct if still referenced)
- Test: `backend/apps/offers/tests.py`

- [ ] **Step 1: Failing test**

Add to the offers `OfferListTest` (customer list) — after accepting an offer, the customer's offer row carries the deal id:

```python
    def test_accepted_offer_exposes_resulting_deal(self):
        # accept an offer, then read it back from the customer list
        offer = self._accept_and_return_offer()  # use existing accept helper
        offer.refresh_from_db()
        self.client.force_authenticate(user=self.customer)
        res = self.client.get("/api/v1/offers/my-offers")
        row = next(r for r in res.data["results"] if r["id"] == str(offer.id))
        self.assertEqual(row["resulting_deal"], str(offer.deal.id))
```

- [ ] **Step 2: Run to confirm failure**

Run: `uv run pytest apps/offers/tests.py -k resulting_deal -v`
Expected: FAIL — `resulting_deal` not a field.

- [ ] **Step 3: Add the field**

In `backend/apps/offers/serializers.py`, add to both `OfferSerializer` and `OwnerOfferSerializer`:

```python
    resulting_deal = serializers.SerializerMethodField()

    def get_resulting_deal(self, offer):
        deal = getattr(offer, "deal", None)
        return str(deal.id) if deal else None
```

Add `"resulting_deal"` to each serializer's `Meta.fields` (and `read_only_fields` if it lists fields explicitly). Keep the existing `resulting_request` field (now always null for buy — harmless, avoids a wider frontend churn).

- [ ] **Step 4: Run tests**

Run: `uv run pytest apps/offers/tests.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/offers/
git commit -m "feat(offers): expose resulting_deal id on offer payloads"
```

---

# FRONTEND (Claude implements directly)

## Task 8: Deals API client (types + hooks)

**Files:**
- Create: `frontend/src/features/deals/api/types.ts`, `deals-api.ts`, `index.ts`
- Modify: `frontend/src/features/offers/api/types.ts` (add `resulting_deal`)

- [ ] **Step 1: Types** — `frontend/src/features/deals/api/types.ts`:

```ts
export type DealStatus = "active" | "completed" | "cancelled";

export type DealParty = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  business_name: string;
};

export type DealCar = {
  id: string;
  title: string;
  primary_image: string | null;
};

export type Deal = {
  id: string;
  status: DealStatus;
  agreed_amount: string;
  currency: string;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  car: DealCar;
  seller: DealParty;
  buyer: DealParty;
  viewer_role: "buyer" | "seller";
};
```

- [ ] **Step 2: Hooks** — `frontend/src/features/deals/api/deals-api.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { Deal } from "./types";

export const dealKeys = {
  all: ["deals"] as const,
  detail: (id: string) => [...dealKeys.all, id] as const,
};

export function useDeal(dealId: string) {
  return useQuery({
    queryKey: dealKeys.detail(dealId),
    queryFn: () => apiClient.get<Deal>(`/deals/${dealId}`),
    enabled: !!dealId,
  });
}

export function useCompleteDeal(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<Deal>(`/deals/${dealId}/complete`),
    meta: { skipGlobalOverlay: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dealKeys.detail(dealId) }),
  });
}

export function useCancelDeal(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<Deal>(`/deals/${dealId}/cancel`),
    meta: { skipGlobalOverlay: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dealKeys.detail(dealId) }),
  });
}
```

- [ ] **Step 3: Barrel** — `frontend/src/features/deals/api/index.ts`:

```ts
export * from "./types";
export * from "./deals-api";
```

- [ ] **Step 4:** In `frontend/src/features/offers/api/types.ts`, add to `OfferBase` after `resulting_request`:

```ts
  resulting_request: string | null;
  resulting_deal: string | null;
```

- [ ] **Step 5:** `npm run lint && npm run build` → clean. Commit:

```bash
git add frontend/src/features/deals/ frontend/src/features/offers/api/types.ts
git commit -m "feat(deals): API client + Deal types"
```

---

## Task 9: The `/deals/[id]` reveal page

**Files:**
- Create: `frontend/src/app/deals/[id]/page.tsx`, `frontend/src/features/deals/components/deal-reveal-page.tsx`
- Modify: `frontend/src/app/globals.css` (reveal keyframe if needed)

- [ ] **Step 1: Route** — `frontend/src/app/deals/[id]/page.tsx`:

```tsx
"use client";

import { useParams } from "next/navigation";
import { DealRevealPage } from "@/features/deals/components/deal-reveal-page";

export default function DealRoutePage() {
  const params = useParams();
  const dealId = params?.id as string;
  if (!dealId) return null;
  return <DealRevealPage dealId={dealId} />;
}
```

- [ ] **Step 2: The component** — `frontend/src/features/deals/components/deal-reveal-page.tsx`. Uses `useDeal`/`useCompleteDeal`/`useCancelDeal`, `ConfirmDialog`, sonner `toast`, lucide icons, `--brc-*` tokens, and the `scaleIn`/`motion-safe:` animation pattern. Full component:

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CarIcon, CheckCircle2Icon, HandshakeIcon, Loader2Icon, MailIcon,
  PhoneIcon, ShieldCheckIcon, UserRoundIcon,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCancelDeal, useCompleteDeal, useDeal } from "@/features/deals/api";
import type { DealParty } from "@/features/deals/api";

function initials(p: DealParty) {
  return `${p.first_name?.[0] ?? ""}${p.last_name?.[0] ?? ""}`.toUpperCase() || "?";
}

function money(amount: string, currency: string) {
  const symbol = ({ NGN: "₦", USD: "$", GBP: "£", EUR: "€" } as Record<string, string>)[currency] ?? `${currency} `;
  return `${symbol}${Number(amount).toLocaleString("en-NG")}`;
}

function ContactCard({ party, role, isYou }: { party: DealParty; role: "Buyer" | "Seller"; isYou: boolean }) {
  const name = party.business_name || `${party.first_name} ${party.last_name}`;
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-(--brc-radius-md) border border-(--brc-border) bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-(--brc-primary-tint) text-sm font-extrabold text-(--brc-primary) [font-family:var(--brc-font-ui)]">
          {initials(party)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{name}</div>
          <div className="text-xs font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
            {role}{isYou ? " · You" : ""}
          </div>
        </div>
      </div>
      {!isYou && (
        <div className="flex flex-col gap-2 text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
          <a href={`tel:${party.phone}`} className="flex items-center gap-2 no-underline text-(--brc-text-secondary)">
            <PhoneIcon className="size-4 text-(--brc-primary)" aria-hidden="true" />{party.phone || "—"}
          </a>
          <a href={`mailto:${party.email}`} className="flex items-center gap-2 no-underline text-(--brc-text-secondary)">
            <MailIcon className="size-4 text-(--brc-primary)" aria-hidden="true" />{party.email}
          </a>
        </div>
      )}
    </div>
  );
}

export function DealRevealPage({ dealId }: { dealId: string }) {
  const router = useRouter();
  const { data: deal, isLoading } = useDeal(dealId);
  const complete = useCompleteDeal(dealId);
  const cancel = useCancelDeal(dealId);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (isLoading || !deal) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-10">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="flex gap-4"><Skeleton className="h-40 flex-1 rounded-xl" /><Skeleton className="h-40 flex-1 rounded-xl" /></div>
      </div>
    );
  }

  const isSeller = deal.viewer_role === "seller";
  const you = isSeller ? deal.seller : deal.buyer;
  const other = isSeller ? deal.buyer : deal.seller;
  const isActive = deal.status === "active";

  function handleComplete() {
    complete.mutate(undefined, {
      onSuccess: () => { toast.success("Marked as sold."); setConfirmComplete(false); },
      onError: () => toast.error("Couldn't complete the deal. Please try again."),
    });
  }
  function handleCancel() {
    cancel.mutate(undefined, {
      onSuccess: () => { toast.success("Deal cancelled."); setConfirmCancel(false); },
      onError: () => toast.error("Couldn't cancel the deal. Please try again."),
    });
  }

  return (
    <div className="min-h-[80vh] bg-(--brc-bg-subtle)">
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-5 py-10">
        {/* Hero */}
        <div className="flex flex-col items-center gap-3 text-center motion-safe:animate-[scaleIn_0.5s_ease-out]">
          <span className="flex size-16 items-center justify-center rounded-full bg-(--brc-success-bg) text-(--brc-success)">
            <HandshakeIcon className="size-9" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-extrabold text-(--brc-text) [font-family:var(--brc-font-display)]">
            {deal.status === "completed" ? "Sale completed" : deal.status === "cancelled" ? "Deal cancelled" : "It's a deal!"}
          </h1>
          <p className="text-sm text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">
            You agreed on <strong>{money(deal.agreed_amount, deal.currency)}</strong> for the {deal.car.title}.
          </p>
        </div>

        {/* Car strip */}
        <div className="flex items-center gap-3 rounded-(--brc-radius-md) border border-(--brc-border) bg-white p-3">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-(--brc-radius-sm) border border-(--brc-border)">
            {deal.car.primary_image ? (
              <Image src={deal.car.primary_image} alt={deal.car.title} fill className="object-cover" />
            ) : <div className="flex size-full items-center justify-center text-(--brc-text-muted)"><CarIcon className="size-5" /></div>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-(--brc-text) [font-family:var(--brc-font-ui)]">{deal.car.title}</div>
            <div className="text-sm tabular-nums text-(--brc-text-secondary) [font-family:var(--brc-font-ui)]">{money(deal.agreed_amount, deal.currency)}</div>
          </div>
        </div>

        {/* Contact cards */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <ContactCard party={you} role={isSeller ? "Seller" : "Buyer"} isYou />
          <ContactCard party={other} role={isSeller ? "Buyer" : "Seller"} isYou={false} />
        </div>

        {/* Guidance */}
        <div className="flex items-start gap-2 rounded-(--brc-radius-md) bg-(--brc-primary-tint) px-4 py-3 text-sm leading-relaxed text-(--brc-primary) [font-family:var(--brc-font-ui)]">
          <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Reach out to arrange an inspection and complete the purchase — you're welcome to bring your own mechanic. Meet in a safe, public place and inspect the vehicle and its papers before paying.
        </div>

        {/* Actions */}
        {isActive && (
          <div className="flex flex-col gap-2">
            {isSeller ? (
              <button type="button" onClick={() => setConfirmComplete(true)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-(--brc-radius-sm) bg-(--brc-primary) text-[15px] font-bold text-white hover:bg-(--brc-primary-hover)">
                <CheckCircle2Icon className="size-4" aria-hidden="true" /> Mark as sold
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-(--brc-radius-sm) border border-dashed border-(--brc-border) px-4 py-3 text-sm font-semibold text-(--brc-text-muted) [font-family:var(--brc-font-ui)]">
                <Loader2Icon className="size-4" aria-hidden="true" /> Waiting for the seller to confirm the sale
              </div>
            )}
            <button type="button" onClick={() => setConfirmCancel(true)}
              className="mx-auto text-sm font-semibold text-(--brc-text-muted) underline-offset-2 hover:underline [font-family:var(--brc-font-ui)]">
              Deal fell through?
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmComplete} onOpenChange={(o) => !o && setConfirmComplete(false)}
        title="Mark this car as sold?"
        description="This closes the deal and takes the car off the marketplace. Do this once you've completed the sale."
        confirmLabel="Mark as sold" isPending={complete.isPending} onConfirm={handleComplete}
      />
      <ConfirmDialog
        open={confirmCancel} onOpenChange={(o) => !o && setConfirmCancel(false)}
        title="Did this deal fall through?"
        description="This cancels the deal and puts the car back on the market. Buyers who bid earlier will be notified it's available again."
        confirmLabel="Yes, cancel the deal" destructive isPending={cancel.isPending} onConfirm={handleCancel}
      />
    </div>
  );
}
```

- [ ] **Step 3:** Confirm `scaleIn` exists in `globals.css` (it does — `@keyframes scaleIn`). No new keyframe needed.

- [ ] **Step 4:** `npm run lint && npm run build` → clean. Commit:

```bash
git add frontend/src/app/deals/ frontend/src/features/deals/components/
git commit -m "feat(deals): animated Deal Reached / contacts-unlocked page"
```

---

## Task 10: Route users to the deal on acceptance

**Files:**
- Modify: `frontend/src/features/offers/components/owner-respond-sheet.tsx` (accept → navigate)
- Modify: `frontend/src/features/offers/components/counter-response-card.tsx` (customer accept-of-counter → navigate)
- Modify: `frontend/src/features/offers/components/customer-offer-card.tsx` (accepted link → `/deals/[id]`)

- [ ] **Step 1: Owner accept navigates to the deal.** In `owner-respond-sheet.tsx`, `handleAccept` currently flips to an in-sheet success mode. Capture the returned offer's `resulting_deal` and navigate. Add `import { useRouter } from "next/navigation";` and `const router = useRouter();`. Rewrite `handleAccept`:

```tsx
  async function handleAccept() {
    try {
      const updated = await respond.mutateAsync({ action: "accept" });
      onOpenChange(false);
      if (updated.resulting_deal) {
        router.push(`/deals/${updated.resulting_deal}`);
      } else {
        toast.success("Offer accepted");
      }
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't accept this offer"));
    } finally {
      setConfirmAction(null);
    }
  }
```

(The in-sheet `mode === "success"` panel can stay as dead fallback, or be removed — leave it; the navigation supersedes it.)

- [ ] **Step 2: Customer accept-of-counter navigates.** Read `frontend/src/features/offers/components/counter-response-card.tsx` first (not yet inspected). Find its accept handler (a `useRespondToOffer(...).mutateAsync({ action: "accept" })` or similar). On success, if the returned offer has `resulting_deal`, `router.push('/deals/${resulting_deal}')`. Mirror the pattern from Step 1 (add `useRouter`). If the component receives the offer and uses a mutation hook, capture the mutateAsync result.

- [ ] **Step 3: Accepted-offer link → deal.** In `customer-offer-card.tsx`, replace the accepted block (currently links to `/customer/requests/${offer.resulting_request}`) with:

```tsx
{offer.status === "accepted" && offer.resulting_deal && (
  <Link
    href={`/deals/${offer.resulting_deal}`}
    className="group inline-flex w-max items-center gap-1.5 text-sm font-bold text-(--brc-primary) no-underline [font-family:var(--brc-font-ui)]"
  >
    View the deal & contacts
    <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
  </Link>
)}
```

- [ ] **Step 4: Owner offers list** — in `frontend/src/app/owner/offers/page.tsx`, the accepted `OfferRow` "View" button can also deep-link. If an accepted `OwnerOffer` carries `resulting_deal`, make its action navigate to `/deals/[id]`. (Optional polish — add if straightforward.)

- [ ] **Step 5:** `npm run lint && npm run build` → clean. Manual: accept an offer as owner → lands on `/deals/[id]` showing the buyer's contact; the buyer opens their offer → "View the deal & contacts" → same page showing the seller's contact. Commit:

```bash
git add frontend/src/features/offers/
git commit -m "feat(offers): route both parties to the deal page on acceptance"
```

---

## Final verification

- [ ] Backend: `cd backend && uv run pytest -q` — all pass; `uv run python manage.py makemigrations --check --dry-run` → "No changes detected".
- [ ] Frontend: `cd frontend && npm run build && npm run lint` — clean.
- [ ] Manual smoke: place an offer (customer) → accept (owner) → owner lands on the reveal showing the buyer's name/phone/email; buyer opens their offer → reveal shows the seller's name/business/phone/email; seller "Mark as sold" → car reads "Sold"; on a fresh deal, "Deal fell through" → car back to "available" and a rival bidder gets a "available again" notification; run `uv run python manage.py expire_deals` on a back-dated deal → it cancels.

---

## Self-review notes (addressed inline)

- **Spec coverage:** Deal model (T1); accept→Deal + DEAL_REACHED (T2); availability + guard repoint (T3); reveal endpoint + participant-only (T4); complete/cancel + 3 remaining notifications + templates (T5); 7-day expiry command (T6); deal-id on offers (T7); FE client (T8), reveal page (T9), navigation (T10). Item 8 (mutual contact on accept) = the DealSerializer reveal in T4 + navigation in T10.
- **Known follow-ups (out of scope, flag at execution):** VIN transfer on completion is **Spec 5**, not here — `complete_deal` archives the car but does not transfer ownership. The old `resulting_request` field stays (null for buy) to avoid a wide frontend refactor. `notify_offer_accepted`/`notify_counter_accepted` become unused by `accept_offer`; leave them defined (still referenced by tests/other paths) but they no longer fire on accept.
