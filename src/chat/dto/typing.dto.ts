import { IsBoolean } from 'class-validator';
import { JoinConversationDto } from '@/chat/dto/join-conversation.dto.js';

export class TypingDto extends JoinConversationDto {
  @IsBoolean()
  isTyping: boolean;
}
