import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UsersModule } from '@/users/users.module.js';
import { Conversation } from '@/conversations/models/conversation.model.js';
import { ConversationParticipant } from '@/conversations/models/conversation-participant.model.js';
import { ConversationsController } from '@/conversations/conversations.controller.js';
import { ConversationsService } from '@/conversations/conversations.service.js';
import { ConversationsRepository } from '@/conversations/conversations.repository.js';

@Module({
  imports: [SequelizeModule.forFeature([Conversation, ConversationParticipant]), UsersModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsRepository],
  exports: [ConversationsService],
})
export class ConversationsModule {}
