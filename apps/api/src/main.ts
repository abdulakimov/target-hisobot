import 'reflect-metadata';
import { Logger, LogLevel, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './modules/common/filters/all-exceptions.filter';
import type { AppConfig } from './modules/common/config/env.validation';

/** Map a single LOG_LEVEL value to the set of Nest log levels at or above it. */
function logLevelsFor(level: string): LogLevel[] {
  const order: LogLevel[] = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'];
  const aliases: Record<string, LogLevel> = {
    verbose: 'verbose',
    debug: 'debug',
    info: 'log',
    log: 'log',
    warn: 'warn',
    error: 'error',
  };
  const min = aliases[level.toLowerCase()] ?? 'log';
  return order.slice(order.indexOf(min));
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<AppConfig, true>);
  app.useLogger(logLevelsFor(config.get('LOG_LEVEL', { infer: true })));
  const logger = new Logger('Bootstrap');

  // Behind nginx (+ the web container's /api proxy) — trust X-Forwarded-* so req.ip
  // reflects the real client for rate limiting.
  app.set('trust proxy', true);
  // Security headers. CSP/COOP/COEP/CORP are disabled: the API serves only JSON +
  // OAuth redirects (no same-origin documents), and enabling them would risk the
  // cross-origin SPA fetch and the Meta OAuth popup flow.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
    }),
  );

  // All REST routes live under /api so the SPA can own every other path on the
  // same origin (e.g. /groups, /reports are client-side routes). /health stays
  // top-level for infra checks.
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.use(cookieParser(config.get('SESSION_SECRET', { infer: true })));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
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
