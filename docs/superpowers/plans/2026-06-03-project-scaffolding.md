# EverythingCars — Project Scaffolding & Infrastructure Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the monorepo with Next.js 16.2 frontend, shared API contracts, Docker orchestration, CI/CD pipeline, and all shared infrastructure so feature development can begin immediately.

**Architecture:** Monorepo with `frontend/` (Next.js 16.2 + App Router), `contracts/` (Zod schemas), `backend/` (Django stub), and `docker/` directories. Frontend uses feature-based folder structure with route groups for public, auth, customer, and owner areas. Shared infrastructure includes API client, React Query config, Zustand providers, and auth middleware.

**Tech Stack:** Next.js 16.2, TypeScript, React 19, Tailwind CSS, shadcn/ui, React Query (TanStack Query v5), Zustand, Zod, Docker, GitHub Actions

---

## File Map

### Monorepo Root
- Create: `.gitignore`
- Create: `.env.example`
- Create: `docker-compose.yml`
- Create: `README.md`

### Docker
- Create: `docker/frontend.Dockerfile`
- Create: `docker/backend.Dockerfile`
- Create: `docker/nginx.conf`

### CI/CD
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy-staging.yml`
- Create: `.github/workflows/deploy-production.yml`

### Frontend — Config
- Create: `frontend/package.json` (via `create-next-app`)
- Create: `frontend/tsconfig.json` (via `create-next-app`, then modify)
- Create: `frontend/next.config.ts`
- Create: `frontend/tailwind.config.ts` (via init)
- Create: `frontend/components.json` (via `shadcn init`)
- Create: `frontend/.env.local.example`

### Frontend — Infrastructure (`frontend/src/lib/`)
- Create: `frontend/src/lib/config.ts`
- Create: `frontend/src/lib/api-client.ts`
- Create: `frontend/src/lib/query-client.ts`

### Frontend — Shared (`frontend/src/shared/`)
- Create: `frontend/src/shared/utils/cn.ts`
- Create: `frontend/src/shared/utils/format.ts`
- Create: `frontend/src/shared/utils/index.ts`
- Create: `frontend/src/shared/types/api.ts`
- Create: `frontend/src/shared/types/index.ts`
- Create: `frontend/src/shared/providers/query-provider.tsx`
- Create: `frontend/src/shared/providers/auth-provider.tsx`
- Create: `frontend/src/shared/providers/index.tsx`
- Create: `frontend/src/shared/hooks/use-debounce.ts`
- Create: `frontend/src/shared/hooks/use-media-query.ts`
- Create: `frontend/src/shared/hooks/index.ts`
- Create: `frontend/src/shared/components/header.tsx`
- Create: `frontend/src/shared/components/footer.tsx`
- Create: `frontend/src/shared/components/sidebar.tsx`
- Create: `frontend/src/shared/components/index.ts`

### Frontend — Middleware
- Create: `frontend/src/middleware.ts`

### Frontend — App Router Pages
- Create: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/not-found.tsx`
- Create: `frontend/src/app/(public)/layout.tsx`
- Create: `frontend/src/app/(public)/page.tsx`
- Create: `frontend/src/app/(public)/about/page.tsx`
- Create: `frontend/src/app/(public)/contact/page.tsx`
- Create: `frontend/src/app/(public)/services/page.tsx`
- Create: `frontend/src/app/(auth)/layout.tsx`
- Create: `frontend/src/app/(auth)/get-started/page.tsx`
- Create: `frontend/src/app/(auth)/sign-up/page.tsx`
- Create: `frontend/src/app/(auth)/sign-in/page.tsx`
- Create: `frontend/src/app/(auth)/verify/page.tsx`
- Create: `frontend/src/app/(customer)/layout.tsx`
- Create: `frontend/src/app/(customer)/dashboard/page.tsx`
- Create: `frontend/src/app/(customer)/listings/page.tsx`
- Create: `frontend/src/app/(customer)/listings/[id]/page.tsx`
- Create: `frontend/src/app/(customer)/requests/page.tsx`
- Create: `frontend/src/app/(customer)/requests/[id]/page.tsx`
- Create: `frontend/src/app/(customer)/payments/page.tsx`
- Create: `frontend/src/app/(customer)/transactions/page.tsx`
- Create: `frontend/src/app/(owner)/layout.tsx`
- Create: `frontend/src/app/(owner)/dashboard/page.tsx`
- Create: `frontend/src/app/(owner)/my-cars/page.tsx`
- Create: `frontend/src/app/(owner)/my-cars/new/page.tsx`
- Create: `frontend/src/app/(owner)/my-cars/[id]/page.tsx`
- Create: `frontend/src/app/(owner)/requests/page.tsx`
- Create: `frontend/src/app/(owner)/requests/[id]/page.tsx`
- Create: `frontend/src/app/(owner)/payments/page.tsx`
- Create: `frontend/src/app/(owner)/transactions/page.tsx`

### Frontend — Feature Stubs
- Create: `frontend/src/features/auth/components/.gitkeep`
- Create: `frontend/src/features/auth/hooks/.gitkeep`
- Create: `frontend/src/features/auth/api/.gitkeep`
- Create: `frontend/src/features/auth/store.ts`
- Create: `frontend/src/features/auth/schemas.ts`
- Create: `frontend/src/features/auth/index.ts`
- Create: `frontend/src/features/listings/components/.gitkeep`
- Create: `frontend/src/features/listings/hooks/.gitkeep`
- Create: `frontend/src/features/listings/api/.gitkeep`
- Create: `frontend/src/features/listings/schemas.ts`
- Create: `frontend/src/features/listings/index.ts`
- Create: `frontend/src/features/requests/components/.gitkeep`
- Create: `frontend/src/features/requests/hooks/.gitkeep`
- Create: `frontend/src/features/requests/api/.gitkeep`
- Create: `frontend/src/features/requests/schemas.ts`
- Create: `frontend/src/features/requests/index.ts`
- Create: `frontend/src/features/payments/components/.gitkeep`
- Create: `frontend/src/features/payments/hooks/.gitkeep`
- Create: `frontend/src/features/payments/api/.gitkeep`
- Create: `frontend/src/features/payments/services/.gitkeep`
- Create: `frontend/src/features/payments/schemas.ts`
- Create: `frontend/src/features/payments/index.ts`

### Contracts
- Create: `contracts/package.json`
- Create: `contracts/tsconfig.json`
- Create: `contracts/src/auth.ts`
- Create: `contracts/src/listings.ts`
- Create: `contracts/src/requests.ts`
- Create: `contracts/src/payments.ts`
- Create: `contracts/src/users.ts`
- Create: `contracts/src/endpoints.ts`
- Create: `contracts/src/index.ts`

### Tests
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/__tests__/lib/api-client.test.ts`
- Create: `frontend/src/__tests__/lib/config.test.ts`
- Create: `frontend/src/__tests__/shared/utils/format.test.ts`
- Create: `frontend/src/__tests__/shared/providers/query-provider.test.tsx`
- Create: `frontend/src/__tests__/middleware.test.ts`
- Create: `contracts/src/__tests__/auth.test.ts`
- Create: `contracts/src/__tests__/listings.test.ts`
- Create: `contracts/src/__tests__/requests.test.ts`
- Create: `contracts/src/__tests__/payments.test.ts`

---

## Task 1: Initialize Git Repository and Monorepo Root

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/namy/Work/EverythingCars
git init
```

- [ ] **Step 2: Create .gitignore**

```gitignore
# Dependencies
node_modules/
__pycache__/
*.pyc
.venv/
venv/

# Environment
.env
.env.local
.env.production.local

# Build
.next/
out/
dist/
build/
*.egg-info/
staticfiles/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Docker
docker-compose.override.yml

# Test
coverage/
.coverage
htmlcov/
.pytest_cache/

# Superpowers
.superpowers/
```

- [ ] **Step 3: Create .env.example**

```env
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_NAME=EverythingCars

# Backend
DJANGO_SECRET_KEY=change-me-in-production
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# Database
POSTGRES_DB=everythingcars
POSTGRES_USER=everythingcars
POSTGRES_PASSWORD=change-me-in-production
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# JWT
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
```

- [ ] **Step 4: Create README.md**

```markdown
# EverythingCars

Hybrid peer-to-peer and fleet car rental marketplace.

## Tech Stack

- **Frontend:** Next.js 16.2 (TypeScript, React 19, Tailwind, shadcn/ui)
- **Backend:** Django REST Framework, PostgreSQL 16, Celery + Redis
- **Infrastructure:** Docker, GitHub Actions CI/CD

## Getting Started

### Prerequisites

- Node.js 22+
- Python 3.12+
- Docker & Docker Compose

### Local Development

```bash
# Clone and setup
cp .env.example .env

# Start all services
docker compose up -d

# Frontend only (without Docker)
cd frontend && npm install && npm run dev

# Backend only (without Docker)
cd backend && pip install -r requirements.txt && python manage.py runserver
```

### Project Structure

```
EverythingCars/
├── frontend/      # Next.js 16.2 application
├── backend/       # Django REST API
├── contracts/     # Shared API schemas (Zod)
├── docker/        # Dockerfiles
└── .github/       # CI/CD workflows
```
```

- [ ] **Step 5: Commit**

```bash
git add .gitignore .env.example README.md
git commit -m "chore: initialize monorepo with gitignore and env template"
```

---

## Task 2: Scaffold Next.js 16.2 Application

**Files:**
- Create: `frontend/` (via create-next-app)
- Modify: `frontend/next.config.ts`
- Modify: `frontend/tsconfig.json`

- [ ] **Step 1: Create Next.js app**

```bash
cd /Users/namy/Work/EverythingCars
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-npm
```

Expected: Next.js project scaffolded in `frontend/` with App Router, TypeScript, Tailwind, ESLint.

- [ ] **Step 2: Verify it builds**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Update next.config.ts with security headers and API proxy**

Replace `frontend/next.config.ts` with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 4: Update tsconfig.json with strict settings and path aliases**

Ensure `frontend/tsconfig.json` has these compiler options (merge with what create-next-app generated):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": false,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"],
      "@contracts/*": ["../contracts/src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", "../contracts/src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Create frontend/.env.local.example**

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_NAME=EverythingCars
```

- [ ] **Step 6: Verify build still passes**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add frontend/ 
git commit -m "feat: scaffold Next.js 16.2 app with security headers and strict TypeScript"
```

---

## Task 3: Install Dependencies and Configure shadcn/ui

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/components.json`

- [ ] **Step 1: Install core dependencies**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npm install @tanstack/react-query@latest zustand zod axios
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom @testing-library/user-event
```

- [ ] **Step 2: Initialize shadcn/ui**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npx shadcn@latest init -d
```

When prompted, accept defaults (New York style, Zinc color, CSS variables: yes).

- [ ] **Step 3: Add commonly needed shadcn components**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npx shadcn@latest add button card input label separator sheet dialog dropdown-menu avatar badge table tabs toast
```

- [ ] **Step 4: Verify build**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add frontend/
git commit -m "feat: install React Query, Zustand, Zod, shadcn/ui with base components"
```

---

## Task 4: Set Up Vitest Testing Framework

**Files:**
- Create: `frontend/vitest.config.ts`
- Modify: `frontend/package.json` (add test script)

- [ ] **Step 1: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/app/**/page.tsx",
        "src/app/**/layout.tsx",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@contracts": path.resolve(__dirname, "../contracts/src"),
    },
  },
});
```

- [ ] **Step 2: Create test setup file**

Create `frontend/src/__tests__/setup.ts`:

```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Add test scripts to package.json**

Add to the `"scripts"` section of `frontend/package.json`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 4: Write a smoke test to verify the setup**

Create `frontend/src/__tests__/setup.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("test setup", () => {
  it("vitest is configured correctly", () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 5: Run the test**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npm test
```

Expected: 1 test passes.

- [ ] **Step 6: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add frontend/
git commit -m "feat: configure Vitest with React Testing Library and path aliases"
```

---

## Task 5: Create Shared Infrastructure — Config and API Client

**Files:**
- Create: `frontend/src/lib/config.ts`
- Create: `frontend/src/lib/api-client.ts`
- Create: `frontend/src/lib/query-client.ts`
- Create: `frontend/src/__tests__/lib/config.test.ts`
- Create: `frontend/src/__tests__/lib/api-client.test.ts`

- [ ] **Step 1: Write failing test for config**

Create `frontend/src/__tests__/lib/config.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { config } from "@/lib/config";

describe("config", () => {
  it("exposes apiUrl with a default value", () => {
    expect(config.apiUrl).toBeDefined();
    expect(typeof config.apiUrl).toBe("string");
  });

  it("exposes appName with a default value", () => {
    expect(config.appName).toBe("EverythingCars");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npx vitest run src/__tests__/lib/config.test.ts
```

Expected: FAIL — module `@/lib/config` not found.

- [ ] **Step 3: Implement config.ts**

Create `frontend/src/lib/config.ts`:

```typescript
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  appName: process.env.NEXT_PUBLIC_APP_NAME || "EverythingCars",
  isProd: process.env.NODE_ENV === "production",
  isDev: process.env.NODE_ENV === "development",
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npx vitest run src/__tests__/lib/config.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write failing test for api-client**

Create `frontend/src/__tests__/lib/api-client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/lib/api-client";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("apiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("makes GET requests with correct base URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: "test" }),
    });

    await apiClient.get("/listings");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/listings"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("makes POST requests with JSON body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1 }),
    });

    await apiClient.post("/auth/sign-in", { email: "test@example.com" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/sign-in"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      }),
    );
  });

  it("includes Content-Type header for JSON requests", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await apiClient.post("/test", { key: "value" });

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers).toEqual(
      expect.objectContaining({ "Content-Type": "application/json" }),
    );
  });

  it("throws ApiError on non-ok responses", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Unauthorized" }),
    });

    await expect(apiClient.get("/protected")).rejects.toThrow("Unauthorized");
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npx vitest run src/__tests__/lib/api-client.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 7: Implement api-client.ts**

Create `frontend/src/lib/api-client.ts`:

```typescript
import { config } from "./config";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  headers?: Record<string, string>;
};

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const url = `${config.apiUrl}${path}`;

  const headers: Record<string, string> = {
    ...options?.headers,
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  // Add access token if available (stored in memory by auth store)
  const token =
    typeof window !== "undefined"
      ? window.__everythingcars_token
      : undefined;

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include", // sends httpOnly refresh cookie
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      (errorData as { detail?: string }).detail ||
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, errorData);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, undefined, options),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, body, options),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, undefined, options),
};

// Type declaration for the in-memory token
declare global {
  interface Window {
    __everythingcars_token?: string;
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npx vitest run src/__tests__/lib/api-client.test.ts
```

Expected: All 4 tests pass.

- [ ] **Step 9: Create query-client.ts**

Create `frontend/src/lib/query-client.ts`:

```typescript
import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api-client";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: (failureCount, error) => {
          // Don't retry on auth errors
          if (error instanceof ApiError && error.status === 401) {
            return false;
          }
          return failureCount < 3;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
```

- [ ] **Step 10: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add frontend/
git commit -m "feat: add config, API client with auth headers, and React Query client"
```

---

## Task 6: Create Shared Utilities

**Files:**
- Create: `frontend/src/shared/utils/cn.ts`
- Create: `frontend/src/shared/utils/format.ts`
- Create: `frontend/src/shared/utils/index.ts`
- Create: `frontend/src/shared/types/api.ts`
- Create: `frontend/src/shared/types/index.ts`
- Create: `frontend/src/__tests__/shared/utils/format.test.ts`

- [ ] **Step 1: Write failing test for format utilities**

Create `frontend/src/__tests__/shared/utils/format.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, formatRelativeDate } from "@/shared/utils/format";

describe("formatCurrency", () => {
  it("formats a number as USD currency", () => {
    expect(formatCurrency(1500)).toBe("$1,500.00");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats decimal amounts", () => {
    expect(formatCurrency(99.9)).toBe("$99.90");
  });
});

describe("formatDate", () => {
  it("formats a date string as readable date", () => {
    const result = formatDate("2026-06-03T10:00:00Z");
    expect(result).toContain("Jun");
    expect(result).toContain("2026");
  });
});

describe("formatRelativeDate", () => {
  it("returns 'just now' for recent dates", () => {
    const now = new Date().toISOString();
    expect(formatRelativeDate(now)).toBe("just now");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npx vitest run src/__tests__/shared/utils/format.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement format.ts**

Create `frontend/src/shared/utils/format.ts`:

```typescript
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

export function formatRelativeDate(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);

  if (diffSeconds < 60) return "just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

  return formatDate(dateString);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npx vitest run src/__tests__/shared/utils/format.test.ts
```

Expected: All 5 tests pass.

- [ ] **Step 5: Create cn.ts (className merge utility)**

Create `frontend/src/shared/utils/cn.ts`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Note: shadcn/ui may have already created a `lib/utils.ts` with this. If so, move it here and update the import in shadcn components, or keep shadcn's version and re-export from here:

```typescript
export { cn } from "@/lib/utils";
```

- [ ] **Step 6: Create utils barrel export**

Create `frontend/src/shared/utils/index.ts`:

```typescript
export { cn } from "./cn";
export { formatCurrency, formatDate, formatRelativeDate } from "./format";
```

- [ ] **Step 7: Create shared types**

Create `frontend/src/shared/types/api.ts`:

```typescript
/** Standard paginated response from the API */
export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/** Standard API error response */
export type ApiErrorResponse = {
  detail: string;
  code?: string;
  errors?: Record<string, string[]>;
};

/** User roles in the system */
export type UserRole = "customer" | "owner";

/** Common request status across the rental flow */
export type RequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "paid"
  | "active"
  | "completed"
  | "cancelled";
```

Create `frontend/src/shared/types/index.ts`:

```typescript
export type {
  PaginatedResponse,
  ApiErrorResponse,
  UserRole,
  RequestStatus,
} from "./api";
```

- [ ] **Step 8: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add frontend/
git commit -m "feat: add shared utilities (cn, format, currency) and API types"
```

---

## Task 7: Create Providers (Query, Auth, Root)

**Files:**
- Create: `frontend/src/shared/providers/query-provider.tsx`
- Create: `frontend/src/shared/providers/auth-provider.tsx`
- Create: `frontend/src/shared/providers/index.tsx`
- Create: `frontend/src/__tests__/shared/providers/query-provider.test.tsx`

- [ ] **Step 1: Write failing test for QueryProvider**

Create `frontend/src/__tests__/shared/providers/query-provider.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { QueryProvider } from "@/shared/providers/query-provider";

function TestChild() {
  const queryClient = useQueryClient();
  return <div>has-client: {queryClient ? "yes" : "no"}</div>;
}

describe("QueryProvider", () => {
  it("provides a QueryClient to children", () => {
    render(
      <QueryProvider>
        <TestChild />
      </QueryProvider>,
    );

    expect(screen.getByText("has-client: yes")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npx vitest run src/__tests__/shared/providers/query-provider.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement QueryProvider**

Create `frontend/src/shared/providers/query-provider.tsx`:

```tsx
"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { makeQueryClient } from "@/lib/query-client";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 4: Install React Query devtools**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npm install @tanstack/react-query-devtools
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npx vitest run src/__tests__/shared/providers/query-provider.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Create AuthProvider (stub for now, full implementation in auth feature plan)**

Create `frontend/src/shared/providers/auth-provider.tsx`:

```tsx
"use client";

import { createContext, useContext } from "react";
import type { UserRole } from "@/shared/types";

type AuthState = {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  userId: string | null;
};

type AuthContextValue = AuthState & {
  setToken: (token: string) => void;
  clearAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}

/**
 * AuthProvider — wraps app with authentication context.
 * Token is stored in memory (window.__everythingcars_token) for security.
 * Full implementation comes with the auth feature plan.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Stub: always unauthenticated until auth feature is built
  const value: AuthContextValue = {
    isAuthenticated: false,
    userRole: null,
    userId: null,
    setToken: (token: string) => {
      if (typeof window !== "undefined") {
        window.__everythingcars_token = token;
      }
    },
    clearAuth: () => {
      if (typeof window !== "undefined") {
        delete window.__everythingcars_token;
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

- [ ] **Step 7: Create root providers barrel**

Create `frontend/src/shared/providers/index.tsx`:

```tsx
"use client";

import { QueryProvider } from "./query-provider";
import { AuthProvider } from "./auth-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );
}

export { QueryProvider } from "./query-provider";
export { AuthProvider, useAuthContext } from "./auth-provider";
```

- [ ] **Step 8: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add frontend/
git commit -m "feat: add QueryProvider, AuthProvider stub, and root Providers wrapper"
```

---

## Task 8: Create Shared Layout Components

**Files:**
- Create: `frontend/src/shared/components/header.tsx`
- Create: `frontend/src/shared/components/footer.tsx`
- Create: `frontend/src/shared/components/sidebar.tsx`
- Create: `frontend/src/shared/components/index.ts`
- Create: `frontend/src/shared/hooks/use-debounce.ts`
- Create: `frontend/src/shared/hooks/use-media-query.ts`
- Create: `frontend/src/shared/hooks/index.ts`

- [ ] **Step 1: Create Header component**

Create `frontend/src/shared/components/header.tsx`:

```tsx
import Link from "next/link";
import { config } from "@/lib/config";

type HeaderProps = {
  variant?: "public" | "customer" | "owner";
};

export function Header({ variant = "public" }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          {config.appName}
        </Link>

        <nav className="flex items-center gap-6">
          {variant === "public" && (
            <>
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                About Us
              </Link>
              <Link href="/services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Services
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </Link>
              <Link href="/sign-in" className="text-sm font-medium">
                Sign In
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create Footer component**

Create `frontend/src/shared/components/footer.tsx`:

```tsx
import Link from "next/link";
import { config } from "@/lib/config";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-lg font-semibold">{config.appName}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your trusted car rental marketplace.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Company</h4>
            <ul className="mt-2 space-y-2">
              <li><Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">About Us</Link></li>
              <li><Link href="/services" className="text-sm text-muted-foreground hover:text-foreground">Services</Link></li>
              <li><Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">For Customers</h4>
            <ul className="mt-2 space-y-2">
              <li><Link href="/listings" className="text-sm text-muted-foreground hover:text-foreground">Browse Cars</Link></li>
              <li><Link href="/sign-up" className="text-sm text-muted-foreground hover:text-foreground">Sign Up</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">For Owners</h4>
            <ul className="mt-2 space-y-2">
              <li><Link href="/sign-up" className="text-sm text-muted-foreground hover:text-foreground">List Your Car</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {config.appName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Create Sidebar component (for dashboard layouts)**

Create `frontend/src/shared/components/sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/shared/types";
import { cn } from "@/shared/utils";

type SidebarLink = {
  href: string;
  label: string;
  icon?: string;
};

const customerLinks: SidebarLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/listings", label: "Browse Cars" },
  { href: "/requests", label: "My Requests" },
  { href: "/payments", label: "Payments" },
  { href: "/transactions", label: "Transactions" },
];

const ownerLinks: SidebarLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/my-cars", label: "My Cars" },
  { href: "/requests", label: "Requests" },
  { href: "/payments", label: "Payments" },
  { href: "/transactions", label: "Transactions" },
];

type SidebarProps = {
  role: UserRole;
};

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const links = role === "customer" ? customerLinks : ownerLinks;

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-background md:block">
      <nav className="flex flex-col gap-1 p-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition-colors",
              pathname === link.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 4: Create component barrel export**

Create `frontend/src/shared/components/index.ts`:

```typescript
export { Header } from "./header";
export { Footer } from "./footer";
export { Sidebar } from "./sidebar";
```

- [ ] **Step 5: Create shared hooks**

Create `frontend/src/shared/hooks/use-debounce.ts`:

```typescript
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

Create `frontend/src/shared/hooks/use-media-query.ts`:

```typescript
import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
```

Create `frontend/src/shared/hooks/index.ts`:

```typescript
export { useDebounce } from "./use-debounce";
export { useMediaQuery } from "./use-media-query";
```

- [ ] **Step 6: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add frontend/
git commit -m "feat: add shared layout components (Header, Footer, Sidebar) and hooks"
```

---

## Task 9: Create App Router Layouts and Middleware

**Files:**
- Create: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/not-found.tsx`
- Create: `frontend/src/app/(public)/layout.tsx`
- Create: `frontend/src/app/(auth)/layout.tsx`
- Create: `frontend/src/app/(customer)/layout.tsx`
- Create: `frontend/src/app/(owner)/layout.tsx`
- Create: `frontend/src/middleware.ts`

- [ ] **Step 1: Create root layout**

Replace `frontend/src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/shared/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EverythingCars — Car Rental Marketplace",
  description: "Rent cars from individual owners and fleet operators. Browse, request, and book with ease.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create not-found page**

Replace `frontend/src/app/not-found.tsx` (or create if it doesn't exist):

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <Link
        href="/"
        className="text-sm font-medium text-primary hover:underline"
      >
        Go back home
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Create public layout**

Create `frontend/src/app/(public)/layout.tsx`:

```tsx
import { Header } from "@/shared/components";
import { Footer } from "@/shared/components";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header variant="public" />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 4: Create auth layout**

Create `frontend/src/app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <div className="w-full max-w-md px-4">{children}</div>
    </div>
  );
}
```

- [ ] **Step 5: Create customer layout**

Create `frontend/src/app/(customer)/layout.tsx`:

```tsx
import { Header } from "@/shared/components";
import { Sidebar } from "@/shared/components";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header variant="customer" />
      <div className="flex flex-1">
        <Sidebar role="customer" />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create owner layout**

Create `frontend/src/app/(owner)/layout.tsx`:

```tsx
import { Header } from "@/shared/components";
import { Sidebar } from "@/shared/components";

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header variant="owner" />
      <div className="flex flex-1">
        <Sidebar role="owner" />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create auth middleware**

Create `frontend/src/middleware.ts`:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedPaths = [
  "/dashboard",
  "/listings",
  "/requests",
  "/payments",
  "/transactions",
  "/my-cars",
  "/loyalty",
  "/notifications",
  "/profile",
];

// Routes only for unauthenticated users
const authPaths = ["/sign-in", "/sign-up", "/get-started", "/verify"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for refresh token cookie as auth indicator
  // (access token is in memory, can't check from middleware)
  const refreshToken = request.cookies.get("refresh_token")?.value;
  const isAuthenticated = !!refreshToken;

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && authPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users to sign-in
  if (!isAuthenticated && protectedPaths.some((p) => pathname.startsWith(p))) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, images
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
```

- [ ] **Step 8: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add frontend/
git commit -m "feat: add route group layouts, root providers, and auth middleware"
```

---

## Task 10: Create All Page Stubs

**Files:**
- Create all page.tsx files under `frontend/src/app/`

Each page is a thin stub that will be filled in by feature-specific implementation plans.

- [ ] **Step 1: Create public page stubs**

Create `frontend/src/app/(public)/page.tsx`:

```tsx
export default function LandingPage() {
  return (
    <div className="container py-16">
      <h1 className="text-4xl font-bold">Find Your Perfect Rental</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Browse cars from individual owners and fleet operators.
      </p>
    </div>
  );
}
```

Create `frontend/src/app/(public)/about/page.tsx`:

```tsx
export default function AboutPage() {
  return (
    <div className="container py-16">
      <h1 className="text-3xl font-bold">About Us</h1>
      <p className="mt-4 text-muted-foreground">
        EverythingCars connects car owners with people who need reliable rentals.
      </p>
    </div>
  );
}
```

Create `frontend/src/app/(public)/contact/page.tsx`:

```tsx
export default function ContactPage() {
  return (
    <div className="container py-16">
      <h1 className="text-3xl font-bold">Contact Us</h1>
      <p className="mt-4 text-muted-foreground">
        Get in touch with our team.
      </p>
    </div>
  );
}
```

Create `frontend/src/app/(public)/services/page.tsx`:

```tsx
export default function ServicesPage() {
  return (
    <div className="container py-16">
      <h1 className="text-3xl font-bold">Our Services</h1>
      <p className="mt-4 text-muted-foreground">
        Peer-to-peer rentals, fleet management, and more.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create auth page stubs**

Create `frontend/src/app/(auth)/get-started/page.tsx`:

```tsx
import Link from "next/link";

export default function GetStartedPage() {
  return (
    <div className="space-y-6 text-center">
      <h1 className="text-3xl font-bold">Get Started</h1>
      <p className="text-muted-foreground">Join EverythingCars today.</p>
      <div className="flex flex-col gap-3">
        <Link
          href="/sign-up"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          Create Account
        </Link>
        <Link
          href="/sign-in"
          className="rounded-md border px-4 py-2"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
```

Create `frontend/src/app/(auth)/sign-up/page.tsx`:

```tsx
export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-center">Create Account</h1>
      <p className="text-center text-muted-foreground">
        Sign up to rent or list cars.
      </p>
      {/* SignUpForm component will be added by auth feature plan */}
    </div>
  );
}
```

Create `frontend/src/app/(auth)/sign-in/page.tsx`:

```tsx
export default function SignInPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-center">Sign In</h1>
      <p className="text-center text-muted-foreground">
        Enter your email or phone to continue.
      </p>
      {/* SignInForm component will be added by auth feature plan */}
    </div>
  );
}
```

Create `frontend/src/app/(auth)/verify/page.tsx`:

```tsx
export default function VerifyPage() {
  return (
    <div className="space-y-6 text-center">
      <h1 className="text-2xl font-bold">Verify Your Identity</h1>
      <p className="text-muted-foreground">
        Check your device for a push notification, or enter your access code.
      </p>
      {/* PushAuthPrompt + AccessCodeInput will be added by auth feature plan */}
    </div>
  );
}
```

- [ ] **Step 3: Create customer page stubs**

Create `frontend/src/app/(customer)/dashboard/page.tsx`:

```tsx
export default function CustomerDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Welcome back! Here&apos;s your rental overview.</p>
    </div>
  );
}
```

Create `frontend/src/app/(customer)/listings/page.tsx`:

```tsx
export default function ListingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Browse Cars</h1>
      <p className="mt-2 text-muted-foreground">Find your next rental.</p>
    </div>
  );
}
```

Create `frontend/src/app/(customer)/listings/[id]/page.tsx`:

```tsx
export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Car Details</h1>
      <p className="mt-2 text-muted-foreground">Loading car information...</p>
    </div>
  );
}
```

Create `frontend/src/app/(customer)/requests/page.tsx`:

```tsx
export default function CustomerRequestsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">My Requests</h1>
      <p className="mt-2 text-muted-foreground">Track your rental requests.</p>
    </div>
  );
}
```

Create `frontend/src/app/(customer)/requests/[id]/page.tsx`:

```tsx
export default function CustomerRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Request Details</h1>
      <p className="mt-2 text-muted-foreground">Loading request...</p>
    </div>
  );
}
```

Create `frontend/src/app/(customer)/payments/page.tsx`:

```tsx
export default function CustomerPaymentsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Payments</h1>
      <p className="mt-2 text-muted-foreground">Manage your payment methods and pending payments.</p>
    </div>
  );
}
```

Create `frontend/src/app/(customer)/transactions/page.tsx`:

```tsx
export default function CustomerTransactionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Transaction History</h1>
      <p className="mt-2 text-muted-foreground">View all your past transactions.</p>
    </div>
  );
}
```

- [ ] **Step 4: Create owner page stubs**

Create `frontend/src/app/(owner)/dashboard/page.tsx`:

```tsx
export default function OwnerDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Owner Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Manage your fleet and view earnings.</p>
    </div>
  );
}
```

Create `frontend/src/app/(owner)/my-cars/page.tsx`:

```tsx
export default function MyCarsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">My Cars</h1>
      <p className="mt-2 text-muted-foreground">Manage your listed vehicles.</p>
    </div>
  );
}
```

Create `frontend/src/app/(owner)/my-cars/new/page.tsx`:

```tsx
export default function AddCarPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Add New Car</h1>
      <p className="mt-2 text-muted-foreground">List a new vehicle for rental.</p>
    </div>
  );
}
```

Create `frontend/src/app/(owner)/my-cars/[id]/page.tsx`:

```tsx
export default function CarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Car Details</h1>
      <p className="mt-2 text-muted-foreground">Edit your listing.</p>
    </div>
  );
}
```

Create `frontend/src/app/(owner)/requests/page.tsx`:

```tsx
export default function OwnerRequestsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Incoming Requests</h1>
      <p className="mt-2 text-muted-foreground">Review and manage rental requests for your cars.</p>
    </div>
  );
}
```

Create `frontend/src/app/(owner)/requests/[id]/page.tsx`:

```tsx
export default function OwnerRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Request Details</h1>
      <p className="mt-2 text-muted-foreground">Review this rental request.</p>
    </div>
  );
}
```

Create `frontend/src/app/(owner)/payments/page.tsx`:

```tsx
export default function OwnerPaymentsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Payments</h1>
      <p className="mt-2 text-muted-foreground">Track incoming payments and payouts.</p>
    </div>
  );
}
```

Create `frontend/src/app/(owner)/transactions/page.tsx`:

```tsx
export default function OwnerTransactionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Transaction History</h1>
      <p className="mt-2 text-muted-foreground">View all your earning transactions.</p>
    </div>
  );
}
```

- [ ] **Step 5: Verify build passes with all pages**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npm run build
```

Expected: Build succeeds. All routes are accessible.

- [ ] **Step 6: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add frontend/
git commit -m "feat: add all page stubs for public, auth, customer, and owner routes"
```

---

## Task 11: Create Feature Module Stubs

**Files:**
- Create all feature directories with initial files

- [ ] **Step 1: Create auth feature stub**

Create `frontend/src/features/auth/schemas.ts`:

```typescript
import { z } from "zod";

// Placeholder schemas — full implementation in auth feature plan
export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["customer", "owner"]),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const accessCodeSchema = z.object({
  code: z.string().length(6, "Access code must be 6 digits"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type AccessCodeInput = z.infer<typeof accessCodeSchema>;
```

Create `frontend/src/features/auth/store.ts`:

```typescript
import { create } from "zustand";
import type { UserRole } from "@/shared/types";

type AuthStore = {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  userId: string | null;
  setAuth: (userId: string, role: UserRole, token: string) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  userRole: null,
  userId: null,

  setAuth: (userId, role, token) => {
    if (typeof window !== "undefined") {
      window.__everythingcars_token = token;
    }
    set({ isAuthenticated: true, userId, userRole: role });
  },

  clearAuth: () => {
    if (typeof window !== "undefined") {
      delete window.__everythingcars_token;
    }
    set({ isAuthenticated: false, userId: null, userRole: null });
  },
}));
```

Create `frontend/src/features/auth/index.ts`:

```typescript
export { signUpSchema, signInSchema, accessCodeSchema } from "./schemas";
export type { SignUpInput, SignInInput, AccessCodeInput } from "./schemas";
export { useAuthStore } from "./store";
```

Create empty directories:

```bash
mkdir -p frontend/src/features/auth/components
mkdir -p frontend/src/features/auth/hooks
mkdir -p frontend/src/features/auth/api
touch frontend/src/features/auth/components/.gitkeep
touch frontend/src/features/auth/hooks/.gitkeep
touch frontend/src/features/auth/api/.gitkeep
```

- [ ] **Step 2: Create listings feature stub**

Create `frontend/src/features/listings/schemas.ts`:

```typescript
import { z } from "zod";

export const carSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number(),
  color: z.string(),
  pricePerDay: z.number(),
  location: z.string(),
  description: z.string(),
  images: z.array(z.string()),
  isAvailable: z.boolean(),
  createdAt: z.string(),
});

export const searchFiltersSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type Car = z.infer<typeof carSchema>;
export type SearchFilters = z.infer<typeof searchFiltersSchema>;
```

Create `frontend/src/features/listings/index.ts`:

```typescript
export { carSchema, searchFiltersSchema } from "./schemas";
export type { Car, SearchFilters } from "./schemas";
```

```bash
mkdir -p frontend/src/features/listings/components
mkdir -p frontend/src/features/listings/hooks
mkdir -p frontend/src/features/listings/api
touch frontend/src/features/listings/components/.gitkeep
touch frontend/src/features/listings/hooks/.gitkeep
touch frontend/src/features/listings/api/.gitkeep
```

- [ ] **Step 3: Create requests feature stub**

Create `frontend/src/features/requests/schemas.ts`:

```typescript
import { z } from "zod";

export const rentalRequestSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  carId: z.string(),
  ownerId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  totalPrice: z.number(),
  status: z.enum([
    "pending",
    "approved",
    "rejected",
    "paid",
    "active",
    "completed",
    "cancelled",
  ]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createRequestSchema = z.object({
  carId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  message: z.string().optional(),
});

export type RentalRequest = z.infer<typeof rentalRequestSchema>;
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
```

Create `frontend/src/features/requests/index.ts`:

```typescript
export { rentalRequestSchema, createRequestSchema } from "./schemas";
export type { RentalRequest, CreateRequestInput } from "./schemas";
```

```bash
mkdir -p frontend/src/features/requests/components
mkdir -p frontend/src/features/requests/hooks
mkdir -p frontend/src/features/requests/api
touch frontend/src/features/requests/components/.gitkeep
touch frontend/src/features/requests/hooks/.gitkeep
touch frontend/src/features/requests/api/.gitkeep
```

- [ ] **Step 4: Create payments feature stub**

Create `frontend/src/features/payments/schemas.ts`:

```typescript
import { z } from "zod";

export const transactionSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  payerId: z.string(),
  payeeId: z.string(),
  amount: z.number(),
  currency: z.string().default("USD"),
  status: z.enum(["pending", "completed", "failed", "refunded"]),
  createdAt: z.string(),
});

export const paymentIntentSchema = z.object({
  requestId: z.string(),
  amount: z.number(),
  currency: z.string().default("USD"),
});

export type Transaction = z.infer<typeof transactionSchema>;
export type PaymentIntent = z.infer<typeof paymentIntentSchema>;
```

Create `frontend/src/features/payments/index.ts`:

```typescript
export { transactionSchema, paymentIntentSchema } from "./schemas";
export type { Transaction, PaymentIntent } from "./schemas";
```

```bash
mkdir -p frontend/src/features/payments/components
mkdir -p frontend/src/features/payments/hooks
mkdir -p frontend/src/features/payments/api
mkdir -p frontend/src/features/payments/services
touch frontend/src/features/payments/components/.gitkeep
touch frontend/src/features/payments/hooks/.gitkeep
touch frontend/src/features/payments/api/.gitkeep
touch frontend/src/features/payments/services/.gitkeep
```

- [ ] **Step 5: Verify build**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add frontend/
git commit -m "feat: add feature module stubs with Zod schemas for auth, listings, requests, payments"
```

---

## Task 12: Create Shared API Contracts Package

**Files:**
- Create: `contracts/package.json`
- Create: `contracts/tsconfig.json`
- Create: `contracts/src/auth.ts`
- Create: `contracts/src/listings.ts`
- Create: `contracts/src/requests.ts`
- Create: `contracts/src/payments.ts`
- Create: `contracts/src/users.ts`
- Create: `contracts/src/endpoints.ts`
- Create: `contracts/src/index.ts`
- Create: `contracts/src/__tests__/auth.test.ts`
- Create: `contracts/src/__tests__/listings.test.ts`
- Create: `contracts/src/__tests__/requests.test.ts`
- Create: `contracts/src/__tests__/payments.test.ts`

- [ ] **Step 1: Initialize contracts package**

Create `contracts/package.json`:

```json
{
  "name": "@everythingcars/contracts",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

Create `contracts/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

- [ ] **Step 2: Write failing tests for auth contracts**

Create `contracts/src/__tests__/auth.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { signUpRequestSchema, signInRequestSchema, tokenResponseSchema } from "../auth";

describe("auth contracts", () => {
  it("validates a valid sign-up request", () => {
    const result = signUpRequestSchema.safeParse({
      email: "user@example.com",
      name: "John Doe",
      phone: "+1234567890",
      role: "customer",
    });
    expect(result.success).toBe(true);
  });

  it("rejects sign-up with invalid email", () => {
    const result = signUpRequestSchema.safeParse({
      email: "not-an-email",
      name: "John",
      role: "customer",
    });
    expect(result.success).toBe(false);
  });

  it("validates a valid sign-in request", () => {
    const result = signInRequestSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("validates a token response", () => {
    const result = tokenResponseSchema.safeParse({
      accessToken: "eyJ...",
      refreshToken: "eyJ...",
      userId: "user-123",
      role: "customer",
      expiresIn: 900,
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /Users/namy/Work/EverythingCars/contracts
npm install
npx vitest run src/__tests__/auth.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement auth contracts**

Create `contracts/src/auth.ts`:

```typescript
import { z } from "zod";

export const signUpRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(["customer", "owner"]),
  fleetName: z.string().optional(), // Only for fleet owners
});

export const signInRequestSchema = z.object({
  email: z.string().email(),
});

export const pushAuthChallengeSchema = z.object({
  challengeId: z.string(),
  expiresAt: z.string(),
  status: z.enum(["pending", "approved", "rejected", "expired"]),
});

export const accessCodeVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export const tokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  userId: z.string(),
  role: z.enum(["customer", "owner"]),
  expiresIn: z.number(),
});

export type SignUpRequest = z.infer<typeof signUpRequestSchema>;
export type SignInRequest = z.infer<typeof signInRequestSchema>;
export type PushAuthChallenge = z.infer<typeof pushAuthChallengeSchema>;
export type AccessCodeVerify = z.infer<typeof accessCodeVerifySchema>;
export type TokenResponse = z.infer<typeof tokenResponseSchema>;
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /Users/namy/Work/EverythingCars/contracts
npx vitest run src/__tests__/auth.test.ts
```

Expected: All 4 tests pass.

- [ ] **Step 6: Write failing tests for listings contracts**

Create `contracts/src/__tests__/listings.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { carSchema, createCarRequestSchema, searchFiltersSchema } from "../listings";

describe("listings contracts", () => {
  it("validates a complete car object", () => {
    const result = carSchema.safeParse({
      id: "car-1",
      ownerId: "owner-1",
      ownerName: "John Doe",
      ownerType: "individual",
      make: "Toyota",
      model: "Camry",
      year: 2024,
      color: "White",
      pricePerDay: 75,
      location: "New York, NY",
      description: "Well-maintained sedan",
      images: ["https://example.com/car1.jpg"],
      features: ["AC", "Bluetooth"],
      isAvailable: true,
      createdAt: "2026-01-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("validates a create car request", () => {
    const result = createCarRequestSchema.safeParse({
      make: "Honda",
      model: "Civic",
      year: 2025,
      color: "Black",
      pricePerDay: 60,
      location: "Los Angeles, CA",
      description: "Compact and fuel efficient",
      features: ["AC"],
    });
    expect(result.success).toBe(true);
  });

  it("validates search filters with optional fields", () => {
    const result = searchFiltersSchema.safeParse({
      minPrice: 50,
      maxPrice: 200,
    });
    expect(result.success).toBe(true);
  });

  it("validates empty search filters", () => {
    const result = searchFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 7: Implement listings contracts**

Create `contracts/src/listings.ts`:

```typescript
import { z } from "zod";

export const carSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  ownerName: z.string(),
  ownerType: z.enum(["individual", "fleet"]),
  make: z.string(),
  model: z.string(),
  year: z.number().min(1990).max(2030),
  color: z.string(),
  pricePerDay: z.number().positive(),
  location: z.string(),
  description: z.string(),
  images: z.array(z.string()),
  features: z.array(z.string()),
  isAvailable: z.boolean(),
  createdAt: z.string(),
});

export const createCarRequestSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().min(1990).max(2030),
  color: z.string().min(1),
  pricePerDay: z.number().positive(),
  location: z.string().min(1),
  description: z.string().min(10),
  features: z.array(z.string()).default([]),
});

export const searchFiltersSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().default(1),
  pageSize: z.number().default(20),
});

export type Car = z.infer<typeof carSchema>;
export type CreateCarRequest = z.infer<typeof createCarRequestSchema>;
export type SearchFilters = z.infer<typeof searchFiltersSchema>;
```

- [ ] **Step 8: Run listings tests**

```bash
cd /Users/namy/Work/EverythingCars/contracts
npx vitest run src/__tests__/listings.test.ts
```

Expected: All 4 tests pass.

- [ ] **Step 9: Write failing tests for requests contracts**

Create `contracts/src/__tests__/requests.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { rentalRequestSchema, createRentalRequestSchema, statusUpdateSchema } from "../requests";

describe("requests contracts", () => {
  it("validates a rental request object", () => {
    const result = rentalRequestSchema.safeParse({
      id: "req-1",
      customerId: "cust-1",
      customerName: "Jane Doe",
      carId: "car-1",
      carSummary: "2024 Toyota Camry",
      ownerId: "owner-1",
      startDate: "2026-07-01",
      endDate: "2026-07-05",
      totalPrice: 375,
      status: "pending",
      message: "I need it for a business trip",
      createdAt: "2026-06-01T00:00:00Z",
      updatedAt: "2026-06-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("validates a create request", () => {
    const result = createRentalRequestSchema.safeParse({
      carId: "car-1",
      startDate: "2026-07-01",
      endDate: "2026-07-05",
    });
    expect(result.success).toBe(true);
  });

  it("validates status updates", () => {
    const result = statusUpdateSchema.safeParse({
      status: "approved",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = statusUpdateSchema.safeParse({
      status: "invalid",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 10: Implement requests contracts**

Create `contracts/src/requests.ts`:

```typescript
import { z } from "zod";

export const requestStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "paid",
  "active",
  "completed",
  "cancelled",
]);

export const rentalRequestSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  carId: z.string(),
  carSummary: z.string(),
  ownerId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  totalPrice: z.number(),
  status: requestStatusSchema,
  message: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createRentalRequestSchema = z.object({
  carId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  message: z.string().optional(),
});

export const statusUpdateSchema = z.object({
  status: requestStatusSchema,
  reason: z.string().optional(),
});

export type RequestStatus = z.infer<typeof requestStatusSchema>;
export type RentalRequest = z.infer<typeof rentalRequestSchema>;
export type CreateRentalRequest = z.infer<typeof createRentalRequestSchema>;
export type StatusUpdate = z.infer<typeof statusUpdateSchema>;
```

- [ ] **Step 11: Run requests tests**

```bash
cd /Users/namy/Work/EverythingCars/contracts
npx vitest run src/__tests__/requests.test.ts
```

Expected: All 4 tests pass.

- [ ] **Step 12: Write failing tests for payments contracts**

Create `contracts/src/__tests__/payments.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { transactionSchema, paymentIntentSchema } from "../payments";

describe("payments contracts", () => {
  it("validates a transaction object", () => {
    const result = transactionSchema.safeParse({
      id: "txn-1",
      requestId: "req-1",
      payerId: "cust-1",
      payeeId: "owner-1",
      amount: 375,
      currency: "USD",
      status: "completed",
      provider: "stripe",
      providerTransactionId: "pi_abc123",
      createdAt: "2026-06-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("validates a payment intent", () => {
    const result = paymentIntentSchema.safeParse({
      requestId: "req-1",
      amount: 375,
      currency: "USD",
    });
    expect(result.success).toBe(true);
  });

  it("defaults currency to USD", () => {
    const result = paymentIntentSchema.safeParse({
      requestId: "req-1",
      amount: 100,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("USD");
    }
  });
});
```

- [ ] **Step 13: Implement payments contracts**

Create `contracts/src/payments.ts`:

```typescript
import { z } from "zod";

export const transactionSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  payerId: z.string(),
  payeeId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  status: z.enum(["pending", "completed", "failed", "refunded"]),
  provider: z.string(),
  providerTransactionId: z.string().optional(),
  createdAt: z.string(),
});

export const paymentIntentSchema = z.object({
  requestId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
});

export const paymentResultSchema = z.object({
  transactionId: z.string(),
  status: z.enum(["completed", "failed"]),
  providerTransactionId: z.string().optional(),
  error: z.string().optional(),
});

export type Transaction = z.infer<typeof transactionSchema>;
export type PaymentIntent = z.infer<typeof paymentIntentSchema>;
export type PaymentResult = z.infer<typeof paymentResultSchema>;
```

- [ ] **Step 14: Run payments tests**

```bash
cd /Users/namy/Work/EverythingCars/contracts
npx vitest run src/__tests__/payments.test.ts
```

Expected: All 3 tests pass.

- [ ] **Step 15: Create users and endpoints contracts**

Create `contracts/src/users.ts`:

```typescript
import { z } from "zod";

export const userProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  phone: z.string().optional(),
  role: z.enum(["customer", "owner"]),
  avatarUrl: z.string().optional(),
  createdAt: z.string(),
});

export const ownerProfileSchema = userProfileSchema.extend({
  ownerType: z.enum(["individual", "fleet"]),
  fleetName: z.string().optional(),
  totalListings: z.number(),
  totalRentals: z.number(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type OwnerProfile = z.infer<typeof ownerProfileSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
```

Create `contracts/src/endpoints.ts`:

```typescript
/** API endpoint definitions — single source of truth for both frontend and backend */

export const API = {
  auth: {
    signUp: { method: "POST", path: "/auth/sign-up" },
    signIn: { method: "POST", path: "/auth/sign-in" },
    verify: { method: "POST", path: "/auth/verify" },
    refresh: { method: "POST", path: "/auth/refresh" },
    signOut: { method: "POST", path: "/auth/sign-out" },
    pushStatus: { method: "GET", path: "/auth/push-status/:challengeId" },
  },
  listings: {
    list: { method: "GET", path: "/listings" },
    get: { method: "GET", path: "/listings/:id" },
    create: { method: "POST", path: "/listings" },
    update: { method: "PATCH", path: "/listings/:id" },
    delete: { method: "DELETE", path: "/listings/:id" },
    myListings: { method: "GET", path: "/listings/mine" },
  },
  requests: {
    list: { method: "GET", path: "/requests" },
    get: { method: "GET", path: "/requests/:id" },
    create: { method: "POST", path: "/requests" },
    updateStatus: { method: "PATCH", path: "/requests/:id/status" },
    cancel: { method: "POST", path: "/requests/:id/cancel" },
  },
  payments: {
    createIntent: { method: "POST", path: "/payments/intent" },
    confirm: { method: "POST", path: "/payments/:id/confirm" },
    transactions: { method: "GET", path: "/payments/transactions" },
    transaction: { method: "GET", path: "/payments/transactions/:id" },
  },
  users: {
    me: { method: "GET", path: "/users/me" },
    update: { method: "PATCH", path: "/users/me" },
    profile: { method: "GET", path: "/users/:id" },
  },
} as const;
```

- [ ] **Step 16: Create barrel export**

Create `contracts/src/index.ts`:

```typescript
// Auth
export {
  signUpRequestSchema,
  signInRequestSchema,
  pushAuthChallengeSchema,
  accessCodeVerifySchema,
  tokenResponseSchema,
} from "./auth";
export type {
  SignUpRequest,
  SignInRequest,
  PushAuthChallenge,
  AccessCodeVerify,
  TokenResponse,
} from "./auth";

// Listings
export {
  carSchema,
  createCarRequestSchema,
  searchFiltersSchema,
} from "./listings";
export type { Car, CreateCarRequest, SearchFilters } from "./listings";

// Requests
export {
  requestStatusSchema,
  rentalRequestSchema,
  createRentalRequestSchema,
  statusUpdateSchema,
} from "./requests";
export type {
  RequestStatus,
  RentalRequest,
  CreateRentalRequest,
  StatusUpdate,
} from "./requests";

// Payments
export {
  transactionSchema,
  paymentIntentSchema,
  paymentResultSchema,
} from "./payments";
export type { Transaction, PaymentIntent, PaymentResult } from "./payments";

// Users
export {
  userProfileSchema,
  ownerProfileSchema,
  updateProfileSchema,
} from "./users";
export type { UserProfile, OwnerProfile, UpdateProfile } from "./users";

// Endpoints
export { API } from "./endpoints";
```

- [ ] **Step 17: Run all contract tests**

```bash
cd /Users/namy/Work/EverythingCars/contracts
npx vitest run
```

Expected: All 15 tests pass.

- [ ] **Step 18: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add contracts/
git commit -m "feat: add shared API contracts with Zod schemas and endpoint definitions"
```

---

## Task 13: Create Docker Setup

**Files:**
- Create: `docker/frontend.Dockerfile`
- Create: `docker/backend.Dockerfile`
- Create: `docker/nginx.conf`
- Create: `docker-compose.yml`

- [ ] **Step 1: Create frontend Dockerfile**

Create `docker/frontend.Dockerfile`:

```dockerfile
# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
COPY contracts/ ../contracts/
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

- [ ] **Step 2: Create backend Dockerfile**

Create `docker/backend.Dockerfile`:

```dockerfile
# Stage 1: Dependencies
FROM python:3.12-slim AS deps
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim AS runner
WORKDIR /app

RUN addgroup --system django && adduser --system --ingroup django django

COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin
COPY backend/ .

RUN python manage.py collectstatic --noinput 2>/dev/null || true

USER django

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
```

- [ ] **Step 3: Create nginx config**

Create `docker/nginx.conf`:

```nginx
upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:8000;
}

server {
    listen 80;
    server_name localhost;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API requests → Django
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin → Django
    location /admin/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static files from Django
    location /static/ {
        proxy_pass http://backend;
    }

    # Everything else → Next.js
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

- [ ] **Step 4: Create docker-compose.yml**

Create `docker-compose.yml` in project root:

```yaml
services:
  frontend:
    build:
      context: .
      dockerfile: docker/frontend.Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
      - NEXT_PUBLIC_APP_NAME=EverythingCars
    volumes:
      - ./frontend/src:/app/src
      - ./contracts:/contracts
    depends_on:
      - backend
    develop:
      watch:
        - action: sync
          path: ./frontend/src
          target: /app/src

  backend:
    build:
      context: .
      dockerfile: docker/backend.Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DJANGO_SECRET_KEY=dev-secret-key-change-in-production
      - DJANGO_DEBUG=True
      - DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
      - POSTGRES_DB=everythingcars
      - POSTGRES_USER=everythingcars
      - POSTGRES_PASSWORD=devpassword
      - POSTGRES_HOST=db
      - POSTGRES_PORT=5432
      - REDIS_URL=redis://redis:6379/0
    volumes:
      - ./backend:/app
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=everythingcars
      - POSTGRES_USER=everythingcars
      - POSTGRES_PASSWORD=devpassword
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U everythingcars"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  celery:
    build:
      context: .
      dockerfile: docker/backend.Dockerfile
    command: celery -A config worker -l info
    environment:
      - DJANGO_SECRET_KEY=dev-secret-key-change-in-production
      - POSTGRES_DB=everythingcars
      - POSTGRES_USER=everythingcars
      - POSTGRES_PASSWORD=devpassword
      - POSTGRES_HOST=db
      - POSTGRES_PORT=5432
      - REDIS_URL=redis://redis:6379/0
    volumes:
      - ./backend:/app
    depends_on:
      - db
      - redis

volumes:
  pgdata:
```

- [ ] **Step 5: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add docker/ docker-compose.yml
git commit -m "feat: add Docker setup with multi-stage builds and docker-compose for local dev"
```

---

## Task 14: Create CI/CD GitHub Actions Workflows

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy-staging.yml`
- Create: `.github/workflows/deploy-production.yml`

- [ ] **Step 1: Create CI workflow (runs on PR)**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  frontend-checks:
    name: Frontend Checks
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Security audit
        run: npm audit --audit-level=high
        continue-on-error: true

  contracts-checks:
    name: Contracts Checks
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: contracts

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: contracts/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Run tests
        run: npm test

  backend-checks:
    name: Backend Checks
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: test_everythingcars
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Lint
        run: ruff check .

      - name: Run tests
        env:
          POSTGRES_DB: test_everythingcars
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_HOST: localhost
          POSTGRES_PORT: 5432
          DJANGO_SECRET_KEY: test-secret-key
        run: pytest --tb=short -q
```

- [ ] **Step 2: Create staging deploy workflow**

Create `.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy Staging

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - name: Build frontend Docker image
        run: |
          docker build -f docker/frontend.Dockerfile -t everythingcars-frontend:${{ github.sha }} .

      - name: Build backend Docker image
        run: |
          docker build -f docker/backend.Dockerfile -t everythingcars-backend:${{ github.sha }} .

      # Push to container registry (configure for your provider)
      # - name: Push images
      #   run: |
      #     docker push $REGISTRY/everythingcars-frontend:${{ github.sha }}
      #     docker push $REGISTRY/everythingcars-backend:${{ github.sha }}

      # Deploy to staging (configure for your provider)
      # - name: Deploy
      #   run: |
      #     # Deploy commands here

      - name: Verify deployment
        run: echo "Staging deployment placeholder — configure for your hosting provider"
```

- [ ] **Step 3: Create production deploy workflow**

Create `.github/workflows/deploy-production.yml`:

```yaml
name: Deploy Production

on:
  workflow_dispatch:
    inputs:
      confirm:
        description: "Type 'deploy' to confirm production deployment"
        required: true
        type: string

jobs:
  validate:
    name: Validate Approval
    runs-on: ubuntu-latest
    steps:
      - name: Check confirmation
        if: github.event.inputs.confirm != 'deploy'
        run: |
          echo "Deployment not confirmed. Type 'deploy' to proceed."
          exit 1

  deploy:
    name: Deploy to Production
    needs: validate
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Build Docker images
        run: |
          docker build -f docker/frontend.Dockerfile -t everythingcars-frontend:${{ github.sha }} .
          docker build -f docker/backend.Dockerfile -t everythingcars-backend:${{ github.sha }} .

      # Push and deploy (configure for your provider)
      - name: Deploy
        run: echo "Production deployment placeholder — configure for your hosting provider"

      # Health check
      - name: Health check
        run: echo "Health check placeholder — configure for your hosting provider"
```

- [ ] **Step 4: Commit**

```bash
cd /Users/namy/Work/EverythingCars
git add .github/
git commit -m "feat: add GitHub Actions CI/CD workflows for PR checks, staging, and production"
```

---

## Task 15: Final Build Verification and All Tests

- [ ] **Step 1: Install all contract dependencies**

```bash
cd /Users/namy/Work/EverythingCars/contracts
npm install
```

- [ ] **Step 2: Run all contract tests**

```bash
cd /Users/namy/Work/EverythingCars/contracts
npx vitest run
```

Expected: All 15 tests pass.

- [ ] **Step 3: Run all frontend tests**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npm test
```

Expected: All tests pass.

- [ ] **Step 4: Run frontend build**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npm run build
```

Expected: Build succeeds with all routes compiled.

- [ ] **Step 5: Run frontend lint**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npm run lint
```

Expected: No lint errors.

- [ ] **Step 6: Run type check**

```bash
cd /Users/namy/Work/EverythingCars/frontend
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 7: Commit any fixes**

If any step above required fixes:

```bash
cd /Users/namy/Work/EverythingCars
git add .
git commit -m "fix: address build/lint/type issues from final verification"
```

- [ ] **Step 8: Tag the scaffolding milestone**

```bash
cd /Users/namy/Work/EverythingCars
git tag v0.1.0-scaffold -m "Project scaffolding complete: Next.js 16.2, contracts, Docker, CI/CD"
```

---

## Next Plans

After this scaffolding plan, the following feature plans should be created and executed in order:

1. **Auth Feature Plan** — Push-to-authenticate flow, access code fallback, JWT token management, sign-up/sign-in forms, AuthProvider full implementation
2. **Listings Feature Plan** — Car catalog, search/filter, car detail pages, owner car management (CRUD)
3. **Requests Feature Plan** — Rental request creation, owner approval/rejection, status tracking
4. **Payments Feature Plan** — Payment abstraction layer, payment flow, transaction history
