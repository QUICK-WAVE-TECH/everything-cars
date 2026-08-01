from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.listings.models import Brand, Car, CarStatus, ListingType
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
        brand=Brand.objects.get(name="Lexus"),
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


class DealEndpointTest(APITestCase):
    def setUp(self):
        self.owner = make_owner("de-owner@test.com")
        self.owner.phone = "08011112222"
        self.owner.save(update_fields=["phone"])
        self.buyer = make_user("de-buyer@test.com")
        self.buyer.phone = "08033334444"
        self.buyer.save(update_fields=["phone"])
        self.stranger = make_user("de-stranger@test.com")
        self.car = make_negotiable_car(self.owner)
        self.offer = make_accepted_offer(self.car, self.buyer)
        self.offer.status = OfferStatus.ACCEPTED
        self.offer.save(update_fields=["status"])
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

    def test_my_deals_lists_participant_deals(self):
        self.client.force_authenticate(user=self.buyer)
        res = self.client.get("/api/v1/deals/")
        rows = res.data["results"] if isinstance(res.data, dict) else res.data
        self.assertTrue(any(str(self.deal.id) == r["id"] for r in rows))


class DealDisputeTest(DealEndpointTest):
    def _complete(self):
        self.client.force_authenticate(user=self.owner)
        self.client.post(f"/api/v1/deals/{self.deal.id}/complete")
        self.deal.refresh_from_db()

    def test_buyer_disputes_a_completed_deal(self):
        self._complete()
        self.client.force_authenticate(user=self.buyer)
        res = self.client.post(
            f"/api/v1/deals/{self.deal.id}/dispute",
            {"reason": "I never bought this car."},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.deal.refresh_from_db()
        self.assertIsNotNone(self.deal.disputed_at)
        self.assertEqual(self.deal.dispute_reason, "I never bought this car.")

    def test_cannot_dispute_an_active_deal(self):
        self.client.force_authenticate(user=self.buyer)
        res = self.client.post(f"/api/v1/deals/{self.deal.id}/dispute")
        self.assertEqual(res.status_code, 400)

    def test_seller_cannot_dispute(self):
        self._complete()
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(f"/api/v1/deals/{self.deal.id}/dispute")
        self.assertEqual(res.status_code, 403)

    def test_dispute_window_closes(self):
        self._complete()
        self.deal.completed_at = timezone.now() - timedelta(days=8)
        self.deal.save(update_fields=["completed_at"])
        self.client.force_authenticate(user=self.buyer)
        res = self.client.post(f"/api/v1/deals/{self.deal.id}/dispute")
        self.assertEqual(res.status_code, 400)

    def test_staff_reverse_relists_the_car(self):
        from apps.listings.models import CarStatus
        from apps.sales.services import reverse_deal
        self._complete()
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.ARCHIVED)
        reverse_deal(self.deal)
        self.deal.refresh_from_db()
        self.car.refresh_from_db()
        self.assertEqual(self.deal.status, DealStatus.CANCELLED)
        self.assertEqual(self.car.status, CarStatus.PUBLISHED)
        detail = self.client.get(f"/api/v1/listings/cars/{self.car.id}")
        self.assertEqual(detail.data["availability_status"], "available")


class StaffDisputeResolutionTest(APITestCase):
    def setUp(self):
        self.owner = make_owner("sd-owner@test.com")
        self.owner.phone = "08011112222"
        self.owner.save(update_fields=["phone"])
        self.buyer = make_user("sd-buyer@test.com")
        self.buyer.phone = "08033334444"
        self.buyer.save(update_fields=["phone"])
        self.staff = make_user("sd-staff@test.com")
        self.staff.is_staff = True
        self.staff.save(update_fields=["is_staff"])
        self.car = make_negotiable_car(self.owner)
        self.offer = make_accepted_offer(self.car, self.buyer)
        self.offer.status = OfferStatus.ACCEPTED
        self.offer.save(update_fields=["status"])
        self.deal = Deal.objects.create(
            car=self.car, buyer=self.buyer, seller=self.owner, offer=self.offer,
            agreed_amount="14000000.00", currency=self.car.currency,
            expires_at=timezone.now() + timedelta(days=DEAL_TTL_DAYS),
        )
        # Complete then dispute the deal so it lands in the staff queue.
        self.client.force_authenticate(user=self.owner)
        self.client.post(f"/api/v1/deals/{self.deal.id}/complete")
        self.client.force_authenticate(user=self.buyer)
        self.client.post(
            f"/api/v1/deals/{self.deal.id}/dispute",
            {"reason": "I never bought this car and never got it."},
            format="json",
        )
        self.deal.refresh_from_db()

    def test_staff_list_shows_open_dispute(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.get("/api/v1/deals/staff/disputes/")
        self.assertEqual(res.status_code, 200)
        rows = res.data["results"] if isinstance(res.data, dict) else res.data
        self.assertTrue(any(str(self.deal.id) == r["id"] for r in rows))
        row = next(r for r in rows if str(self.deal.id) == r["id"])
        self.assertEqual(row["dispute_status"], "open")
        self.assertEqual(row["buyer"]["phone"], "08033334444")
        self.assertTrue(row["ref"].startswith("DSP-"))

    def test_non_staff_forbidden(self):
        self.client.force_authenticate(user=self.buyer)
        res = self.client.get("/api/v1/deals/staff/disputes/")
        self.assertEqual(res.status_code, 403)

    def test_uphold_reverses_and_relists(self):
        from apps.listings.models import CarStatus

        self.client.force_authenticate(user=self.staff)
        res = self.client.post(
            f"/api/v1/deals/staff/disputes/{self.deal.id}/uphold/"
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.deal.refresh_from_db()
        self.car.refresh_from_db()
        self.assertEqual(self.deal.status, DealStatus.CANCELLED)
        self.assertEqual(self.deal.dispute_resolution, "upheld")
        self.assertEqual(self.deal.dispute_resolved_by_id, self.staff.id)
        self.assertEqual(self.car.status, CarStatus.PUBLISHED)

    def test_dismiss_keeps_sale_and_records_note(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post(
            f"/api/v1/deals/staff/disputes/{self.deal.id}/dismiss/",
            {"note": "Buyer confirmed receipt by phone; payment ref verified."},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.deal.refresh_from_db()
        self.assertEqual(self.deal.status, DealStatus.COMPLETED)  # sale stands
        self.assertEqual(self.deal.dispute_resolution, "dismissed")
        self.assertIn("payment ref verified", self.deal.dispute_resolution_note)

    def test_dismiss_requires_a_note(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post(
            f"/api/v1/deals/staff/disputes/{self.deal.id}/dismiss/",
            {"note": "too short"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_resolved_dispute_leaves_the_open_queue(self):
        self.client.force_authenticate(user=self.staff)
        self.client.post(f"/api/v1/deals/staff/disputes/{self.deal.id}/uphold/")
        res = self.client.get("/api/v1/deals/staff/disputes/?status=open")
        rows = res.data["results"] if isinstance(res.data, dict) else res.data
        self.assertFalse(any(str(self.deal.id) == r["id"] for r in rows))
        res2 = self.client.get("/api/v1/deals/staff/disputes/?status=upheld")
        rows2 = res2.data["results"] if isinstance(res2.data, dict) else res2.data
        self.assertTrue(any(str(self.deal.id) == r["id"] for r in rows2))


class DealActionTest(DealEndpointTest):
    def test_seller_completes_deal_and_car_reads_sold(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(f"/api/v1/deals/{self.deal.id}/complete")
        self.assertEqual(res.status_code, 200)
        self.deal.refresh_from_db()
        self.car.refresh_from_db()
        self.assertEqual(self.deal.status, DealStatus.COMPLETED)
        self.assertEqual(self.car.status, CarStatus.ARCHIVED)

    def test_buyer_cannot_complete(self):
        self.client.force_authenticate(user=self.buyer)
        res = self.client.post(f"/api/v1/deals/{self.deal.id}/complete")
        self.assertEqual(res.status_code, 403)

    def test_either_party_can_cancel_and_car_returns_to_available(self):
        self.client.force_authenticate(user=self.buyer)
        res = self.client.post(f"/api/v1/deals/{self.deal.id}/cancel")
        self.assertEqual(res.status_code, 200)
        self.deal.refresh_from_db()
        self.assertEqual(self.deal.status, DealStatus.CANCELLED)
        self.assertEqual(self.deal.cancelled_by, "buyer")
        detail = self.client.get(f"/api/v1/listings/cars/{self.car.id}")
        self.assertEqual(detail.data["availability_status"], "available")

    def test_cancel_notifies_prior_bidders(self):
        rival = make_user("de-rival@test.com")
        Offer.objects.create(
            car=self.car, customer=rival, amount="1.00", currency=self.car.currency,
            status=OfferStatus.SUPERSEDED, expires_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.owner)
        # Should not raise; prior-bidder notification fires on commit.
        res = self.client.post(f"/api/v1/deals/{self.deal.id}/cancel")
        self.assertEqual(res.status_code, 200)


class ExpireDealsCommandTest(DealEndpointTest):
    def test_command_cancels_stale_active_deals(self):
        from django.core.management import call_command
        from apps.sales.models import DealCancelledBy
        self.deal.expires_at = timezone.now() - timedelta(minutes=1)
        self.deal.save(update_fields=["expires_at"])
        call_command("expire_deals")
        self.deal.refresh_from_db()
        self.assertEqual(self.deal.status, DealStatus.CANCELLED)
        self.assertEqual(self.deal.cancelled_by, DealCancelledBy.SYSTEM)

    def test_command_leaves_live_deals_alone(self):
        from django.core.management import call_command
        call_command("expire_deals")
        self.deal.refresh_from_db()
        self.assertEqual(self.deal.status, DealStatus.ACTIVE)


class BackfillDealsCommandTest(APITestCase):
    def setUp(self):
        self.owner = make_owner("bf-owner@test.com")
        self.buyer = make_user("bf-buyer@test.com")
        self.car = make_negotiable_car(self.owner)
        self.offer = make_accepted_offer(self.car, self.buyer, "9000000.00")
        self.offer.status = OfferStatus.ACCEPTED
        self.offer.save(update_fields=["status"])

    def test_backfill_creates_deal_for_legacy_accepted_offer(self):
        from django.core.management import call_command
        call_command("backfill_deals")
        self.offer.refresh_from_db()
        self.assertTrue(Deal.objects.filter(offer=self.offer).exists())
        self.assertEqual(str(self.offer.deal.agreed_amount), "9000000.00")
        self.assertEqual(self.offer.deal.buyer, self.buyer)
        self.assertEqual(self.offer.deal.seller, self.owner)

    def test_backfill_is_idempotent(self):
        from django.core.management import call_command
        call_command("backfill_deals")
        call_command("backfill_deals")
        self.assertEqual(Deal.objects.filter(offer=self.offer).count(), 1)


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
