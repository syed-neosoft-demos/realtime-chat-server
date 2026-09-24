import { Controller, Inject } from '@nestjs/common';
import { ConversationsController } from '@/conversations/conversations.controller.js';
import { ConversationsService } from '@/conversations/conversations.service.js';

// Expose the same conversation CRUD under /chat, alongside the Socket.IO namespace.
@Controller('chat')
export class ChatController extends ConversationsController {
  constructor(@Inject(ConversationsService) conversations: ConversationsService) {
    super(conversations);
  }
}
