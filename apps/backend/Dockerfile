FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install --filter @mockup/backend... --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend
RUN pnpm --filter @mockup/shared build \
  && pnpm --filter @mockup/backend db:generate \
  && pnpm --filter @mockup/backend build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/.npmrc ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/backend ./apps/backend
RUN mkdir -p /app/uploads
WORKDIR /app/apps/backend
EXPOSE 3001
CMD ["sh", "-c", "pnpm db:migrate && node dist/index.js"]
