# ─── Stage 1: Install dependencies ───────────────────────────────
FROM node:22-slim AS builder
WORKDIR /workspace

RUN corepack enable \
  && corepack prepare pnpm@9.15.0 --activate

# Copy manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/ai/package.json packages/ai/
# Workers dir needed for pnpm-workspace.yaml resolution
COPY workers/pdf-worker/package.json workers/pdf-worker/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: Copy source & build ───────────────────────────────
COPY tsconfig.json ./
COPY apps/api/ apps/api/
COPY packages/core/ packages/core/
COPY packages/db/ packages/db/
COPY packages/ai/ packages/ai/

# Build workspace packages (core, db, ai need tsc compilation)
RUN pnpm build

# ─── Stage 3: Production image ───────────────────────────────────
FROM node:22-slim AS prod
WORKDIR /workspace

RUN corepack enable \
  && corepack prepare pnpm@9.15.0 --activate

# Copy installed workspace from builder
COPY --from=builder /workspace ./

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Health check against the API
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/v2/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["pnpm", "--filter", "@kratos/api", "start"]
