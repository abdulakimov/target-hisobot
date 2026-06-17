import { Global, Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramSenderService } from './telegram-sender.service';
import { MePhotoController } from './me-photo.controller';

@Global()
@Module({
  imports: [UsersModule, AuthModule, GroupsModule],
  controllers: [MePhotoController],
  providers: [TelegramBotService, TelegramSenderService],
  exports: [TelegramBotService, TelegramSenderService],
})
export class TelegramModule {}
