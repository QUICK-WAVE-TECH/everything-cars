from io import BytesIO
import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase
from apps.users.models import User, OwnerProfile
from apps.listings.tests import (
    create_user,
    create_fleet_owner_profile,
    create_owner_profile,
)
from apps.listings.models import Branch
from apps.users.models import TeamMembership
from apps.users.services import SUSPENDED_MESSAGE


def create_user_owner(email):
    return create_user(email, "owner")


def make_team_member(
    email, business_profile, branches, is_active=True, title="Sales Rep"
):
    user = create_user(email, "team_member")
    m = TeamMembership.objects.create(
        user=user, business=business_profile, title=title, is_active=is_active
    )
    m.branches.set(branches)
    return user, m


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
        "team_member_added": {
            "first_name": "Chidi",
            "business_name": "AutoKings Motors",
            "action_url": "http://fe/reset-password?token=abc123",
        },
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
        "staff_car_ready_to_publish": {
            "car_title": "Lexus NX",
            "owner_name": "Ada Bello",
            "review_url": "http://fe/admin/publishing",
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
            email="staff-ov@test.com",
            first_name="S",
            last_name="T",
            password="securepass123",
            role="owner",
            is_staff=True,
            is_active=True,
        )
        self.owner = User.objects.create_user(
            email="owner-ov@test.com",
            first_name="Ada",
            last_name="B",
            password="securepass123",
            role="owner",
            is_active=True,
        )
        self.profile = OwnerProfile.objects.create(
            user=self.owner,
            owner_type="individual",
            id_type="nin",
            national_id="123",
        )

    def test_staff_lists_and_verifies_owner(self):
        from django.core import mail

        self.client.force_authenticate(user=self.staff)
        res = self.client.get("/api/v1/users/admin/owners?verified=false")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)
        self.assertFalse(res.data["results"][0]["is_verified"])

        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(f"/api/v1/users/admin/owners/{self.owner.id}/verify")
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
            "password": "SecurePass123!",
            "phone": "08012345678",
            "role": "owner",
            "owner_type": "individual",
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

    def test_owner_signup_no_longer_needs_bank_details(self):
        # Bank fields were removed from registration entirely.
        res = self.client.post(
            "/api/v1/auth/sign-up", self._owner_payload(), format="multipart"
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_owner_signup_requires_phone(self):
        res = self.client.post(
            "/api/v1/auth/sign-up",
            self._owner_payload(phone=""),
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", res.data)


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
            "password": "SecurePass123!",
            "phone": "08012345678",
            "role": "customer",
        }
        payload.update(overrides)
        return payload

    def test_customer_signup_requires_phone(self):
        res = self.client.post(
            "/api/v1/auth/sign-up",
            self._customer_payload(phone=""),
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", res.data)

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
            "password": "SecurePass123!",
            "phone": "08012345678",
            "role": "owner",
            "owner_type": "individual",
            "id_type": "nin",
            "document": id_image("ownership.jpg"),
            "id_document": id_image("id.jpg"),
        }
        res = self.client.post("/api/v1/auth/sign-up", payload, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("national_id", res.data)


class ForgotPasswordEmailTest(APITestCase):
    """A reset request emails the link (Mailpit in dev) rather than only printing."""

    def test_forgot_password_sends_reset_email(self):
        from django.core import mail

        User.objects.create_user(
            email="reset-me@test.com",
            first_name="Reset",
            last_name="Me",
            password="securepass123",
            role="customer",
            is_active=True,
        )
        res = self.client.post(
            "/api/v1/auth/forgot-password",
            {"email": "reset-me@test.com"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["reset-me@test.com"])
        body = mail.outbox[0].alternatives[0][0]
        self.assertIn("reset-password?token=", body)

    def test_forgot_password_unknown_email_sends_nothing(self):
        from django.core import mail

        res = self.client.post(
            "/api/v1/auth/forgot-password",
            {"email": "nobody@test.com"},
            format="json",
        )
        # Same generic response, but no email and no account leak.
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)


class CustomerVerificationEmailTest(APITestCase):
    """Sign-up creates an inactive user and emails a one-click verify link."""

    def test_signup_sends_verification_link_and_leaves_user_inactive(self):
        from django.core import mail

        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                "/api/v1/auth/sign-up",
                {
                    "email": "verify-me@test.com",
                    "first_name": "Vee",
                    "last_name": "Rify",
                    "password": "SecurePass123!",
                    "phone": "08012345678",
                    "role": "customer",
                },
                format="multipart",
            )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(email="verify-me@test.com")
        self.assertFalse(user.is_active)  # can't sign in until verified

        self.assertEqual(len(mail.outbox), 1)
        html = mail.outbox[0].alternatives[0][0]
        self.assertIn("/verify-email?email=", html)
        self.assertIn("Verify My Account", html)

    def test_unverified_signin_is_blocked(self):
        User.objects.create_user(
            email="pending@test.com",
            first_name="Pend",
            last_name="Ing",
            password="securepass123",
            role="customer",
            is_active=False,
        )
        res = self.client.post(
            "/api/v1/auth/sign-in",
            {"email": "pending@test.com", "password": "securepass123"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(res.data.get("requires_verification"))


class TeamMembershipModelTest(APITestCase):
    def test_membership_links_one_business_and_many_branches(self):
        owner = create_user_owner("biz-model@test.com")
        profile = create_fleet_owner_profile(owner)
        b1 = Branch.objects.create(business=profile, name="A", state="Lagos", city="Ikeja",
            street_address="1", phone="+2340000000000", email="a@x.ng")
        b2 = Branch.objects.create(business=profile, name="B", state="Oyo", city="Ibadan",
            street_address="2", phone="+2340000000001", email="b@x.ng")
        member, m = make_team_member("tm-model@test.com", profile, [b1, b2])
        assert m.business == profile          # FK, not M2M
        assert m.branches.count() == 2
        assert m.is_active is True
        assert member.role == "team_member"


class ResolveScopeTest(APITestCase):
    def setUp(self):
        self.owner = create_user_owner("scope-owner@test.com")
        self.profile = create_fleet_owner_profile(self.owner)
        self.b1 = Branch.objects.create(business=self.profile, name="A", state="Lagos",
            city="Ikeja", street_address="1", phone="+2340000000000", email="a@x.ng")
        self.b2 = Branch.objects.create(business=self.profile, name="B", state="Oyo",
            city="Ibadan", street_address="2", phone="+2340000000001", email="b@x.ng")

    def test_owner_gets_all_branches(self):
        from apps.users.services import resolve_business_scope
        business_owner, branch_ids = resolve_business_scope(self.owner)
        assert business_owner == self.owner
        assert branch_ids is None

    def test_team_member_gets_assigned_active_branches(self):
        from apps.users.services import resolve_business_scope
        member, _ = make_team_member("tm-scope@test.com", self.profile, [self.b1])
        business_owner, branch_ids = resolve_business_scope(member)
        assert business_owner == self.owner
        assert branch_ids == [self.b1.id]

    def test_inactive_membership_no_access(self):
        from apps.users.services import resolve_business_scope, NoBusinessAccess
        member, _ = make_team_member("tm-off@test.com", self.profile, [self.b1], is_active=False)
        with self.assertRaises(NoBusinessAccess):
            resolve_business_scope(member)

    def test_customer_no_access(self):
        from apps.users.services import resolve_business_scope, NoBusinessAccess
        cust = create_user("scope-cust@test.com", "customer")
        with self.assertRaises(NoBusinessAccess):
            resolve_business_scope(cust)


class RbacPermissionTest(APITestCase):
    def test_owner_or_team_member_allows_both(self):
        from common.permissions import IsOwnerOrTeamMember

        perm = IsOwnerOrTeamMember()

        class Req:
            def __init__(self, u):
                self.user = u

        owner = create_user_owner("perm-owner@test.com")
        member = create_user("perm-tm@test.com", "team_member")
        cust = create_user("perm-cust@test.com", "customer")
        assert perm.has_permission(Req(owner), None) is True
        assert perm.has_permission(Req(member), None) is True
        assert perm.has_permission(Req(cust), None) is False


class TeamListCreateApiTest(APITestCase):
    def setUp(self):
        self.owner = create_user_owner("team-owner@test.com")
        self.profile = create_fleet_owner_profile(self.owner)
        self.b1 = Branch.objects.create(business=self.profile, name="A", state="Lagos",
            city="Ikeja", street_address="1", phone="+2340000000000", email="a@x.ng")
        self.other_owner = create_user_owner("team-other@test.com")
        self.other_profile = create_fleet_owner_profile(self.other_owner, fleet_name="Rivals")
        self.other_branch = Branch.objects.create(business=self.other_profile, name="X",
            state="Oyo", city="Ibadan", street_address="9", phone="+2340000000009", email="x@x.ng")
        self.individual = create_user_owner("team-indiv@test.com")
        create_owner_profile(self.individual)

    def _payload(self, **over):
        data = {"email": "newtm@test.com", "first_name": "New", "last_name": "Rep",
                "title": "Sales", "branch_ids": [str(self.b1.id)]}
        data.update(over)
        return data

    def test_verified_fleet_owner_creates_member(self):
        self.client.force_authenticate(self.owner)
        r = self.client.post("/api/v1/owner/team/", self._payload(), format="json")
        assert r.status_code == 201, r.data
        u = User.objects.get(email="newtm@test.com")
        assert u.role == "team_member" and u.is_active is True
        assert list(u.team_membership.branches.values_list("id", flat=True)) == [self.b1.id]

    def test_duplicate_email_rejected(self):
        self.client.force_authenticate(self.owner)
        r = self.client.post("/api/v1/owner/team/", self._payload(email=self.owner.email), format="json")
        assert r.status_code == 400

    def test_cross_business_branch_rejected(self):
        self.client.force_authenticate(self.owner)
        r = self.client.post("/api/v1/owner/team/",
            self._payload(branch_ids=[str(self.other_branch.id)]), format="json")
        assert r.status_code == 400

    def test_no_branch_rejected(self):
        self.client.force_authenticate(self.owner)
        r = self.client.post("/api/v1/owner/team/", self._payload(branch_ids=[]), format="json")
        assert r.status_code == 400

    def test_individual_owner_forbidden(self):
        self.client.force_authenticate(self.individual)
        r = self.client.post("/api/v1/owner/team/", self._payload(), format="json")
        assert r.status_code == 403

    def test_list_scoped_to_business(self):
        make_team_member("mine@test.com", self.profile, [self.b1])
        make_team_member("theirs@test.com", self.other_profile, [self.other_branch])
        self.client.force_authenticate(self.owner)
        r = self.client.get("/api/v1/owner/team/")
        rows = r.data["results"] if "results" in r.data else r.data
        emails = [m["email"] for m in rows]
        assert "mine@test.com" in emails and "theirs@test.com" not in emails


class TeamLifecycleApiTest(APITestCase):
    def setUp(self):
        self.owner = create_user_owner("tl-owner@test.com")
        self.profile = create_fleet_owner_profile(self.owner)
        self.b1 = Branch.objects.create(business=self.profile, name="A", state="Lagos",
            city="Ikeja", street_address="1", phone="+2340000000000", email="a@x.ng")
        self.b2 = Branch.objects.create(business=self.profile, name="B", state="Oyo",
            city="Ibadan", street_address="2", phone="+2340000000001", email="b@x.ng")
        _, self.m = make_team_member("tl-tm@test.com", self.profile, [self.b1])

    def test_patch_reassigns_branches_and_title(self):
        self.client.force_authenticate(self.owner)
        r = self.client.patch(f"/api/v1/owner/team/{self.m.id}/",
            {"title": "Manager", "branch_ids": [str(self.b2.id)]}, format="json")
        assert r.status_code == 200, r.data
        self.m.refresh_from_db()
        assert self.m.title == "Manager"
        assert list(self.m.branches.values_list("id", flat=True)) == [self.b2.id]

    def test_deactivate_then_reactivate(self):
        self.client.force_authenticate(self.owner)
        assert self.client.post(f"/api/v1/owner/team/{self.m.id}/deactivate/").status_code == 200
        self.m.refresh_from_db()
        assert self.m.is_active is False
        assert self.client.post(f"/api/v1/owner/team/{self.m.id}/reactivate/").status_code == 200
        self.m.refresh_from_db()
        assert self.m.is_active is True

    def test_team_member_cannot_manage_team(self):
        member, _ = make_team_member("tl-intruder@test.com", self.profile, [self.b1])
        self.client.force_authenticate(member)
        assert self.client.get("/api/v1/owner/team/").status_code == 403

    def test_cross_business_member_is_404(self):
        other = create_user_owner("tl-other@test.com")
        create_fleet_owner_profile(other, fleet_name="Rivals")
        self.client.force_authenticate(other)
        assert self.client.get(f"/api/v1/owner/team/{self.m.id}/").status_code == 404


class BranchRetireUnassignsTest(APITestCase):
    def test_retiring_branch_unassigns_members(self):
        owner = create_user_owner("ru-owner@test.com")
        profile = create_fleet_owner_profile(owner)
        b1 = Branch.objects.create(business=profile, name="A", state="Lagos", city="Ikeja",
            street_address="1", phone="+2340000000000", email="a@x.ng")
        b2 = Branch.objects.create(business=profile, name="B", state="Oyo", city="Ibadan",
            street_address="2", phone="+2340000000002", email="b@x.ng")
        _, m = make_team_member("ru-tm@test.com", profile, [b1, b2])
        self.client.force_authenticate(owner)
        r = self.client.post(f"/api/v1/owner/branches/{b1.id}/deactivate/")
        assert r.status_code == 200
        assert list(m.branches.values_list("id", flat=True)) == [b2.id]


class MyScopeApiTest(APITestCase):
    def setUp(self):
        from apps.users.models import TeamMembership
        self.owner = create_user_owner("scope-api-owner@test.com")
        self.profile = create_fleet_owner_profile(self.owner)
        self.b1 = Branch.objects.create(business=self.profile, name="A", state="Lagos",
            city="Ikeja", street_address="1", phone="+2340000000000", email="a@x.ng")
        self.b2 = Branch.objects.create(business=self.profile, name="B", state="Oyo",
            city="Ibadan", street_address="2", phone="+2340000000002", email="b@x.ng")
        self.member = create_user("scope-api-tm@test.com", "team_member")
        m = TeamMembership.objects.create(user=self.member, business=self.profile)
        m.branches.set([self.b1])

    def test_owner_scope(self):
        self.client.force_authenticate(self.owner)
        r = self.client.get("/api/v1/owner/me/scope")
        assert r.status_code == 200
        assert r.data["is_team_member"] is False
        assert r.data["can_manage_team"] is True
        assert {b["name"] for b in r.data["branches"]} == {"A", "B"}

    def test_member_scope(self):
        self.client.force_authenticate(self.member)
        r = self.client.get("/api/v1/owner/me/scope")
        assert r.status_code == 200
        assert r.data["is_team_member"] is True
        assert r.data["can_manage_team"] is False
        assert [b["name"] for b in r.data["branches"]] == ["A"]


class StaffRoleModelTest(APITestCase):
    def test_staff_role_choices_and_default(self):
        u = User.objects.create_user(
            email="sr@test.com", first_name="S", last_name="R",
            password="x", role="customer", is_staff=True,
        )
        assert u.staff_role == ""
        u.staff_role = User.StaffRole.INSPECTOR
        u.save()
        u.refresh_from_db()
        assert u.staff_role == "inspector"


class InspectPublishPermsTest(APITestCase):
    def _req(self, u):
        class R:
            user = u
        return R()

    def test_permissions(self):
        from common.permissions import IsInspector, IsPublisher

        def staff(role):
            return User.objects.create_user(email=f"{role or 'none'}-perm@t.com",
                first_name="A", last_name="B", password="x", role="customer",
                is_staff=True, staff_role=role)

        insp = staff("inspector")
        pub = staff("publisher")
        adm = staff("admin")
        none = staff("")
        customer = User.objects.create_user(email="cperm@t.com", first_name="C",
            last_name="D", password="x", role="customer")

        assert IsInspector().has_permission(self._req(insp), None) is True
        assert IsInspector().has_permission(self._req(adm), None) is True
        assert IsInspector().has_permission(self._req(pub), None) is False
        assert IsPublisher().has_permission(self._req(pub), None) is True
        assert IsPublisher().has_permission(self._req(adm), None) is True
        assert IsPublisher().has_permission(self._req(insp), None) is False
        assert IsInspector().has_permission(self._req(customer), None) is False
        assert IsPublisher().has_permission(self._req(none), None) is False


class MeStaffRoleTest(APITestCase):
    def test_me_includes_staff_role(self):
        u = User.objects.create_user(email="me-sr@test.com", first_name="M", last_name="E",
            password="x", role="customer", is_active=True, is_staff=True, staff_role="publisher")
        self.client.force_authenticate(u)
        r = self.client.get("/api/v1/users/me")
        assert r.status_code == 200
        assert r.data["staff_role"] == "publisher"


class MeCanBookInspectionsTest(APITestCase):
    def test_owner_with_id_can_book(self):
        owner = create_user_owner("cb-owner@test.com")
        create_owner_profile(owner)  # includes id_type + id_document
        self.client.force_authenticate(owner)
        r = self.client.get("/api/v1/users/me")
        assert r.data["can_book_inspections"] is True

    def test_team_member_inherits_business_id(self):
        owner = create_user_owner("cb-biz@test.com")
        profile = create_fleet_owner_profile(owner)
        branch = Branch.objects.create(
            business=profile, name="A", state="Lagos", city="Ikeja",
            street_address="1", phone="+2340000000000", email="a@x.ng",
        )
        member, _ = make_team_member("cb-tm@test.com", profile, [branch])
        self.client.force_authenticate(member)
        r = self.client.get("/api/v1/users/me")
        # The team member has no owner_profile of their own, yet inherits the
        # business's verified identity.
        assert r.data["owner_profile"] is None
        assert r.data["can_book_inspections"] is True

    def test_customer_cannot_book(self):
        u = User.objects.create_user(email="cb-cust@test.com", first_name="C",
            last_name="U", password="x", role="customer", is_active=True)
        self.client.force_authenticate(u)
        r = self.client.get("/api/v1/users/me")
        assert r.data["can_book_inspections"] is False


class TeamMemberWelcomeEmailTest(APITestCase):
    def test_creating_a_member_sends_a_welcome_email(self):
        from django.core import mail
        owner = create_user_owner("welcome-owner@test.com")
        profile = create_fleet_owner_profile(owner, fleet_name="AutoKings Motors")
        b1 = Branch.objects.create(business=profile, name="HQ", state="Lagos",
            city="Ikeja", street_address="1 A", phone="+2348010000000", email="a@x.ng")
        self.client.force_authenticate(owner)
        mail.outbox = []
        with self.captureOnCommitCallbacks(execute=True):
            r = self.client.post("/api/v1/owner/team/", {
                "email": "newrep@test.com", "first_name": "Chidi", "last_name": "Okafor",
                "title": "Sales", "branch_ids": [str(b1.id)],
            }, format="json")
        assert r.status_code == 201, r.data
        # Welcome email lands with the member and business named.
        assert any(m.to == ["newrep@test.com"] for m in mail.outbox), [m.to for m in mail.outbox]
        welcome = next(m for m in mail.outbox if m.to == ["newrep@test.com"])
        assert "AutoKings Motors" in welcome.subject
        # It links to a set-password page (reset-password token).
        body = " ".join([welcome.body, *[b for b, _ in welcome.alternatives]])
        assert "/reset-password?token=" in body
        # A usable set-password token was minted for the member.
        member = User.objects.get(email="newrep@test.com")
        from apps.users.models import PasswordResetToken
        assert PasswordResetToken.objects.filter(user=member, is_used=False).exists()
        # And an in-app notification for the member.
        assert member.notifications.filter(title__icontains="AutoKings Motors").exists()

    def test_member_can_set_password_and_sign_in(self):
        import re
        from django.core import mail
        owner = create_user_owner("e2e-owner@test.com")
        profile = create_fleet_owner_profile(owner, fleet_name="AutoKings Motors")
        b1 = Branch.objects.create(business=profile, name="HQ", state="Lagos",
            city="Ikeja", street_address="1 A", phone="+2348010000000", email="a@x.ng")
        self.client.force_authenticate(owner)
        mail.outbox = []
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post("/api/v1/owner/team/", {
                "email": "e2e-rep@test.com", "first_name": "Chidi",
                "last_name": "Okafor", "branch_ids": [str(b1.id)],
            }, format="json")
        # Pull the real token out of the emailed set-password link.
        welcome = next(m for m in mail.outbox if m.to == ["e2e-rep@test.com"])
        html = " ".join([welcome.body, *[b for b, _ in welcome.alternatives]])
        match = re.search(r"/reset-password\?token=([^\s\"'&<]+)", html)
        assert match, html[:400]
        plain_token = match.group(1)
        # The member sets their password via that link, then can sign in.
        self.client.force_authenticate(None)
        r = self.client.post("/api/v1/auth/reset-password",
            {"token": plain_token, "password": "MyNewPass123!"}, format="json")
        assert r.status_code == 200, r.data
        member = User.objects.get(email="e2e-rep@test.com")
        assert member.check_password("MyNewPass123!")


class PasswordComplexityValidatorTest(APITestCase):
    def _validate(self, pw):
        from django.core.exceptions import ValidationError

        from common.password_validation import PasswordComplexityValidator

        try:
            PasswordComplexityValidator().validate(pw)
            return None
        except ValidationError as exc:
            return exc.messages

    def test_compliant_password_passes(self):
        self.assertIsNone(self._validate("MyNewPass123!"))
        self.assertIsNone(self._validate("Abcdefg1"))  # letters + a digit

    def test_missing_uppercase_rejected(self):
        msgs = self._validate("mynewpass123!")
        self.assertTrue(any("uppercase" in m for m in msgs))

    def test_missing_lowercase_rejected(self):
        msgs = self._validate("MYNEWPASS123!")
        self.assertTrue(any("lowercase" in m for m in msgs))

    def test_missing_number_or_symbol_rejected(self):
        msgs = self._validate("MyNewPassword")
        self.assertTrue(any("number or symbol" in m for m in msgs))

    def test_symbol_alone_satisfies_number_or_symbol(self):
        self.assertIsNone(self._validate("MyNewPass!"))

    def test_over_max_length_rejected(self):
        msgs = self._validate("Aa1" + "a" * 130)
        self.assertTrue(any("128 characters or fewer" in m for m in msgs))


class PasswordPolicyEndpointTest(APITestCase):
    def _reset_token(self):
        from apps.users.models import PasswordResetToken

        user = create_user("pw-reset@test.com", "customer")
        token = PasswordResetToken.create_token(user)
        return user, token.plain_token

    def test_reset_password_rejects_weak(self):
        _user, plain = self._reset_token()
        r = self.client.post(
            "/api/v1/auth/reset-password",
            {"token": plain, "password": "alllowercase1"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reset_password_accepts_compliant(self):
        _user, plain = self._reset_token()
        r = self.client.post(
            "/api/v1/auth/reset-password",
            {"token": plain, "password": "GoodPass1!"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_signup_serializer_rejects_weak_password(self):
        from apps.users.serializers import SignUpSerializer

        s = SignUpSerializer(
            data={
                "email": "pw-signup@test.com",
                "first_name": "Ada",
                "last_name": "Obi",
                "password": "weakpass1",  # no uppercase
                "role": "customer",
            }
        )
        self.assertFalse(s.is_valid())
        self.assertIn("password", s.errors)

    def test_change_password_rejects_weak(self):
        user = create_user("pw-change@test.com", "customer")
        user.set_password("OldPass1!")
        user.save(update_fields=["password"])
        self.client.force_authenticate(user)
        r = self.client.post(
            "/api/v1/auth/change-password",
            {"old_password": "OldPass1!", "new_password": "nouppercase1"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


class TeamSuspensionAuthTest(APITestCase):
    def setUp(self):
        from apps.users.services import issue_tokens

        self.owner = create_user_owner("susp-owner@test.com")
        self.profile = create_fleet_owner_profile(self.owner)
        self.branch = Branch.objects.create(
            business=self.profile, name="HQ", state="Lagos", city="Ikeja",
            street_address="1", phone="+2348010000000", email="hq@x.ng",
        )
        self.member, self.membership = make_team_member(
            "susp-member@test.com", self.profile, [self.branch]
        )
        self.member.set_password("MemberPass1!")
        self.member.save(update_fields=["password"])
        self._issue_tokens = issue_tokens

    def _auth_as(self, user):
        token = self._issue_tokens(user)["access_token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def _suspend(self):
        self.membership.is_active = False
        self.membership.save(update_fields=["is_active"])

    def test_active_member_can_access_authenticated_endpoint(self):
        self._auth_as(self.member)
        r = self.client.get("/api/v1/users/me")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_suspended_member_token_rejected_immediately(self):
        # A token minted while active must stop working once suspended.
        self._auth_as(self.member)
        self._suspend()
        r = self.client.get("/api/v1/users/me")
        self.assertIn(
            r.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        self.assertIn(SUSPENDED_MESSAGE, str(r.data))

    def test_suspended_member_cannot_sign_in(self):
        self._suspend()
        self.client.credentials()
        r = self.client.post(
            "/api/v1/auth/sign-in",
            {"email": "susp-member@test.com", "password": "MemberPass1!"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(r.data["detail"], SUSPENDED_MESSAGE)

    def test_reactivated_member_regains_access(self):
        self._suspend()
        self.membership.is_active = True
        self.membership.save(update_fields=["is_active"])
        self._auth_as(self.member)
        r = self.client.get("/api/v1/users/me")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_owner_unaffected_by_suspension_check(self):
        self._auth_as(self.owner)
        r = self.client.get("/api/v1/users/me")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
