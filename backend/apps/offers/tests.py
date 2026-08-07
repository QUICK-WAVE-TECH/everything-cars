from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.listings.models import Brand, Car, CarStatus, ListingType
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
        brand=Brand.objects.get(name="Toyota"),
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

    def test_rival_offers_go_on_standby(self):
        # Spec D: rivals are preserved on standby (revivable), not terminally closed.
        self._accept()
        self.rival_offer.refresh_from_db()
        self.assertEqual(self.rival_offer.status, OfferStatus.STANDBY)

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
        self.stranger = create_user("t9-other@test.com", "owner")
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


class OwnerOfferScopeTest(APITestCase):
    def setUp(self):
        from apps.listings.tests import create_fleet_owner_profile
        from apps.listings.models import Branch
        from apps.users.models import TeamMembership
        self.owner = create_user("off-owner@test.com", "owner")
        self.profile = create_fleet_owner_profile(self.owner)
        self.b1 = Branch.objects.create(business=self.profile, name="A", state="Lagos",
            city="Ikeja", street_address="1", phone="+2340000000000", email="a@x.ng")
        self.b2 = Branch.objects.create(business=self.profile, name="B", state="Oyo",
            city="Ibadan", street_address="2", phone="+2340000000002", email="b@x.ng")
        self.car1 = create_negotiable_car(self.owner, branch=self.b1)
        self.car2 = create_negotiable_car(self.owner, branch=self.b2, vin="", plate_number="")
        self.customer = create_user("off-cust@test.com")
        self.offer1 = Offer.objects.create(car=self.car1, customer=self.customer,
            amount="16000000.00", currency="NGN", expires_at=timezone.now() + timedelta(hours=48))
        self.offer2 = Offer.objects.create(car=self.car2, customer=self.customer,
            amount="16000000.00", currency="NGN", expires_at=timezone.now() + timedelta(hours=48))
        self.member = create_user("off-tm@test.com", "team_member")
        m = TeamMembership.objects.create(user=self.member, business=self.profile)
        m.branches.set([self.b1])

    def test_member_offer_list_scoped(self):
        self.client.force_authenticate(self.member)
        r = self.client.get("/api/v1/offers/owner-offers")
        ids = [o["id"] for o in r.data["results"]]
        assert str(self.offer1.id) in ids and str(self.offer2.id) not in ids

    def test_member_can_accept_in_branch(self):
        self.client.force_authenticate(self.member)
        r = self.client.post(f"/api/v1/offers/offers/{self.offer1.id}/respond",
            {"action": "accept"}, format="json")
        assert r.status_code == 200, r.data
        self.offer1.refresh_from_db()
        assert self.offer1.status == OfferStatus.ACCEPTED

    def test_member_cannot_respond_other_branch(self):
        self.client.force_authenticate(self.member)
        r = self.client.post(f"/api/v1/offers/offers/{self.offer2.id}/respond",
            {"action": "accept"}, format="json")
        assert r.status_code == 404


class StandbyStatusTest(APITestCase):
    def test_standby_status_and_revived_at_exist(self):
        assert OfferStatus.STANDBY == "standby"
        assert any(f.name == "revived_at" for f in Offer._meta.get_fields())


class AcceptStandbyTest(APITestCase):
    def setUp(self):
        self.owner = create_user("as-owner@test.com", "owner")
        self.car = create_negotiable_car(self.owner)
        self.a = create_user("buyer-a@test.com")
        self.b = create_user("buyer-b@test.com")
        self.offer_a = Offer.objects.create(car=self.car, customer=self.a,
            amount="14000000.00", currency="NGN", expires_at=timezone.now() + timedelta(hours=48))
        self.offer_b = Offer.objects.create(car=self.car, customer=self.b,
            amount="13000000.00", currency="NGN", expires_at=timezone.now() + timedelta(hours=48))

    def test_accepting_puts_rivals_on_standby(self):
        from apps.offers.services import accept_offer
        accept_offer(self.offer_a)
        self.offer_a.refresh_from_db()
        self.offer_b.refresh_from_db()
        assert self.offer_a.status == OfferStatus.ACCEPTED
        assert self.offer_b.status == OfferStatus.STANDBY


class FallbackAcceptTest(APITestCase):
    def setUp(self):
        self.owner = create_user("fb-owner@test.com", "owner")
        self.car = create_negotiable_car(self.owner)
        self.a = create_user("fb-a@test.com")
        self.b = create_user("fb-b@test.com")
        self.c = create_user("fb-c@test.com")
        self.oa = Offer.objects.create(car=self.car, customer=self.a, amount="14000000.00",
            currency="NGN", expires_at=timezone.now() + timedelta(hours=48))
        self.ob = Offer.objects.create(car=self.car, customer=self.b, amount="13000000.00",
            currency="NGN", expires_at=timezone.now() + timedelta(hours=48))
        self.oc = Offer.objects.create(car=self.car, customer=self.c, amount="12000000.00",
            currency="NGN", expires_at=timezone.now() + timedelta(hours=48))

    def test_seller_accepts_a_revived_fallback_offer(self):
        from apps.offers.services import accept_offer
        from apps.sales.services import cancel_deal
        from apps.sales.models import DealCancelledBy

        accept_offer(self.oa)                                   # A wins; B,C standby
        cancel_deal(self.oa.deal, cancelled_by=DealCancelledBy.SELLER)  # revive B,C
        self.ob.refresh_from_db()
        assert self.ob.status == OfferStatus.PENDING            # acceptable again
        accept_offer(self.ob)                                   # accept fallback B
        self.ob.refresh_from_db(); self.oc.refresh_from_db()
        assert self.ob.status == OfferStatus.ACCEPTED
        assert self.oc.status == OfferStatus.STANDBY            # C back on standby


class StandbyNotExpiredTest(APITestCase):
    def test_standby_offer_is_not_auto_expired(self):
        from django.core.management import call_command
        owner = create_user("sne-owner@test.com", "owner")
        car = create_negotiable_car(owner)
        buyer = create_user("sne-buyer@test.com")
        offer = Offer.objects.create(car=car, customer=buyer, amount="1000000.00",
            currency="NGN", status=OfferStatus.STANDBY,
            expires_at=timezone.now() - timedelta(hours=1))  # already "past"
        call_command("expire_offers")
        offer.refresh_from_db()
        assert offer.status == OfferStatus.STANDBY  # standby is never auto-expired


class RevivedAtSerializedTest(APITestCase):
    def test_serializer_exposes_revived_at(self):
        from apps.offers.serializers import OfferSerializer
        owner = create_user("ra-owner@test.com", "owner")
        car = create_negotiable_car(owner)
        buyer = create_user("ra-buyer@test.com")
        offer = Offer.objects.create(car=car, customer=buyer, amount="1000000.00",
            currency="NGN", expires_at=timezone.now() + timedelta(hours=48))
        assert "revived_at" in OfferSerializer(offer).data
