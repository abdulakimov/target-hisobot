import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import type { AppConfig } from './modules/common/config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<AppConfig, true>);
  const logger = new Logger('Bootstrap');

  // All REST routes live under /api so the SPA can own every other path on the
  // same origin (e.g. /groups, /reports are client-side routes). /health stays
  // top-level for infra checks.
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.use(cookieParser(config.get('SESSION_SECRET', { infer: true })));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: config.get('FRONTEND_URL', { infer: true }),
    credentials: true,
  });
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  logger.log(`API listening on http://localhost:${port}`);
}

void bootstrap();
