import { Global, Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramSenderService } from './telegram-sender.service';

@Global()
@Module({
  imports: [UsersModule, AuthModule, GroupsModule],
  providers: [TelegramBotService, TelegramSenderService],
  exports: [TelegramBotService, TelegramSenderService],
})
export class TelegramModule {}
