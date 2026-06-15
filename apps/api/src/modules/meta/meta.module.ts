import { Module } from '@nestjs/common';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';
import { MetaGraphService } from './meta-graph.service';

// M2: Facebook OAuth (ads_read, business_management), long-lived token exchange +
// AES-256-GCM storage, /me/adaccounts sync, account enable + lead action_type.
@Module({
  controllers: [MetaController],
  providers: [MetaService, MetaGraphService],
})
export class MetaModule {}
