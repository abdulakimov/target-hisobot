import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

// Superadmin panel: list users + grant/extend/revoke access. SuperadminGuard (from
// AccessModule) gates every route; PrismaModule is global.
@Module({
  imports: [AccessModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
