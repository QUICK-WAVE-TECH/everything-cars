# Offer & Negotiation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Workflow for this batch:** Backend tasks (1–9) are written BY THE USER (Namy) with Claude guiding step-by-step — failing test first, explain why, review the code Namy writes. Frontend tasks (10–14) Claude implements directly from the design brief.

**Goal:** A customer offers a price on a negotiable buy listing; the owner accepts, declines, or sends one counter; the customer answers it. An accepted offer reserves the car and feeds the existing purchase flow. The owner's private range is never discoverable.

**Architecture:** A new `apps/offers` app owns the negotiation state machine end to end. It never duplicates fulfilment — accepting an offer creates an `APPROVED` buy `Request` and the existing payment pipeline finishes the sale. Expiry is enforced lazily (no scheduler exists in this project), with a management command for notifications.

**Tech Stack:** Django 5.2, DRF, Postgres partial unique constraints, pytest/Django test runner. Frontend: Next.js 16 App Router, React Query, shadcn v4 + `@base-ui/react`, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-07-22-offer-negotiation-design.md`

---

## File structure

| Path                                                       | Responsibility                                                               |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `backend/common/notifications.py`                          | `schedule_notification` helper (one home; currently duplicated in two apps)  |
| `backend/apps/offers/models.py`                            | `Offer`, `OfferStatus`, `ACTIVE_OFFER_STATUSES`                              |
| `backend/apps/offers/serializers.py`                       | Create / respond / counter / list serializers, owner-vs-customer field split |
| `backend/apps/offers/views.py`                             | Customer + owner endpoints                                                   |
| `backend/apps/offers/services.py`                          | `accept_offer()` — the atomic hand-off, kept out of the view                 |
| `backend/apps/offers/urls.py`                              | Route table                                                                  |
| `backend/apps/offers/management/commands/expire_offers.py` | Sweep + notify                                                               |
| `backend/apps/offers/tests.py`                             | All backend tests                                                            |
| `backend/apps/notifications/service.py`                    | 9 new `notify_offer_*` functions                                             |
| `frontend/src/features/offers/`                            | api/, components/, types                                                     |
| `frontend/src/app/owner/offers/page.tsx`                   | Owner Offer Management                                                       |
| `frontend/src/app/customer/offers/page.tsx`                | Customer My Offers                                                           |

---

### Task 1: App scaffold, Offer model, constraints

**Files:** Create `backend/apps/offers/{__init__,models,apps}.py`, migration; Modify `config/settings/base.py` (INSTALLED_APPS)

- [x] **Step 1: Create the app**

```bash
cd backend && uv run python manage.py startapp offers apps/offers
```

Then set `name = "apps.offers"` in `apps/offers/apps.py`, and add `"apps.offers"` to `INSTALLED_APPS` in `config/settings/base.py`.

- [x] **Step 2: Write the failing test** in `apps/offers/tests.py`

```python
from datetime import timedelta
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.listings.models import Car, CarStatus, ListingType
from apps.offers.models import ACTIVE_OFFER_STATUSES, Offer, OfferStatus
from apps.users.models import OwnerProfile, User


def create_user(email, role="customer", **extra):
    return User.objects.create_user(
        email=email, first_name="Test", last_name="User",
        password="securepass123", role=role, is_active=True, **extra,
    )


def create_negotiable_car(owner, **extra):
    defaults = dict(
        owner=owner, title="2023 Toyota Land Cruiser", listing_type=ListingType.BUY,
        sale_price="18500000.00", is_negotiable=True,
        min_price="16000000.00", max_price="18500000.00",
        brand="Toyota", model="Land Cruiser", year=2023,
        state="Lagos", city="Ikeja", status=CarStatus.PUBLISHED,
    )
    defaults.update(extra)
    return Car.objects.create(**defaults)


class OfferModelTest(APITestCase):
    def setUp(self):
        self.owner = create_user("t1-owner@test.com", "owner")
        self.customer = create_user("t1-cust@test.com")
        self.car = create_negotiable_car(self.owner)

    def _offer(self, **extra):
        return Offer.objects.create(
            car=self.car, customer=self.customer, amount="16500000.00",
            currency="NGN", expires_at=timezone.now() + timedelta(hours=48), **extra,
        )

    def test_defaults_to_pending(self):
        self.assertEqual(self._offer().status, OfferStatus.PENDING)

    def test_one_active_offer_per_customer_per_car(self):
        self._offer()
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self._offer()

    def test_closed_offer_frees_the_slot(self):
        first = self._offer()
        first.status = OfferStatus.REJECTED
        first.save(update_fields=["status"])
        self._offer()  # must not raise
        self.assertEqual(Offer.objects.filter(car=self.car).count(), 2)

    def test_active_statuses(self):
        self.assertEqual(
            set(ACTIVE_OFFER_STATUSES), {OfferStatus.PENDING, OfferStatus.COUNTERED}
        )
```

- [x] **Step 3: Run it, expect failure**

Run: `cd backend && uv run python manage.py test apps.offers -v2`
Expected: FAIL — `apps.offers.models` has no `Offer`.

- [x] **Step 4: Write the model** in `apps/offers/models.py`

```python
import uuid

from django.db import models

from apps.listings.models import Car, Currency, Request
from apps.users.models import User


class OfferStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    COUNTERED = "countered", "Countered"
    ACCEPTED = "accepted", "Accepted"
    REJECTED = "rejected", "Rejected"
    WITHDRAWN = "withdrawn", "Withdrawn"
    EXPIRED = "expired", "Expired"
    SUPERSEDED = "superseded", "Closed — vehicle sold"


# An offer still awaiting somebody's decision. Everything else is terminal.
ACTIVE_OFFER_STATUSES = [OfferStatus.PENDING, OfferStatus.COUNTERED]

MAX_OFFERS_PER_CAR = 3
OFFER_TTL_HOURS = 48


class Offer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="offers")
    customer = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="offers_made"
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(
        max_length=3, choices=Currency.choices, default=Currency.NGN
    )
    message = models.TextField(max_length=400, blank=True)
    status = models.CharField(
        max_length=20, choices=OfferStatus.choices,
        default=OfferStatus.PENDING, db_index=True,
    )
    # The owner's single counter-offer.
    counter_amount = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    counter_message = models.TextField(max_length=400, blank=True)
    countered_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(db_index=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    # Set when accepted — the buy Request that carries the sale to completion.
    resulting_request = models.ForeignKey(
        Request, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="originating_offers",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["car", "status"]),
            models.Index(fields=["customer", "status"]),
        ]
        constraints = [
            # One live offer per customer per car, enforced in the database so
            # concurrent submissions cannot both slip through a serializer check.
            models.UniqueConstraint(
                fields=["car", "customer"],
                condition=models.Q(status__in=ACTIVE_OFFER_STATUSES),
                name="one_active_offer_per_customer_per_car",
            ),
        ]

    def __str__(self):
        return f"{self.customer.email} — {self.amount} on {self.car.title}"

    @property
    def is_expired(self):
        """Lazy expiry: the clock is the truth, not the stored status."""
        from django.utils import timezone

        return (
            self.status in ACTIVE_OFFER_STATUSES and self.expires_at <= timezone.now()
        )

    @property
    def agreed_amount(self):
        """What the sale is for — the counter if there was one, else the offer."""
        return self.counter_amount if self.counter_amount is not None else self.amount
```

- [ ] **Step 5: Migrate and re-run**

```bash
cd backend && uv run python manage.py makemigrations offers && \
  uv run python manage.py migrate offers && \
  uv run python manage.py test apps.offers -v2
```

Expected: 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/offers backend/config/settings/base.py
git commit -m "feat(offers): add Offer model with one-active-offer constraint"
```

---

### Task 2: Placing an offer — eligibility, the price floor, the caps

**Files:** Create `apps/offers/serializers.py`, `apps/offers/views.py`, `apps/offers/urls.py`; Modify `config/urls.py`; Test: `apps/offers/tests.py`

- [x] **Step 1: Write the failing tests**

```python
class PlaceOfferTest(APITestCase):
    def setUp(self):
        self.owner = create_user("t2-owner@test.com", "owner")
        self.customer = create_user("t2-cust@test.com")
        self.car = create_negotiable_car(self.owner)
        self.client.force_authenticate(user=self.customer)

    def _url(self, car=None):
        return f"/api/v1/offers/cars/{(car or self.car).id}/offers"

    def _post(self, amount="16500000.00", car=None, **extra):
        return self.client.post(
            self._url(car), {"amount": amount, **extra}, format="json"
        )

    def test_valid_offer_created(self):
        res = self._post()
        self.assertEqual(res.status_code, 201)
        offer = Offer.objects.get(id=res.data["id"])
        self.assertEqual(offer.status, OfferStatus.PENDING)
        self.assertEqual(offer.currency, self.car.currency)
        # 48-hour window, allowing a little clock drift in the test
        self.assertGreater(offer.expires_at, timezone.now() + timedelta(hours=47))

    def test_below_minimum_rejected_with_fixed_message(self):
        res = self._post("15999999.00")
        self.assertEqual(res.status_code, 400)
        self.assertIn("below the acceptable range", str(res.data))

    def test_below_minimum_message_is_identical_regardless_of_distance(self):
        """The floor must not be recoverable by bisecting the error message."""
        near = self._post("15999999.00")
        far = self._post("1.00")
        self.assertEqual(near.data, far.data)

    def test_response_never_leaks_the_range(self):
        body = str(self._post("15000000.00").data) + str(self._post().data)
        self.assertNotIn("16000000", body)
        self.assertNotIn("18500000", body)

    def test_owner_cannot_offer_on_own_car(self):
        self.client.force_authenticate(user=self.owner)
        self.assertEqual(self._post().status_code, 400)

    def test_rent_car_rejected(self):
        rent = create_negotiable_car(
            self.owner, listing_type=ListingType.RENT, sale_price=None,
            rent_price_per_day="45000.00", is_negotiable=None,
            min_price=None, max_price=None,
        )
        self.assertEqual(self._post(car=rent).status_code, 400)

    def test_non_negotiable_car_rejected(self):
        fixed = create_negotiable_car(
            self.owner, is_negotiable=False, min_price=None, max_price=None,
        )
        self.assertEqual(self._post(car=fixed).status_code, 400)

    def test_unpublished_car_rejected(self):
        draft = create_negotiable_car(self.owner, status=CarStatus.DRAFT)
        self.assertEqual(self._post(car=draft).status_code, 400)

    def test_second_active_offer_rejected(self):
        self.assertEqual(self._post().status_code, 201)
        self.assertEqual(self._post().status_code, 400)

    def test_lifetime_cap_of_three(self):
        for _ in range(3):
            res = self._post()
            self.assertEqual(res.status_code, 201)
            Offer.objects.filter(car=self.car, customer=self.customer,
                                 status=OfferStatus.PENDING).update(
                status=OfferStatus.REJECTED)
        self.assertEqual(self._post().status_code, 400)
```

- [x] **Step 2: Run, expect 404s** (no route yet)

Run: `cd backend && uv run python manage.py test apps.offers.tests.PlaceOfferTest -v2`

- [x] **Step 3: Write the serializer** in `apps/offers/serializers.py`

```python
from django.utils import timezone
from datetime import timedelta

from rest_framework import serializers

from apps.listings.models import CarStatus, ListingType
from .models import (
    ACTIVE_OFFER_STATUSES, MAX_OFFERS_PER_CAR, OFFER_TTL_HOURS, Offer,
)

# One fixed sentence for every rejected-too-low offer. Never interpolate the
# actual minimum, and never vary the wording by how far off the amount is —
# either would let a buyer binary-search the owner's private floor.
BELOW_RANGE_MESSAGE = (
    "Your offer is below the acceptable range for this vehicle. "
    "Please submit a higher amount to continue."
)


class OfferCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offer
        fields = ["amount", "message"]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Enter an amount greater than zero.")
        return value

    def validate(self, data):
        car = self.context["car"]
        user = self.context["request"].user

        if car.owner_id == user.id:
            raise serializers.ValidationError(
                {"detail": "You cannot make an offer on your own listing."}
            )
        if car.listing_type != ListingType.BUY or not car.is_negotiable:
            raise serializers.ValidationError(
                {"detail": "This listing does not accept offers."}
            )
        if car.status != CarStatus.PUBLISHED:
            raise serializers.ValidationError(
                {"detail": "This listing is not available."}
            )

        existing = Offer.objects.filter(car=car, customer=user)
        if existing.filter(status__in=ACTIVE_OFFER_STATUSES).exists():
            raise serializers.ValidationError(
                {"detail": "You already have an active offer on this vehicle."}
            )
        # Counts every offer ever made, including withdrawn and expired ones —
        # otherwise withdraw-and-resubmit would bypass the cap entirely.
        if existing.count() >= MAX_OFFERS_PER_CAR:
            raise serializers.ValidationError(
                {"detail": (
                    f"You have reached the maximum of {MAX_OFFERS_PER_CAR} offers "
                    "on this vehicle."
                )}
            )

        if car.min_price is not None and data["amount"] < car.min_price:
            raise serializers.ValidationError({"amount": BELOW_RANGE_MESSAGE})
        return data

    def create(self, validated_data):
        car = self.context["car"]
        return Offer.objects.create(
            car=car,
            customer=self.context["request"].user,
            currency=car.currency,
            expires_at=timezone.now() + timedelta(hours=OFFER_TTL_HOURS),
            **validated_data,
        )
```

- [ ] **Step 4: Write the customer-facing read serializer** (same file)

```python
class OfferCarSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    sale_price = serializers.DecimalField(max_digits=14, decimal_places=2)
    primary_image = serializers.SerializerMethodField()

    def get_primary_image(self, obj):
        image = next((i for i in obj.images.all() if i.is_primary), None)
        image = image or next(iter(obj.images.all()), None)
        if not image:
            return None
        file = image.thumbnail or image.image
        request = self.context.get("request")
        return request.build_absolute_uri(file.url) if request else file.url


class OfferSerializer(serializers.ModelSerializer):
    """Customer-facing. Carries NOTHING about the owner's private range."""

    car = OfferCarSummarySerializer(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Offer
        fields = [
            "id", "car", "amount", "currency", "message", "status",
            "counter_amount", "counter_message", "countered_at",
            "expires_at", "responded_at", "resulting_request",
            "is_expired", "created_at",
        ]
        read_only_fields = fields
```

- [ ] **Step 5: Write the view** in `apps/offers/views.py`

```python
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.listings.models import Car
from .models import Offer
from .serializers import OfferCreateSerializer, OfferSerializer


class CarOfferCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, car_id):
        car = get_object_or_404(Car, id=car_id)
        serializer = OfferCreateSerializer(
            data=request.data, context={"request": request, "car": car}
        )
        serializer.is_valid(raise_exception=True)
        offer = serializer.save()
        offer = Offer.objects.select_related("car").prefetch_related(
            "car__images"
        ).get(id=offer.id)
        return Response(
            OfferSerializer(offer, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
```

- [x] **Step 6: Wire the routes.** `apps/offers/urls.py`:

```python
from django.urls import path

from .views import CarOfferCreateView

urlpatterns = [
    path("cars/<uuid:car_id>/offers", CarOfferCreateView.as_view(), name="car-offers"),
]
```

And in `config/urls.py`, beside the other includes:

```python
    path("api/v1/offers/", include("apps.offers.urls")),
```

- [x] **Step 7: Run — all PlaceOfferTest tests pass. Then commit**

```bash
git add backend/apps/offers backend/config/urls.py
git commit -m "feat(offers): place an offer with floor, eligibility and caps"
```

---

### Task 3: Owner responds — decline and counter

**Files:** Modify `apps/offers/serializers.py`, `views.py`, `urls.py`; Test: `tests.py`

- [x] **Step 1: Failing tests**

```python
class OwnerRespondTest(APITestCase):
    def setUp(self):
        self.owner = create_user("t3-owner@test.com", "owner")
        self.customer = create_user("t3-cust@test.com")
        self.other = create_user("t3-other@test.com")
        self.car = create_negotiable_car(self.owner)
        self.offer = Offer.objects.create(
            car=self.car, customer=self.customer, amount="16500000.00",
            currency="NGN", expires_at=timezone.now() + timedelta(hours=48),
        )

    def _respond(self, actor, **payload):
        self.client.force_authenticate(user=actor)
        return self.client.post(
            f"/api/v1/offers/offers/{self.offer.id}/respond", payload, format="json"
        )

    def test_owner_declines(self):
        self.assertEqual(self._respond(self.owner, action="reject").status_code, 200)
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.status, OfferStatus.REJECTED)
        self.assertIsNotNone(self.offer.responded_at)

    def test_owner_counters(self):
        res = self._respond(
            self.owner, action="counter", counter_amount="17500000.00"
        )
        self.assertEqual(res.status_code, 200)
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.status, OfferStatus.COUNTERED)
        self.assertEqual(str(self.offer.counter_amount), "17500000.00")
        self.assertIsNotNone(self.offer.countered_at)

    def test_counter_resets_the_expiry_window(self):
        self.offer.expires_at = timezone.now() + timedelta(hours=2)
        self.offer.save(update_fields=["expires_at"])
        self._respond(self.owner, action="counter", counter_amount="17500000.00")
        self.offer.refresh_from_db()
        self.assertGreater(self.offer.expires_at, timezone.now() + timedelta(hours=47))

    def test_counter_requires_an_amount(self):
        self.assertEqual(self._respond(self.owner, action="counter").status_code, 400)

    def test_cannot_counter_twice(self):
        self._respond(self.owner, action="counter", counter_amount="17500000.00")
        second = self._respond(
            self.owner, action="counter", counter_amount="17000000.00"
        )
        self.assertEqual(second.status_code, 400)

    def test_stranger_cannot_respond(self):
        self.assertEqual(self._respond(self.other, action="reject").status_code, 404)

    def test_customer_cannot_use_owner_actions(self):
        self.assertEqual(self._respond(self.customer, action="counter",
                                       counter_amount="1.00").status_code, 400)

    def test_expired_offer_cannot_be_actioned(self):
        self.offer.expires_at = timezone.now() - timedelta(minutes=1)
        self.offer.save(update_fields=["expires_at"])
        self.assertEqual(self._respond(self.owner, action="reject").status_code, 400)
```

- [ ] **Step 2: Run, expect failure.**

- [ ] **Step 3: Add the respond serializer**

```python
class OfferRespondSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["accept", "reject", "counter"])
    counter_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False
    )
    message = serializers.CharField(max_length=400, required=False, allow_blank=True)

    def validate(self, data):
        if data["action"] == "counter" and data.get("counter_amount") is None:
            raise serializers.ValidationError(
                {"counter_amount": "Enter the amount you're countering with."}
            )
        if data.get("counter_amount") is not None and data["counter_amount"] <= 0:
            raise serializers.ValidationError(
                {"counter_amount": "Enter an amount greater than zero."}
            )
        return data
```

- [ ] **Step 4: Add the respond view.** Both parties hit one endpoint; the actor's relationship to the offer decides which transitions are legal.

Add these imports at the top of `apps/offers/views.py` alongside the Task 2 ones:

```python
from django.core.exceptions import ValidationError
from django.db.models import Q

from .serializers import OfferRespondSerializer
from .services import customer_respond, owner_respond
```

```python
class OfferRespondView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, offer_id):
        # A user may only ever see their own offers or offers on their own cars;
        # anything else is a 404, not a 403 — we don't confirm the offer exists.
        offer = get_object_or_404(
            Offer.objects.select_related("car", "customer").filter(
                Q(customer=request.user) | Q(car__owner=request.user)
            ),
            id=offer_id,
        )
        serializer = OfferRespondSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data["action"]

        if offer.is_expired:
            return Response(
                {"detail": "This offer has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_owner = offer.car.owner_id == request.user.id
        try:
            if is_owner:
                offer = owner_respond(offer, action, serializer.validated_data)
            else:
                offer = customer_respond(offer, action)
        except ValidationError as exc:
            return Response({"detail": str(exc.message)},
                            status=status.HTTP_400_BAD_REQUEST)

        return Response(OfferSerializer(offer, context={"request": request}).data)
```

- [ ] **Step 5: Add** `owner_respond` **to** `apps/offers/services.py`

```python
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta

from .models import OFFER_TTL_HOURS, Offer, OfferStatus


def owner_respond(offer, action, data):
    if offer.status != OfferStatus.PENDING:
        raise ValidationError("This offer is no longer awaiting your response.")

    if action == "reject":
        offer.status = OfferStatus.REJECTED
        offer.responded_at = timezone.now()
        offer.save(update_fields=["status", "responded_at", "updated_at"])
        return offer

    if action == "counter":
        offer.status = OfferStatus.COUNTERED
        offer.counter_amount = data["counter_amount"]
        offer.counter_message = data.get("message", "")
        offer.countered_at = timezone.now()
        # The ball is now in the buyer's court, so restart their clock.
        offer.expires_at = timezone.now() + timedelta(hours=OFFER_TTL_HOURS)
        offer.save(update_fields=[
            "status", "counter_amount", "counter_message", "countered_at",
            "expires_at", "updated_at",
        ])
        return offer

    return accept_offer(offer)
```

**Both** `accept_offer` **and** `customer_respond` **must exist now as stubs**, or this module fails to import. Task 4 and Task 5 replace them:

```python
def accept_offer(offer):
    raise ValidationError("Accepting is not implemented yet.")  # Task 4


def customer_respond(offer, action):
    raise ValidationError("Not implemented yet.")  # Task 5
```

- [ ] **Step 6: Register the route**, run the tests green, commit.

```python
    path("offers/<uuid:offer_id>/respond", OfferRespondView.as_view(), name="offer-respond"),
```

```bash
git commit -am "feat(offers): owner can decline or send one counter-offer"
```

---

### Task 4: Accepting — the atomic hand-off

This is the riskiest task in the plan: it mutates three things at once and must survive two owners clicking Accept simultaneously.

**Files:** Modify `apps/offers/services.py`; Test: `tests.py`

- [ ] **Step 1: Failing tests**

```python
class AcceptOfferTest(APITestCase):
    def setUp(self):
        self.owner = create_user("t4-owner@test.com", "owner")
        self.buyer = create_user("t4-buyer@test.com")
        self.rival = create_user("t4-rival@test.com")
        self.car = create_negotiable_car(self.owner)
        self.offer = Offer.objects.create(
            car=self.car, customer=self.buyer, amount="17000000.00",
            currency="NGN", expires_at=timezone.now() + timedelta(hours=48))
        self.rival_offer = Offer.objects.create(
            car=self.car, customer=self.rival, amount="16200000.00",
            currency="NGN", expires_at=timezone.now() + timedelta(hours=48))

    def _accept(self, offer=None):
        self.client.force_authenticate(user=self.owner)
        return self.client.post(
            f"/api/v1/offers/offers/{(offer or self.offer).id}/respond",
            {"action": "accept"}, format="json")

    def test_accept_creates_approved_buy_request_at_agreed_amount(self):
        self.assertEqual(self._accept().status_code, 200)
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.status, OfferStatus.ACCEPTED)
        req = self.offer.resulting_request
        self.assertIsNotNone(req)
        self.assertEqual(req.request_type, ListingType.BUY)
        self.assertEqual(req.status, RequestStatus.APPROVED)
        self.assertEqual(str(req.price_offered), "17000000.00")
        self.assertEqual(req.customer, self.buyer)

    def test_accepting_a_counter_uses_the_counter_amount(self):
        self.offer.status = OfferStatus.COUNTERED
        self.offer.counter_amount = "17800000.00"
        self.offer.save(update_fields=["status", "counter_amount"])
        self.client.force_authenticate(user=self.buyer)
        res = self.client.post(
            f"/api/v1/offers/offers/{self.offer.id}/respond",
            {"action": "accept"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.offer.refresh_from_db()
        self.assertEqual(str(self.offer.resulting_request.price_offered), "17800000.00")

    def test_rival_offers_superseded(self):
        self._accept()
        self.rival_offer.refresh_from_db()
        self.assertEqual(self.rival_offer.status, OfferStatus.SUPERSEDED)

    def test_car_reads_reserved_after_acceptance(self):
        self._accept()
        res = self.client.get(f"/api/v1/listings/cars/{self.car.id}")
        self.assertEqual(res.data["availability_status"], "reserved")

    def test_cannot_accept_a_second_offer_on_the_same_car(self):
        self._accept()
        # rival_offer is superseded; accepting it must fail
        self.assertEqual(self._accept(self.rival_offer).status_code, 400)
```

- [x] **Step 2: Run, expect failure.**

- [x] **Step 3: Implement** `accept_offer`

```python
from django.db import transaction

from apps.listings.models import Car, ListingType, Request, RequestStatus, RequestStatusEvent


def accept_offer(offer):
    """Accept an offer and hand the sale to the existing purchase pipeline.

    Everything here is one transaction under a row lock on the car: without it,
    two offers on the same vehicle could both be accepted and we would create
    two competing purchase requests for one car.
    """
    with transaction.atomic():
        car = Car.objects.select_for_update().get(id=offer.car_id)

        if Offer.objects.filter(
            car=car, status=OfferStatus.ACCEPTED
        ).exclude(id=offer.id).exists():
            raise ValidationError("Another offer on this vehicle was already accepted.")
        if offer.status not in ACTIVE_OFFER_STATUSES:
            raise ValidationError("This offer is no longer open.")

        amount = offer.agreed_amount

        # Owner approval is implicit in accepting, so the request skips PENDING
        # and lands ready for payment.
        req = Request.objects.create(
            car=car, customer=offer.customer, request_type=ListingType.BUY,
            price_offered=amount, currency=car.currency,
            status=RequestStatus.APPROVED,
        )
        RequestStatusEvent.objects.create(
            request=req, from_status="", to_status=RequestStatus.APPROVED,
            actor=car.owner, note="Created from an accepted offer.",
        )

        offer.status = OfferStatus.ACCEPTED
        offer.responded_at = timezone.now()
        offer.resulting_request = req
        offer.save(update_fields=[
            "status", "responded_at", "resulting_request", "updated_at",
        ])

        # Everyone else loses; they are told the vehicle is gone (Task 7).
        Offer.objects.filter(
            car=car, status__in=ACTIVE_OFFER_STATUSES
        ).exclude(id=offer.id).update(
            status=OfferStatus.SUPERSEDED, responded_at=timezone.now(),
        )
    return offer
```

- [ ] **Step 4: Run green. Commit.**

```bash
git commit -am "feat(offers): accepting an offer reserves the car and opens a buy request"
```

---

### Task 5: Customer responds to a counter, and withdrawal

**Files:** Modify `apps/offers/services.py`, `views.py`, `urls.py`; Test: `tests.py`

- [ ] **Step 1: Failing tests**

```python
class CustomerRespondTest(APITestCase):
    def setUp(self):
        self.owner = create_user("t5-owner@test.com", "owner")
        self.customer = create_user("t5-cust@test.com")
        self.car = create_negotiable_car(self.owner)
        self.offer = Offer.objects.create(
            car=self.car, customer=self.customer, amount="16500000.00",
            currency="NGN", expires_at=timezone.now() + timedelta(hours=48))
        self.client.force_authenticate(user=self.customer)

    def _post(self, path, **payload):
        return self.client.post(
            f"/api/v1/offers/offers/{self.offer.id}/{path}", payload, format="json")

    def _make_countered(self):
        self.offer.status = OfferStatus.COUNTERED
        self.offer.counter_amount = "17500000.00"
        self.offer.save(update_fields=["status", "counter_amount"])

    def test_customer_declines_counter(self):
        self._make_countered()
        self.assertEqual(self._post("respond", action="reject").status_code, 200)
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.status, OfferStatus.REJECTED)

    def test_customer_cannot_respond_before_a_counter(self):
        self.assertEqual(self._post("respond", action="accept").status_code, 400)

    def test_withdraw_while_pending(self):
        self.assertEqual(self._post("withdraw").status_code, 200)
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.status, OfferStatus.WITHDRAWN)

    def test_cannot_withdraw_after_a_counter(self):
        self._make_countered()
        self.assertEqual(self._post("withdraw").status_code, 400)

    def test_withdrawn_offer_still_counts_toward_the_cap(self):
        self._post("withdraw")
        self.assertEqual(
            Offer.objects.filter(car=self.car, customer=self.customer).count(), 1)
```

- [ ] **Step 2: Run, expect failure. Step 3: implement**

```python
def customer_respond(offer, action):
    if offer.status != OfferStatus.COUNTERED:
        raise ValidationError("There is no counter-offer awaiting your response.")
    if action == "accept":
        return accept_offer(offer)
    if action == "reject":
        offer.status = OfferStatus.REJECTED
        offer.responded_at = timezone.now()
        offer.save(update_fields=["status", "responded_at", "updated_at"])
        return offer
    raise ValidationError("Unsupported action.")


def withdraw_offer(offer):
    # Only before the owner has responded — once they have, the buyer answers
    # rather than retreats.
    if offer.status != OfferStatus.PENDING:
        raise ValidationError("You can only withdraw an offer awaiting a response.")
    offer.status = OfferStatus.WITHDRAWN
    offer.responded_at = timezone.now()
    offer.save(update_fields=["status", "responded_at", "updated_at"])
    return offer
```

- [ ] **Step 4: Add the withdraw view** in `apps/offers/views.py` (scoped to the customer — an owner has no business withdrawing someone's offer):

```python
class OfferWithdrawView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, offer_id):
        offer = get_object_or_404(
            Offer.objects.select_related("car"), id=offer_id, customer=request.user
        )
        try:
            offer = withdraw_offer(offer)
        except ValidationError as exc:
            return Response({"detail": str(exc.message)},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response(OfferSerializer(offer, context={"request": request}).data)
```

Import `withdraw_offer` from `.services`, route it, run green, commit.

```bash
git commit -am "feat(offers): customer answers a counter or withdraws a pending offer"
```

---

### Task 6: Expiry — lazy guard plus the sweep command

**Files:** Create `apps/offers/management/commands/expire_offers.py` (+ `__init__.py` at each level); Test: `tests.py`

- [ ] **Step 1: Failing tests**

```python
class ExpiryTest(APITestCase):
    def setUp(self):
        self.owner = create_user("t6-owner@test.com", "owner")
        self.customer = create_user("t6-cust@test.com")
        self.car = create_negotiable_car(self.owner)
        self.offer = Offer.objects.create(
            car=self.car, customer=self.customer, amount="16500000.00",
            currency="NGN", expires_at=timezone.now() - timedelta(minutes=1))

    def test_stale_pending_offer_reports_expired(self):
        self.assertTrue(self.offer.is_expired)

    def test_expired_offer_cannot_be_accepted_even_while_stored_pending(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(
            f"/api/v1/offers/offers/{self.offer.id}/respond",
            {"action": "accept"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.offer.refresh_from_db()
        self.assertNotEqual(self.offer.status, OfferStatus.ACCEPTED)

    def test_command_flips_and_is_idempotent(self):
        from django.core.management import call_command
        call_command("expire_offers")
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.status, OfferStatus.EXPIRED)
        call_command("expire_offers")  # second run must be a no-op

    def test_command_leaves_live_offers_alone(self):
        live = Offer.objects.create(
            car=self.car, customer=create_user("t6-b@test.com"),
            amount="16600000.00", currency="NGN",
            expires_at=timezone.now() + timedelta(hours=10))
        from django.core.management import call_command
        call_command("expire_offers")
        live.refresh_from_db()
        self.assertEqual(live.status, OfferStatus.PENDING)
```

- [ ] **Step 2: Run, expect failure. Step 3: write the command**

```python
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.offers.models import ACTIVE_OFFER_STATUSES, Offer, OfferStatus


class Command(BaseCommand):
    help = "Close offers past their 48-hour window and notify the buyers."

    def handle(self, *args, **options):
        stale = Offer.objects.filter(
            status__in=ACTIVE_OFFER_STATUSES, expires_at__lte=timezone.now()
        ).select_related("car", "customer")
        # Materialise before the update — afterwards they no longer match.
        expiring = list(stale)
        stale.update(status=OfferStatus.EXPIRED)
        for offer in expiring:
            notify_offer_expired(offer)  # wired in Task 7
        self.stdout.write(self.style.SUCCESS(f"Expired {len(expiring)} offer(s)."))
```

- [ ] **Step 4: Run green, commit.**

```bash
git commit -am "feat(offers): lazy expiry guard plus expire_offers command"
```

---

### Task 7: Notifications and emails

**Files:** Modify `apps/notifications/models.py` (+ migration), `apps/notifications/service.py`; Create `apps/notifications/templates/emails/offer_*.html`; Create `backend/common/notifications.py`; Test: `tests.py`

- [ ] **Step 1: Add the nine types** to `NotificationType`:

```python
    OFFER_SUBMITTED = "offer_submitted", "Offer submitted"
    OFFER_RECEIVED = "offer_received", "New offer received"
    OFFER_COUNTERED = "offer_countered", "Counter-offer received"
    OFFER_ACCEPTED = "offer_accepted", "Offer accepted"
    OFFER_REJECTED = "offer_rejected", "Offer declined"
    COUNTER_ACCEPTED = "counter_accepted", "Counter-offer accepted"
    COUNTER_REJECTED = "counter_rejected", "Counter-offer declined"
    OFFER_EXPIRED = "offer_expired", "Offer expired"
    CAR_NO_LONGER_AVAILABLE = "car_no_longer_available", "Vehicle no longer available"
```

Then `uv run python manage.py makemigrations notifications`.

- [ ] **Step 2: Failing test**

```python
class OfferNotificationTest(APITestCase):
    def test_placing_an_offer_notifies_both_sides(self):
        owner = create_user("t7-owner@test.com", "owner")
        customer = create_user("t7-cust@test.com")
        car = create_negotiable_car(owner)
        self.client.force_authenticate(user=customer)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                f"/api/v1/offers/cars/{car.id}/offers",
                {"amount": "16500000.00"}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertTrue(Notification.objects.filter(
            recipient=owner, notification_type="offer_received").exists())
        self.assertTrue(Notification.objects.filter(
            recipient=customer, notification_type="offer_submitted").exists())
```

Write the equivalent for counter, accept, decline, counter-accepted, counter-declined, superseded and expired.

- [ ] **Step 3: Add** `notify_offer_`\* **functions** to `apps/notifications/service.py`, each following the existing `notify_request_approved` shape — `_create_notification(...)` then `send_email(...)` for the customer-facing ones. Wire `car_no_longer_available` to the **existing** `car_sold.html` template. Keep decline copy neutral.

- [ ] **Step 4: Create** `backend/common/notifications.py`

```python
from django.db import transaction


def schedule_notification(notify_func, get_payload):
    """Fire a notification only once the surrounding transaction commits."""
    transaction.on_commit(lambda: notify_func(get_payload()), robust=True)
```

Use it from `apps/offers/views.py`. (`apps/listings/views.py` and `apps/inspections/views.py` each hold an identical private copy; leave them be for now, but this is the shared home for future callers.)

- [ ] **Step 5: Call the notifications** from the create/respond/withdraw views and `accept_offer`, all via `schedule_notification`. Run green, commit.

```bash
git commit -m "feat(offers): notifications and emails across the negotiation"
```

---

### Task 8: Negotiable cars use offers, not direct buy requests

**Files:** Modify `apps/listings/serializers.py` (`RequestCreateSerializer.validate`); Test: `apps/listings/tests.py`

- [ ] **Step 1: Failing test**

```python
def test_direct_buy_request_rejected_on_negotiable_car(self):
    """Negotiable listings transact through offers only."""
    car = create_car(self.owner, listing_type=ListingType.BUY,
                     sale_price="18500000.00", is_negotiable=True,
                     min_price="16000000.00", max_price="18500000.00")
    res = self._post(car, "buy", "18500000.00")
    self.assertEqual(res.status_code, 400)
    self.assertIn("offer", str(res.data).lower())

def test_direct_buy_request_still_allowed_on_non_negotiable_car(self):
    car = create_car(self.owner, listing_type=ListingType.BUY,
                     sale_price="18500000.00", is_negotiable=False)
    self.assertEqual(self._post(car, "buy", "18500000.00").status_code, 201)
```

- [ ] **Step 2: Run, expect failure. Step 3:** in `RequestCreateSerializer.validate`, after the type-match check:

```python
        if (
            car
            and request_type == ListingType.BUY
            and car.is_negotiable
            and self.instance is None
        ):
            raise serializers.ValidationError({"detail": (
                "This vehicle accepts offers. Submit an offer instead of a "
                "direct purchase request."
            )})
```

**Note for the implementer:** `accept_offer` creates its `Request` through the ORM, not this serializer, so it is unaffected by this guard.

- [ ] **Step 4: Run the full listings + offers suites green. Commit.**

```bash
git commit -am "feat(listings): negotiable buy listings transact through offers"
```

---

### Task 9: List endpoints

**Files:** Modify `apps/offers/views.py`, `serializers.py`, `urls.py`; Test: `tests.py`

- [ ] **Step 1: Failing tests**

```python
class OfferListTest(APITestCase):
    def setUp(self):
        self.owner = create_user("t9-owner@test.com", "owner")
        self.buyer = create_user("t9-buyer@test.com")
        self.stranger = create_user("t9-other@test.com")
        self.car = create_negotiable_car(self.owner)
        self.offer = Offer.objects.create(
            car=self.car, customer=self.buyer, amount="16500000.00",
            currency="NGN", expires_at=timezone.now() + timedelta(hours=48))

    def test_my_offers_returns_only_my_own(self):
        self.client.force_authenticate(user=self.stranger)
        res = self.client.get("/api/v1/offers/my-offers")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["results"], [])

    def test_owner_offers_returns_only_offers_on_my_cars(self):
        self.client.force_authenticate(user=self.stranger)
        res = self.client.get("/api/v1/offers/owner-offers")
        self.assertEqual(res.data["results"], [])

    def test_owner_sees_buyer_name_but_not_contact_while_pending(self):
        self.client.force_authenticate(user=self.owner)
        row = self.client.get("/api/v1/offers/owner-offers").data["results"][0]
        self.assertEqual(row["customer"]["first_name"], self.buyer.first_name)
        self.assertIsNone(row["customer"]["email"])

    def test_owner_sees_contact_once_accepted(self):
        self.offer.status = OfferStatus.ACCEPTED
        self.offer.save(update_fields=["status"])
        self.client.force_authenticate(user=self.owner)
        row = self.client.get("/api/v1/offers/owner-offers").data["results"][0]
        self.assertEqual(row["customer"]["email"], self.buyer.email)

    def test_no_payload_leaks_the_private_range(self):
        self.client.force_authenticate(user=self.buyer)
        mine = str(self.client.get("/api/v1/offers/my-offers").data)
        self.assertNotIn("16000000", mine)
        self.assertNotIn("18500000", mine)

    def test_status_filter(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get("/api/v1/offers/owner-offers?status=rejected")
        self.assertEqual(res.data["results"], [])
```

- [ ] **Step 2: Implement** `MyOfferListView` and `OwnerOfferListView` using `StandardPagination`, `select_related("car", "customer", "resulting_request")` and `prefetch_related("car__images")`.

Owner-facing buyer block:

```python
class OfferBuyerSerializer(serializers.Serializer):
    """Name always; contact details only once a deal exists."""

    id = serializers.UUIDField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()

    def _revealed(self):
        return self.context.get("offer_status") == OfferStatus.ACCEPTED

    def get_email(self, obj):
        return obj.email if self._revealed() else None

    def get_phone(self, obj):
        return getattr(obj, "phone", None) if self._revealed() else None
```

- [ ] **Step 3: Run green, commit.**

```bash
git commit -m "feat(offers): customer and owner offer list endpoints"
```

---

### Task 10: Frontend — types and API hooks _(Claude implements)_

**Files:** Create `frontend/src/features/offers/api/{types.ts,offers-api.ts,index.ts}`

- [ ] `Offer`, `OfferStatus`, `OfferBuyer`, `OfferCarSummary` types mirroring the serializers; `min_price`/`max_price` must not appear in any customer-facing type.
- [ ] Hooks: `usePlaceOffer`, `useMyOffers`, `useOwnerOffers(filters)`, `useRespondToOffer`, `useWithdrawOffer`. All mutations set `meta: { skipGlobalOverlay: true }` — these screens show inline progress.
- [ ] Add offer query keys to `NOTIFICATION_QUERY_DEPS` in `use-websocket.ts` for all nine notification types so both dashboards update live.
- [ ] Verify: `npx tsc --noEmit`. Commit.

---

### Task 11: Frontend — Make Offer dialog _(Claude implements)_

**Files:** Create `features/offers/components/make-offer-dialog.tsx`; Modify `features/listings/components/car-detail-page.tsx`

- [ ] On a negotiable buy listing, the primary CTA becomes **Make an Offer**; the direct "Request to Buy" is removed (matching Task 8's server rule).
- [ ] Dialog per the design brief: large ₦ amount input with live thousands separators, −5%/−10%/asking quick-picks, optional message with counter, and the "valid for 48 hours · N of 3 remaining" footer.
- [ ] **Below-minimum rejection**: render the server's message inline, calm styling, no shake, no hint of the threshold, preserving the entered amount.
- [ ] Verify: `tsc`, `lint`, `build`. Commit.

---

### Task 12: Frontend — `/customer/offers` _(Claude implements)_

- [ ] Active/Closed segmented control; offer cards with countdown; countered offers expanded as the hero state with the offer-vs-counter comparison and Accept/Decline; withdraw as a quiet ghost link while pending; closed cards recessed with an explanatory chip.
- [ ] Accept routes through `ConfirmDialog` stating it reserves the vehicle.
- [ ] Loading skeletons, empty state, error retry. Verify and commit.

---

### Task 13: Frontend — `/owner/offers` _(Claude implements)_

- [ ] Stat strip, sticky filter bar (car / status / sort), offers **grouped by car**, "Best offer" flag on each car's highest live bid, per-minute countdown.
- [ ] Right-side respond `Sheet`: buyer block, the private range card (**the only place it renders**), Accept / Counter / Decline, counter amount revealed by accordion with the one-counter warning.
- [ ] Accept and Decline both via `ConfirmDialog`; the accept dialog names how many other offers will close.
- [ ] Verify and commit.

---

### Task 14: Frontend — remaining surfaces _(Claude implements)_

- [ ] Owner car detail: per-car offers section with count and link.
- [ ] Owner dashboard: pending-offers stat and recent-offers widget.
- [ ] Customer request detail: "Created from your accepted offer" provenance line linking back.
- [ ] Notification dropdown + notifications page: icons, copy and deep links for all nine types.
- [ ] Verify and commit.

---

## Verification (whole plan)

- [ ] `cd backend && uv run python manage.py test apps` — all green
- [ ] `cd backend && uv run ruff check .` — clean
- [ ] `cd frontend && npx tsc --noEmit && npm run lint && npm run build` — clean
- [ ] Write `docs/test-offer-negotiation.md` covering: the floor never leaks, the caps, every state transition, concurrent accepts, expiry, and the nine notifications.
