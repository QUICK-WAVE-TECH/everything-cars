# EverythingCars — Design Specification

## Overview

EverythingCars is a hybrid peer-to-peer and fleet car rental marketplace. Individual car owners and fleet operators list vehicles on a unified platform. Customers browse, request rentals, and pay through a structured approval flow. Both sides earn loyalty points.

## Tech Stack

### Frontend
- **Next.js 16.2** (TypeScript, App Router, React 19)
- **shadcn/ui** — component library (built on Radix UI + Tailwind)
- **React Query (TanStack Query)** — server state management
- **Zustand** — client UI state management
- **Zod** — schema validation (forms, API responses)
- **Tailwind CSS** — utility-first styling

### Backend
- **Django REST Framework** — REST API
- **PostgreSQL 16** — primary database
- **Celery + Redis** — async task queue (push notifications, email, point calculations)
- **JWT (RS256)** — authentication tokens

### Infrastructure
- **Docker** — containerized deployment (platform-agnostic)
- **GitHub Actions** — CI/CD pipeline
- **S3-compatible storage** — file/image uploads
- **FCM / APNs** — push notification delivery

## User Roles

### Customer
- Browse car listings with search and filters
- Submit rental requests for specific dates
- Make payments upon owner approval
- Earn loyalty points per rental (Phase 2)
- View transaction history, manage profile (Phase 2)

### Owner (Individual or Fleet)
- List cars with photos, pricing, availability
- Review and approve/reject incoming rental requests
- Receive payments after rental completion
- Earn loyalty points for completed rentals (Phase 2)
- Manage fleet listings, view analytics (Phase 2)

## Authentication Flow

Passwordless push-to-authenticate with access code fallback:

1. **User enters email or phone** on sign-in page
2. **Push notification sent** to registered device (via FCM/APNs)
3. **User approves on device** — or enters a 6-digit access code as fallback
4. **JWT issued** — access token (15min, stored in memory) + refresh token (7 days, httpOnly secure cookie)

### Registration
- New users enter email/phone, name, and select role (customer or owner)
- Device registered for push notifications during sign-up
- Owners provide additional fleet/individual designation

### Token Strategy
- **Access token**: Short-lived (15 minutes), stored in JavaScript memory (not localStorage), sent via Authorization header
- **Refresh token**: Long-lived (7 days), stored in httpOnly secure cookie with SameSite=Strict, auto-refreshed via silent rotation
- **Token signing**: RS256 (asymmetric) — backend holds private key, frontend/services verify with public key

## Core Business Flow

**Request → Approve → Pay → Pickup**

1. Customer browses listings, selects a car, chooses dates
2. Customer submits a rental request (pending status)
3. Owner receives notification, reviews request
4. Owner approves or rejects the request
5. On approval, customer is prompted to pay
6. Payment processed through abstraction layer
7. Both parties receive confirmation with pickup details
8. After rental completion, loyalty points awarded to both sides (Phase 2)

### Request Statuses
- `pending` — submitted by customer, awaiting owner action
- `approved` — owner approved, awaiting payment
- `rejected` — owner declined
- `paid` — payment completed, awaiting pickup
- `active` — rental in progress
- `completed` — rental finished
- `cancelled` — cancelled by either party before payment

## MVP Phases

### Phase 1 — Core (Initial Build)
- Authentication (push-to-authenticate + access code fallback)
- Landing pages (customer + owner variants)
- About Us, Contact, Services (static/marketing pages)
- Car listings: browse, search, filter, detail view
- Owner car management: add, edit, remove listings
- Rental request flow: create, approve/reject, pay
- Payment abstraction layer (provider-agnostic interface)
- Basic transaction records

### Phase 2 — Enhance
- Loyalty program (points-based, both roles)
- Push notification center (in-app)
- Customer dashboard (booking overview, stats)
- Owner dashboard (listing performance, earnings)
- Profile management (both roles)
- Full transaction history with filtering
- Notification preferences and history

## Architecture

### Monorepo Structure

```
EverythingCars/
├── frontend/          ← Next.js 16.2 application
├── backend/           ← Django REST Framework API
├── contracts/         ← Shared API schemas (Zod + TypeScript)
├── docker/            ← Dockerfiles and nginx config
├── .github/           ← CI/CD workflows
├── docker-compose.yml ← Local development orchestration
└── .env.example
```

### Development Strategy: Parallel with API Contracts

Frontend and backend develop in parallel against a shared contract layer:
- **contracts/** contains Zod schemas defining every API request/response shape
- Frontend builds against these schemas using mock data initially
- Backend implements Django serializers that match the contract shapes
- React Query hooks work against mocks, then flip to real endpoints with zero code changes
- Zod schemas serve as both frontend validation AND backend documentation

### Frontend Folder Structure (Feature-Based)

```
frontend/src/
├── app/                          ← App Router (thin page wrappers)
│   ├── (public)/                 ← Route group: public pages
│   │   ├── page.tsx              ← Landing page
│   │   ├── about/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── services/page.tsx
│   │   └── layout.tsx
│   ├── (auth)/                   ← Route group: auth pages
│   │   ├── get-started/page.tsx
│   │   ├── sign-up/page.tsx
│   │   ├── sign-in/page.tsx
│   │   ├── verify/page.tsx       ← Push auth + access code
│   │   └── layout.tsx
│   ├── (customer)/               ← Route group: customer area
│   │   ├── dashboard/page.tsx
│   │   ├── listings/page.tsx     ← Browse cars
│   │   ├── listings/[id]/page.tsx
│   │   ├── requests/page.tsx     ← My rental requests
│   │   ├── requests/[id]/page.tsx
│   │   ├── payments/page.tsx
│   │   ├── transactions/page.tsx
│   │   ├── loyalty/page.tsx      ← Phase 2
│   │   ├── notifications/page.tsx ← Phase 2
│   │   ├── profile/page.tsx      ← Phase 2
│   │   └── layout.tsx            ← Auth guard + customer nav
│   ├── (owner)/                  ← Route group: owner area
│   │   ├── dashboard/page.tsx
│   │   ├── my-cars/page.tsx      ← Listed cars
│   │   ├── my-cars/new/page.tsx  ← Add new listing
│   │   ├── my-cars/[id]/page.tsx
│   │   ├── requests/page.tsx     ← Incoming rental requests
│   │   ├── requests/[id]/page.tsx
│   │   ├── payments/page.tsx
│   │   ├── transactions/page.tsx
│   │   ├── loyalty/page.tsx      ← Phase 2
│   │   ├── notifications/page.tsx ← Phase 2
│   │   ├── profile/page.tsx      ← Phase 2
│   │   └── layout.tsx            ← Auth guard + owner nav
│   ├── layout.tsx                ← Root layout (providers)
│   └── not-found.tsx
│
├── features/                     ← Feature modules (domain logic)
│   ├── auth/
│   │   ├── components/           ← SignUpForm, PushAuthPrompt, AccessCodeInput
│   │   ├── hooks/                ← useAuth, usePushAuth, useSignUp
│   │   ├── api/                  ← React Query mutations & queries
│   │   ├── store.ts              ← Zustand auth store
│   │   ├── schemas.ts            ← Zod validation schemas
│   │   └── index.ts              ← Public API barrel export
│   ├── listings/
│   │   ├── components/           ← CarCard, CarGrid, SearchFilters, CarDetail
│   │   ├── hooks/
│   │   ├── api/
│   │   ├── schemas.ts
│   │   └── index.ts
│   ├── requests/
│   │   ├── components/           ← RequestForm, RequestCard, RequestStatus
│   │   ├── hooks/
│   │   ├── api/
│   │   ├── schemas.ts
│   │   └── index.ts
│   ├── payments/
│   │   ├── components/           ← PaymentForm, TransactionList
│   │   ├── hooks/
│   │   ├── api/
│   │   ├── services/             ← Payment provider abstraction
│   │   ├── schemas.ts
│   │   └── index.ts
│   ├── loyalty/                  ← Phase 2
│   ├── notifications/            ← Phase 2
│   └── profile/                  ← Phase 2
│
├── shared/                       ← Reusable across features
│   ├── components/               ← Header, Footer, Sidebar, DataTable
│   ├── hooks/                    ← useDebounce, useMediaQuery
│   ├── providers/                ← QueryProvider, AuthProvider, ThemeProvider
│   ├── types/                    ← Global TypeScript types
│   └── utils/                    ← cn(), formatCurrency, dateUtils
│
├── lib/                          ← Infrastructure
│   ├── api-client.ts             ← Fetch wrapper with auth headers + refresh
│   ├── query-client.ts           ← React Query configuration
│   └── config.ts                 ← Environment config
│
└── middleware.ts                  ← Auth middleware (route protection)
```

### Contracts Folder

```
contracts/
├── auth.ts           ← SignUpRequest, SignInRequest, TokenResponse, PushAuthChallenge
├── listings.ts       ← Car, CarListResponse, CreateCarRequest, SearchFilters
├── requests.ts       ← RentalRequest, CreateRentalRequest, RequestStatusUpdate
├── payments.ts       ← PaymentIntent, PaymentResult, Transaction
├── users.ts          ← UserProfile, OwnerProfile, UpdateProfileRequest
├── endpoints.ts      ← API endpoint path definitions and HTTP methods
└── index.ts          ← Re-exports
```

### Key Design Decisions

1. **Route Groups** — `(public)`, `(auth)`, `(customer)`, `(owner)` provide separate layouts without affecting URL paths. Customer pages live at `/dashboard`, `/listings`, etc. Owner pages at `/dashboard`, `/my-cars`, etc. — differentiated by auth context and layout.

2. **Feature Isolation** — Each feature module owns its components, hooks, API calls, Zustand store, and Zod schemas. No cross-feature imports except through barrel exports.

3. **Thin Pages** — App Router pages are thin wrappers that compose feature components. Business logic lives in features, not in pages.

4. **Auth Middleware** — Next.js middleware.ts protects `(customer)` and `(owner)` route groups, redirecting unauthenticated users to sign-in. Role-based access ensures customers can't access owner routes and vice versa.

5. **Server State vs Client State** — React Query handles all server-derived state (listings, requests, user data). Zustand handles only client UI state (sidebar open, selected filters, modal state). No overlap.

## Security Requirements

### Frontend
- Zod validation on all form inputs before submission
- CSRF protection via Next.js middleware
- Content Security Policy (CSP) headers in next.config.ts
- XSS prevention: React's default escaping + DOMPurify for any user-generated rich content
- Strict TypeScript: no `any` types, strict null checks
- Environment variables: only `NEXT_PUBLIC_` prefix for client-safe values
- Rate limiting on auth-related pages (client-side throttling)

### Backend
- JWT with RS256 signing (asymmetric keys)
- Django CORS whitelist: only the frontend origin allowed
- Rate limiting via django-ratelimit on all endpoints
- SQL injection prevention: Django ORM exclusively, no raw SQL
- Input validation on all serializers
- File upload validation: type checking, size limits, virus scanning
- Secrets stored in environment variables, never in code or version control

### Infrastructure
- HTTPS everywhere with TLS 1.3 minimum
- Docker containers run as non-root users
- Dependency scanning via Dependabot and/or Snyk
- No .env files committed to git (.gitignore enforced)
- Database connections over SSL
- Container image scanning in CI pipeline

### Data Protection
- Passwordless authentication: no passwords stored
- PII encrypted at rest in the database
- Payment card data never touches our servers (handled by payment provider)
- Audit logging on sensitive operations (auth events, payment events, data exports)
- GDPR-ready: data export and deletion API endpoints

## CI/CD Pipeline (GitHub Actions)

### On Pull Request
- **Lint**: ESLint (frontend) + Ruff (backend)
- **Type check**: `tsc --noEmit`
- **Unit tests**: Vitest + React Testing Library (frontend), pytest (backend)
- **Build check**: `next build` (catches build errors)
- **Security audit**: `npm audit` + `pip-audit`
- **Dependency scan**: automated vulnerability detection

### On Merge to Main
- All PR checks run again
- Integration tests (API + database)
- Build Docker images (multi-stage)
- Push images to container registry
- Database migration validation (`python manage.py migrate --check`)

### Deploy to Staging (Automatic)
- Auto-deploy on successful main build
- E2E tests via Playwright against staging
- Smoke tests on critical paths (auth, listing, request, payment)
- Performance baseline check

### Deploy to Production (Manual Gate)
- Manual approval required
- Blue-green deployment strategy
- Health check verification post-deploy
- Automatic rollback on health check failure

## Docker Setup

### Local Development (docker-compose.yml)
- **frontend**: Next.js dev server on port 3000 with hot reload
- **backend**: Django dev server on port 8000 with auto-reload
- **db**: PostgreSQL 16 on port 5432
- **redis**: Redis 7 on port 6379
- **celery**: Celery worker connected to Redis

### Production Dockerfiles
- **frontend.Dockerfile**: Multi-stage (deps → build → runtime), standalone Next.js output
- **backend.Dockerfile**: Multi-stage (deps → runtime), non-root user, gunicorn
- **nginx.conf**: Reverse proxy for production, handles SSL termination

## Testing Strategy

### Frontend
- **Unit tests**: Vitest + React Testing Library for components and hooks
- **Integration tests**: Testing feature flows with mocked API (MSW)
- **E2E tests**: Playwright for critical user journeys
- **Coverage target**: 80% for feature modules

### Backend
- **Unit tests**: pytest for serializers, models, and utility functions
- **Integration tests**: pytest + factory_boy for API endpoint testing
- **Coverage target**: 85% for views and serializers

## Page Inventory (from Design Screens)

### Shared Pages
| Page | Route | Phase |
|------|-------|-------|
| Get Started | `/get-started` | 1 |
| Sign Up | `/sign-up` | 1 |
| Sign In | `/sign-in` | 1 |
| Verify (Push Auth) | `/verify` | 1 |
| Landing Page | `/` | 1 |
| About Us | `/about` | 1 |
| Contact | `/contact` | 1 |
| Services | `/services` | 1 |

### Customer Pages
| Page | Route | Phase |
|------|-------|-------|
| Customer Dashboard | `/dashboard` | 1 |
| Browse Listings | `/listings` | 1 |
| Listing Detail | `/listings/[id]` | 1 |
| My Requests | `/requests` | 1 |
| Request Detail | `/requests/[id]` | 1 |
| Payments | `/payments` | 1 |
| Transactions | `/transactions` | 1 |
| Loyalty Program | `/loyalty` | 2 |
| Notifications | `/notifications` | 2 |
| Profile | `/profile` | 2 |

### Owner Pages
| Page | Route | Phase |
|------|-------|-------|
| Owner Dashboard | `/dashboard` | 1 |
| My Cars (Listed) | `/my-cars` | 1 |
| Add New Car | `/my-cars/new` | 1 |
| Car Detail/Edit | `/my-cars/[id]` | 1 |
| Incoming Requests | `/requests` | 1 |
| Request Detail | `/requests/[id]` | 1 |
| Payments | `/payments` | 1 |
| Transactions | `/transactions` | 1 |
| Loyalty Program | `/loyalty` | 2 |
| Notifications | `/notifications` | 2 |
| Profile | `/profile` | 2 |
