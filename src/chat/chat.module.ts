import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module.js';
import { ConversationsModule } from '@/conversations/conversations.module.js';
import { RedisModule } from '@/redis/redis.module.js';
import { ChatGateway } from '@/chat/chat.gateway.js';
import { ChatService } from '@/chat/chat.service.js';
import { ChatController } from '@/chat/chat.controller.js';

@Module({
  imports: [AuthModule, ConversationsModule, RedisModule],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
