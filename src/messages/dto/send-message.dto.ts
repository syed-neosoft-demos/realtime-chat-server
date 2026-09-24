import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { MessageType } from '@/messages/models/message.model.js';

export class SendMessageDto {
  @IsUUID()
  conversationId: string;

  @IsOptional()
  @IsEnum(MessageType)
  messageType: MessageType = MessageType.TEXT;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(10000)
  content: string;
}
