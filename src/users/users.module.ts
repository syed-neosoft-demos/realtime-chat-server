import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UsersController } from '@/users/users.controller.js';
import { UsersService } from '@/users/users.service.js';
import { ChatUser } from '@/users/models/chat-user.model.js';
import { Conversation } from '@/conversations/models/conversation.model.js';
import { ConversationParticipant } from '@/conversations/models/conversation-participant.model.js';
import { UsersRepository } from './users.repository.js';

@Module({
  imports: [SequelizeModule.forFeature([ChatUser, Conversation, ConversationParticipant])],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
