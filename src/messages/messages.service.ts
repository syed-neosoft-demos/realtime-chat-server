import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConversationsService } from '@/conversations/conversations.service.js';
import { MessagesRepository } from '@/messages/messages.repository.js';
import type { SendMessageDto } from '@/messages/dto/send-message.dto.js';
import type { EditMessageDto } from '@/messages/dto/edit-message.dto.js';

@Injectable()
export class MessagesService {
  constructor(
    @Inject(MessagesRepository) private readonly repository: MessagesRepository,
    @Inject(ConversationsService) private readonly conversations: ConversationsService,
  ) {}

  async list(conversationId: string, userId: string) {
    await this.conversations.assertMember(conversationId, userId);
    return this.repository.list(conversationId);
  }

  async findOne(messageId: string, userId: string) {
    const message = await this.repository.findById(messageId);
    if (!message) throw new NotFoundException('Message not found');
    await this.conversations.assertMember(message.conversationId, userId);
    return message;
  }

  async remove(messageId: string, userId: string) {
    const message = await this.findOne(messageId, userId);
    if (message.senderId !== userId)
      throw new ForbiddenException('Only the sender can delete this message');
    await this.repository.remove(message);
  }

  async send(userId: string, dto: SendMessageDto) {
    await this.conversations.assertMember(dto.conversationId, userId);
    return this.repository.create(userId, dto);
  }

  async edit(messageId: string, userId: string, dto: EditMessageDto) {
    const message = await this.repository.findById(messageId);
    if (!message) throw new NotFoundException('Message not found');
    await this.conversations.assertMember(message.conversationId, userId);
    if (message.senderId !== userId)
      throw new ForbiddenException('Only the sender can edit this message');
    return message.update({ content: dto.content, editedAt: new Date() });
  }
}
