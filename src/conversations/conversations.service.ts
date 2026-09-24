import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UniqueConstraintError } from 'sequelize';
import { UsersService } from '@/users/users.service.js';
import { ConversationsRepository } from '@/conversations/conversations.repository.js';
import { ConversationType } from '@/conversations/models/conversation.model.js';
import { ParticipantRole } from '@/conversations/models/conversation-participant.model.js';
import type { CreateGroupDto } from '@/conversations/dto/create-group.dto.js';
import type { UpdateGroupDto } from '@/conversations/dto/update-group.dto.js';

@Injectable()
export class ConversationsService {
  constructor(
    @Inject(ConversationsRepository) private readonly repository: ConversationsRepository,
    @Inject(UsersService) private readonly users: UsersService,
  ) {}

  list(userId: string) {
    return this.repository.findForUser(userId);
  }

  async findOne(conversationId: string, userId: string) {
    await this.assertMember(conversationId, userId);
    const conversation = await this.repository.findById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async remove(conversationId: string, actorId: string) {
    const conversation = await this.findOne(conversationId, actorId);
    if (conversation.type === ConversationType.GROUP)
      await this.requireGroupAdmin(conversationId, actorId);
    else if (conversation.createdBy !== actorId)
      throw new ForbiddenException('Only the creator can delete this direct conversation');
    await conversation.destroy();
  }

  async assertMember(conversationId: string, userId: string) {
    const membership = await this.repository.findMembership(conversationId, userId);
    if (!membership) throw new ForbiddenException('You are not an active conversation participant');
    return membership;
  }

  async createDirect(creatorId: string, otherUserId: string) {
    creatorId = creatorId.toLowerCase();
    otherUserId = otherUserId.toLowerCase();
    if (creatorId === otherUserId) throw new BadRequestException('Choose another user');
    await this.users.findById(otherUserId);
    const directKey = [creatorId, otherUserId].sort().join(':');
    const existing = await this.repository.findByDirectKey(directKey);
    if (existing) return existing;
    try {
      return await this.repository.sequelize.transaction(async (transaction) => {
        const conversation = await this.repository.create(
          { type: ConversationType.DIRECT, directKey, createdBy: creatorId },
          transaction,
        );
        await this.repository.addParticipants(
          [creatorId, otherUserId].map((userId) => ({ conversationId: conversation.id, userId })),
          transaction,
        );
        return conversation;
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        const concurrent = await this.repository.findByDirectKey(directKey);
        if (concurrent) return concurrent;
      }
      throw error;
    }
  }

  async createGroup(creatorId: string, dto: CreateGroupDto) {
    creatorId = creatorId.toLowerCase();
    const memberIds = [...new Set([creatorId, ...dto.memberIds.map((id) => id.toLowerCase())])];
    await Promise.all(memberIds.map((id) => this.users.findById(id)));
    return this.repository.sequelize.transaction(async (transaction) => {
      const conversation = await this.repository.create(
        {
          type: ConversationType.GROUP,
          name: dto.name,
          avatarUrl: dto.avatarUrl,
          createdBy: creatorId,
        },
        transaction,
      );
      await this.repository.addParticipants(
        memberIds.map((userId) => ({
          conversationId: conversation.id,
          userId,
          role: userId === creatorId ? ParticipantRole.ADMIN : ParticipantRole.MEMBER,
        })),
        transaction,
      );
      return conversation;
    });
  }

  private async requireGroupAdmin(conversationId: string, userId: string) {
    const membership = await this.assertMember(conversationId, userId);
    const conversation = await this.repository.findById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.type !== ConversationType.GROUP)
      throw new BadRequestException('This operation requires a group');
    if (membership.role !== ParticipantRole.ADMIN)
      throw new ForbiddenException('Group administrator access is required');
    return conversation;
  }

  async addMember(conversationId: string, actorId: string, userId: string) {
    await this.requireGroupAdmin(conversationId, actorId);
    await this.users.findById(userId);
    return this.repository.addMember(conversationId, userId);
  }

  async updateGroup(conversationId: string, actorId: string, dto: UpdateGroupDto) {
    const conversation = await this.requireGroupAdmin(conversationId, actorId);
    return conversation.update({
      ...(dto.name != null ? { name: dto.name } : {}),
      ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
    });
  }
}
