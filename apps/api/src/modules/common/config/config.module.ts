import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './env.validation';

/**
 * Global config. Loads the repo-root .env (cwd is apps/api when running dev),
 * validates with zod. In Docker, env vars are injected directly and the missing
 * file is ignored.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      envFilePath: ['../../.env', '.env'],
    }),
  ],
})
export class AppConfigModule {}
