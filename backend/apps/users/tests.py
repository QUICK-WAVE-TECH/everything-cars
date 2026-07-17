from io import BytesIO
import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase
from apps.users.models import User, OwnerProfile, CustomerProfile


@pytest.mark.django_db
class TestUserModel:
    def test_create_customer(self):
        user = User.objects.create_user(
            email="customer@test.com",
            first_name="Test",
            last_name="Customer",
            password="testpass123",
            role="customer",
        )
        assert user.email == "customer@test.com"
        assert user.first_name == "Test"
        assert user.last_name == "Customer"
        assert user.role == "customer"
        assert user.is_active is False
        assert user.check_password("testpass123")

    def test_create_owner(self):
        user = User.objects.create_user(
            email="owner@test.com",
            first_name="Test",
            last_name="Owner",
            password="testpass123",
            role="owner",
        )
        assert user.role == "owner"

    def test_email_required(self):
        with pytest.raises(ValueError, match="email"):
            User.objects.create_user(
                email="", first_name="No", last_name="Email", password="testpass123"
            )

    def test_password_required(self):
        with pytest.raises(ValueError, match="password"):
            User.objects.create_user(
                email="x@test.com", first_name="No", last_name="Pass", password=None
            )


def id_image(name="id.jpg"):
    buf = BytesIO()
    Image.new("RGB", (10, 10), "blue").save(buf, format="JPEG")
    buf.seek(0)
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/jpeg")


class OwnerSignUpIDTest(APITestCase):
    def _owner_payload(self, **overrides):
        payload = {
            "email": "newowner@test.com",
            "first_name": "New",
            "last_name": "Owner",
            "password": "securepass123",
            "role": "owner",
            "owner_type": "individual",
            "bank_account": "1234567890",
            "bank_name": "Test Bank",
            "national_id": "12345678901",
            "id_type": "nin",
            "document": id_image("ownership.jpg"),
            "id_document": id_image("id.jpg"),
        }
        payload.update(overrides)
        return payload

    def test_owner_signup_requires_id_type(self):
        payload = self._owner_payload()
        payload.pop("id_type")
        res = self.client.post("/api/v1/auth/sign-up", payload, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("id_type", res.data)

    def test_owner_signup_requires_id_document(self):
        payload = self._owner_payload()
        payload.pop("id_document")
        res = self.client.post("/api/v1/auth/sign-up", payload, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("id_document", res.data)

    def test_nin_must_be_digits(self):
        res = self.client.post(
            "/api/v1/auth/sign-up",
            self._owner_payload(national_id="ABC1234"),
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("national_id", res.data)

    def test_passport_allows_letters(self):
        res = self.client.post(
            "/api/v1/auth/sign-up",
            self._owner_payload(
                id_type="intl_passport", national_id="A1234567", email="pp@test.com"
            ),
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        profile = OwnerProfile.objects.get(user__email="pp@test.com")
        self.assertEqual(profile.id_type, "intl_passport")
        self.assertTrue(profile.id_document)

    def test_owner_signup_persists_id_fields(self):
        res = self.client.post(
            "/api/v1/auth/sign-up", self._owner_payload(), format="multipart"
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        profile = OwnerProfile.objects.get(user__email="newowner@test.com")
        self.assertEqual(profile.id_type, "nin")
        self.assertTrue(profile.id_document.name)
