import { Module } from '@nestjs/common';
import { AccessService } from './access.service';
import { SubscriptionGuard } from './guards/subscription.guard';
import { SuperadminGuard } from './guards/superadmin.guard';

// Access/paywall + superadmin authorization. PrismaModule and ConfigModule are global,
// so this only needs to export the service + guards for the modules that apply them.
@Module({
  providers: [AccessService, SubscriptionGuard, SuperadminGuard],
  exports: [AccessService, SubscriptionGuard, SuperadminGuard],
})
export class AccessModule {}
