# ─── Stage 1: Install dependencies ───────────────────────────────
FROM node:22-slim AS builder
WORKDIR /workspace

RUN corepack enable \
  && corepack prepare pnpm@9.15.0 --activate

# Copy manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY workers/analysis-worker/package.json workers/analysis-worker/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/ai/package.json packages/ai/
COPY apps/api/package.json apps/api/
COPY workers/pdf-worker/package.json workers/pdf-worker/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: Copy source & type-check ────────────────────────────
COPY tsconfig.json ./
COPY workers/analysis-worker/ workers/analysis-worker/
COPY packages/core/ packages/core/
COPY packages/db/ packages/db/
COPY packages/ai/ packages/ai/

# Build workspace packages (core, db, ai compile to dist/)
RUN pnpm build

# ─── Stage 3: Production image ───────────────────────────────────
FROM node:22-slim AS prod
WORKDIR /workspace

RUN corepack enable \
  && corepack prepare pnpm@9.15.0 --activate

# Copy installed workspace from builder
COPY --from=builder /workspace ./

ENV NODE_ENV=production

STOPSIGNAL SIGTERM

CMD ["pnpm", "--filter", "@kratos/analysis-worker", "start"]
