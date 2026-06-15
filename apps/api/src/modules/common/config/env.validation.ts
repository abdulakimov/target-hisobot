import { z } from 'zod';

/**
 * Environment schema. Secrets that gate features (Telegram, Meta) are optional so the
 * skeleton can boot without them; the relevant modules guard on their presence.
 * Hard-required: DB URL + the two 32-char crypto secrets.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default('info'),
  TZ: z.string().default('Asia/Tashkent'),

  APP_BASE_URL: z.string().min(1).default('http://localhost:3000'),
  FRONTEND_URL: z.string().min(1).default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  TELEGRAM_BOT_POLLING_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true' || v === '1'),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_OAUTH_REDIRECT_URL: z.string().optional(),
  META_TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(32, 'META_TOKEN_ENCRYPTION_KEY must be at least 32 characters'),
  META_GRAPH_API_VERSION: z.string().default('v23.0'),
  META_OAUTH_SCOPES: z.string().default('ads_read,business_management'),
});

export type AppConfig = z.infer<typeof envSchema>;

/** Used by @nestjs/config `validate`. Throws with a readable list on failure. */
export function validateEnv(config: Record<string, unknown>): AppConfig {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}
