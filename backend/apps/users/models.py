import secrets
import uuid
import hashlib
from datetime import timedelta
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django_countries.fields import CountryField

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        OWNER = "owner", "Owner"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True, default="")
    role = models.CharField(max_length=10, choices=Role.choices)
    is_active = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    class Meta:
        db_table = "users"

    def __str__(self):
        return f"{self.name} ({self.email})"


class CustomerProfile(models.Model):

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="customer_profile"
    )
    drivers_license = models.CharField(
        max_length=250, null=True, blank=True, default=""
    )
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
        return f"{self.user.name} - customer profile"


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
    national_id = models.CharField(max_length=50, blank=True, default="")
    location = models.CharField(max_length=200, blank=True, default="")
    rc_number = models.CharField(max_length=50, blank=True, default="")
    bank_account = models.CharField(max_length=20)
    bank_name = models.CharField(max_length=100)
    document = models.FileField(upload_to=owner_document_path, blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "owner_profiles"

    def __str__(self):
        return f"{self.user.name} - {self.owner_type}"


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
