import { Module } from '@nestjs/common';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';
import { MetaGraphService } from './meta-graph.service';
import { InsightsService } from './insights.service';
import { MetaMaintenanceService } from './meta-maintenance.service';

// M2: Facebook OAuth (ads_read, business_management), long-lived token exchange +
// AES-256-GCM storage, /me/adaccounts sync, account enable + lead action_type,
// daily token-refresh maintenance (MetaMaintenanceService).
// M5: InsightsService (exported) feeds the scheduler's report dispatcher.
@Module({
  controllers: [MetaController],
  providers: [MetaService, MetaGraphService, InsightsService, MetaMaintenanceService],
  exports: [InsightsService],
})
export class MetaModule {}
