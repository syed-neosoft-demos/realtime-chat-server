import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '@/users/users.module.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { WebsocketAuthGuard } from '@/common/guards/websocket-auth.guard.js';
import { AuthService } from '@/auth/auth.service.js';
import { AuthController } from '@/auth/auth.controller.js';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, WebsocketAuthGuard, { provide: APP_GUARD, useClass: JwtAuthGuard }],
  exports: [AuthService, WebsocketAuthGuard],
})
export class AuthModule {}
