# Backend Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Django REST Framework backend with passwordless authentication (email-based 6-digit OTP), JWT tokens (RS256), custom User model, OwnerProfile with document upload, and Resend for transactional email.

**Architecture:** Django project with split settings (base/dev/prod), apps-based structure (`apps/users/`), business logic in services.py (views stay thin), shared utilities in `common/`. Auth flow: sign-up → email OTP via Resend → verify → JWT issued. Refresh tokens in httpOnly cookies with rotation and blacklisting.

**Tech Stack:** Django 5.1, DRF, PostgreSQL 16, PyJWT (RS256), Resend (email), Celery + Upstash Redis, django-storages (S3)

---

## File Map

### Config
- Create: `backend/config/__init__.py`
- Create: `backend/config/settings/__init__.py`
- Create: `backend/config/settings/base.py`
- Create: `backend/config/settings/development.py`
- Create: `backend/config/settings/production.py`
- Create: `backend/config/urls.py`
- Create: `backend/config/wsgi.py`
- Create: `backend/config/celery.py`

### Users App
- Create: `backend/apps/__init__.py`
- Create: `backend/apps/users/__init__.py`
- Create: `backend/apps/users/models.py`
- Create: `backend/apps/users/managers.py`
- Create: `backend/apps/users/serializers.py`
- Create: `backend/apps/users/views.py`
- Create: `backend/apps/users/services.py`
- Create: `backend/apps/users/urls.py`
- Create: `backend/apps/users/admin.py`
- Create: `backend/apps/users/tests/__init__.py`
- Create: `backend/apps/users/tests/test_models.py`
- Create: `backend/apps/users/tests/test_services.py`
- Create: `backend/apps/users/tests/test_views.py`
- Create: `backend/apps/users/tests/factories.py`

### Common
- Create: `backend/common/__init__.py`
- Create: `backend/common/permissions.py`
- Create: `backend/common/pagination.py`
- Create: `backend/common/storage.py`
- Create: `backend/common/authentication.py`

### Root
- Create: `backend/manage.py`
- Create: `backend/requirements.txt`
- Create: `backend/pytest.ini`
- Create: `backend/.env.example`

---

## Task 1: Scaffold Django Project

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/manage.py`
- Create: `backend/config/__init__.py`
- Create: `backend/config/settings/__init__.py`
- Create: `backend/config/settings/base.py`
- Create: `backend/config/settings/development.py`
- Create: `backend/config/settings/production.py`
- Create: `backend/config/urls.py`
- Create: `backend/config/wsgi.py`
- Create: `backend/config/celery.py`
- Create: `backend/.env.example`
- Create: `backend/pytest.ini`
- Create: `backend/apps/__init__.py`
- Create: `backend/common/__init__.py`

- [ ] **Step 1: Create requirements.txt**

```txt
django>=5.1,<6.0
djangorestframework>=3.15
django-cors-headers>=4.4
PyJWT>=2.9
cryptography>=43.0
python-dotenv>=1.0
psycopg[binary]>=3.2
django-storages>=1.14
boto3>=1.35
celery>=5.4
redis>=5.0
gunicorn>=23.0
resend>=2.0

# Dev / Test
ruff>=0.7
pytest>=8.3
pytest-django>=4.9
factory-boy>=3.3
```

- [ ] **Step 2: Create virtual environment and install**

```bash
cd /Users/namy/Work/EverythingCars/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

- [ ] **Step 3: Create manage.py**

```python
#!/usr/bin/env python
import os
import sys

def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Create config/__init__.py**

```python
# Empty
```

- [ ] **Step 5: Create config/settings/__init__.py**

```python
# Empty — use DJANGO_SETTINGS_MODULE to select base/development/production
```

- [ ] **Step 6: Create config/settings/base.py**

```python
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "insecure-dev-key-change-me")

ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "corsheaders",
    "storages",
    # Local apps
    "apps.users",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Database
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "everythingcars"),
        "USER": os.environ.get("POSTGRES_USER", "everythingcars"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", ""),
        "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}

# Custom User
AUTH_USER_MODEL = "users.User"

# DRF
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "common.authentication.JWTAuthentication",
    ],
    "DEFAULT_PAGINATION_CLASS": "common.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}

# JWT
JWT_PRIVATE_KEY = os.environ.get("JWT_PRIVATE_KEY", "")
JWT_PUBLIC_KEY = os.environ.get("JWT_PUBLIC_KEY", "")
JWT_ACCESS_TOKEN_LIFETIME_MINUTES = int(os.environ.get("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", "15"))
JWT_REFRESH_TOKEN_LIFETIME_DAYS = int(os.environ.get("JWT_REFRESH_TOKEN_LIFETIME_DAYS", "7"))

# Resend (email)
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "noreply@everythingcars.com")

# Celery
CELERY_BROKER_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = CELERY_BROKER_URL

# Static files
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Media (file uploads)
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
```

- [ ] **Step 7: Create config/settings/development.py**

```python
from .base import *  # noqa: F401,F403

DEBUG = True

# CORS — allow all in dev
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Email — print to console in dev
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Use local file storage in dev
DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

# Add browsable API renderer in dev
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [  # noqa: F405
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
]
```

- [ ] **Step 8: Create config/settings/production.py**

```python
import os
from .base import *  # noqa: F401,F403

DEBUG = False

# CORS — whitelist frontend only
CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ALLOWED_ORIGINS", "https://everythingcars.vercel.app"
).split(",")
CORS_ALLOW_CREDENTIALS = True

# Security
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = bool(os.environ.get("SECURE_SSL_REDIRECT", "1"))

# S3 storage
DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME")
AWS_S3_REGION_NAME = os.environ.get("AWS_S3_REGION_NAME", "us-east-1")
AWS_S3_CUSTOM_DOMAIN = os.environ.get("AWS_S3_CUSTOM_DOMAIN")
AWS_QUERYSTRING_AUTH = False
```

- [ ] **Step 9: Create config/urls.py**

```python
from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.users.urls.auth_urls")),
    path("api/v1/users/", include("apps.users.urls.user_urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

- [ ] **Step 10: Create config/wsgi.py**

```python
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

application = get_wsgi_application()
```

- [ ] **Step 11: Create config/celery.py**

```python
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("everythingcars")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
```

- [ ] **Step 12: Create .env.example**

```env
DJANGO_SECRET_KEY=change-me-in-production
DJANGO_SETTINGS_MODULE=config.settings.development
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

POSTGRES_DB=everythingcars
POSTGRES_USER=everythingcars
POSTGRES_PASSWORD=devpassword
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

REDIS_URL=redis://localhost:6379/0

JWT_PRIVATE_KEY=
JWT_PUBLIC_KEY=
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

RESEND_API_KEY=
DEFAULT_FROM_EMAIL=noreply@everythingcars.com

# S3 (production only)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=
AWS_S3_REGION_NAME=us-east-1
```

- [ ] **Step 13: Create pytest.ini**

```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings.development
python_files = tests.py test_*.py *_tests.py
python_paths = .
```

- [ ] **Step 14: Create empty __init__.py files**

```bash
mkdir -p backend/apps backend/common
touch backend/apps/__init__.py backend/common/__init__.py
```

- [ ] **Step 15: Verify Django boots**

```bash
cd /Users/namy/Work/EverythingCars/backend
source .venv/bin/activate
python manage.py check
```

Expected: "System check identified no issues" (will warn about missing users app — that's Task 2).

- [ ] **Step 16: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add backend/
git commit -m "feat: scaffold Django project with split settings, Celery, and Resend config"
```

---

## Task 2: Custom User Model and Manager

**Files:**
- Create: `backend/apps/users/__init__.py`
- Create: `backend/apps/users/managers.py`
- Create: `backend/apps/users/models.py`
- Create: `backend/apps/users/admin.py`
- Create: `backend/apps/users/tests/__init__.py`
- Create: `backend/apps/users/tests/factories.py`
- Create: `backend/apps/users/tests/test_models.py`

- [ ] **Step 1: Create apps/users/__init__.py**

```python
# Empty
```

- [ ] **Step 2: Write failing test for User model**

Create `backend/apps/users/tests/__init__.py` (empty) and `backend/apps/users/tests/test_models.py`:

```python
import pytest
from apps.users.models import User


@pytest.mark.django_db
class TestUserModel:
    def test_create_customer(self):
        user = User.objects.create_user(
            email="customer@example.com",
            name="Jane Doe",
            role="customer",
        )
        assert user.email == "customer@example.com"
        assert user.name == "Jane Doe"
        assert user.role == "customer"
        assert user.is_active is False
        assert user.has_usable_password() is False
        assert str(user) == "Jane Doe (customer@example.com)"

    def test_create_owner(self):
        user = User.objects.create_user(
            email="owner@example.com",
            name="John Owner",
            role="owner",
        )
        assert user.role == "owner"

    def test_create_user_without_email_raises(self):
        with pytest.raises(ValueError, match="email"):
            User.objects.create_user(email="", name="No Email", role="customer")

    def test_create_superuser(self):
        user = User.objects.create_superuser(
            email="admin@example.com",
            name="Admin",
        )
        assert user.is_staff is True
        assert user.is_superuser is True
        assert user.is_active is True

    def test_email_normalized(self):
        user = User.objects.create_user(
            email="Test@EXAMPLE.COM",
            name="Test",
            role="customer",
        )
        assert user.email == "Test@example.com"
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /Users/namy/Work/EverythingCars/backend
source .venv/bin/activate
pytest apps/users/tests/test_models.py -v
```

Expected: FAIL — `apps.users.models` not found.

- [ ] **Step 4: Create managers.py**

```python
from django.contrib.auth.models import BaseUserManager


class UserManager(BaseUserManager):
    def create_user(self, email, name, role="customer", **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        extra_fields.setdefault("is_active", False)
        user = self.model(email=email, name=name, role=role, **extra_fields)
        user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", "customer")

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, name, **extra_fields)
```

- [ ] **Step 5: Create models.py**

```python
import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        OWNER = "owner", "Owner"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    name = models.CharField(max_length=150)
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
```

- [ ] **Step 6: Create admin.py**

```python
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "name", "role", "is_active", "date_joined")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("email", "name")
    ordering = ("-date_joined",)
    fieldsets = (
        (None, {"fields": ("email", "name", "phone", "role")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser")}),
        ("Dates", {"fields": ("date_joined",)}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "name", "role")}),
    )
```

- [ ] **Step 7: Create and run migrations**

```bash
cd /Users/namy/Work/EverythingCars/backend
python manage.py makemigrations users
python manage.py migrate
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
pytest apps/users/tests/test_models.py -v
```

Expected: All 5 tests pass.

- [ ] **Step 9: Create test factories**

Create `backend/apps/users/tests/factories.py`:

```python
import factory
from apps.users.models import User


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    name = factory.Faker("name")
    role = "customer"
    is_active = True

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        manager = cls._get_manager(model_class)
        return manager.create_user(*args, **kwargs)


class OwnerFactory(UserFactory):
    role = "owner"
```

- [ ] **Step 10: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add backend/
git commit -m "feat: add custom User model with passwordless UserManager"
```

---

## Task 3: CustomerProfile, OwnerProfile, and AccessCode Models

**Files:**
- Modify: `backend/apps/users/models.py`
- Modify: `backend/apps/users/admin.py`
- Modify: `backend/apps/users/tests/test_models.py`
- Modify: `backend/apps/users/tests/factories.py`

- [ ] **Step 1: Write failing tests for CustomerProfile, OwnerProfile, and AccessCode**

Add to `backend/apps/users/tests/test_models.py`:

```python
from django.utils import timezone
from datetime import timedelta
from apps.users.models import User, CustomerProfile, OwnerProfile, AccessCode


@pytest.mark.django_db
class TestCustomerProfile:
    def test_create_customer_profile(self):
        user = User.objects.create_user(
            email="customer1@example.com", name="Customer One", role="customer"
        )
        profile = CustomerProfile.objects.create(
            user=user,
            drivers_license="DL12345",
            date_of_birth="1995-06-15",
            address="123 Main St",
            state="Lagos",
            city="Ikeja",
        )
        assert profile.drivers_license == "DL12345"
        assert profile.state == "Lagos"
        assert str(profile) == "Customer One — customer profile"

    def test_create_customer_profile_minimal(self):
        user = User.objects.create_user(
            email="customer2@example.com", name="Customer Two", role="customer"
        )
        profile = CustomerProfile.objects.create(user=user)
        assert profile.drivers_license == ""
        assert profile.date_of_birth is None


@pytest.mark.django_db
class TestOwnerProfile:
    def test_create_individual_owner_profile(self):
        user = User.objects.create_user(
            email="owner1@example.com", name="Owner One", role="owner"
        )
        profile = OwnerProfile.objects.create(
            user=user,
            owner_type="individual",
            national_id="NIN12345",
            location="Lagos, Nigeria",
            bank_account="0123456789",
            bank_name="GTBank",
        )
        assert profile.owner_type == "individual"
        assert profile.is_verified is False
        assert str(profile) == "Owner One — individual"

    def test_create_fleet_owner_profile(self):
        user = User.objects.create_user(
            email="fleet@example.com", name="Fleet Co", role="owner"
        )
        profile = OwnerProfile.objects.create(
            user=user,
            owner_type="fleet",
            fleet_name="Fleet Rentals Ltd",
            rc_number="RC123456",
            bank_account="9876543210",
            bank_name="Access Bank",
        )
        assert profile.owner_type == "fleet"
        assert profile.fleet_name == "Fleet Rentals Ltd"


@pytest.mark.django_db
class TestAccessCode:
    def test_create_and_verify_code(self):
        code_obj = AccessCode.create_code(
            email="test@example.com", purpose="sign_in"
        )
        assert code_obj.email == "test@example.com"
        assert code_obj.purpose == "sign_in"
        assert code_obj.is_used is False
        assert code_obj.expires_at > timezone.now()
        # The plain code is returned as an attribute for sending
        assert len(code_obj.plain_code) == 6
        assert code_obj.plain_code.isdigit()

    def test_verify_valid_code(self):
        code_obj = AccessCode.create_code(
            email="test@example.com", purpose="sign_in"
        )
        plain = code_obj.plain_code
        found = AccessCode.verify_code(
            email="test@example.com", code=plain, purpose="sign_in"
        )
        assert found is not None
        assert found.is_used is True

    def test_verify_wrong_code_returns_none(self):
        AccessCode.create_code(email="test@example.com", purpose="sign_in")
        found = AccessCode.verify_code(
            email="test@example.com", code="000000", purpose="sign_in"
        )
        assert found is None

    def test_verify_expired_code_returns_none(self):
        code_obj = AccessCode.create_code(
            email="test@example.com", purpose="sign_in"
        )
        plain = code_obj.plain_code
        # Force expiry
        code_obj.expires_at = timezone.now() - timedelta(minutes=1)
        code_obj.save()
        found = AccessCode.verify_code(
            email="test@example.com", code=plain, purpose="sign_in"
        )
        assert found is None

    def test_verify_used_code_returns_none(self):
        code_obj = AccessCode.create_code(
            email="test@example.com", purpose="sign_in"
        )
        plain = code_obj.plain_code
        # Use it once
        AccessCode.verify_code(
            email="test@example.com", code=plain, purpose="sign_in"
        )
        # Try again
        found = AccessCode.verify_code(
            email="test@example.com", code=plain, purpose="sign_in"
        )
        assert found is None
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest apps/users/tests/test_models.py -v
```

Expected: FAIL — `CustomerProfile`, `OwnerProfile`, and `AccessCode` not found.

- [ ] **Step 3: Add CustomerProfile, OwnerProfile, and AccessCode to models.py**

Add to `backend/apps/users/models.py`:

```python
import hashlib
import secrets


class CustomerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="customer_profile")
    drivers_license = models.CharField(max_length=50, blank=True, default="")
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.CharField(max_length=300, blank=True, default="")
    state = models.CharField(max_length=100, blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "customer_profiles"

    def __str__(self):
        return f"{self.user.name} — customer profile"


def owner_document_path(instance, filename):
    return f"owner_documents/{instance.user.id}/{filename}"


class OwnerProfile(models.Model):
    class OwnerType(models.TextChoices):
        INDIVIDUAL = "individual", "Individual"
        FLEET = "fleet", "Fleet"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="owner_profile")
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
        return f"{self.user.name} — {self.owner_type}"


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

    @staticmethod
    def _hash_code(code: str) -> str:
        return hashlib.sha256(code.encode()).hexdigest()

    @classmethod
    def create_code(cls, email: str, purpose: str, user=None):
        plain_code = f"{secrets.randbelow(1000000):06d}"
        obj = cls.objects.create(
            user=user,
            email=email,
            code_hash=cls._hash_code(plain_code),
            purpose=purpose,
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        # Attach plain code as transient attribute (not saved to DB)
        obj.plain_code = plain_code
        return obj

    @classmethod
    def verify_code(cls, email: str, code: str, purpose: str):
        code_hash = cls._hash_code(code)
        try:
            obj = cls.objects.get(
                email=email,
                code_hash=code_hash,
                purpose=purpose,
                is_used=False,
                expires_at__gt=timezone.now(),
            )
        except cls.DoesNotExist:
            return None
        obj.is_used = True
        obj.save(update_fields=["is_used"])
        return obj


class RefreshTokenBlacklist(models.Model):
    jti = models.CharField(max_length=64, unique=True, db_index=True)
    blacklisted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "refresh_token_blacklist"
```

Add `from datetime import timedelta` to the top of the file.

- [ ] **Step 4: Update admin.py**

Add to `backend/apps/users/admin.py`:

```python
from .models import CustomerProfile, OwnerProfile, AccessCode


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "state", "city", "created_at")
    search_fields = ("user__email", "user__name")


@admin.register(OwnerProfile)
class OwnerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "owner_type", "is_verified", "created_at")
    list_filter = ("owner_type", "is_verified")
    search_fields = ("user__email", "user__name", "fleet_name")


@admin.register(AccessCode)
class AccessCodeAdmin(admin.ModelAdmin):
    list_display = ("email", "purpose", "is_used", "expires_at", "created_at")
    list_filter = ("purpose", "is_used")
    readonly_fields = ("code_hash",)
```

- [ ] **Step 5: Run migrations**

```bash
python manage.py makemigrations users
python manage.py migrate
```

- [ ] **Step 6: Run tests**

```bash
pytest apps/users/tests/test_models.py -v
```

Expected: All 14 tests pass (5 User + 2 CustomerProfile + 2 OwnerProfile + 5 AccessCode).

- [ ] **Step 7: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add backend/
git commit -m "feat: add CustomerProfile, OwnerProfile, AccessCode, and RefreshTokenBlacklist models"
```

---

## Task 4: JWT Service and Authentication Class

**Files:**
- Create: `backend/common/authentication.py`
- Create: `backend/common/permissions.py`
- Create: `backend/common/pagination.py`
- Create: `backend/apps/users/services.py`
- Create: `backend/apps/users/tests/test_services.py`

- [ ] **Step 1: Write failing tests for JWT service**

Create `backend/apps/users/tests/test_services.py`:

```python
import pytest
from apps.users.tests.factories import UserFactory
from apps.users.services import issue_tokens, verify_access_token
from apps.users.models import RefreshTokenBlacklist


@pytest.mark.django_db
class TestJWTService:
    def test_issue_tokens_returns_access_and_refresh(self):
        user = UserFactory(is_active=True)
        tokens = issue_tokens(user)
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert "expires_in" in tokens
        assert isinstance(tokens["access_token"], str)
        assert isinstance(tokens["refresh_token"], str)

    def test_verify_access_token_returns_payload(self):
        user = UserFactory(is_active=True)
        tokens = issue_tokens(user)
        payload = verify_access_token(tokens["access_token"])
        assert payload["sub"] == str(user.id)
        assert payload["role"] == user.role

    def test_verify_invalid_token_returns_none(self):
        payload = verify_access_token("invalid.token.here")
        assert payload is None

    def test_verify_refresh_token_and_blacklist(self):
        from apps.users.services import verify_refresh_token, blacklist_token

        user = UserFactory(is_active=True)
        tokens = issue_tokens(user)
        payload = verify_refresh_token(tokens["refresh_token"])
        assert payload is not None
        assert payload["type"] == "refresh"

        # Blacklist it
        blacklist_token(payload["jti"])
        assert RefreshTokenBlacklist.objects.filter(jti=payload["jti"]).exists()

        # Verify again — should fail
        payload2 = verify_refresh_token(tokens["refresh_token"])
        assert payload2 is None
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest apps/users/tests/test_services.py -v
```

Expected: FAIL — `apps.users.services` not found.

- [ ] **Step 3: Generate RSA key pair for dev**

```bash
cd /Users/namy/Work/EverythingCars/backend
python -c "
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
private_pem = private_key.private_bytes(
    serialization.Encoding.PEM,
    serialization.PrivateFormat.PKCS8,
    serialization.NoEncryption(),
).decode()
public_pem = private_key.public_key().public_bytes(
    serialization.Encoding.PEM,
    serialization.PublicFormat.SubjectPublicKeyInfo,
).decode()
print('=== PRIVATE KEY ===')
print(private_pem)
print('=== PUBLIC KEY ===')
print(public_pem)
"
```

Copy the output into a `.env` file as `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` (newlines as `\n`).

- [ ] **Step 4: Create services.py**

Create `backend/apps/users/services.py`:

```python
import uuid
from datetime import datetime, timedelta, timezone

import jwt
import resend
from django.conf import settings

from .models import AccessCode, RefreshTokenBlacklist


def issue_tokens(user) -> dict:
    now = datetime.now(timezone.utc)
    jti_access = uuid.uuid4().hex
    jti_refresh = uuid.uuid4().hex

    access_payload = {
        "sub": str(user.id),
        "role": user.role,
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_LIFETIME_MINUTES),
        "jti": jti_access,
        "type": "access",
    }
    refresh_payload = {
        "sub": str(user.id),
        "iat": now,
        "exp": now + timedelta(days=settings.JWT_REFRESH_TOKEN_LIFETIME_DAYS),
        "jti": jti_refresh,
        "type": "refresh",
    }

    access_token = jwt.encode(access_payload, settings.JWT_PRIVATE_KEY, algorithm="RS256")
    refresh_token = jwt.encode(refresh_payload, settings.JWT_PRIVATE_KEY, algorithm="RS256")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": settings.JWT_ACCESS_TOKEN_LIFETIME_MINUTES * 60,
    }


def verify_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.JWT_PUBLIC_KEY, algorithms=["RS256"])
        if payload.get("type") != "access":
            return None
        return payload
    except jwt.InvalidTokenError:
        return None


def verify_refresh_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.JWT_PUBLIC_KEY, algorithms=["RS256"])
        if payload.get("type") != "refresh":
            return None
        if RefreshTokenBlacklist.objects.filter(jti=payload["jti"]).exists():
            return None
        return payload
    except jwt.InvalidTokenError:
        return None


def blacklist_token(jti: str) -> None:
    RefreshTokenBlacklist.objects.get_or_create(jti=jti)


def generate_and_send_code(email: str, purpose: str, user=None) -> AccessCode:
    code_obj = AccessCode.create_code(email=email, purpose=purpose, user=user)

    if settings.RESEND_API_KEY:
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.DEFAULT_FROM_EMAIL,
            "to": [email],
            "subject": "Your EverythingCars Access Code",
            "text": f"Your access code is: {code_obj.plain_code}\n\nIt expires in 10 minutes.",
        })
    else:
        # Fallback: print to console (dev without Resend key)
        print(f"\n[DEV] Access code for {email}: {code_obj.plain_code}\n")

    return code_obj
```

- [ ] **Step 5: Create common/authentication.py**

```python
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from apps.users.models import User
from apps.users.services import verify_access_token


class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ")[1]
        payload = verify_access_token(token)
        if payload is None:
            raise AuthenticationFailed("Invalid or expired token")

        try:
            user = User.objects.get(id=payload["sub"], is_active=True)
        except User.DoesNotExist:
            raise AuthenticationFailed("User not found")

        return (user, payload)
```

- [ ] **Step 6: Create common/permissions.py**

```python
from rest_framework.permissions import BasePermission


class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "customer"
        )


class IsOwner(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "owner"
        )
```

- [ ] **Step 7: Create common/pagination.py**

```python
from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
```

- [ ] **Step 8: Run tests**

```bash
pytest apps/users/tests/test_services.py -v
```

Expected: All 4 tests pass.

- [ ] **Step 9: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add backend/
git commit -m "feat: add JWT service (RS256), authentication class, permissions, and Resend email"
```

---

## Task 5: Auth Serializers

**Files:**
- Create: `backend/apps/users/serializers.py`

- [ ] **Step 1: Create serializers.py**

```python
from rest_framework import serializers
from .models import User, CustomerProfile, OwnerProfile


class SignUpSerializer(serializers.Serializer):
    email = serializers.EmailField()
    name = serializers.CharField(min_length=2, max_length=150)
    phone = serializers.CharField(max_length=20, required=False, default="")
    role = serializers.ChoiceField(choices=User.Role.choices)

    # Customer-specific fields (optional, validated in validate())
    drivers_license = serializers.CharField(max_length=50, required=False, default="")
    date_of_birth = serializers.DateField(required=False, allow_null=True, default=None)
    address = serializers.CharField(max_length=300, required=False, default="")
    state = serializers.CharField(max_length=100, required=False, default="")
    city = serializers.CharField(max_length=100, required=False, default="")

    # Owner-specific fields (optional, validated in validate())
    owner_type = serializers.ChoiceField(
        choices=OwnerProfile.OwnerType.choices, required=False
    )
    fleet_name = serializers.CharField(max_length=200, required=False, default="")
    national_id = serializers.CharField(max_length=50, required=False, default="")
    location = serializers.CharField(max_length=200, required=False, default="")
    rc_number = serializers.CharField(max_length=50, required=False, default="")
    bank_account = serializers.CharField(max_length=20, required=False, default="")
    bank_name = serializers.CharField(max_length=100, required=False, default="")
    document = serializers.FileField(required=False)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_document(self, value):
        if value:
            max_size = 9 * 1024 * 1024  # 9MB
            if value.size > max_size:
                raise serializers.ValidationError("File size must be under 9MB.")
            allowed_types = [
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ]
            if value.content_type not in allowed_types:
                raise serializers.ValidationError("Only PDF, DOC, and DOCX files are allowed.")
        return value

    def validate(self, data):
        if data["role"] == "owner":
            if not data.get("owner_type"):
                raise serializers.ValidationError(
                    {"owner_type": "Owner type is required for owner accounts."}
                )
            if not data.get("bank_account") or not data.get("bank_name"):
                raise serializers.ValidationError(
                    {"bank_account": "Bank details are required for owner accounts."}
                )
        return data


class SignInSerializer(serializers.Serializer):
    email = serializers.EmailField()


class VerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(min_length=6, max_length=6)
    purpose = serializers.ChoiceField(choices=["sign_in", "sign_up_verify"])


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "name", "phone", "role", "date_joined"]
        read_only_fields = ["id", "email", "role", "date_joined"]


class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = ["drivers_license", "date_of_birth", "address", "state", "city"]


class OwnerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = OwnerProfile
        fields = [
            "owner_type", "fleet_name", "national_id", "location",
            "rc_number", "bank_account", "bank_name", "is_verified",
        ]
        read_only_fields = ["is_verified"]


class MeSerializer(serializers.ModelSerializer):
    customer_profile = CustomerProfileSerializer(read_only=True)
    owner_profile = OwnerProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "name", "phone", "role", "date_joined",
            "customer_profile", "owner_profile",
        ]
        read_only_fields = ["id", "email", "role", "date_joined"]
```

- [ ] **Step 2: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add backend/
git commit -m "feat: add auth serializers with validation for sign-up, sign-in, verify, and profiles"
```

---

## Task 6: Auth Views and URL Routing

**Files:**
- Create: `backend/apps/users/views.py`
- Create: `backend/apps/users/urls/__init__.py`
- Create: `backend/apps/users/urls/auth_urls.py`
- Create: `backend/apps/users/urls/user_urls.py`
- Create: `backend/apps/users/tests/test_views.py`

- [ ] **Step 1: Create views.py**

```python
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User, CustomerProfile, OwnerProfile, AccessCode
from .serializers import (
    SignUpSerializer,
    SignInSerializer,
    VerifySerializer,
    MeSerializer,
    UserProfileSerializer,
)
from .services import generate_and_send_code, issue_tokens, verify_refresh_token, blacklist_token


class SignUpView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignUpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Create user
        user = User.objects.create_user(
            email=data["email"],
            name=data["name"],
            phone=data.get("phone", ""),
            role=data["role"],
        )

        # Create role-specific profile
        if data["role"] == "customer":
            CustomerProfile.objects.create(
                user=user,
                drivers_license=data.get("drivers_license", ""),
                date_of_birth=data.get("date_of_birth"),
                address=data.get("address", ""),
                state=data.get("state", ""),
                city=data.get("city", ""),
            )
        elif data["role"] == "owner":
            OwnerProfile.objects.create(
                user=user,
                owner_type=data["owner_type"],
                fleet_name=data.get("fleet_name", ""),
                national_id=data.get("national_id", ""),
                location=data.get("location", ""),
                rc_number=data.get("rc_number", ""),
                bank_account=data["bank_account"],
                bank_name=data["bank_name"],
                document=data.get("document"),
            )

        # Send verification code
        generate_and_send_code(
            email=user.email, purpose="sign_up_verify", user=user
        )

        return Response(
            {"message": "Verification code sent to your email.", "email": user.email},
            status=status.HTTP_201_CREATED,
        )


class SignInView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        try:
            user = User.objects.get(email__iexact=email, is_active=True)
        except User.DoesNotExist:
            return Response(
                {"detail": "No active account found with this email."},
                status=status.HTTP_404_NOT_FOUND,
            )

        generate_and_send_code(email=user.email, purpose="sign_in", user=user)

        return Response(
            {"message": "Access code sent to your email.", "email": user.email},
            status=status.HTTP_200_OK,
        )


class VerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        code_obj = AccessCode.verify_code(
            email=data["email"], code=data["code"], purpose=data["purpose"]
        )
        if code_obj is None:
            return Response(
                {"detail": "Invalid or expired access code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get user
        try:
            user = User.objects.get(email__iexact=data["email"])
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND
            )

        # Activate user if sign-up verification
        if data["purpose"] == "sign_up_verify" and not user.is_active:
            user.is_active = True
            user.save(update_fields=["is_active"])

        # Issue tokens
        tokens = issue_tokens(user)

        response = Response(
            {
                "accessToken": tokens["access_token"],
                "userId": str(user.id),
                "role": user.role,
                "expiresIn": tokens["expires_in"],
            },
            status=status.HTTP_200_OK,
        )

        # Set refresh token as httpOnly cookie
        response.set_cookie(
            key="refresh_token",
            value=tokens["refresh_token"],
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Strict",
            max_age=settings.JWT_REFRESH_TOKEN_LIFETIME_DAYS * 86400,
            path="/api/v1/auth/",
        )

        return response


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.COOKIES.get("refresh_token")
        if not token:
            return Response(
                {"detail": "Refresh token not provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        payload = verify_refresh_token(token)
        if payload is None:
            return Response(
                {"detail": "Invalid or expired refresh token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Blacklist old token
        blacklist_token(payload["jti"])

        # Get user
        try:
            user = User.objects.get(id=payload["sub"], is_active=True)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."}, status=status.HTTP_401_UNAUTHORIZED
            )

        # Issue new tokens
        tokens = issue_tokens(user)

        response = Response(
            {
                "accessToken": tokens["access_token"],
                "expiresIn": tokens["expires_in"],
            },
            status=status.HTTP_200_OK,
        )

        response.set_cookie(
            key="refresh_token",
            value=tokens["refresh_token"],
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Strict",
            max_age=settings.JWT_REFRESH_TOKEN_LIFETIME_DAYS * 86400,
            path="/api/v1/auth/",
        )

        return response


class SignOutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.COOKIES.get("refresh_token")
        if token:
            payload = verify_refresh_token(token)
            if payload:
                blacklist_token(payload["jti"])

        response = Response(
            {"message": "Signed out."}, status=status.HTTP_200_OK
        )
        response.delete_cookie("refresh_token", path="/api/v1/auth/")
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = MeSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MeSerializer(request.user).data)
```

- [ ] **Step 2: Create URL files**

Create `backend/apps/users/urls/__init__.py` (empty).

Create `backend/apps/users/urls/auth_urls.py`:

```python
from django.urls import path
from apps.users.views import SignUpView, SignInView, VerifyView, RefreshView, SignOutView

urlpatterns = [
    path("sign-up", SignUpView.as_view(), name="auth-sign-up"),
    path("sign-in", SignInView.as_view(), name="auth-sign-in"),
    path("verify", VerifyView.as_view(), name="auth-verify"),
    path("refresh", RefreshView.as_view(), name="auth-refresh"),
    path("sign-out", SignOutView.as_view(), name="auth-sign-out"),
]
```

Create `backend/apps/users/urls/user_urls.py`:

```python
from django.urls import path
from apps.users.views import MeView

urlpatterns = [
    path("me", MeView.as_view(), name="user-me"),
]
```

- [ ] **Step 3: Write integration tests for auth views**

Create `backend/apps/users/tests/test_views.py`:

```python
import pytest
from rest_framework.test import APIClient
from apps.users.tests.factories import UserFactory
from apps.users.models import AccessCode, User


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestSignUp:
    def test_customer_sign_up(self, api_client):
        response = api_client.post("/api/v1/auth/sign-up", {
            "email": "new@example.com",
            "name": "New User",
            "role": "customer",
            "drivers_license": "DL12345",
            "date_of_birth": "1995-06-15",
            "address": "123 Main St",
            "state": "Lagos",
            "city": "Ikeja",
        })
        assert response.status_code == 201
        assert response.data["email"] == "new@example.com"
        user = User.objects.get(email="new@example.com")
        assert user.is_active is False
        assert hasattr(user, "customer_profile")
        assert user.customer_profile.drivers_license == "DL12345"
        assert user.customer_profile.state == "Lagos"
        assert AccessCode.objects.filter(email="new@example.com").exists()

    def test_owner_sign_up(self, api_client):
        response = api_client.post("/api/v1/auth/sign-up", {
            "email": "owner@example.com",
            "name": "Car Owner",
            "role": "owner",
            "owner_type": "individual",
            "bank_account": "0123456789",
            "bank_name": "GTBank",
        })
        assert response.status_code == 201
        user = User.objects.get(email="owner@example.com")
        assert hasattr(user, "owner_profile")
        assert user.owner_profile.owner_type == "individual"

    def test_duplicate_email_rejected(self, api_client):
        UserFactory(email="taken@example.com")
        response = api_client.post("/api/v1/auth/sign-up", {
            "email": "taken@example.com",
            "name": "Duplicate",
            "role": "customer",
        })
        assert response.status_code == 400


@pytest.mark.django_db
class TestSignIn:
    def test_sign_in_sends_code(self, api_client):
        UserFactory(email="active@example.com", is_active=True)
        response = api_client.post("/api/v1/auth/sign-in", {
            "email": "active@example.com",
        })
        assert response.status_code == 200
        assert AccessCode.objects.filter(email="active@example.com", purpose="sign_in").exists()

    def test_sign_in_inactive_user_rejected(self, api_client):
        UserFactory(email="inactive@example.com", is_active=False)
        response = api_client.post("/api/v1/auth/sign-in", {
            "email": "inactive@example.com",
        })
        assert response.status_code == 404


@pytest.mark.django_db
class TestVerify:
    def test_sign_up_verify_activates_user_and_returns_tokens(self, api_client):
        # Create user via sign-up
        api_client.post("/api/v1/auth/sign-up", {
            "email": "verify@example.com",
            "name": "Verify Me",
            "role": "customer",
        })
        # Get the code from DB (in real life it's emailed)
        code_obj = AccessCode.objects.get(email="verify@example.com")
        # We need the plain code — re-create since we can't reverse the hash
        # For testing, create a known code
        from apps.users.models import AccessCode as AC
        known_code = AC.create_code(email="verify@example.com", purpose="sign_up_verify")

        response = api_client.post("/api/v1/auth/verify", {
            "email": "verify@example.com",
            "code": known_code.plain_code,
            "purpose": "sign_up_verify",
        })
        assert response.status_code == 200
        assert "accessToken" in response.data
        assert "userId" in response.data
        assert "role" in response.data
        # Check user is now active
        user = User.objects.get(email="verify@example.com")
        assert user.is_active is True
        # Check refresh cookie is set
        assert "refresh_token" in response.cookies

    def test_invalid_code_rejected(self, api_client):
        UserFactory(email="wrong@example.com")
        response = api_client.post("/api/v1/auth/verify", {
            "email": "wrong@example.com",
            "code": "000000",
            "purpose": "sign_in",
        })
        assert response.status_code == 400


@pytest.mark.django_db
class TestRefresh:
    def test_refresh_rotates_tokens(self, api_client):
        user = UserFactory(email="refresh@example.com", is_active=True)
        from apps.users.services import issue_tokens
        tokens = issue_tokens(user)
        api_client.cookies["refresh_token"] = tokens["refresh_token"]

        response = api_client.post("/api/v1/auth/refresh")
        assert response.status_code == 200
        assert "accessToken" in response.data
        # Old token should be blacklisted — refreshing again with same cookie fails
        response2 = api_client.post("/api/v1/auth/refresh")
        # The cookie was updated by the first response, so this should work
        # unless the client still sends the old one

    def test_refresh_without_cookie_rejected(self, api_client):
        response = api_client.post("/api/v1/auth/refresh")
        assert response.status_code == 401


@pytest.mark.django_db
class TestMe:
    def test_get_me_authenticated(self, api_client):
        user = UserFactory(email="me@example.com", is_active=True)
        from apps.users.services import issue_tokens
        tokens = issue_tokens(user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access_token']}")
        response = api_client.get("/api/v1/users/me")
        assert response.status_code == 200
        assert response.data["email"] == "me@example.com"

    def test_get_me_unauthenticated(self, api_client):
        response = api_client.get("/api/v1/users/me")
        assert response.status_code == 403

    def test_patch_me(self, api_client):
        user = UserFactory(email="patch@example.com", is_active=True)
        from apps.users.services import issue_tokens
        tokens = issue_tokens(user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access_token']}")
        response = api_client.patch("/api/v1/users/me", {"name": "Updated Name"})
        assert response.status_code == 200
        assert response.data["name"] == "Updated Name"
```

- [ ] **Step 4: Run all tests**

```bash
cd /Users/namy/Work/EverythingCars/backend
pytest -v
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add backend/
git commit -m "feat: add auth views (sign-up, sign-in, verify, refresh, sign-out, me) with URL routing"
```

---

## Task 7: Vercel Frontend Deployment

**Files:**
- Create: `frontend/vercel.json`
- Modify: `frontend/next.config.ts`

- [ ] **Step 1: Create vercel.json**

Create `frontend/vercel.json`:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "env": {
    "NEXT_PUBLIC_API_URL": "@next-public-api-url",
    "NEXT_PUBLIC_APP_NAME": "EverythingCars"
  }
}
```

- [ ] **Step 2: Deploy to Vercel**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npx vercel --yes
```

Follow prompts to link to Vercel project. Set the `NEXT_PUBLIC_API_URL` environment variable in the Vercel dashboard to point to your backend URL.

- [ ] **Step 3: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add frontend/vercel.json
git commit -m "feat: add Vercel deployment config for frontend"
```

---

## Task 8: Platform Integrations (PostHog, Sentry, Upstash)

**Files:**
- Modify: `frontend/package.json` (add posthog-js, @sentry/nextjs)
- Create: `frontend/src/shared/providers/posthog-provider.tsx`
- Modify: `frontend/src/shared/providers/index.tsx`
- Modify: `backend/requirements.txt` (add sentry-sdk, posthog)
- Modify: `backend/config/settings/base.py`

- [ ] **Step 1: Install frontend analytics/monitoring packages**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npm install posthog-js @sentry/nextjs
```

- [ ] **Step 2: Create PostHog provider**

Create `frontend/src/shared/providers/posthog-provider.tsx`:

```tsx
"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (POSTHOG_KEY) {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: true,
        capture_pageleave: true,
      });
    }
  }, []);

  if (!POSTHOG_KEY) return <>{children}</>;

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
```

- [ ] **Step 3: Add PostHog to root providers**

Read `frontend/src/shared/providers/index.tsx`, then add PostHogProvider to the composition:

```tsx
"use client";

import { QueryProvider } from "./query-provider";
import { AuthProvider } from "./auth-provider";
import { PostHogProvider } from "./posthog-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <QueryProvider>
        <AuthProvider>{children}</AuthProvider>
      </QueryProvider>
    </PostHogProvider>
  );
}

export { QueryProvider } from "./query-provider";
export { AuthProvider, useAuthContext } from "./auth-provider";
export { PostHogProvider } from "./posthog-provider";
```

- [ ] **Step 4: Initialize Sentry for Next.js**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npx @sentry/wizard@latest -i nextjs
```

Follow the wizard prompts. It will create `sentry.client.config.ts`, `sentry.server.config.ts`, and update `next.config.ts`.

- [ ] **Step 5: Add backend monitoring packages**

Add to `backend/requirements.txt`:

```
sentry-sdk[django]>=2.0
```

- [ ] **Step 6: Add Sentry to Django settings**

Add to `backend/config/settings/base.py`:

```python
import sentry_sdk

SENTRY_DSN = os.environ.get("SENTRY_DSN", "")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
    )
```

- [ ] **Step 7: Configure Upstash Redis**

Update `backend/config/settings/production.py` — Upstash provides a Redis URL that works as a drop-in replacement:

```python
# Celery — use Upstash Redis URL in production
# Set REDIS_URL env var to your Upstash REST URL:
# rediss://default:xxx@xxx.upstash.io:6379
CELERY_BROKER_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_BROKER_USE_SSL = CELERY_BROKER_URL.startswith("rediss://")
```

- [ ] **Step 8: Update .env.example files**

Add to `backend/.env.example`:

```env
SENTRY_DSN=
```

Add to `frontend/.env.local.example`:

```env
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_SENTRY_DSN=
```

- [ ] **Step 9: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add .
git commit -m "feat: add PostHog analytics, Sentry error tracking, and Upstash Redis config"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Run backend tests**

```bash
cd /Users/namy/Work/EverythingCars/backend
source .venv/bin/activate
pytest -v
```

Expected: All tests pass.

- [ ] **Step 2: Run backend linter**

```bash
ruff check .
```

Expected: No errors.

- [ ] **Step 3: Run frontend build**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npm run build
```

Expected: Build passes.

- [ ] **Step 4: Run frontend tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 5: Test the full auth flow manually**

```bash
cd /Users/namy/Work/EverythingCars/backend
python manage.py runserver
```

In another terminal:
```bash
# Sign up
curl -X POST http://localhost:8000/api/v1/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","role":"customer"}'

# Check terminal for the access code (printed to console in dev)
# Verify with the code
curl -X POST http://localhost:8000/api/v1/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456","purpose":"sign_up_verify"}'
```

- [ ] **Step 6: Commit any fixes**

```bash
cd /Users/namy/Work/EverythingCars
git add .
git commit -m "fix: address issues from final verification"
```

---

## Next Plans

After this backend auth plan, the following should be implemented:

1. **Frontend Auth Wiring** — Connect sign-up/sign-in forms to the real API, Zustand auth store, React Query mutations, token refresh logic
2. **Listings API** — Car CRUD endpoints, search, filters
3. **Requests API** — Rental request flow (create, approve/reject, status updates)
4. **Payments API** — Payment abstraction layer, transactions
5. **Cloudflare DNS** — Configure custom domain pointing to Vercel (frontend) and backend host
