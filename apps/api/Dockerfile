# Render backend container — NestJS API on Node 22 LTS
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# pnpm workspace: copy manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY packages/shared-dto/package.json packages/shared-dto/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/tailwind-config/package.json packages/tailwind-config/package.json
COPY apps/api/package.json apps/api/package.json

RUN pnpm install --frozen-lockfile --filter=api... || pnpm install --frozen-lockfile

# Copy sources
COPY packages/tsconfig packages/tsconfig
COPY packages/shared-dto packages/shared-dto
COPY packages/database packages/database
COPY apps/api apps/api

# Build dependency packages then the API
RUN pnpm --filter @repo/shared-dto build \
 && pnpm --filter @repo/database build \
 && pnpm --filter api build

# Prune dev dependencies for a slim runtime image
RUN pnpm --filter api --prod deploy /out/api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /out/api ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
