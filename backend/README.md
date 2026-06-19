# EverythingCars Backend

Django 5.2 REST API for the EverythingCars car rental/purchase marketplace.

## Prerequisites

- **Python 3.13+**
- **uv** (Python package manager) - [install guide](https://docs.astral.sh/uv/getting-started/installation/)
- **PostgreSQL 15+**
- **Redis 7+** (for WebSocket channel layer and Celery)

### Install uv

```bash
# macOS
brew install uv

# Linux/WSL
curl -LsSf https://astral.sh/uv/install.sh | sh

# Verify
uv --version
```

## Quick Start

### 1. Clone and navigate

```bash
git clone https://github.com/QUICK-WAVE-TECH/everything-cars.git
cd everything-cars/backend
```

### 2. Install dependencies

```bash
uv sync
```

This creates a `.venv` directory and installs all dependencies from `pyproject.toml` + `uv.lock`. No need to manually create a virtual environment.

For dev dependencies (pytest, ruff, factory-boy):

```bash
uv sync --group dev
```

### 3. Set up PostgreSQL

Create the database:

```bash
# macOS (via Homebrew)
brew services start postgresql@15
createdb everythingcars
createuser everythingcars

# Or via psql
psql -U postgres
CREATE DATABASE everythingcars;
CREATE USER everythingcars WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE everythingcars TO everythingcars;
\q
```

### 4. Set up Redis

```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt install redis-server
sudo systemctl start redis

# Verify
redis-cli ping
# Should return: PONG
```

### 5. Generate JWT keys

The auth system uses RS256 (RSA) JWT tokens. Generate a key pair:

```bash
# Generate private key
openssl genrsa -out jwt_private.pem 2048

# Extract public key
openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem
```

### 6. Create `.env` file

Create `backend/.env` with the following:

```env
# Django
DJANGO_SECRET_KEY=your-secret-key-change-in-production
DJANGO_SETTINGS_MODULE=config.settings.development
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# Database
POSTGRES_DB=everythingcars
POSTGRES_USER=everythingcars
POSTGRES_PASSWORD=your_db_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# JWT (paste the full PEM content, replacing newlines with \n)
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIB...\n-----END PUBLIC KEY-----"

# Token lifetimes (optional, defaults shown)
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

# Redis
REDIS_URL=redis://localhost:6379/0

# Email (optional - defaults to console in dev)
RESEND_API_KEY=
DEFAULT_FROM_EMAIL=noreply@everythingcars.com
```

**Tip for JWT keys:** To convert PEM files to single-line env vars:

```bash
# Private key
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' jwt_private.pem

# Public key
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' jwt_public.pem
```

Paste the output into your `.env` file.

### 7. Run migrations

```bash
uv run python manage.py migrate
```

### 8. Create a superuser (optional)

```bash
uv run python manage.py createsuperuser
```

### 9. Start the development server

```bash
uv run python manage.py runserver
```

The server starts at `http://localhost:8000` using Daphne (ASGI), which handles both HTTP and WebSocket connections.

**Note:** With `daphne` in `INSTALLED_APPS`, `runserver` automatically uses ASGI instead of WSGI. You don't need to run Daphne separately in development.

## Common Commands

### Run server

```bash
uv run python manage.py runserver
```

### Run migrations

```bash
# Create migration files after model changes
uv run python manage.py makemigrations

# Apply migrations
uv run python manage.py migrate

# Show migration status
uv run python manage.py showmigrations
```

### Django shell

```bash
uv run python manage.py shell
```

### Run tests

```bash
uv run pytest

# Specific test file
uv run pytest apps/listings/tests.py -v

# With coverage
uv run pytest --cov=apps
```

### Lint and format

```bash
# Check
uv run ruff check .

# Fix
uv run ruff check --fix .

# Format
uv run ruff format .
```

### Add a new dependency

```bash
# Production dependency
uv add package-name

# Dev dependency
uv add --group dev package-name

# Remove
uv remove package-name
```

### Create a new Django app

```bash
uv run python manage.py startapp app_name apps/app_name
```

Then update `apps/app_name/apps.py` to set `name = 'apps.app_name'` and add `'apps.app_name'` to `INSTALLED_APPS` in `config/settings/base.py`.

## Project Structure

```
backend/
├── config/                     # Project configuration
│   ├── settings/
│   │   ├── base.py             # Shared settings
│   │   ├── development.py      # Dev overrides (DEBUG=True, console email)
│   │   └── production.py       # Prod overrides (S3, SSL, CORS whitelist)
│   ├── asgi.py                 # ASGI config (Daphne + Channels)
│   ├── wsgi.py                 # WSGI config (gunicorn fallback)
│   └── urls.py                 # Root URL config
├── apps/
│   ├── users/                  # Auth, profiles, JWT tokens
│   ├── listings/               # Cars, requests, transactions
│   ├── notifications/          # Notification model, WebSocket consumer
│   └── reviews/                # Car reviews and ratings
├── common/                     # Shared utilities
│   ├── authentication.py       # JWT authentication class
│   ├── pagination.py           # Standard pagination
│   └── permissions.py          # IsCustomer, IsOwner, IsStaff
├── media/                      # Uploaded files (dev only)
├── manage.py
├── pyproject.toml              # Dependencies and config
└── uv.lock                     # Locked dependency versions
```

## API Endpoints

### Auth (`/api/v1/auth/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sign-up` | Register (customer or owner) |
| POST | `/sign-in` | Request OTP code |
| POST | `/verify` | Verify OTP, receive JWT tokens |
| POST | `/refresh` | Refresh access token |
| POST | `/sign-out` | Blacklist refresh token |
| POST | `/forgot-password` | Request password reset |
| POST | `/reset-password` | Reset password with token |

### Users (`/api/v1/users/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Current user profile |
| PATCH | `/me` | Update profile |
| POST | `/me/change-password` | Change password |

### Listings (`/api/v1/listings/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/cars` | Public | Browse published + sold cars |
| GET | `/cars/{id}` | Public | Car detail with availability |
| GET | `/cars/filter-options` | Public | Available states, cities, body types, brands |
| GET | `/cars/{id}/reviews` | Public | Car reviews |
| POST | `/cars/{id}/reviews` | Auth | Create review |
| GET/POST | `/my-cars` | Owner | List/create own cars |
| GET/PATCH/DELETE | `/my-cars/{id}` | Owner | Manage own car |
| POST | `/my-cars/{id}/images` | Owner | Upload car images |
| POST | `/my-cars/{id}/status` | Owner | Change car status |
| GET/POST | `/requests` | Customer | List/create requests |
| GET | `/requests/{id}` | Customer | Request detail |
| POST | `/requests/{id}/cancel` | Customer | Cancel request |
| POST | `/requests/{id}/submit-payment` | Customer | Submit payment with receipt |
| GET | `/owner-requests` | Owner | Incoming requests |
| GET | `/owner-requests/{id}` | Owner | Request detail |
| POST | `/owner-requests/{id}/action` | Owner | Approve/reject/mark active/complete |
| GET | `/transactions` | Auth | List transactions (role-aware) |
| GET | `/transactions/{id}` | Auth | Transaction detail |
| GET | `/admin/cars` | Staff | All cars (any status) |
| POST | `/admin/cars/{id}/status` | Staff | Approve/suspend/request changes |
| GET | `/admin/requests` | Staff | All requests |
| POST | `/admin/requests/{id}/confirm-payment` | Staff | Confirm customer payment |

### Notifications (`/api/v1/notifications/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List notifications |
| GET | `/unread-count` | Unread count |
| POST | `/{id}/read` | Mark as read |
| POST | `/mark-all-read` | Mark all as read |

### WebSocket

| Protocol | Endpoint | Description |
|----------|----------|-------------|
| WS | `/ws/notifications/?token=JWT` | Real-time notifications |

## Environment-Specific Settings

| Setting | Development | Production |
|---------|-------------|------------|
| DEBUG | True | False |
| CORS | Allow all origins | Whitelist only |
| Email | Console backend | Resend API |
| File storage | Local filesystem | AWS S3 |
| Database | Local PostgreSQL | Render PostgreSQL (SSL) |
| Server | Daphne (via runserver) | Daphne (direct) |
| SSL | Off | SECURE_SSL_REDIRECT + proxy header |

## Production Deployment (Render)

### Start command

```bash
uv run python -m daphne -b 0.0.0.0 -p $PORT config.asgi:application
```

### Required environment variables

```
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_SECRET_KEY=<generate-a-strong-key>
DJANGO_ALLOWED_HOSTS=everything-cars.onrender.com
DATABASE_URL=<render-postgres-url>
REDIS_URL=<redis-url>
JWT_PRIVATE_KEY=<rsa-private-key>
JWT_PUBLIC_KEY=<rsa-public-key>
RESEND_API_KEY=<resend-api-key>
CORS_ALLOWED_ORIGINS=https://everythingcars.vercel.app
AWS_ACCESS_KEY_ID=<s3-key>
AWS_SECRET_ACCESS_KEY=<s3-secret>
AWS_STORAGE_BUCKET_NAME=<bucket-name>
```

### Build command

```bash
uv sync && uv run python manage.py migrate
```
