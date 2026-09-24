import { Inject, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
  type OnGatewayConnection,
} from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import { WebsocketAuthGuard } from '@/common/guards/websocket-auth.guard.js';
import type { ChatUser } from '@/users/models/chat-user.model.js';
import { ChatService } from '@/chat/chat.service.js';
import { JoinConversationDto } from '@/chat/dto/join-conversation.dto.js';
import { TypingDto } from '@/chat/dto/typing.dto.js';

@WebSocketGateway({ namespace: '/chat' })
@UseGuards(WebsocketAuthGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory: () => new WsException('Invalid event payload'),
  }),
)
export class ChatGateway implements OnGatewayConnection {
  constructor(
    @Inject(ChatService) private readonly chat: ChatService,
    @Inject(WebsocketAuthGuard) private readonly auth: WebsocketAuthGuard,
  ) {}

  async handleConnection(client: Socket) {
    try {
      await this.auth.authenticate(client);
      const expiresAt = client.data.tokenExpiresAt as number;
      const timer = setTimeout(
        () => client.disconnect(true),
        Math.min(Math.max(0, expiresAt - Date.now()), 2_147_483_647),
      );
      timer.unref();
      client.once('disconnect', () => clearTimeout(timer));
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('join-conversation')
  async join(
    @ConnectedSocket() client: Socket,
    @CurrentUser() user: ChatUser,
    @MessageBody() dto: JoinConversationDto,
  ) {
    try {
      const room = await this.chat.join(dto.conversationId, user.id);
      await client.join(room);
      return { conversationId: dto.conversationId, joined: true };
    } catch {
      throw new WsException('Unable to join conversation');
    }
  }

  @SubscribeMessage('typing')
  async typing(
    @ConnectedSocket() client: Socket,
    @CurrentUser() user: ChatUser,
    @MessageBody() dto: TypingDto,
  ) {
    try {
      const room = await this.chat.typing(dto.conversationId, user.id, dto.isTyping);
      client.to(room).emit('typing', {
        conversationId: dto.conversationId,
        userId: user.id,
        isTyping: dto.isTyping,
      });
      return { success: true };
    } catch {
      throw new WsException('Unable to update typing status');
    }
  }
}
