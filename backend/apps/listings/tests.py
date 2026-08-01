import shutil
import tempfile
from io import BytesIO
import json
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from datetime import time, date, timedelta
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.listings.models import (
    Brand,
    Car,
    CarImage,
    CarImageType,
    CarStatus,
    ListingType,
    Request,
    RequestStatus,
    ListingFeature,
)
from apps.listings.serializers import ListingFeatureSerializer
from apps.users.models import CustomerProfile, OwnerProfile, User
from apps.listings.migration_helpers import delete_both_cars


def create_user(email, role, **extra):
    return User.objects.create_user(
        email=email,
        first_name=extra.pop("first_name", role.title()),
        last_name=extra.pop("last_name", "User"),
        password="securepass123",
        role=role,
        is_active=True,
        **extra,
    )


def create_owner_profile(user):
    return OwnerProfile.objects.create(
        user=user,
        owner_type=OwnerProfile.OwnerType.INDIVIDUAL,
        bank_account="1234567890",
        bank_name="Test Bank",
        is_verified=True,
        national_id="12345678901",
        id_type="nin",
        id_document=create_test_image("id.jpg"),
    )


def create_customer_profile(user):
    return CustomerProfile.objects.create(user=user)


def create_car(owner, **extra):
    defaults = {
        "owner": owner,
        "title": "Lexus NX 300h",
        "listing_type": ListingType.BUY,
        "sale_price": "15000000.00",
        "brand": "Lexus",
        "model": "NX 300h",
        "year": 2022,
        "state": "Lagos",
        "city": "Lekki",
        "status": CarStatus.PUBLISHED,
    }
    defaults.update(extra)
    return Car.objects.create(**defaults)


def create_test_image(name="test.jpg", size=(100, 100)):
    img = Image.new("RGB", size, color="red")
    buffer = BytesIO()
    img.save(buffer, format="JPEG")
    buffer.seek(0)
    return SimpleUploadedFile(name, buffer.read(), content_type="image/jpeg")


def image_upload(name="car.jpg", size=(16, 16), image_format="JPEG"):
    buffer = BytesIO()
    Image.new("RGB", size, color=(0, 0, 139)).save(buffer, format=image_format)
    buffer.seek(0)
    return SimpleUploadedFile(
        name,
        buffer.getvalue(),
        content_type=f"image/{image_format.lower()}",
    )


class CarStatusChoicesTest(APITestCase):
    def test_new_inspection_statuses_exist(self):
        """New inspection statuses are valid CarStatus choices."""
        self.assertEqual(CarStatus.INSPECTION_PENDING, "inspection_pending")
        self.assertEqual(CarStatus.LISTING_APPROVED, "listing_approved")
        self.assertEqual(CarStatus.INSPECTION_IN_PROGRESS, "inspection_in_progress")
        self.assertEqual(CarStatus.NEEDS_CLEARANCE, "needs_clearance")
        self.assertEqual(CarStatus.INSPECTION_REJECTED, "inspection_rejected")
        self.assertEqual(CarStatus.INSPECTION_NO_SHOW, "inspection_no_show")

    def test_pending_review_removed(self):
        """PENDING_REVIEW is no longer a valid status."""
        status_values = [choice[0] for choice in CarStatus.choices]

        self.assertNotIn("pending_review", status_values)


class EditLockdownTest(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.TEMP_MEDIA = tempfile.mkdtemp()

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.TEMP_MEDIA, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.owner = create_user("lockdown@test.com", "owner")
        create_owner_profile(self.owner)
        self.car = create_car(self.owner)
        self.client.force_authenticate(user=self.owner)

    def test_edit_blocked_in_draft(self):
        # Draft locks the moment it is submitted for review — only staff-requested
        # changes reopen editing.
        self.car.status = CarStatus.DRAFT
        self.car.save(update_fields=["status"])
        res = self.client.patch(
            f"/api/v1/listings/my-cars/{self.car.id}", {"color": "Red"}
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_edit_allowed_in_needs_changes(self):
        self.car.status = CarStatus.NEEDS_CHANGES
        self.car.save(update_fields=["status"])
        res = self.client.patch(
            f"/api/v1/listings/my-cars/{self.car.id}", {"color": "Blue"}
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_edit_blocked_in_needs_clearance(self):
        # Clearance is answered with a message, not by editing the listing.
        self.car.status = CarStatus.NEEDS_CLEARANCE
        self.car.save(update_fields=["status"])
        res = self.client.patch(
            f"/api/v1/listings/my-cars/{self.car.id}", {"color": "Green"}
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_edit_blocked_in_inspection_rejected(self):
        # A rejected inspection is fixed on the physical car and resubmitted —
        # the listing content stays locked.
        self.car.status = CarStatus.INSPECTION_REJECTED
        self.car.save(update_fields=["status"])
        res = self.client.patch(
            f"/api/v1/listings/my-cars/{self.car.id}", {"color": "Green"}
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_edit_blocked_in_inspection_no_show(self):
        # no_show cars rebook the inspection; the listing itself stays locked
        self.car.status = CarStatus.INSPECTION_NO_SHOW
        self.car.save(update_fields=["status"])
        res = self.client.patch(
            f"/api/v1/listings/my-cars/{self.car.id}", {"color": "White"}
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_edit_blocked_in_inspection_pending(self):
        self.car.status = CarStatus.INSPECTION_PENDING
        self.car.save(update_fields=["status"])
        res = self.client.patch(
            f"/api/v1/listings/my-cars/{self.car.id}", {"color": "Red"}
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_edit_blocked_in_listing_approved(self):
        self.car.status = CarStatus.LISTING_APPROVED
        self.car.save(update_fields=["status"])
        res = self.client.patch(
            f"/api/v1/listings/my-cars/{self.car.id}", {"color": "Red"}
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_edit_blocked_in_inspection_in_progress(self):
        self.car.status = CarStatus.INSPECTION_IN_PROGRESS
        self.car.save(update_fields=["status"])
        res = self.client.patch(
            f"/api/v1/listings/my-cars/{self.car.id}", {"color": "Red"}
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_edit_blocked_in_published(self):
        self.car.status = CarStatus.PUBLISHED
        self.car.save(update_fields=["status"])
        res = self.client.patch(
            f"/api/v1/listings/my-cars/{self.car.id}", {"color": "Red"}
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(MEDIA_ROOT=None)
    def test_image_upload_blocked_in_inspection_pending(self):
        self.car.status = CarStatus.INSPECTION_PENDING
        self.car.save(update_fields=["status"])
        img = create_test_image()
        res = self.client.post(
            f"/api/v1/listings/my-cars/{self.car.id}/images",
            {"front": img, "back": img, "left_side": img, "right_side": img},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class BuyRequestConflictTests(APITestCase):
    def setUp(self):
        self.owner = create_user("owner@test.com", User.Role.OWNER)
        create_owner_profile(self.owner)
        self.customer = create_user("customer@test.com", User.Role.CUSTOMER)
        create_customer_profile(self.customer)
        self.other_customer = create_user("other@test.com", User.Role.CUSTOMER)
        create_customer_profile(self.other_customer)

    def test_owner_cannot_approve_second_buy_request_when_one_is_active(self):
        blocking_statuses = [
            RequestStatus.APPROVED,
            RequestStatus.PAYMENT_SUBMITTED,
            RequestStatus.PAID,
            RequestStatus.ACTIVE,
        ]

        for blocking_status in blocking_statuses:
            with self.subTest(blocking_status=blocking_status):
                car = create_car(
                    self.owner,
                    title=f"Buy car {blocking_status}",
                )
                Request.objects.create(
                    car=car,
                    customer=self.customer,
                    request_type=ListingType.BUY,
                    price_offered="15000000.00",
                    status=blocking_status,
                )
                pending_request = Request.objects.create(
                    car=car,
                    customer=self.other_customer,
                    request_type=ListingType.BUY,
                    price_offered="15100000.00",
                    status=RequestStatus.PENDING,
                )

                self.client.force_authenticate(user=self.owner)
                response = self.client.post(
                    f"/api/v1/listings/owner-requests/{pending_request.id}/action",
                    {"action": "approve"},
                    format="json",
                )

                self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
                pending_request.refresh_from_db()
                self.assertEqual(pending_request.status, RequestStatus.PENDING)


class CarImageUploadTests(APITestCase):
    def setUp(self):
        self.media_dir = tempfile.mkdtemp()
        self.override = override_settings(MEDIA_ROOT=self.media_dir)
        self.override.enable()

        self.owner = create_user("image-owner@test.com", User.Role.OWNER)
        create_owner_profile(self.owner)
        self.car = create_car(
            self.owner,
            listing_type=ListingType.RENT,
            rent_price_per_day="35000.00",
            sale_price=None,
            status=CarStatus.DRAFT,
        )
        self.client.force_authenticate(user=self.owner)

    def tearDown(self):
        self.override.disable()
        shutil.rmtree(self.media_dir, ignore_errors=True)

    def upload_url(self, car=None):
        return f"/api/v1/listings/my-cars/{(car or self.car).id}/images"

    def typed_images_payload(self, **overrides):
        payload = {
            CarImageType.FRONT: image_upload("front.jpg"),
            CarImageType.BACK: image_upload("back.jpg"),
            CarImageType.LEFT_SIDE: image_upload("left-side.jpg"),
            CarImageType.RIGHT_SIDE: image_upload("right-side.jpg"),
        }
        payload.update(overrides)
        return payload

    def test_rejects_non_image_uploads(self):
        response = self.client.post(
            self.upload_url(),
            {
                CarImageType.FRONT: SimpleUploadedFile(
                    "not-an-image.txt",
                    b"plain text",
                    content_type="text/plain",
                )
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(CarImage.objects.filter(car=self.car).count(), 0)

    def test_rejects_oversized_uploads(self):
        oversized = SimpleUploadedFile(
            "large.jpg",
            b"0" * (5 * 1024 * 1024 + 1),
            content_type="image/jpeg",
        )

        response = self.client.post(
            self.upload_url(),
            self.typed_images_payload(front=oversized),
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("too large", response.data["detail"])

    def test_rejects_missing_required_views(self):
        response = self.client.post(
            self.upload_url(),
            {
                CarImageType.FRONT: image_upload("front.jpg"),
                CarImageType.BACK: image_upload("back.jpg"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(CarImageType.LEFT_SIDE, response.data["missing_types"])
        self.assertIn(CarImageType.RIGHT_SIDE, response.data["missing_types"])

    def test_first_upload_becomes_primary_and_optimizes_to_webp(self):
        response = self.client.post(
            self.upload_url(),
            self.typed_images_payload(interior=image_upload("interior.jpg")),
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CarImage.objects.filter(car=self.car).count(), 5)
        self.assertEqual(
            CarImage.objects.filter(car=self.car, is_primary=True).count(),
            1,
        )
        front_response = next(
            item for item in response.data if item["image_type"] == CarImageType.FRONT
        )
        self.assertTrue(front_response["is_primary"])
        self.assertTrue(front_response["image"].startswith("http://testserver/media/"))
        self.assertTrue(
            front_response["thumbnail"].startswith("http://testserver/media/")
        )
        first_image = CarImage.objects.filter(car=self.car, is_primary=True).get()
        self.assertEqual(first_image.image_type, CarImageType.FRONT)
        self.assertTrue(first_image.image.name.endswith(".webp"))
        self.assertTrue(first_image.thumbnail.name.endswith("-thumb.webp"))

        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.DRAFT)

    def test_replaces_existing_typed_image(self):
        self.client.post(
            self.upload_url(),
            self.typed_images_payload(),
            format="multipart",
        )
        original_front = CarImage.objects.get(
            car=self.car, image_type=CarImageType.FRONT
        )

        response = self.client.post(
            self.upload_url(),
            {CarImageType.FRONT: image_upload("new-front.jpg")},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CarImage.objects.filter(car=self.car).count(), 4)
        self.assertFalse(CarImage.objects.filter(id=original_front.id).exists())
        self.assertTrue(
            CarImage.objects.get(car=self.car, image_type=CarImageType.FRONT).is_primary
        )


class ListingApprovalTest(APITestCase):
    def setUp(self):
        self.staff = create_user("staff-appr@test.com", "owner", is_staff=True)
        self.owner = create_user("owner-appr@test.com", "owner")
        create_owner_profile(self.owner)
        self.car = create_car(self.owner, status=CarStatus.DRAFT)
        self.client.force_authenticate(user=self.staff)

    def test_approve_draft_listing(self):
        res = self.client.post(
            f"/api/v1/listings/admin/cars/{self.car.id}/approve-listing"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.LISTING_APPROVED)

    def test_approve_writes_history(self):
        self.client.post(f"/api/v1/listings/admin/cars/{self.car.id}/approve-listing")
        entry = self.car.status_history.get()
        self.assertEqual(entry.from_status, CarStatus.DRAFT)
        self.assertEqual(entry.to_status, CarStatus.LISTING_APPROVED)
        self.assertEqual(entry.actor_role, "staff")

    def test_approve_resubmitted_listing(self):
        self.car.status = CarStatus.NEEDS_CHANGES
        self.car.save()
        res = self.client.post(
            f"/api/v1/listings/admin/cars/{self.car.id}/approve-listing"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_approve_published_rejected(self):
        self.car.status = CarStatus.PUBLISHED
        self.car.save()
        res = self.client.post(
            f"/api/v1/listings/admin/cars/{self.car.id}/approve-listing"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_staff_forbidden(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(
            f"/api/v1/listings/admin/cars/{self.car.id}/approve-listing"
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_request_changes_notifies_owner(self):
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                f"/api/v1/listings/admin/cars/{self.car.id}/status",
                {"status": "needs_changes", "note": "Fix the photos"},
                format="json",
            )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        from apps.notifications.models import Notification

        note = Notification.objects.filter(
            recipient=self.owner, notification_type="changes_requested"
        ).first()
        self.assertIsNotNone(note)
        self.assertIn("Fix the photos", note.message)

    def test_request_changes_from_draft(self):
        res = self.client.post(
            f"/api/v1/listings/admin/cars/{self.car.id}/status",
            {"status": "needs_changes", "note": "Photos are blurry"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.NEEDS_CHANGES)


class MyCarHistoryTest(APITestCase):
    def setUp(self):
        self.staff = create_user("staff-hist@test.com", "owner", is_staff=True)
        self.owner = create_user("owner-hist@test.com", "owner")
        create_owner_profile(self.owner)
        self.car = create_car(self.owner, status=CarStatus.DRAFT)
        self.client.force_authenticate(user=self.staff)
        self.client.post(f"/api/v1/listings/admin/cars/{self.car.id}/approve-listing")
        self.client.force_authenticate(user=self.owner)

    def test_history_returned_oldest_first(self):
        res = self.client.get(f"/api/v1/listings/my-cars/{self.car.id}/history")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["to_status"], CarStatus.LISTING_APPROVED)

    def test_history_hides_staff_identity(self):
        res = self.client.get(f"/api/v1/listings/my-cars/{self.car.id}/history")
        for entry in res.data:
            self.assertNotIn("actor", entry)
            self.assertIn(entry["actor_role"], ["owner", "staff", "system"])

    def test_other_owners_car_is_404(self):
        other = create_user("other-hist@test.com", "owner")
        create_owner_profile(other)
        self.client.force_authenticate(user=other)
        res = self.client.get(f"/api/v1/listings/my-cars/{self.car.id}/history")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class ResubmissionTest(APITestCase):
    def setUp(self):
        self.owner = create_user("owner-resub@test.com", "owner")
        create_owner_profile(self.owner)
        self.car = create_car(self.owner, status=CarStatus.NEEDS_CHANGES)
        self.client.force_authenticate(user=self.owner)

    def test_owner_resubmits_needs_changes_to_draft(self):
        res = self.client.post(
            f"/api/v1/listings/my-cars/{self.car.id}/status",
            {"status": "draft"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.DRAFT)
        entry = self.car.status_history.get()
        self.assertEqual(entry.from_status, CarStatus.NEEDS_CHANGES)
        self.assertEqual(entry.to_status, CarStatus.DRAFT)
        self.assertEqual(entry.actor_role, "owner")

    def test_resubmission_notifies_staff(self):
        staff = create_user("staff-resub@test.com", "owner", is_staff=True)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                f"/api/v1/listings/my-cars/{self.car.id}/status",
                {"status": "draft"},
                format="json",
            )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        from apps.notifications.models import Notification

        note = Notification.objects.filter(
            recipient=staff, notification_type="listing_submitted"
        ).first()
        self.assertIsNotNone(note)
        self.assertIn("re-review", note.message)

    def test_owner_resubmits_after_failed_inspection(self):
        self.car.status = CarStatus.INSPECTION_REJECTED
        self.car.save(update_fields=["status"])
        res = self.client.post(
            f"/api/v1/listings/my-cars/{self.car.id}/status",
            {"status": "draft"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.DRAFT)

    def test_owner_cannot_skip_review(self):
        res = self.client.post(
            f"/api/v1/listings/my-cars/{self.car.id}/status",
            {"status": "listing_approved"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class PublicListingTypeFilterTest(APITestCase):
    def setUp(self):
        owner = create_user("owner-pub@test.com", "owner")
        create_owner_profile(owner)
        create_car(
            owner,
            title="Rent Only",
            listing_type=ListingType.RENT,
            sale_price=None,
            rent_price_per_day="20000.00",
        )
        create_car(owner, title="Buy Only", listing_type=ListingType.BUY)

    def _titles(self, res):
        return {c["title"] for c in res.data["results"]}

    def test_rent_mode_returns_only_rent(self):
        res = self.client.get("/api/v1/listings/cars?listing_type=rent")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        titles = self._titles(res)
        self.assertIn("Rent Only", titles)
        self.assertNotIn("Buy Only", titles)

    def test_buy_mode_returns_only_buy(self):
        res = self.client.get("/api/v1/listings/cars?listing_type=buy")
        titles = self._titles(res)
        self.assertIn("Buy Only", titles)
        self.assertNotIn("Rent Only", titles)


class AdminStatusCountsTest(APITestCase):
    def test_counts_cover_all_cars_not_one_page(self):
        staff = create_user("staff-counts@test.com", "owner", is_staff=True)
        owner = create_user("owner-counts@test.com", "owner")
        create_owner_profile(owner)
        # More drafts than one pagination page (page size 20)
        for i in range(25):
            create_car(owner, title=f"Draft {i}", status=CarStatus.DRAFT)
        create_car(owner, title="Live", status=CarStatus.PUBLISHED)
        self.client.force_authenticate(user=staff)
        res = self.client.get("/api/v1/listings/admin/cars/status-counts")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["draft"], 25)
        self.assertEqual(res.data["published"], 1)

    def test_non_staff_forbidden(self):
        owner = create_user("owner-counts2@test.com", "owner")
        self.client.force_authenticate(user=owner)
        res = self.client.get("/api/v1/listings/admin/cars/status-counts")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class AdminCarOrderingTest(APITestCase):
    def setUp(self):
        self.staff = create_user(
            "staff-ordering@test.com",
            "owner",
            is_staff=True,
        )
        owner = create_user("owner-ordering@test.com", "owner")
        create_owner_profile(owner)
        self.older = create_car(
            owner,
            title="Older draft",
            status=CarStatus.DRAFT,
        )
        self.newer = create_car(
            owner,
            title="Newer draft",
            status=CarStatus.DRAFT,
        )
        Car.objects.filter(id=self.older.id).update(
            created_at=timezone.now() - timedelta(days=2),
        )
        self.client.force_authenticate(user=self.staff)

    def test_oldest_first_ordering_applies_before_pagination(self):
        res = self.client.get(
            "/api/v1/listings/admin/cars?status=draft&ordering=created_at",
        )

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [car["title"] for car in res.data["results"][:2]],
            ["Older draft", "Newer draft"],
        )

    def test_invalid_ordering_falls_back_to_newest_first(self):
        res = self.client.get(
            "/api/v1/listings/admin/cars?status=draft&ordering=owner__email",
        )

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [car["title"] for car in res.data["results"][:2]],
            ["Newer draft", "Older draft"],
        )


class PublicArchivedVisibilityTest(APITestCase):
    def setUp(self):
        self.owner = create_user("owner-arch@test.com", "owner")
        create_owner_profile(self.owner)
        self.customer = create_user("customer-arch@test.com", "customer")
        create_customer_profile(self.customer)

    def test_owner_archived_car_hidden_from_public(self):
        create_car(self.owner, title="Withdrawn Car", status=CarStatus.ARCHIVED)
        res = self.client.get("/api/v1/listings/cars")
        titles = {c["title"] for c in res.data["results"]}
        self.assertNotIn("Withdrawn Car", titles)

    def test_sold_car_shows_publicly_as_sold(self):
        from apps.offers.models import Offer, OfferStatus
        from apps.sales.models import Deal, DealStatus
        car = create_car(self.owner, title="Sold Car", status=CarStatus.ARCHIVED)
        offer = Offer.objects.create(
            car=car, customer=self.customer, amount="15000000.00",
            currency=car.currency, status=OfferStatus.ACCEPTED,
            expires_at=timezone.now(),
        )
        Deal.objects.create(
            car=car, buyer=self.customer, seller=self.owner, offer=offer,
            agreed_amount="15000000.00", currency=car.currency,
            status=DealStatus.COMPLETED, expires_at=timezone.now(),
            completed_at=timezone.now(),
        )
        res = self.client.get("/api/v1/listings/cars")
        sold = next((c for c in res.data["results"] if c["title"] == "Sold Car"), None)
        self.assertIsNotNone(sold)
        self.assertEqual(sold["availability_status"], "sold")

    def test_owner_archived_detail_is_404_publicly(self):
        car = create_car(self.owner, title="Withdrawn Car", status=CarStatus.ARCHIVED)
        res = self.client.get(f"/api/v1/listings/cars/{car.id}")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class ArchiveGuardTest(APITestCase):
    def setUp(self):
        self.owner = create_user("owner-ag@test.com", "owner")
        create_owner_profile(self.owner)
        self.client.force_authenticate(user=self.owner)

    def test_archive_blocked_during_inspection_pending(self):
        car = create_car(self.owner, status=CarStatus.INSPECTION_PENDING)
        res = self.client.delete(f"/api/v1/listings/my-cars/{car.id}")
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

    def test_archive_blocked_during_inspection_in_progress(self):
        car = create_car(self.owner, status=CarStatus.INSPECTION_IN_PROGRESS)
        res = self.client.delete(f"/api/v1/listings/my-cars/{car.id}")
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

    def test_archive_allowed_from_draft(self):
        car = create_car(self.owner, status=CarStatus.DRAFT)
        res = self.client.delete(f"/api/v1/listings/my-cars/{car.id}")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)


class SuspendReinstateTest(APITestCase):
    def setUp(self):
        self.staff = create_user("staff-sr@test.com", "owner", is_staff=True)
        self.owner = create_user("owner-sr@test.com", "owner")
        create_owner_profile(self.owner)
        self.client.force_authenticate(user=self.staff)

    def _set_status(self, car, new_status):
        return self.client.post(
            f"/api/v1/listings/admin/cars/{car.id}/status",
            {"status": new_status},
            format="json",
        )

    def test_suspend_from_inspection_pending_cancels_booking(self):
        from apps.inspections.models import (
            BookingStatus,
            InspectionBooking,
            InspectionCenter,
            InspectionSlot,
        )
        from datetime import time as dtime, timedelta as td
        from django.utils import timezone as tz

        car = create_car(self.owner, status=CarStatus.INSPECTION_PENDING)
        center = InspectionCenter.objects.create(
            company_name="C",
            address="a",
            country="NG",
            country_code="NG",
            state="Lagos",
            city="Lagos",
            city_code="LOS",
            created_by=self.staff,
        )
        slot = InspectionSlot.objects.create(
            date=tz.localdate() + td(days=3),
            start_time=dtime(9),
            end_time=dtime(10),
            center=center,
            created_by=self.staff,
        )
        booking = InspectionBooking.objects.create(
            car=car, slot=slot, booked_by=self.owner
        )
        res = self._set_status(car, "suspended")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.status, BookingStatus.CANCELLED)

    def test_reinstate_restores_prior_status_not_blind_publish(self):
        car = create_car(self.owner, status=CarStatus.INSPECTION_PENDING)
        self._set_status(car, "suspended")
        res = self._set_status(car, "published")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        car.refresh_from_db()
        # booking was cancelled on suspension → back to bookable, NOT published
        self.assertEqual(car.status, CarStatus.LISTING_APPROVED)

    def test_reinstate_previously_published_car_republishes(self):
        car = create_car(self.owner, status=CarStatus.PUBLISHED)
        self._set_status(car, "suspended")
        res = self._set_status(car, "published")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        car.refresh_from_db()
        self.assertEqual(car.status, CarStatus.PUBLISHED)

    def test_archived_unsold_availability_not_sold(self):
        car = create_car(self.owner, status=CarStatus.ARCHIVED)
        self.client.force_authenticate(user=self.owner)
        res = self.client.get("/api/v1/listings/my-cars?status=archived")
        row = next(c for c in res.data["results"] if c["id"] == str(car.id))
        self.assertEqual(row["availability_status"], "archived")


class VerifiedOverlayTest(APITestCase):
    def setUp(self):
        self.owner = create_user("owner-vf@test.com", "owner")
        create_owner_profile(self.owner)
        self.staff = create_user("staff-vf@test.com", "owner", is_staff=True)
        self.car = create_car(
            self.owner,
            status=CarStatus.PUBLISHED,
            description="Owner description",
            mileage=50000,
            fuel_type="petrol",
        )

    def _add_passed_inspection(self):
        from apps.inspections.models import (
            InspectionBooking,
            InspectionCenter,
            InspectionSlot,
            PhysicalInspection,
        )

        center = InspectionCenter.objects.create(
            company_name="C",
            address="A",
            state="Lagos",
            city="Lekki",
            city_code="LEK",
            country_code="NG",
            created_by=self.staff,
        )
        slot = InspectionSlot.objects.create(
            date=date.today(),
            start_time=time(9, 0),
            end_time=time(10, 0),
            capacity=1,
            center=center,
            created_by=self.staff,
        )
        booking = InspectionBooking.objects.create(
            car=self.car, slot=slot, booked_by=self.owner
        )
        return PhysicalInspection.objects.create(
            booking=booking,
            car=self.car,
            inspector=self.staff,
            condition="used",
            mileage=99999,
            fuel_type="diesel",
            car_type="foreign_used",
            features=["ABS"],
            engine_condition="good",
            chassis_condition="good",
            ac_condition="good",
            is_flooded=False,
            has_accident_history=False,
            result="passed",
            staff_notes="Inspector verified notes",
            inspected_at=timezone.now(),
            presented_id_type="nin",
            presented_id_number="22334455667",
        )

    def test_public_detail_shows_inspector_data(self):
        self._add_passed_inspection()
        res = self.client.get(f"/api/v1/listings/cars/{self.car.id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Description stays the owner's; inspector notes live in the report.
        self.assertEqual(res.data["description"], "Owner description")
        self.assertEqual(
            res.data["verified_report"]["notes"], "Inspector verified notes"
        )
        self.assertEqual(res.data["mileage"], 99999)
        self.assertEqual(res.data["fuel_type"], "diesel")
        self.assertTrue(res.data["is_verified"])
        self.assertIsNotNone(res.data["verified_report"])
        # No ID / staff-identity leak anywhere in the payload.
        body = json.dumps(res.data, default=str)

        self.assertNotIn("presented_id", body)
        self.assertNotIn("22334455667", body)

    def test_owner_detail_keeps_own_data(self):
        self._add_passed_inspection()
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(f"/api/v1/listings/my-cars/{self.car.id}")
        self.assertEqual(res.data["description"], "Owner description")
        self.assertEqual(res.data["mileage"], 50000)

    def test_unverified_public_shows_owner_data(self):
        res = self.client.get(f"/api/v1/listings/cars/{self.car.id}")
        self.assertEqual(res.data["description"], "Owner description")
        self.assertFalse(res.data["is_verified"])
        self.assertIsNone(res.data["verified_report"])


class ListingSubmittedEmailTest(APITestCase):
    def test_staff_emailed_when_listing_submitted(self):
        from django.core import mail

        from apps.notifications.service import notify_listing_submitted

        staff = create_user("staff-nl@test.com", "owner", is_staff=True)
        owner = create_user(
            "owner-nl@test.com", "owner", first_name="Ada", last_name="Bello"
        )
        car = create_car(owner, status=CarStatus.DRAFT)
        notify_listing_submitted(car)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [staff.email])
        html = mail.outbox[0].alternatives[0][0]
        self.assertIn("Ada Bello", html)
        self.assertIn(car.title, html)


class DeleteBothCarsMigrationTest(APITestCase):
    def test_both_cars_deleted_rent_and_buy_kept(self):
        owner = create_user("both-owner@x.com", "owner")
        both = Car.objects.create(
            owner=owner,
            title="Both Car",
            listing_type="both",
            rent_price_per_day=10,
            sale_price=20,
            brand="Toyota",
            model="Camry",
            year=2020,
            state="Lagos",
        )
        rent = Car.objects.create(
            owner=owner,
            title="Rent Car",
            listing_type="rent",
            rent_price_per_day=10,
            brand="Toyota",
            model="Camry",
            year=2020,
            state="Lagos",
        )
        delete_both_cars(Car)
        self.assertFalse(Car.objects.filter(id=both.id).exists())
        self.assertTrue(Car.objects.filter(id=rent.id).exists())


class VinPlateValidationTest(APITestCase):

    def setUp(self):
        self.owner = create_user("owner-vin@test.com", "owner")
        create_owner_profile(self.owner)
        self.client.force_authenticate(user=self.owner)

    def _payload(self, **over):
        data = {
            "title": "Test Car",
            "listing_type": "rent",
            "rent_price_per_day": "20000.00",
            "brand": "Toyota",
            "model": "Corolla",
            "year": 2021,
            "state": "Lagos",
            "city": "Ikeja",
            "vin": "1HGCM82633A004352",  # 17 chars, no I/O/Q
            "plate_number": "ABC123DE",
        }
        data.update(over)
        return data

    def _post(self, **over):
        data = self.client.post(
            "/api/v1/listings/my-cars",
            self._payload(**over),
            format="json",
        )
        return data

    def test_vin_normalized_uppercase(self):
        res = self._post(vin="1hgcm82633a004352")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        car = Car.objects.get(id=res.data["id"])
        self.assertEqual(car.vin, "1HGCM82633A004352")

    def test_vin_bad_length_400(self):
        res = self._post(vin="1HGCM82633A00435")  # 16 chars
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_vin_illegal_letter_400(self):
        res = self._post(vin="1HGCM82633A0O4352")  # contains O
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_plate_normalized_strip(self):
        res = self._post(plate_number="abc 123")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        car = Car.objects.get(id=res.data["id"])
        self.assertEqual(car.plate_number, "ABC123")

    def test_plate_too_short_400(self):
        res = self._post(plate_number="AB12")  # 4 chars
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_vin_generic_message(self):
        other = create_user("other-vin@test.com", "owner")
        create_car(
            other,
            vin="1HGCM82633A004352",
            listing_type=ListingType.RENT,
            sale_price=None,
            rent_price_per_day="10000.00",
        )
        res = self._post(vin="1HGCM82633A004352")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already registered on the platform", str(res.data))
        self.assertNotIn("other-vin@test.com", str(res.data))


class XorPricingTest(APITestCase):
    def setUp(self):
        self.owner = create_user("xor-owner@test.com", "owner")
        create_owner_profile(self.owner)
        self.client.force_authenticate(user=self.owner)

    def _post(self, **over):
        data = {
            "title": "Test Car",
            "brand": "Toyota",
            "model": "Corolla",
            "year": 2021,
            "state": "Lagos",
            "city": "Ikeja",
            "vin": "1HGCM82633A004352",
            "plate_number": "ABC123DE",
        }
        data.update(over)
        return self.client.post("/api/v1/listings/my-cars", data, format="json")

    def test_rent_requires_rent_price_clears_sale(self):
        res = self._post(
            listing_type="rent", rent_price_per_day="20000.00", sale_price="5000000.00"
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(Car.objects.get(id=res.data["id"]).sale_price)

    def test_rent_without_rent_price_400(self):
        self.assertEqual(self._post(listing_type="rent").status_code, 400)

    def test_buy_requires_sale_price_clears_rent(self):
        res = self._post(
            listing_type="buy",
            sale_price="5000000.00",
            rent_price_per_day="20000.00",
            is_negotiable=False,
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(Car.objects.get(id=res.data["id"]).rent_price_per_day)

    def test_buy_without_sale_price_400(self):
        self.assertEqual(
            self._post(listing_type="buy", is_negotiable=False).status_code, 400
        )

    def test_buy_requires_is_negotiable(self):
        self.assertEqual(
            self._post(listing_type="buy", sale_price="5000000.00").status_code, 400
        )

    def test_rent_forces_is_negotiable_null(self):
        res = self._post(
            listing_type="rent", rent_price_per_day="20000.00", is_negotiable=True
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(Car.objects.get(id=res.data["id"]).is_negotiable)

    def test_listing_type_both_rejected(self):
        self.assertEqual(
            self._post(listing_type="both", rent_price_per_day="20000.00").status_code,
            400,
        )

    def test_negotiable_buy_valid_without_range(self):
        res = self._post(
            listing_type="buy",
            sale_price="5000000.00",
            is_negotiable=True,
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Car.objects.get(id=res.data["id"]).is_negotiable)

    def test_car_model_has_no_min_max_fields(self):
        field_names = {f.name for f in Car._meta.get_fields()}
        self.assertNotIn("min_price", field_names)
        self.assertNotIn("max_price", field_names)


class VinPlatePrivacyTest(APITestCase):
    def setUp(self):
        self.owner = create_user("priv-owner@test.com", "owner")
        create_owner_profile(self.owner)
        self.car = create_car(
            self.owner,
            vin="1HGCM82633A004352",
            plate_number="ABC123DE",
            is_negotiable=True,
        )

    PRIVATE = ("vin", "plate_number")

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

    def test_public_detail_omits_private_fields(self):
        res = self.client.get(f"/api/v1/listings/cars/{self.car.id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        for key in self.PRIVATE:
            self.assertNotIn(key, res.data)

    def test_owner_detail_includes_private_fields(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(f"/api/v1/listings/my-cars/{self.car.id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["vin"], "1HGCM82633A004352")
        self.assertEqual(res.data["plate_number"], "ABC123DE")

    def test_admin_detail_includes_private_fields(self):
        staff = create_user("priv-staff@test.com", "owner", is_staff=True)
        self.client.force_authenticate(user=staff)
        res = self.client.get(f"/api/v1/listings/admin/cars/{self.car.id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("vin", res.data)

    def test_is_negotiable_is_public(self):
        """The badge flag is public; only the range behind it is private."""
        detail = self.client.get(f"/api/v1/listings/cars/{self.car.id}")
        self.assertTrue(detail.data["is_negotiable"])
        listing = self.client.get("/api/v1/listings/cars")
        row = next(r for r in listing.data["results"] if r["id"] == str(self.car.id))
        self.assertTrue(row["is_negotiable"])
        self.assertNotIn("min_price", row)

    def test_public_list_omits_private_fields(self):
        res = self.client.get("/api/v1/listings/cars")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        for row in res.data["results"]:
            for key in self.PRIVATE:
                self.assertNotIn(key, row)


class RequestTypeMatchTest(APITestCase):
    def setUp(self):
        self.owner = create_user("rtm-owner@test.com", "owner")
        create_owner_profile(self.owner)
        self.buy_car = create_car(
            self.owner,
            listing_type=ListingType.BUY,
            sale_price="5000000.00",
            is_negotiable=False,
        )
        self.rent_car = create_car(
            self.owner,
            listing_type=ListingType.RENT,
            sale_price=None,
            rent_price_per_day="20000.00",
        )
        self.customer = create_user("rtm-customer@test.com", "customer")
        create_customer_profile(self.customer)
        self.client.force_authenticate(user=self.customer)

    def _post(self, car, rtype, price):
        return self.client.post(
            "/api/v1/listings/requests",
            {"car": str(car.id), "request_type": rtype, "price_offered": price},
            format="json",
        )

    def test_rent_request_on_buy_car_400(self):
        self.assertEqual(self._post(self.buy_car, "rent", "20000.00").status_code, 400)

    def test_buy_request_on_rent_car_400(self):
        self.assertEqual(
            self._post(self.rent_car, "buy", "5000000.00").status_code, 400
        )

    def test_matching_buy_request_ok(self):
        self.assertEqual(self._post(self.buy_car, "buy", "5000000.00").status_code, 201)

    def test_direct_buy_request_rejected_on_negotiable_car(self):
        """Negotiable listings transact through offers only."""
        car = create_car(
            self.owner,
            listing_type=ListingType.BUY,
            sale_price="18500000.00",
            is_negotiable=True,
        )
        res = self._post(car, "buy", "18500000.00")
        self.assertEqual(res.status_code, 400)
        self.assertIn("offer", str(res.data).lower())

    def test_direct_buy_request_still_allowed_on_non_negotiable_car(self):
        car = create_car(
            self.owner,
            listing_type=ListingType.BUY,
            sale_price="18500000.00",
            is_negotiable=False,
        )
        self.assertEqual(self._post(car, "buy", "18500000.00").status_code, 201)


class ReservedListingPauseTest(APITestCase):
    """A car reserved by an accepted offer (active buy request) can't be paused."""

    def setUp(self):
        self.owner = create_user("pause-owner@test.com", "owner")
        create_owner_profile(self.owner)
        self.customer = create_user("pause-buyer@test.com", "customer")
        self.car = create_car(
            self.owner,
            listing_type=ListingType.BUY,
            sale_price="5000000.00",
            status=CarStatus.PUBLISHED,
        )
        self.client.force_authenticate(user=self.owner)

    def _pause(self):
        return self.client.post(
            f"/api/v1/listings/my-cars/{self.car.id}/status",
            {"status": "paused"},
            format="json",
        )

    def test_pause_blocked_when_reserved(self):
        from apps.offers.models import Offer, OfferStatus
        from apps.sales.models import Deal, DEAL_TTL_DAYS
        offer = Offer.objects.create(
            car=self.car, customer=self.customer, amount="5000000.00",
            currency=self.car.currency, status=OfferStatus.ACCEPTED,
            expires_at=timezone.now(),
        )
        Deal.objects.create(
            car=self.car, buyer=self.customer, seller=self.owner, offer=offer,
            agreed_amount="5000000.00", currency=self.car.currency,
            expires_at=timezone.now() + timedelta(days=DEAL_TTL_DAYS),
        )
        res = self._pause()
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.PUBLISHED)

    def test_pause_allowed_when_not_reserved(self):
        self.assertEqual(self._pause().status_code, status.HTTP_200_OK)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.PAUSED)


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


class SeedBrandsCommandTest(TestCase):
    def test_seed_is_idempotent_and_includes_local_brands(self):
        from django.core.management import call_command

        call_command("seed_brands")
        first = Brand.objects.count()
        self.assertGreaterEqual(first, 100)
        self.assertTrue(Brand.objects.filter(name="Innoson").exists())
        self.assertTrue(Brand.objects.filter(name="Toyota").exists())
        self.assertLess(Brand.objects.get(name="Toyota").display_order, 100)

        call_command("seed_brands")  # idempotent
        self.assertEqual(Brand.objects.count(), first)
