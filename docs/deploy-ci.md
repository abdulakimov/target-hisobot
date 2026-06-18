# Deploy: CI-built images (off-VPS build)

The RAM-tight VPS must **not** build Docker images (it OOMs — see the project notes). Instead
GitHub Actions builds `api` + `web` images and pushes them to **GHCR**; the VPS only pulls.

This is milestone **M8 / A1** of [PLAN_V2.md](../PLAN_V2.md), and a prerequisite for later work
that adds heavier native deps (e.g. the satori image renderer in M12).

## How it works

`.github/workflows/build-and-push.yml`:

1. **test** job — install, build `shared`, `prisma generate`, typecheck the API, run `pnpm test`.
2. **build** job (only if tests pass) — builds both Dockerfiles with Buildx layer caching and
   pushes to:
   - `ghcr.io/abdulakimov/target-hisobot/api`
   - `ghcr.io/abdulakimov/target-hisobot/web`

Tags pushed per build: `latest` (default branch only), the branch name (e.g. `feat-m3-m6`),
git tags (`v*`), and `sha-<short>` (immutable — use this for rollback).

Triggers: push to `main` or `feat/m3-m6`, any `v*` tag, or manual `workflow_dispatch`.

No build-time secrets are needed (the web app has no `VITE_*` build vars; it talks to `/api`
same-origin at runtime).

## One-time setup

1. **Push the workflow** to GitHub. `GITHUB_TOKEN` already has `packages: write`, so no PAT is
   needed for pushing from Actions.
2. **Make the VPS able to pull.** Either:
   - Make the two GHCR packages **public** (Package settings → Change visibility), then no auth
     is needed to pull; **or**
   - Create a PAT with `read:packages` and on the VPS run:
     ```bash
     echo <PAT> | docker login ghcr.io -u abdulakimov --password-stdin
     ```

## Deploy on the VPS

From `/opt/target-hisobotchi-bot` (where `.env` lives):

```bash
docker compose -f docker-compose.registry.yml pull
docker compose -f docker-compose.registry.yml up -d
```

The API container runs `prisma migrate deploy` on start, so DB migrations apply automatically.

## Rollback

Pin both services to a known-good immutable tag and re-up:

```bash
export API_IMAGE=ghcr.io/abdulakimov/target-hisobot/api:sha-abc1234
export WEB_IMAGE=ghcr.io/abdulakimov/target-hisobot/web:sha-abc1234
docker compose -f docker-compose.registry.yml up -d
```

(Find tags under the repo's **Packages**, or `git log` for the short SHA.)

## Notes

- `docker-compose.vps.yml` (on-box build) is kept as a fallback only — prefer the registry flow.
- `host nginx` (80/443 + TLS) → `127.0.0.1:3014` → `web` container → `/api` → `api` is unchanged.
- `trust proxy` is enabled in the API so rate limiting sees the real client IP via
  `X-Forwarded-For` — make sure the nginx + web proxy chain forwards it.
