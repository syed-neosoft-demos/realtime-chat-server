import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { ChatUser } from '@/users/models/chat-user.model.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ChatUser => {
    if (context.getType() === 'ws') {
      return context.switchToWs().getClient<{ data: { user: ChatUser } }>().data.user;
    }
    return context.switchToHttp().getRequest<{ user: ChatUser }>().user;
  },
);
