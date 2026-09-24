import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import type { CreationAttributes, Transaction } from 'sequelize';
import { Conversation } from '@/conversations/models/conversation.model.js';
import { ConversationParticipant } from '@/conversations/models/conversation-participant.model.js';

@Injectable()
export class ConversationsRepository {
  constructor(
    @InjectModel(Conversation) private readonly conversations: typeof Conversation,
    @InjectModel(ConversationParticipant)
    private readonly participants: typeof ConversationParticipant,
    @InjectConnection() readonly sequelize: Sequelize,
  ) {}

  findById(id: string) {
    return this.conversations.findByPk(id);
  }
  findByDirectKey(directKey: string) {
    return this.conversations.findOne({ where: { directKey } });
  }
  findForUser(userId: string) {
    return this.conversations.findAll({
      include: [
        { model: ConversationParticipant, where: { userId, leftAt: null }, attributes: [] },
      ],
      order: [['updatedAt', 'DESC']],
      limit: 100,
    });
  }
  findMembership(conversationId: string, userId: string) {
    return this.participants.findOne({ where: { conversationId, userId, leftAt: null } });
  }
  create(values: CreationAttributes<Conversation>, transaction: Transaction) {
    return this.conversations.create(values, { transaction });
  }
  addParticipants(values: CreationAttributes<ConversationParticipant>[], transaction: Transaction) {
    return this.participants.bulkCreate(values, { transaction });
  }
  async addMember(conversationId: string, userId: string) {
    const [participant] = await this.participants.findOrCreate({
      where: { conversationId, userId },
      defaults: { conversationId, userId },
    });
    if (participant.leftAt) await participant.update({ leftAt: null, joinedAt: new Date() });
    return participant;
  }
}
