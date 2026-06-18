import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';

// M3: group pairing (startgroup deep-link → /start <token> link) + bot-status tracking.
@Module({
  imports: [AccessModule],
  providers: [GroupsService],
  controllers: [GroupsController],
  exports: [GroupsService],
})
export class GroupsModule {}
