import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { ReportDispatcherService } from './report-dispatcher.service';
import { MetaModule } from '../meta/meta.module';
import { ReportRunsModule } from '../report-runs/report-runs.module';

@Module({
  imports: [MetaModule, ReportRunsModule],
  providers: [SchedulerService, ReportDispatcherService],
})
export class SchedulerModule {}
