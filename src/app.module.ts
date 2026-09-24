import { Module } from '@nestjs/common';
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
