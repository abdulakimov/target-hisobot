import { Module } from '@nestjs/common';
import { ReportRunsService } from './report-runs.service';
import { ReportRunsController } from './report-runs.controller';

// M6: ReportRun history (list + filters + latest-per-report) and the run-record writer
// reused by the test-send (now) and the M5 dispatcher (later).
@Module({
  providers: [ReportRunsService],
  controllers: [ReportRunsController],
  exports: [ReportRunsService],
})
export class ReportRunsModule {}
