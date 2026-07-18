import shutil
import tempfile
from io import BytesIO
import json
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from datetime import time, date
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.listings.models import (
    Car,
    CarImage,
    CarImageType,
    CarStatus,
    ListingType,
    Request,
    RequestStatus,
)
from apps.users.models import CustomerProfile, OwnerProfile, User


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
        create_car(
            owner,
            title="Both Ways",
            listing_type=ListingType.BOTH,
            rent_price_per_day="30000.00",
        )

    def _titles(self, res):
        return {c["title"] for c in res.data["results"]}

    def test_rent_mode_includes_both(self):
        res = self.client.get("/api/v1/listings/cars?listing_type=rent")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        titles = self._titles(res)
        self.assertIn("Rent Only", titles)
        self.assertIn("Both Ways", titles)
        self.assertNotIn("Buy Only", titles)

    def test_buy_mode_includes_both(self):
        res = self.client.get("/api/v1/listings/cars?listing_type=buy")
        titles = self._titles(res)
        self.assertIn("Buy Only", titles)
        self.assertIn("Both Ways", titles)
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
        car = create_car(self.owner, title="Sold Car", status=CarStatus.ARCHIVED)
        Request.objects.create(
            car=car,
            customer=self.customer,
            request_type=ListingType.BUY,
            price_offered="15000000.00",
            status=RequestStatus.COMPLETED,
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
        self.assertEqual(res.data["description"], "Inspector verified notes")
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
