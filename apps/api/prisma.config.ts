import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma 7 no longer auto-loads .env. Load the repo-root .env (cwd is apps/api).
loadEnv({ path: '../../.env' });
loadEnv({ path: '.env' });

// Read directly from process.env (not the `env()` helper) so commands that don't
// need a connection — e.g. `prisma generate` — don't fail when DATABASE_URL is unset.
const url = process.env.DATABASE_URL ?? '';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url },
});
