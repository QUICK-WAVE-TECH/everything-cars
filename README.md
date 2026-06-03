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
