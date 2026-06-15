# Build context = repo root (see docker-compose.yml).
FROM node:24-alpine AS build
RUN corepack enable && corepack prepare pnpm@11.6.0 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @hisobotchi/shared build \
 && pnpm --filter @hisobotchi/web build

FROM nginx:alpine AS runtime
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
