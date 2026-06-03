# EverythingCars — Backend Auth & Project Setup Design

## Overview

Django REST Framework backend for EverythingCars. This spec covers project scaffolding, the custom User model, Owner profile, and the full passwordless authentication flow using email-based 6-digit access codes. Push-to-authenticate is deferred to Phase 2.

## Scope

- Django project structure with split settings (base/dev/prod)
- Custom User model (passwordless, UUID primary key)
- OwnerProfile model (individual + fleet, document upload)
- AccessCode model (hashed OTP with expiry)
- Sign-up flow (create user → email code → verify → JWT)
- Sign-in flow (email code → verify → JWT)
- JWT tokens (RS256, access in body, refresh in httpOnly cookie)
- Token refresh with rotation and blacklisting
- Sign-out (blacklist refresh token, clear cookie)
- Owner document upload (S3-compatible, PDF/DOC/DOCX, max 9MB)
- Email sending (console backend in dev, SMTP/SendGrid in prod)
- Shared permissions (IsCustomer, IsOwner)
- Standard pagination

## Not In Scope (Phase 2+)

- Push-to-authenticate (FCM/APNs)
- Listings, requests, payments APIs
- Loyalty program
- Admin panel customization

## Project Structure

```
backend/
├── config/
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py           # Shared: installed apps, middleware, DRF config, auth, etc.
│   │   ├── development.py    # DEBUG=True, console email, local DB, CORS allow all
│   │   └── production.py     # DEBUG=False, S3 storage, CORS whitelist, secure cookies
│   ├── urls.py               # Root: api/v1/ namespace
│   ├── wsgi.py
│   └── celery.py             # Celery app (Redis broker)
├── apps/
│   ├── __init__.py
│   └── users/
│       ├── __init__.py
│       ├── models.py          # User, OwnerProfile, AccessCode
│       ├── managers.py        # Custom UserManager (create_user without password)
│       ├── serializers.py     # SignUp, SignIn, Verify, TokenResponse, UserProfile
│       ├── views.py           # SignUpView, SignInView, VerifyView, RefreshView, SignOutView, MeView
│       ├── services.py        # generate_access_code, verify_access_code, issue_tokens, send_code_email
│       ├── urls.py            # /auth/* and /users/* routes
│       ├── admin.py
│       └── tests/
│           ├── __init__.py
│           ├── test_models.py
│           ├── test_services.py
│           └── test_views.py
├── common/
│   ├── __init__.py
│   ├── permissions.py         # IsCustomer, IsOwner
│   ├── pagination.py          # StandardPagination (page_size=20)
│   ├── storage.py             # S3 storage config
│   └── authentication.py      # JWTAuthentication class for DRF
├── manage.py
└── requirements.txt
```

## Data Models

### User

Custom user model extending `AbstractBaseUser` + `PermissionsMixin`.

| Field | Type | Notes |
|-------|------|-------|
| id | UUIDField | Primary key, auto-generated |
| email | EmailField | Unique, indexed, used as USERNAME_FIELD |
| name | CharField(150) | Full name |
| phone | CharField(20) | Optional |
| role | CharField choices: customer, owner | Set at registration, immutable |
| is_active | BooleanField | Default False (activated after OTP verify) |
| is_staff | BooleanField | Default False |
| date_joined | DateTimeField | Auto now add |

- `set_unusable_password()` called on creation — this is a passwordless system
- `USERNAME_FIELD = "email"`, `REQUIRED_FIELDS = ["name"]`
- Custom `UserManager` that creates users without requiring a password

### OwnerProfile

Created alongside User when `role="owner"`. OneToOne relationship.

| Field | Type | Notes |
|-------|------|-------|
| user | OneToOneField → User | on_delete=CASCADE |
| owner_type | CharField choices: individual, fleet | |
| fleet_name | CharField(200) | Required if owner_type=fleet |
| national_id | CharField(50) | Optional (individual owners) |
| location | CharField(200) | Optional (individual owners) |
| rc_number | CharField(50) | Optional (fleet/company owners) |
| bank_account | CharField(20) | Required |
| bank_name | CharField(100) | Required |
| document | FileField | Upload to `owner_documents/`, validated: PDF/DOC/DOCX, max 9MB |
| is_verified | BooleanField | Default False, set by admin |
| created_at | DateTimeField | Auto now add |

### AccessCode

Short-lived one-time code for passwordless auth.

| Field | Type | Notes |
|-------|------|-------|
| id | UUIDField | Primary key |
| user | ForeignKey → User | Nullable (for pre-registration) |
| email | EmailField | For lookup before user exists |
| code_hash | CharField(128) | SHA-256 hash of the 6-digit code |
| purpose | CharField choices: sign_in, sign_up_verify | |
| is_used | BooleanField | Default False |
| expires_at | DateTimeField | 10 minutes from creation |
| created_at | DateTimeField | Auto now add |

- Code is **never stored in plaintext** — hashed with SHA-256 on creation
- On verify: hash the submitted code, compare to stored hash
- Mark `is_used=True` after successful verification
- Expired/used codes rejected

### RefreshTokenBlacklist

Tracks revoked refresh tokens for sign-out and rotation.

| Field | Type | Notes |
|-------|------|-------|
| id | AutoField | Primary key |
| jti | CharField(64) | JWT ID from the refresh token, unique, indexed |
| blacklisted_at | DateTimeField | Auto now add |

## API Endpoints

All under `/api/v1/`.

### Auth Endpoints

**POST /api/v1/auth/sign-up**
- Content-Type: multipart/form-data (to support document upload)
- Body: email, name, phone, role, owner_type?, fleet_name?, national_id?, location?, rc_number?, bank_account?, bank_name?, document?
- Creates User (is_active=False) + OwnerProfile if role=owner
- Generates AccessCode, emails 6-digit code
- Returns: `{ message, email }` (201)
- Errors: 400 (validation), 409 (email already registered)

**POST /api/v1/auth/sign-in**
- Body: `{ email }`
- Finds active user, generates AccessCode, emails code
- Returns: `{ message, email }` (200)
- Errors: 404 (no active user with this email)

**POST /api/v1/auth/verify**
- Body: `{ email, code, purpose }`
- Validates code (hash match, not expired, not used)
- If purpose=sign_up_verify: activates user
- Issues JWT pair (access + refresh)
- Sets refresh token as httpOnly cookie
- Returns: `{ accessToken, userId, role, expiresIn }` (200)
- Errors: 400 (invalid/expired code)

**POST /api/v1/auth/refresh**
- Cookie: refresh_token
- Validates refresh token (not blacklisted, not expired)
- Blacklists old refresh token
- Issues new pair (rotation)
- Sets new refresh cookie
- Returns: `{ accessToken, expiresIn }` (200)
- Errors: 401 (invalid/blacklisted token)

**POST /api/v1/auth/sign-out**
- Cookie: refresh_token
- Blacklists refresh token
- Clears cookie
- Returns: `{ message }` (200)

### User Endpoints

**GET /api/v1/users/me**
- Auth required
- Returns user profile (+ owner profile if role=owner)

**PATCH /api/v1/users/me**
- Auth required
- Body: `{ name?, phone? }`
- Updates user fields
- Returns updated profile

## JWT Implementation

- **Library**: PyJWT
- **Algorithm**: RS256 (asymmetric)
- **Key pair**: Generated during setup, private key in `JWT_PRIVATE_KEY` env var, public key in `JWT_PUBLIC_KEY` env var
- **Access token claims**: `{ sub: userId, role, iat, exp (15min), jti }`
- **Refresh token claims**: `{ sub: userId, iat, exp (7 days), jti, type: "refresh" }`
- **DRF authentication class**: `common/authentication.py` — `JWTAuthentication` that reads `Authorization: Bearer <token>`, verifies with public key, attaches user to request

## Email

- **Dev**: `django.core.mail.backends.console.EmailBackend` (prints to terminal)
- **Prod**: SMTP backend configured via env vars (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`)
- **Template**: Simple text email: "Your EverythingCars access code is: {code}. It expires in 10 minutes."

## File Upload

- **Dev**: Local `MEDIA_ROOT` at `backend/media/`
- **Prod**: django-storages with S3-compatible backend
- **Validation**: File type (PDF, DOC, DOCX only), max size 9MB
- **Upload path**: `owner_documents/{user_id}/{filename}`

## Permissions

- `IsAuthenticated` — standard DRF, checks JWT
- `IsCustomer` — checks `request.user.role == "customer"`
- `IsOwner` — checks `request.user.role == "owner"`

## Dependencies (requirements.txt)

```
django>=5.1,<6.0
djangorestframework>=3.15
django-cors-headers>=4.4
PyJWT>=2.9
cryptography>=43.0    # For RS256 key generation
python-dotenv>=1.0
psycopg[binary]>=3.2  # PostgreSQL adapter
django-storages>=1.14 # S3-compatible storage
boto3>=1.35           # AWS SDK for S3
celery>=5.4
redis>=5.0
gunicorn>=23.0
ruff>=0.7             # Linter (dev)
pytest>=8.3           # Testing (dev)
pytest-django>=4.9    # Testing (dev)
factory-boy>=3.3      # Test fixtures (dev)
```
