# Guia de Deploy — KRATOS v2

**Autor**: Manus AI (Agente DevOps & Arquiteto de Soluções)
**Data**: 15 de Fevereiro de 2026
**Versão**: 2.0

---

## 1. Visão Geral da Estratégia de Deploy

O deploy do **KRATOS v2** é projetado para ser um processo automatizado, seguro e com zero downtime, utilizando plataformas de nuvem modernas (PaaS) e um pipeline de CI/CD robusto. A estratégia de deploy varia ligeiramente para cada componente do monorepo (frontend, backend, workers) para otimizar a performance, o custo e a experiência do desenvolvedor.

## 2. Plataformas de Deploy

-   **Frontend (`apps/web`)**: O deploy será feito na **Vercel**. A Vercel oferece uma integração perfeita com o Next.js (ou Vite/React), deploys atômicos, caching de CDN global e previews de deploy automáticos para cada pull request.

-   **Backend (`apps/api`)**: O deploy será feito no **Fly.io** ou **Railway**. Ambas as plataformas são excelentes para deploy de aplicações conteinerizadas, oferecendo escalabilidade automática, bancos de dados gerenciados e uma CLI poderosa.

-   **Workers (`workers/pdf-worker`)**: Os workers Celery também serão deployados no **Fly.io** ou **Railway**, como processos separados da API, permitindo que sejam escalados de forma independente com base na carga da fila de tarefas.

## 3. Pipeline de CI/CD com GitHub Actions

O coração da nossa estratégia de deploy é o pipeline de CI/CD automatizado com **GitHub Actions**. O pipeline é dividido em três workflows principais:

### Workflow 1: `ci.yml` (Integração Contínua)

-   **Gatilho**: A cada `push` em um pull request aberto para a branch `main`, e a cada `push` direto na `main`.
-   **Ações**:
    1.  **Checkout do Código**: Clona o repositório.
    2.  **Setup do Ambiente**: Instala Node.js 22, pnpm (via `packageManager` em `package.json`).
    3.  **Instalação de Dependências**: Executa `pnpm install --frozen-lockfile`.
    4.  **Build**: Executa `pnpm build` usando o Turborepo.
    5.  **Lint**: Executa `pnpm lint` (ESLint flat config + TypeScript parser).
    6.  **Testes com Cobertura**: Executa `pnpm test:coverage` (Vitest v8 coverage, 171+ testes).
    7.  **Upload de Artefatos**: Faz upload dos relatórios `lcov.info` de cobertura.

### Workflow 2: `deploy-staging.yml` (Deploy para Staging)

-   **Gatilho**: A cada `push` para a branch `main`.
-   **Secrets necessários**: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `FLY_API_TOKEN`, `STAGING_API_URL`
-   **Ações**:
    1.  **Build e Testes**: Instala dependências, builda e roda testes.
    2.  **Deploy do Frontend (Vercel)**: Instala Vercel CLI, faz pull do projeto, build com `VITE_API_BASE_URL` e deploy.
    3.  **Deploy do Backend (Fly.io)**: Instala flyctl e executa `fly deploy` usando `fly.toml` (região `gru`, health check em `/v2/health`).

### Workflow 3: `deploy-production.yml` (Deploy para Produção)

-   **Gatilho**: Criação de `tag` no formato `v*` (ex: `v2.0.0`).
-   **Secrets necessários**: mesmos do staging + `PRODUCTION_API_URL`
-   **Ações**:
    1.  **Testes pré-deploy**: Job `test` roda antes de qualquer deploy.
    2.  **Aprovação Manual**: Usa `environment: production` do GitHub, que exige aprovação de um maintainer.
    3.  **Deploy do Frontend (Vercel)**: Deploy com `--prod` flag.
    4.  **Deploy do Backend (Fly.io)**: Deploy com `fly deploy`.

## 4. Rollbacks

-   **Vercel**: A Vercel mantém um histórico de todos os deploys. Em caso de falha, é possível reverter para um deploy anterior com um único clique no dashboard da Vercel.
-   **Fly.io**: O Fly.io também permite reverter para uma versão anterior da aplicação facilmente através da sua CLI, utilizando o comando `fly deploy --image <imagem_anterior>`.

## 5. Monitoramento e Alertas

Após o deploy, o monitoramento contínuo é essencial para garantir a saúde da aplicação.

-   **Error Tracking (Sentry)**: ✅ Integrado no frontend (`@sentry/react` com ErrorBoundary, session replay) e no backend (`@sentry/node` via `app.onError` com contexto de request). Requer `SENTRY_DSN` (backend) e `VITE_SENTRY_DSN` (frontend).
-   **Health Checks**: ✅ Endpoint `/v2/health/ready` verifica DB e Redis com status 200/503. Endpoint `/v2/health/metrics` expõe request count, error rate e avg latency em JSON.
-   **Métricas de Performance**: Planejado: Prometheus para coletar métricas da API e workers, Grafana para dashboards.
-   **Alertas**: Planejado: Configuração de alertas para anomalias (taxa de erros, latência, CPU/memória).
