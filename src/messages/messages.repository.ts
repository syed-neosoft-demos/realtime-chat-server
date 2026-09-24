import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Conversation } from '@/conversations/models/conversation.model.js';
import { Message } from '@/messages/models/message.model.js';
import type { SendMessageDto } from '@/messages/dto/send-message.dto.js';

@Injectable()
export class MessagesRepository {
  constructor(
    @InjectModel(Message) private readonly messages: typeof Message,
    @InjectModel(Conversation) private readonly conversations: typeof Conversation,
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {}

  list(conversationId: string) {
    return this.messages.findAll({
      where: { conversationId },
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: 50,
    });
  }
  findById(id: string) {
    return this.messages.findByPk(id);
  }

  async remove(message: Message) {
    await this.sequelize.transaction(async (transaction) => {
      const conversation = await this.conversations.findByPk(message.conversationId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
        rejectOnEmpty: true,
      });
      await message.destroy({ transaction });
      const latest = await this.messages.findOne({
        where: { conversationId: message.conversationId },
        order: [
          ['createdAt', 'DESC'],
          ['id', 'DESC'],
        ],
        transaction,
      });
      await conversation.update(
        { lastMessageId: latest?.id ?? null, lastMessageAt: latest?.createdAt ?? null },
        { transaction },
      );
    });
  }

  create(senderId: string, dto: SendMessageDto) {
    return this.sequelize.transaction(async (transaction) => {
      // Serialize sends per conversation so its last-message pointer stays current.
      const conversation = await this.conversations.findByPk(dto.conversationId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
        rejectOnEmpty: true,
      });
      const message = await this.messages.create(
        {
          conversationId: dto.conversationId,
          senderId,
          content: dto.content,
          messageType: dto.messageType,
        },
        { transaction },
      );
      await conversation.update(
        { lastMessageId: message.id, lastMessageAt: message.createdAt },
        { transaction },
      );
      return message;
    });
  }
}
