# Hisobotchi

Multi-tenant SaaS: a Telegram bot that sends scheduled Meta (Facebook) ad reports to client groups for targetologists.

See [CLAUDE.md](CLAUDE.md) for the product/architecture guide and [PLAN.md](PLAN.md) for the technical spec and roadmap.

## Stack

- **api** — NestJS 11 (REST API + grammY Telegram bot + `@nestjs/schedule` cron) in one process
- **web** — React 19 + Vite 8 + Tailwind 4 + shadcn/ui
- **db** — PostgreSQL 17 + Prisma 7
- **monorepo** — pnpm workspaces (`apps/api`, `apps/web`, `packages/shared`)

## Quick start (dev)

```bash
# 1. Install deps
pnpm install

# 2. Copy env and fill in secrets
cp .env.example .env

# 3. Start Postgres
docker compose -f docker-compose.dev.yml up -d

# 4. Run migrations + generate Prisma client
pnpm prisma:migrate

# 5. Run api + web (parallel)
pnpm dev
#   api → http://localhost:3000
#   web → http://localhost:5173
```

## Run the whole stack in Docker on :3000 (no Caddy/TLS)

Single origin — the web container serves the SPA and proxies `/api/*` + `/health` to the api container.

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build postgres api web
# App → http://localhost:3000   (dashboard + API + bot + scheduler)
docker compose -f docker-compose.yml -f docker-compose.local.yml logs -f api   # follow logs
docker compose -f docker-compose.yml -f docker-compose.local.yml down          # stop (keeps DB volume)
```

> Note: all REST routes are under `/api` (NestJS global prefix); `/health` is top-level.
> Client routes like `/groups`, `/reports` are owned by the SPA.

## Public HTTPS for OAuth (dev)

For Telegram Login and Meta OAuth you need a public HTTPS URL in dev:

```bash
cloudflared tunnel --url http://localhost:3000
```

Then register the tunnel domain in BotFather `/setdomain` and the Meta redirect URL.

## Useful commands

```bash
pnpm dev                 # api + web together
pnpm dev:api             # NestJS only
pnpm dev:web             # Vite only
pnpm prisma:migrate      # create/apply migration (dev)
pnpm prisma:studio       # browse the DB
pnpm build               # build all workspaces
```
