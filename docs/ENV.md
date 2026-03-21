# Environment Variables — KRATOS v2

**Version:** 2.6.0
**Last verified:** 2026-03-21

---

## Quick Start

```bash
cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY,
# DATABASE_URL, REDIS_URL, ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY
```

Never commit `.env` files. Use `.env.example` as the template.

---

## 1. Supabase (Database + Auth + Storage)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL (`https://xxx.supabase.co`) |
| `SUPABASE_KEY` | Yes | Anon (public) API key — used by frontend and API for auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (API) | Service role key — bypasses RLS, used by API and workers |

## 2. Database (Drizzle ORM)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Supabase pooler recommended) |

## 3. Redis (Queues + Cache)

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_URL` | Yes | Redis 7 connection string — job queues (`kratos:jobs:*`) and cache |

## 4. AI Providers

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key (Claude models for specialist/drafter agents) |
| `GEMINI_API_KEY` | Yes | Google AI Studio key (Gemini Flash for routing + PDF vision) |
| `OPENAI_API_KEY` | Yes | OpenAI key (text-embedding-3-small, 1536d for RAG embeddings) |
| `LANGSMITH_API_KEY` | No | LangSmith key for LangGraph tracing and observability |

## 5. Trigger.dev (Background Tasks)

| Variable | Required | Description |
|----------|----------|-------------|
| `TRIGGER_SECRET_KEY` | Yes (prod) | Trigger.dev project secret — authenticates task execution |

## 6. Application

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Runtime environment (`development`, `production`, `test`) |
| `PORT` | No | `3001` | API server port |
| `CORS_ORIGIN` | Yes (prod) | `http://localhost:5173` | Allowed CORS origin (must be non-localhost in production) |

## 7. Monitoring (Sentry)

| Variable | Required | Description |
|----------|----------|-------------|
| `SENTRY_DSN` | No | Backend Sentry DSN (`@sentry/node`) |
| `VITE_SENTRY_DSN` | No | Frontend Sentry DSN (`@sentry/react`, `VITE_` prefix exposes to browser) |

## 8. Frontend (`apps/web` — `VITE_` prefix)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | API base URL (e.g., `http://localhost:3001/v2`) |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL (client-side) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key (client-side) |

## 9. Deploy (CI/CD — GitHub Secrets only)

| Variable | Where | Description |
|----------|-------|-------------|
| `VERCEL_TOKEN` | GitHub Secrets | Vercel API token (frontend deploy) |
| `VERCEL_ORG_ID` | GitHub Secrets | Vercel org ID |
| `VERCEL_PROJECT_ID` | GitHub Secrets | Vercel project ID |
| `RAILWAY_TOKEN` | GitHub Secrets | Railway deploy token (staging) |
| `RAILWAY_PRODUCTION_TOKEN` | GitHub Secrets | Railway production deploy token |
| `STAGING_API_URL` | GitHub Secrets | Staging API URL (frontend build) |
| `PRODUCTION_API_URL` | GitHub Secrets | Production API URL (frontend build) |

## 10. Testing (Development only)

| Variable | Required | Description |
|----------|----------|-------------|
| `TEST_USER_ID` | No | UUID for auth bypass in dev (`NODE_ENV=development` only) |
| `E2E_USER_EMAIL` | No | Playwright E2E test user email |
| `E2E_USER_PASSWORD` | No | Playwright E2E test user password |

---

## Removed Variables

These variables were removed in v2.5.0+ and should NOT be used:

| Variable | Reason | Replacement |
|----------|--------|-------------|
| `CELERY_BROKER_URL` | Celery workers replaced by Trigger.dev tasks (v2.6.0) | `TRIGGER_SECRET_KEY` |
| `CELERY_RESULT_BACKEND` | Celery workers replaced by Trigger.dev tasks (v2.6.0) | `TRIGGER_SECRET_KEY` |
| `FLY_API_TOKEN` | Fly.io replaced by Railway (v2.5.0) | `RAILWAY_TOKEN` |
| `OPENROUTER_API_KEY` | OpenRouter replaced by direct provider SDKs (v2.1.0) | `ANTHROPIC_API_KEY` + `GEMINI_API_KEY` |
