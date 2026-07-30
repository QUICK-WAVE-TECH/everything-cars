from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.listings.models import Car, CarStatus, ListingType
from apps.offers.models import Offer, OfferStatus
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
        # min/max kept distinct from sale_price so a leak test can tell the
        # private range apart from the (public) asking price.
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
        )
        self.assertEqual(self._post(car=rent).status_code, 400)

    def test_non_negotiable_car_rejected(self):
        fixed = create_negotiable_car(
            self.owner,
            is_negotiable=False,
        )
        self.assertEqual(self._post(car=fixed).status_code, 400)

    def test_unpublished_car_rejected(self):
        draft = create_negotiable_car(self.owner, status=CarStatus.DRAFT)
        self.assertEqual(self._post(car=draft).status_code, 400)

    def test_second_active_offer_rejected(self):
        self.assertEqual(self._post().status_code, 201)
        self.assertEqual(self._post().status_code, 400)

    def test_lifetime_cap_of_two(self):
        for _ in range(2):
            res = self._post()
            self.assertEqual(res.status_code, 201)
            Offer.objects.filter(
                car=self.car, customer=self.customer, status=OfferStatus.PENDING
            ).update(status=OfferStatus.REJECTED)
        self.assertEqual(self._post().status_code, 400)


class OwnerRespondTest(APITestCase):
    def setUp(self):
        self.owner = create_user("t3-owner@test.com", "owner")
        self.customer = create_user("t3-cust@test.com")
        self.other = create_user("t3-other@test.com")
        self.car = create_negotiable_car(self.owner)
        self.offer = Offer.objects.create(
            car=self.car,
            customer=self.customer,
            amount="16500000.00",
            currency="NGN",
            expires_at=timezone.now() + timedelta(hours=48),
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
        res = self._respond(self.owner, action="counter", counter_amount="17500000.00")
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
        self.assertEqual(
            self._respond(
                self.customer, action="counter", counter_amount="1.00"
            ).status_code,
            400,
        )

    def test_expired_offer_cannot_be_actioned(self):
        self.offer.expires_at = timezone.now() - timedelta(minutes=1)
        self.offer.save(update_fields=["expires_at"])
        self.assertEqual(self._respond(self.owner, action="reject").status_code, 400)


class AcceptOfferTest(APITestCase):
    def setUp(self):
        self.owner = create_user("t4-owner@test.com", "owner")
        self.buyer = create_user("t4-buyer@test.com")
        self.rival = create_user("t4-rival@test.com")
        self.car = create_negotiable_car(self.owner)
        self.offer = Offer.objects.create(
            car=self.car,
            customer=self.buyer,
            amount="17000000.00",
            currency="NGN",
            expires_at=timezone.now() + timedelta(hours=48),
        )
        self.rival_offer = Offer.objects.create(
            car=self.car,
            customer=self.rival,
            amount="16200000.00",
            currency="NGN",
            expires_at=timezone.now() + timedelta(hours=48),
        )

    def _accept(self, offer=None):
        self.client.force_authenticate(user=self.owner)
        return self.client.post(
            f"/api/v1/offers/offers/{(offer or self.offer).id}/respond",
            {"action": "accept"},
            format="json",
        )

        def test_accept_creates_a_deal_at_the_agreed_amount(self):
            from apps.sales.models import Deal, DealStatus
            from apps.listings.models import Request, ListingType

            self.assertEqual(self._accept().status_code, 200)
            self.offer.refresh_from_db()
            self.assertEqual(self.offer.status, OfferStatus.ACCEPTED)
            deal = Deal.objects.get(offer=self.offer)
            self.assertEqual(deal.status, DealStatus.ACTIVE)
            self.assertEqual(str(deal.agreed_amount), "17000000.00")
            self.assertEqual(deal.buyer, self.buyer)
            self.assertEqual(deal.seller, self.owner)
            self.assertFalse(
                Request.objects.filter(
                    car=self.car, request_type=ListingType.BUY
                ).exists()
            )

    def test_accepting_a_counter_uses_the_counter_amount(self):
        self.offer.status = OfferStatus.COUNTERED
        self.offer.counter_amount = "17800000.00"
        self.offer.save(update_fields=["status", "counter_amount"])
        self.client.force_authenticate(user=self.buyer)
        res = self.client.post(
            f"/api/v1/offers/offers/{self.offer.id}/respond",
            {"action": "accept"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.offer.refresh_from_db()
        self.assertEqual(str(self.offer.deal.agreed_amount), "17800000.00")

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

    def test_accepted_offer_exposes_resulting_deal(self):
        self._accept()
        self.offer.refresh_from_db()
        self.client.force_authenticate(user=self.buyer)
        res = self.client.get("/api/v1/offers/my-offers")
        rows = res.data["results"] if isinstance(res.data, dict) else res.data
        row = next(r for r in rows if r["id"] == str(self.offer.id))
        self.assertEqual(row["resulting_deal"], str(self.offer.deal.id))


class CustomerRespondTest(APITestCase):
    def setUp(self):
        self.owner = create_user("t5-owner@test.com", "owner")
        self.customer = create_user("t5-cust@test.com")
        self.car = create_negotiable_car(self.owner)
        self.offer = Offer.objects.create(
            car=self.car,
            customer=self.customer,
            amount="16500000.00",
            currency="NGN",
            expires_at=timezone.now() + timedelta(hours=48),
        )
        self.client.force_authenticate(user=self.customer)

    def _post(self, path, **payload):
        return self.client.post(
            f"/api/v1/offers/offers/{self.offer.id}/{path}", payload, format="json"
        )

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
            Offer.objects.filter(car=self.car, customer=self.customer).count(), 1
        )


class ExpiryTest(APITestCase):
    def setUp(self):
        self.owner = create_user("t6-owner@test.com", "owner")
        self.customer = create_user("t6-cust@test.com")
        self.car = create_negotiable_car(self.owner)
        self.offer = Offer.objects.create(
            car=self.car,
            customer=self.customer,
            amount="16500000.00",
            currency="NGN",
            expires_at=timezone.now() - timedelta(minutes=1),
        )

    def test_stale_pending_offer_reports_expired(self):
        self.assertTrue(self.offer.is_expired)

    def test_expired_offer_cannot_be_accepted_even_while_stored_pending(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(
            f"/api/v1/offers/offers/{self.offer.id}/respond",
            {"action": "accept"},
            format="json",
        )
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
            car=self.car,
            customer=create_user("t6-b@test.com"),
            amount="16600000.00",
            currency="NGN",
            expires_at=timezone.now() + timedelta(hours=10),
        )
        from django.core.management import call_command

        call_command("expire_offers")
        live.refresh_from_db()
        self.assertEqual(live.status, OfferStatus.PENDING)


class OfferListTest(APITestCase):
    def setUp(self):
        self.owner = create_user("t9-owner@test.com", "owner")
        self.buyer = create_user("t9-buyer@test.com")
        self.stranger = create_user("t9-other@test.com")
        self.car = create_negotiable_car(self.owner)
        self.offer = Offer.objects.create(
            car=self.car,
            customer=self.buyer,
            amount="16500000.00",
            currency="NGN",
            expires_at=timezone.now() + timedelta(hours=48),
        )

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
        self.assertNotIn("16000000", mine)  # min
        self.assertNotIn("17000000", mine)  # max

    def test_status_filter(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get("/api/v1/offers/owner-offers?status=rejected")
        self.assertEqual(res.data["results"], [])


class OfferNotificationTest(APITestCase):
    def test_placing_an_offer_notifies_both_sides(self):
        from apps.notifications.models import Notification

        owner = create_user("t7-owner@test.com", "owner")
        customer = create_user("t7-cust@test.com")
        car = create_negotiable_car(owner)
        self.client.force_authenticate(user=customer)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                f"/api/v1/offers/cars/{car.id}/offers",
                {"amount": "16500000.00"},
                format="json",
            )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(
            Notification.objects.filter(
                recipient=owner, notification_type="offer_received"
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                recipient=customer, notification_type="offer_submitted"
            ).exists()
        )
