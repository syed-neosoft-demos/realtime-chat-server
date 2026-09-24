import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from '@/app.controller.js';
import { AppService } from '@/app.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule, type SequelizeModuleOptions } from '@nestjs/sequelize';
import databaseConfig from '@/config/database.config.js';
import redisConfig from '@/config/redis.config.js';
import keycloakConfig from '@/config/keycloak.config.js';
import { AuthModule } from '@/auth/auth.module.js';
import { UsersModule } from '@/users/users.module.js';
import { ConversationsModule } from '@/conversations/conversations.module.js';
import { MessagesModule } from '@/messages/messages.module.js';
import { ChatModule } from '@/chat/chat.module.js';
import { RedisModule } from '@/redis/redis.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig, redisConfig, keycloakConfig] }),
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.getOrThrow<SequelizeModuleOptions>('database'),
    }),
    AuthModule,
    UsersModule,
    ConversationsModule,
    MessagesModule,
    ChatModule,
    RedisModule,
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ...(process.env.OBSERVE_APP_KEY && process.env.OBSERVE_APP_SECRET
      ? [
          ObserveModule.forRoot({
            appKey: process.env.OBSERVE_APP_KEY,
            appSecret: process.env.OBSERVE_APP_SECRET,
            serviceId: 'chat-backend',
          }),
        ]
      : []),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
