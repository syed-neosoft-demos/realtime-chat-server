import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';

import { ChatUser } from '@/users/models/chat-user.model.js';
import { Conversation } from '@/conversations/models/conversation.model.js';
import { ConversationParticipant } from '@/conversations/models/conversation-participant.model.js';
import type { SearchUserDto } from '@/users/dto/search-user.dto.js';

type UserProfile = Pick<ChatUser, 'id' | 'displayName' | 'avatarUrl'>;

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(ConversationParticipant)
    private readonly participants: typeof ConversationParticipant,
  ) {}

  async searchConversationUsers(userId: string, dto: SearchUserDto) {
    const rows = await this.participants.findAll({
      attributes: ['conversationId', 'userId'],
      where: { userId, leftAt: null },
      include: [
        {
          model: Conversation,
          as: 'conversation',
          attributes: ['id'],
          required: true,
          include: [
            {
              model: ConversationParticipant,
              as: 'participants',
              attributes: ['conversationId', 'userId'],
              required: true,
              where: {
                userId: { [Op.ne]: userId },
                leftAt: null,
              },
              include: [
                {
                  model: ChatUser,
                  as: 'user',
                  attributes: ['id', 'displayName', 'avatarUrl'],
                  required: true,
                  // where: dto.query
                  //   ? {
                  //       displayName: {
                  //         [Op.iLike]: `%${dto.query}%`,
                  //       },
                  //     }
                  //   : {},
                },
              ],
            },
          ],
        },
      ],
    });

    const unique = new Map<string, UserProfile>();

    for (const row of rows) {
      for (const participant of row.conversation.participants) {
        const user = participant.user;
        unique.set(user.id, {
          id: user.id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        });
      }
    }

    return [...unique.values()]
      .sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id))
      .slice(0, dto.limit);
  }
}
