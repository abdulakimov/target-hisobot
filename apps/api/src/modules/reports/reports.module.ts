import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ReportRunsModule } from '../report-runs/report-runs.module';
import { AccessModule } from '../access/access.module';

// M4: Report CRUD (account + group + metrics + lead type + window + schedule),
// validation, form options, and an immediate test-send (M5 renderer + sender, M6 run record).
@Module({
  imports: [ReportRunsModule, AccessModule],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
