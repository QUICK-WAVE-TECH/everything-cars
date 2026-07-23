from django.test import TestCase

# Create your tests here.
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.listings.models import Car, CarStatus, ListingType
from apps.offers.models import ACTIVE_OFFER_STATUSES, Offer, OfferStatus
from apps.users.models import User


def create_user(email, role="customer", **extra):
    return User.objects.create_user(
        email=email,
        first_name="Test",
        last_name="User",
        password="securepass123",
        role=role,
        is_active=True,
        **extra,
    )


def create_negotiable_car(owner, **extra):
    defaults = dict(
        owner=owner,
        title="2023 Toyota Land Cruiser",
        listing_type=ListingType.BUY,
        sale_price="18500000.00",
        is_negotiable=True,
        min_price="16000000.00",
        max_price="18500000.00",
        brand="Toyota",
        model="Land Cruiser",
        year=2023,
        state="Lagos",
        city="Ikeja",
        status=CarStatus.PUBLISHED,
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
            car=self.car,
            customer=self.customer,
            amount="16500000.00",
            currency="NGN",
            expires_at=timezone.now() + timedelta(hours=48),
            **extra,
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

    def test_agreed_amount_prefers_the_counter(self):
        offer = self._offer()
        self.assertEqual(str(offer.agreed_amount), "16500000.00")
        offer.counter_amount = "17500000.00"
        self.assertEqual(str(offer.agreed_amount), "17500000.00")


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
            self.owner,
            listing_type=ListingType.RENT,
            sale_price=None,
            rent_price_per_day="45000.00",
            is_negotiable=None,
            min_price=None,
            max_price=None,
        )
        self.assertEqual(self._post(car=rent).status_code, 400)

    def test_non_negotiable_car_rejected(self):
        fixed = create_negotiable_car(
            self.owner,
            is_negotiable=False,
            min_price=None,
            max_price=None,
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
            Offer.objects.filter(
                car=self.car, customer=self.customer, status=OfferStatus.PENDING
            ).update(status=OfferStatus.REJECTED)
        self.assertEqual(self._post().status_code, 400)
