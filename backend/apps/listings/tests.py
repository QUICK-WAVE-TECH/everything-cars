import shutil
import tempfile
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.listings.models import (
    Car,
    CarImage,
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
        self.assertEqual(CarStatus.INSPECTION_APPROVED, "inspection_approved")
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

    def test_edit_allowed_in_draft(self):
        self.car.status = CarStatus.DRAFT
        self.car.save(update_fields=["status"])
        res = self.client.patch(f"/api/v1/listings/my-cars/{self.car.id}", {"color": "Red"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_edit_allowed_in_needs_changes(self):
        self.car.status = CarStatus.NEEDS_CHANGES
        self.car.save(update_fields=["status"])
        res = self.client.patch(f"/api/v1/listings/my-cars/{self.car.id}", {"color": "Blue"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_edit_allowed_in_inspection_rejected(self):
        self.car.status = CarStatus.INSPECTION_REJECTED
        self.car.save(update_fields=["status"])
        res = self.client.patch(f"/api/v1/listings/my-cars/{self.car.id}", {"color": "Green"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_edit_allowed_in_inspection_no_show(self):
        self.car.status = CarStatus.INSPECTION_NO_SHOW
        self.car.save(update_fields=["status"])
        res = self.client.patch(f"/api/v1/listings/my-cars/{self.car.id}", {"color": "White"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_edit_blocked_in_inspection_pending(self):
        self.car.status = CarStatus.INSPECTION_PENDING
        self.car.save(update_fields=["status"])
        res = self.client.patch(f"/api/v1/listings/my-cars/{self.car.id}", {"color": "Red"})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_edit_blocked_in_inspection_approved(self):
        self.car.status = CarStatus.INSPECTION_APPROVED
        self.car.save(update_fields=["status"])
        res = self.client.patch(f"/api/v1/listings/my-cars/{self.car.id}", {"color": "Red"})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_edit_blocked_in_published(self):
        self.car.status = CarStatus.PUBLISHED
        self.car.save(update_fields=["status"])
        res = self.client.patch(f"/api/v1/listings/my-cars/{self.car.id}", {"color": "Red"})
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

    def test_rejects_non_image_uploads(self):
        response = self.client.post(
            self.upload_url(),
            {
                "images": [
                    SimpleUploadedFile(
                        "not-an-image.txt",
                        b"plain text",
                        content_type="text/plain",
                    )
                ]
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
            {"images": [oversized]},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("too large", response.data["detail"])

    def test_rejects_too_many_files_per_request(self):
        files = [
            SimpleUploadedFile(
                f"file-{index}.txt",
                b"not checked because count fails first",
                content_type="text/plain",
            )
            for index in range(11)
        ]

        response = self.client.post(
            self.upload_url(),
            {"images": files},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("up to 10", response.data["detail"])

    def test_first_upload_becomes_primary_and_optimizes_to_webp(self):
        response = self.client.post(
            self.upload_url(),
            {"images": [image_upload("front.jpg"), image_upload("side.jpg")]},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CarImage.objects.filter(car=self.car).count(), 2)
        self.assertEqual(
            CarImage.objects.filter(car=self.car, is_primary=True).count(),
            1,
        )
        self.assertTrue(response.data[0]["is_primary"])
        first_image = CarImage.objects.filter(car=self.car, is_primary=True).get()
        self.assertTrue(first_image.image.name.endswith(".webp"))
        self.assertTrue(first_image.thumbnail.name.endswith("-thumb.webp"))

        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.DRAFT)

    def test_respects_total_image_limit_per_car(self):
        CarImage.objects.bulk_create(
            [
                CarImage(
                    car=self.car,
                    image=f"car_images/{self.car.id}/existing-{index}.jpg",
                    is_primary=index == 0,
                )
                for index in range(19)
            ]
        )

        response = self.client.post(
            self.upload_url(),
            {"images": [image_upload("new-1.jpg"), image_upload("new-2.jpg")]},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("up to 20 images", response.data["detail"])
