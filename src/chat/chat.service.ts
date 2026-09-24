import { Inject, Injectable } from '@nestjs/common';
import { ConversationsService } from '@/conversations/conversations.service.js';
import { RedisService } from '@/redis/redis.service.js';

@Injectable()
export class ChatService {
  constructor(
    @Inject(ConversationsService) private readonly conversations: ConversationsService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  async join(conversationId: string, userId: string) {
    await this.conversations.assertMember(conversationId, userId);
    return `conversation:${conversationId}`;
  }

  async typing(conversationId: string, userId: string, isTyping: boolean) {
    const room = await this.join(conversationId, userId);
    const key = `${room}:typing:${userId}`;
    if (isTyping) await this.redis.set(key, '1', 5);
    else await this.redis.delete(key);
    return room;
  }
}
