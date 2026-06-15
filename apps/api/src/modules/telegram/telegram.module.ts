import { Global, Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { TelegramBotService } from './telegram-bot.service';

@Global()
@Module({
  imports: [UsersModule, AuthModule],
  providers: [TelegramBotService],
  exports: [TelegramBotService],
})
export class TelegramModule {}
