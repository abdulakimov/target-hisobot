import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { MeController } from './me.controller';
import { SessionService } from './session.service';
import { LoginTokenService } from './login-token.service';
import { AuthGuard } from './guards/auth.guard';

// M1: Telegram bot deep-link login (login_token + poll), opaque Postgres sessions,
// and a global AuthGuard (tenant-isolation basis).
@Module({
  imports: [UsersModule],
  controllers: [AuthController, MeController],
  providers: [
    SessionService,
    LoginTokenService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [LoginTokenService],
})
export class AuthModule {}
