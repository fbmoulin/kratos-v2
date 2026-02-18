# ─── Stage 1: Install dependencies ───────────────────────────────
FROM node:22-slim AS builder
WORKDIR /workspace

RUN corepack enable \
  && corepack prepare pnpm@9.15.0 --activate

# Copy manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY workers/docx-worker/package.json workers/docx-worker/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/tools/package.json packages/tools/
COPY apps/api/package.json apps/api/
COPY workers/pdf-worker/package.json workers/pdf-worker/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: Copy source & type-check ────────────────────────────
COPY tsconfig.json ./
COPY workers/docx-worker/ workers/docx-worker/
COPY packages/core/ packages/core/
COPY packages/db/ packages/db/
COPY packages/tools/ packages/tools/

# Build only docx-worker and its workspace deps (core, db, tools)
RUN pnpm --filter @kratos/docx-worker... build

# ─── Stage 3: Production image ───────────────────────────────────
FROM node:22-slim AS prod
WORKDIR /workspace

RUN corepack enable \
  && corepack prepare pnpm@9.15.0 --activate

# Copy installed workspace from builder
COPY --from=builder /workspace ./

ENV NODE_ENV=production

STOPSIGNAL SIGTERM

CMD ["pnpm", "--filter", "@kratos/docx-worker", "start"]
