from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.listings.models import Car, CarStatus, ListingType
from apps.offers.models import Offer, OfferStatus
from apps.sales.models import Deal, DealStatus, DEAL_TTL_DAYS
from apps.users.models import OwnerProfile, User


def make_user(email, role="customer"):
    return User.objects.create_user(
        email=email,
        first_name="A",
        last_name="B",
        password="securepass123",
        role=role,
        is_active=True,
    )


def make_owner(email="deal-owner@test.com"):
    owner = make_user(email, role="owner")
    OwnerProfile.objects.create(
        user=owner,
        owner_type=OwnerProfile.OwnerType.INDIVIDUAL,
        bank_account="1234567890",
        bank_name="Bank",
        is_verified=True,
    )
    return owner


def make_negotiable_car(owner):
    return Car.objects.create(
        owner=owner,
        title="Lexus RX",
        listing_type=ListingType.BUY,
        sale_price="15000000.00",
        is_negotiable=True,
        brand="Lexus",
        model="RX",
        year=2022,
        state="Lagos",
        city="Lekki",
        status=CarStatus.PUBLISHED,
    )


def make_accepted_offer(car, buyer, amount="14000000.00"):
    return Offer.objects.create(
        car=car,
        customer=buyer,
        amount=amount,
        currency=car.currency,
        status=OfferStatus.PENDING,
        expires_at=timezone.now(),
    )


class DealModelTest(APITestCase):
    def setUp(self):
        self.owner = make_owner()
        self.buyer = make_user("deal-buyer@test.com")
        self.car = make_negotiable_car(self.owner)
        self.offer = make_accepted_offer(self.car, self.buyer)

    def test_deal_defaults_to_active_with_a_7_day_expiry(self):
        deal = Deal.objects.create(
            car=self.car,
            buyer=self.buyer,
            seller=self.owner,
            offer=self.offer,
            agreed_amount=Decimal("14000000.00"),
            currency=self.car.currency,
            expires_at=timezone.now() + timezone.timedelta(days=DEAL_TTL_DAYS),
        )
        self.assertEqual(deal.status, DealStatus.ACTIVE)
        self.assertEqual(self.offer.deal, deal)  # reverse OneToOne
        self.assertEqual(self.car.deals.count(), 1)

    def test_only_one_active_deal_per_car(self):
        Deal.objects.create(
            car=self.car,
            buyer=self.buyer,
            seller=self.owner,
            offer=self.offer,
            agreed_amount=Decimal("1.00"),
            currency=self.car.currency,
            expires_at=timezone.now(),
        )
        other = make_accepted_offer(self.car, make_user("b2@test.com"), "1.00")
        with self.assertRaises(
            Exception
        ):  # IntegrityError from the partial unique constraint
            Deal.objects.create(
                car=self.car,
                buyer=self.buyer,
                seller=self.owner,
                offer=other,
                agreed_amount=Decimal("1.00"),
                currency=self.car.currency,
                expires_at=timezone.now(),
            )
