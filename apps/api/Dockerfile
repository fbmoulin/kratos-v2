FROM node:22-bullseye AS base
WORKDIR /workspace

# enable corepack/pnpm and install pnpm
RUN corepack enable \
  && corepack prepare pnpm@9.15.0 --activate

# copy lockfile and package manifests to leverage layer caching
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# copy workspace packages/package.json to help pnpm install resolve workspaces
COPY packages packages
COPY apps apps

# install dependencies
RUN pnpm install --frozen-lockfile

# optional: run package build commands (API uses tsx runtime)
RUN pnpm --filter @kratos/api build

FROM node:22-bullseye AS prod
WORKDIR /app
COPY --from=base /workspace .
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Start API using workspace start script (uses tsx to run src/index.ts)
CMD ["pnpm", "--filter", "@kratos/api", "start"]

