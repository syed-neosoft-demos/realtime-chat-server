import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConversationsModule } from '@/conversations/conversations.module.js';
import { Conversation } from '@/conversations/models/conversation.model.js';
import { Message } from '@/messages/models/message.model.js';
import { MessagesController } from '@/messages/messages.controller.js';
import { MessagesService } from '@/messages/messages.service.js';
import { MessagesRepository } from '@/messages/messages.repository.js';

@Module({
  imports: [SequelizeModule.forFeature([Message, Conversation]), ConversationsModule],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesRepository],
  exports: [MessagesService],
})
export class MessagesModule {}
