import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppConfigModule } from './modules/common/config/config.module';
import { PrismaModule } from './modules/common/prisma/prisma.module';
import { CryptoModule } from './modules/common/crypto/crypto.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { MetaModule } from './modules/meta/meta.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { GroupsModule } from './modules/groups/groups.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { ReportRunsModule } from './modules/report-runs/report-runs.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    // Infrastructure
    AppConfigModule,
    ScheduleModule.forRoot(),
    // Basic abuse protection: 600 requests / minute / IP (generous — the login poll
    // runs ~30/min during sign-in).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 600 }]),
    PrismaModule,
    CryptoModule,
    // Always-on integrations
    TelegramModule,
    SchedulerModule,
    // Feature modules
    HealthModule,
    UsersModule,
    AuthModule,
    MetaModule,
    GroupsModule,
    ReportsModule,
    ReportRunsModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
