import secrets
import uuid
import hashlib
from datetime import timedelta
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django_countries.fields import CountryField

from .managers import UserManager


class IDType(models.TextChoices):
    INTL_PASSPORT = "intl_passport", "International Passport"
    NIN = "nin", "NIN"
    VOTERS_CARD = "voters_card", "Voter's Card"
    DRIVERS_LICENCE = "drivers_licence", "Driver's Licence"


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        OWNER = "owner", "Owner"
        TEAM_MEMBER = "team_member", "Team Member"

    class StaffRole(models.TextChoices):
        INSPECTOR = "inspector", "Inspector"
        PUBLISHER = "publisher", "Publisher"
        ADMIN = "admin", "Admin"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=150, default="")
    last_name = models.CharField(max_length=150, default="")
    phone = models.CharField(max_length=20, blank=True, default="")
    role = models.CharField(max_length=20, choices=Role.choices)
    is_active = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    # Only meaningful when is_staff. Existing staff are backfilled to "admin".
    staff_role = models.CharField(
        max_length=20, choices=StaffRole.choices, blank=True, default=""
    )
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        db_table = "users"

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

    def get_short_name(self):
        return self.first_name


class CustomerProfile(models.Model):

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="customer_profile"
    )
    drivers_license = models.CharField(
        max_length=250, null=True, blank=True, default=""
    )
    national_id = models.CharField(max_length=50, blank=True, default="")
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.CharField(max_length=250, null=True, blank=True, default="")
    city = models.CharField(max_length=250, null=True, blank=True, default="")
    country = CountryField(blank=True, blank_label="Select country")
    state = models.CharField(max_length=250, null=True, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "customer_profiles"
        verbose_name = "Customer Profile"
        verbose_name_plural = "Customer Profiles"

    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name} - customer profile"


def owner_document_path(instance, filename):
    return f"owner_documents/{instance.user.id}/{filename}"


class OwnerProfile(models.Model):
    class OwnerType(models.TextChoices):
        INDIVIDUAL = "individual", "Individual"
        FLEET = "fleet", "Fleet"

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="owner_profile"
    )
    owner_type = models.CharField(max_length=10, choices=OwnerType.choices)
    fleet_name = models.CharField(max_length=200, blank=True, default="")
    id_type = models.CharField(max_length=20, choices=IDType.choices, blank=True)
    # FileField (not ImageField) so a PDF scan of an ID is accepted too; the
    # allowed types (PDF/PNG/JPEG) are enforced in the serializers.
    id_document = models.FileField(
        upload_to="identity-docs/%Y/%m/", blank=True, null=True
    )
    national_id = models.CharField(max_length=50, blank=True, default="")
    location = models.CharField(max_length=200, blank=True, default="")
    rc_number = models.CharField(max_length=50, blank=True, default="")
    country = CountryField(blank=True, blank_label="Select country")
    state = models.CharField(max_length=250, blank=True, default="")
    city = models.CharField(max_length=250, blank=True, default="")
    address = models.CharField(max_length=300, blank=True, default="")
    document = models.FileField(upload_to=owner_document_path, blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "owner_profiles"

    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name} - {self.owner_type}"


class AccessCode(models.Model):

    class Purpose(models.TextChoices):
        SIGN_IN = "sign_in", "Sign In"
        SIGN_UP_VERIFY = "sign_up_verify", "Sign Up Verify"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    email = models.EmailField(db_index=True)
    code_hash = models.CharField(max_length=128)
    purpose = models.CharField(max_length=20, choices=Purpose.choices)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "access_codes"
        indexes = [
            models.Index(
                fields=["email", "purpose", "is_used", "expires_at"],
                name="access_code_lookup_idx",
            )
        ]

    @staticmethod
    def _hash_code(code: str) -> str:
        return hashlib.sha256(code.encode()).hexdigest()

    @classmethod
    def create_code(cls, email: str, purpose: str, user=None):
        cls.objects.filter(
            email=email,
            purpose=purpose,
            is_used=False,
        ).update(is_used=True)
        plain_code = f"{secrets.randbelow(1000000):06d}"
        obj = cls.objects.create(
            user=user,
            email=email,
            code_hash=cls._hash_code(plain_code),
            purpose=purpose,
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        obj.plain_code = plain_code
        return obj

    @classmethod
    def verify_code(cls, email: str, code: str, purpose: str):
        code_hash = cls._hash_code(code)
        obj = (
            cls.objects.filter(
                email=email,
                code_hash=code_hash,
                purpose=purpose,
                is_used=False,
                expires_at__gt=timezone.now(),
            )
            .order_by("-created_at")
            .first()
        )

        if obj is None:
            return None
        obj.is_used = True
        obj.save(update_fields=["is_used"])
        return obj


class RefreshTokenBlacklist(models.Model):
    jti = models.CharField(max_length=64, unique=True, db_index=True)
    blacklisted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "refresh_token_blacklist"


class PasswordResetToken(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token_hash = models.CharField(max_length=128)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "password_reset_tokens"

    @classmethod
    def create_token(cls, user, expires_in_minutes=30):
        # Invalidate old token for this user. A longer window is used for
        # team-member invites (set-your-password) than for a password reset.

        cls.objects.filter(
            user=user,
            is_used=False,
        ).update(is_used=True)
        token = secrets.token_urlsafe(32)
        obj = cls.objects.create(
            user=user,
            token_hash=hashlib.sha256(token.encode()).hexdigest(),
            expires_at=timezone.now() + timedelta(minutes=expires_in_minutes),
        )
        obj.plain_token = token
        return obj

    @classmethod
    def verify_token(cls, token):
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        obj = (
            cls.objects.filter(
                token_hash=token_hash,
                is_used=False,
                expires_at__gt=timezone.now(),
            )
            .select_related("user")
            .first()
        )

        if obj is None:
            return None
        obj.is_used = True
        obj.save(update_fields=["is_used"])
        return obj


class TeamMembership(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="team_membership"
    )
    business = models.ForeignKey(
        OwnerProfile, on_delete=models.CASCADE, related_name="team"
    )

    branches = models.ManyToManyField(
        "listings.Branch", related_name="team_memberships"
    )
    title = models.CharField(max_length=200, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "team_memberships"

    def __str__(self):
        return f"{self.user.get_full_name()} @ {self.business.fleet_name}"
