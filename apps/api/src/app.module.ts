import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AppConfigModule } from './modules/common/config/config.module';
import { PrismaModule } from './modules/common/prisma/prisma.module';
import { CryptoModule } from './modules/common/crypto/crypto.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { MetaModule } from './modules/meta/meta.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { ReportRunsModule } from './modules/report-runs/report-runs.module';

@Module({
  imports: [
    // Infrastructure
    AppConfigModule,
    ScheduleModule.forRoot(),
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
    ReportsModule,
    ReportRunsModule,
  ],
})
export class AppModule {}
