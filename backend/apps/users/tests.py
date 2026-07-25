from io import BytesIO
import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase
from apps.users.models import User, OwnerProfile


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


def fake_upload(name, content_type, data=b"x"):
    return SimpleUploadedFile(name, data, content_type=content_type)


class WiredEmailTemplatesTest(APITestCase):
    """Every wired template renders and surfaces its context values — catches a
    templatizing typo (bad tag or wrong variable name) without needing full
    objects."""

    CASES = {
        "auth_login_code": {"code": "123456", "expires_minutes": 10},
        "auth_signup_code": {"code": "123456", "expires_minutes": 10},
        "owner_verified": {"first_name": "Ada", "action_url": "http://fe/x"},
        "listing_approved": {"car_title": "Lexus NX", "action_url": "http://fe/x"},
        "changes_requested": {
            "car_title": "Lexus NX",
            "admin_note": "Clearer front photo please",
            "action_url": "http://fe/x",
        },
        "inspection_passed": {
            "first_name": "Ada",
            "car_title": "Lexus NX",
            "action_url": "http://fe/x",
        },
        "inspection_failed": {
            "car_title": "Lexus NX",
            "reason": "Brake pads worn",
            "action_url": "http://fe/x",
        },
        "inspection_needs_clearance": {
            "car_title": "Lexus NX",
            "clearance_note": "Upload registration",
            "action_url": "http://fe/x",
        },
        "inspection_rescheduled": {
            "car_title": "Lexus NX",
            "date": "Mon, 21 Jul 2026",
            "time": "1:30 PM",
            "center": "Ikeja Center",
        },
        "request_approved": {"car_title": "Lexus NX", "action_url": "http://fe/x"},
        "payment_confirmed": {
            "car_title": "Lexus NX",
            "amount": "NGN 16000000",
            "action_url": "http://fe/x",
        },
        "assistance_received": {"first_name": "Ada", "state": "Kano"},
        "staff_new_listing": {
            "car_title": "Lexus NX",
            "owner_name": "Ada Bello",
            "review_url": "http://fe/admin",
        },
        "staff_assistance_request": {
            "owner_name": "Ada Bello",
            "state": "Kano",
            "message": "Nearest center please",
        },
        "assistance_booked_for_you": {
            "first_name": "Ada",
            "car_title": "Lexus NX",
            "date": "Mon, 21 Jul 2026",
            "time": "1:30 PM",
            "center": "Ikeja Center",
            "address": "24 Awolowo Rd",
            "tracking_id": "NG-LOS-000123",
        },
        "inspection_booking_confirmed": {
            "car_title": "Lexus NX",
            "date": "Mon, 21 Jul 2026",
            "time": "1:30 PM",
            "center": "Ikeja Center",
            "address": "24 Awolowo Rd",
            "tracking_id": "NG-LOS-000123",
            "attendee_display": "Ada Bello (owner)",
        },
    }

    def test_wired_templates_render_with_context(self):
        from django.template.loader import render_to_string

        for key, ctx in self.CASES.items():
            html = render_to_string(f"emails/{key}.html", ctx)
            for value in ctx.values():
                self.assertIn(
                    str(value), html, msg=f"{value!r} missing from emails/{key}.html"
                )

    def test_assistance_message_block_hidden_when_empty(self):
        from django.template.loader import render_to_string

        shown = render_to_string(
            "emails/staff_assistance_request.html",
            {"owner_name": "A", "state": "Kano", "message": "Please help"},
        )
        self.assertIn("Please help", shown)
        hidden = render_to_string(
            "emails/staff_assistance_request.html",
            {"owner_name": "A", "state": "Kano", "message": ""},
        )
        # The whole MESSAGE block (label + value) disappears when empty.
        self.assertNotIn("Message", hidden)


class AdminOwnerVerifyTest(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            email="staff-ov@test.com", first_name="S", last_name="T",
            password="securepass123", role="owner", is_staff=True, is_active=True,
        )
        self.owner = User.objects.create_user(
            email="owner-ov@test.com", first_name="Ada", last_name="B",
            password="securepass123", role="owner", is_active=True,
        )
        self.profile = OwnerProfile.objects.create(
            user=self.owner, owner_type="individual",
            bank_account="1", bank_name="B", id_type="nin", national_id="123",
        )

    def test_staff_lists_and_verifies_owner(self):
        from django.core import mail

        self.client.force_authenticate(user=self.staff)
        res = self.client.get("/api/v1/users/admin/owners?verified=false")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)
        self.assertFalse(res.data["results"][0]["is_verified"])

        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                f"/api/v1/users/admin/owners/{self.owner.id}/verify"
            )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.is_verified)
        # Owner gets the "you're verified" email once.
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["owner-ov@test.com"])

    def test_owner_cannot_access_admin_owners(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get("/api/v1/users/admin/owners")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class AccessCodeEmailTest(APITestCase):
    def test_sign_in_code_emailed_with_code(self):
        from django.core import mail

        from apps.notifications.models import EmailLog
        from apps.users.services import generate_and_send_code

        code = generate_and_send_code("emmafrank@test.com", "sign_in")
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["emmafrank@test.com"])
        self.assertIn("login code", mail.outbox[0].subject.lower())
        html = mail.outbox[0].alternatives[0][0]
        self.assertIn(code.plain_code, html)
        # The header logo is injected into every email.
        self.assertIn("/logo.png", html)
        log = EmailLog.objects.get(recipient="emmafrank@test.com")
        self.assertTrue(log.success)
        self.assertEqual(log.template_key, "auth_login_code")

    def test_signup_code_uses_signup_template(self):
        from django.core import mail

        from apps.notifications.models import EmailLog
        from apps.users.services import generate_and_send_code

        code = generate_and_send_code("newbie@test.com", "sign_up_verify")
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(code.plain_code, mail.outbox[0].alternatives[0][0])
        self.assertEqual(
            EmailLog.objects.get(recipient="newbie@test.com").template_key,
            "auth_signup_code",
        )


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
            "address": "24 Awolowo Rd",
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

    def test_uploads_accept_png_and_pdf(self):
        res = self.client.post(
            "/api/v1/auth/sign-up",
            self._owner_payload(
                email="fmt@test.com",
                document=fake_upload("own.pdf", "application/pdf", b"%PDF-1.4"),
                id_document=fake_upload("id.png", "image/png"),
            ),
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_document_rejects_docx(self):
        res = self.client.post(
            "/api/v1/auth/sign-up",
            self._owner_payload(
                document=fake_upload(
                    "own.docx",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ),
            ),
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("document", res.data)

    def test_id_document_rejects_disallowed_type(self):
        res = self.client.post(
            "/api/v1/auth/sign-up",
            self._owner_payload(id_document=fake_upload("id.gif", "image/gif")),
            format="multipart",
        )
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
        self.assertEqual(profile.address, "24 Awolowo Rd")
        self.assertTrue(profile.id_document.name)


class OwnerProfileIdentityLockTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="locked-owner@test.com",
            first_name="Locked",
            last_name="Owner",
            password="securepass123",
            role="owner",
        )
        self.user.is_active = True
        self.user.save(update_fields=["is_active"])
        OwnerProfile.objects.create(
            user=self.user,
            owner_type="individual",
            bank_account="1234567890",
            bank_name="Test Bank",
            national_id="12345678901",
            id_type="nin",
            id_document=id_image("locked-id.jpg"),
        )
        self.client.force_authenticate(self.user)

    def test_owner_profile_rejects_identity_updates(self):
        res = self.client.patch(
            "/api/v1/users/me",
            {
                "first_name": "Changed",
                "last_name": "Owner",
                "phone": "08012345678",
                "id_type": "drivers_license",
                "national_id": "DL-12345",
                "id_document": id_image("new-id.jpg"),
            },
            format="multipart",
        )

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("id_type", res.data)
        self.assertIn("national_id", res.data)
        self.assertIn("id_document", res.data)

        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Locked")
        profile = self.user.owner_profile
        profile.refresh_from_db()
        self.assertEqual(profile.id_type, "nin")
        self.assertEqual(profile.national_id, "12345678901")
        self.assertIn("locked-id", profile.id_document.name)
        self.assertNotIn("new-id", profile.id_document.name)


class CustomerSignUpNoNinTest(APITestCase):
    """Customers no longer supply a NIN / national_id at sign-up."""

    def _customer_payload(self, **overrides):
        payload = {
            "email": "newcustomer@test.com",
            "first_name": "New",
            "last_name": "Customer",
            "password": "securepass123",
            "role": "customer",
        }
        payload.update(overrides)
        return payload

    def test_customer_signup_succeeds_without_national_id(self):
        res = self.client.post(
            "/api/v1/auth/sign-up", self._customer_payload(), format="multipart"
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="newcustomer@test.com")
        self.assertEqual(user.role, "customer")
        self.assertEqual(user.customer_profile.national_id, "")

    def test_customer_signup_ignores_non_digit_national_id(self):
        # Even if a value is sent, it is no longer validated for customers.
        res = self.client.post(
            "/api/v1/auth/sign-up",
            self._customer_payload(email="c2@test.com", national_id="not-a-nin"),
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_owner_still_requires_national_id(self):
        payload = {
            "email": "o-nonid@test.com",
            "first_name": "No",
            "last_name": "Id",
            "password": "securepass123",
            "role": "owner",
            "owner_type": "individual",
            "bank_account": "1234567890",
            "bank_name": "Test Bank",
            "id_type": "nin",
            "document": id_image("ownership.jpg"),
            "id_document": id_image("id.jpg"),
        }
        res = self.client.post("/api/v1/auth/sign-up", payload, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("national_id", res.data)
