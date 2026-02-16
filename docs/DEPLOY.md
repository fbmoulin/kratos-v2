# Guia de Deploy — KRATOS v2

**Data**: 16 de Fevereiro de 2026
**Versão**: 2.4

---

## 1. Visão Geral da Estratégia de Deploy

O deploy do **KRATOS v2** é automatizado via GitHub Actions e utiliza plataformas PaaS modernas. A API e workers rodam no **Railway**, o frontend na **Vercel**, e o banco de dados no **Supabase** (externo).

## 2. Plataformas de Deploy

| Componente | Plataforma | URL / Config |
|:---|:---|:---|
| **Frontend** (`apps/web`) | **Vercel** | CDN global, preview deploys por PR, SPA rewrites |
| **Backend** (`apps/api`) | **Railway** | `https://api-production-8225.up.railway.app` |
| **PDF Worker** (`workers/pdf-worker`) | **Railway** | Background worker (sem HTTP), root dir `workers/pdf-worker` |
| **Redis** | **Railway** (managed plugin) | Private networking (`redis.railway.internal:6379`) |
| **Database** | **Supabase** (externo) | Projeto `jzgdorcvfxlahffqnyor`, região sa-east-1 |

### Railway Project
- **URL:** https://railway.com/project/5d0fa1b8-0a31-4451-9319-f04a43d94dc5
- **Auto-deploy:** GitHub integration on push to `main`
- **Redis:** Private networking (IPv6) — ioredis needs `family: 0` for dual-stack

### Configuração por Serviço

| Serviço | Root Dir | Dockerfile | Healthcheck |
|:---|:---|:---|:---|
| API | `/` (monorepo root) | `apps/api/Dockerfile` | `/v2/health` |
| PDF Worker | `workers/pdf-worker` | `workers/pdf-worker/Dockerfile` | Nenhum (background worker) |

**Importante:** NÃO usar `railway.toml` na raiz do monorepo — ele se aplica a TODOS os serviços. Configurar cada serviço via dashboard ou `workers/pdf-worker/railway.toml`.

## 3. Pipeline de CI/CD com GitHub Actions

### Workflow 1: `ci.yml` (Integração Contínua)

-   **Gatilho**: Push/PR para `main` ou `develop`
-   **Ações**:
    1.  Setup: Node.js 22, pnpm, `--frozen-lockfile`
    2.  Build: `pnpm build` (Turborepo)
    3.  Lint: `pnpm lint` (ESLint flat config)
    4.  Testes com Cobertura: `pnpm test:coverage` (Vitest v8, 171+ testes)
    5.  Upload de Artefatos: `lcov.info` + `coverage-summary.json`

### Workflow 2: `deploy-staging.yml` (Deploy para Staging)

-   **Gatilho**: Push para `main`
-   **Secrets necessários**: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `STAGING_API_URL`, `VITE_*`
-   **Ações**:
    1.  **Deploy do Frontend (Vercel)**: `vercel-action@v25` com env vars de build
    2.  **Deploy do Backend (Railway)**: Auto-deploy via GitHub integration (não precisa de workflow step — Railway detecta push automaticamente)

### Workflow 3: `deploy-production.yml` (Deploy para Produção)

-   **Gatilho**: Tag `v*` (ex: `v2.4.0`)
-   **Ações**:
    1.  **Testes pré-deploy**: Job `test` roda antes de qualquer deploy
    2.  **Aprovação Manual**: `environment: production` do GitHub exige aprovação
    3.  **Deploy do Frontend (Vercel)**: Deploy com `--prod` flag
    4.  **Deploy do Backend (Railway)**: Via Railway API ou manual promote

### Workflow 4: `integration.yml` (Testes de Integração)

-   **Gatilho**: Nightly (cron) ou manual (`workflow_dispatch`)
-   **Ações**: Docker Compose (Postgres + Redis) → DB push → API + Worker → Full test suite

## 4. Rollbacks

-   **Vercel**: Histórico de deploys atômicos — reverter com um clique no dashboard
-   **Railway**: Dashboard mostra histórico de deploys. Reverter via "Rollback" no deploy anterior, ou `railway redeploy --service api`

## 5. Monitoramento e Alertas

-   **Error Tracking (Sentry)**: ✅ Integrado no frontend (`@sentry/react` + ErrorBoundary + session replay) e no backend (`@sentry/node` via `app.onError`). Requer `SENTRY_DSN` (backend) e `VITE_SENTRY_DSN` (frontend).
-   **Health Checks**: ✅ `/v2/health` (liveness), `/v2/health/ready` (DB + Redis probes, retorna 503 se degradado), `/v2/health/metrics` (request count, error rate, avg latency).
-   **Logs**: `railway logs --service api` / `railway logs --service pdf-worker`
-   **Métricas**: Planejado — Prometheus/Grafana para dashboards de performance (Pós-MVP)

## 6. Railway CLI (Comandos Úteis)

```bash
# Login (WSL2: usar --browserless)
railway login --browserless

# Ver logs
railway logs --service api
railway logs --service pdf-worker --build

# Variáveis de ambiente
railway variables --service api
railway variables --service api --set "KEY=VALUE"

# Redeploy
railway redeploy --service api
```

## 7. Secrets Necessários

### GitHub Secrets (CI/CD)
| Secret | Uso |
|:---|:---|
| `VERCEL_TOKEN` | Deploy frontend |
| `VERCEL_ORG_ID` | Organização Vercel |
| `VERCEL_PROJECT_ID` | Projeto Vercel |
| `STAGING_API_URL` | URL da API staging (build frontend) |
| `PRODUCTION_API_URL` | URL da API produção (build frontend) |
| `VITE_SUPABASE_URL` | Supabase URL (build frontend) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (build frontend) |
| `VITE_SENTRY_DSN` | Sentry DSN frontend (build frontend) |

### Railway Environment Variables
| Variável | Serviço | Valor |
|:---|:---|:---|
| `SUPABASE_URL` | api, pdf-worker | `https://jzgdorcvfxlahffqnyor.supabase.co` |
| `SUPABASE_KEY` | api | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | api, pdf-worker | Service role key |
| `REDIS_URL` | api, pdf-worker | `${{Redis.REDIS_URL}}` (ref var) |
| `ANTHROPIC_API_KEY` | api | Claude API key |
| `GEMINI_API_KEY` | api | Google AI key |
| `OPENAI_API_KEY` | api | OpenAI key (embeddings) |
| `SENTRY_DSN` | api | Sentry DSN backend |
| `NODE_ENV` | api | `production` |
| `PORT` | api | `3001` |
