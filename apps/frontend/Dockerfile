FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/frontend/package.json ./apps/frontend/
RUN pnpm install --filter @mockup/frontend... --frozen-lockfile

FROM base AS build
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/frontend ./apps/frontend
RUN pnpm --filter @mockup/shared build && pnpm --filter @mockup/frontend build

FROM nginx:1.27-alpine AS runner
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
