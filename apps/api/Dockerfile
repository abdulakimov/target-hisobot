# Build context = repo root (see docker-compose.yml).
FROM node:24-alpine AS build
RUN corepack enable && corepack prepare pnpm@11.6.0 --activate
# Prisma engines need openssl on alpine.
RUN apk add --no-cache openssl
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @hisobotchi/shared build \
 && pnpm --filter @hisobotchi/api exec prisma generate \
 && pnpm --filter @hisobotchi/api build

FROM node:24-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@11.6.0 --activate
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app

# Bring the fully-installed workspace (incl. generated Prisma client) and build output.
COPY --from=build /app ./

WORKDIR /app/apps/api
EXPOSE 3000
# Apply migrations, then start the API + bot + scheduler process.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main"]
