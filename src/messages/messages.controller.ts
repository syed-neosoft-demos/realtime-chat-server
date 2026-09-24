import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import type { ChatUser } from '@/users/models/chat-user.model.js';
import { MessagesService } from '@/messages/messages.service.js';
import { SendMessageDto } from '@/messages/dto/send-message.dto.js';
import { EditMessageDto } from '@/messages/dto/edit-message.dto.js';

@Controller('messages')
export class MessagesController {
  constructor(@Inject(MessagesService) private readonly messages: MessagesService) {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: ChatUser) {
    return this.messages.findOne(id, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: ChatUser) {
    return this.messages.remove(id, user.id);
  }

  @Get()
  list(
    @Query('conversationId', ParseUUIDPipe) conversationId: string,
    @CurrentUser() user: ChatUser,
  ) {
    return this.messages.list(conversationId, user.id);
  }

  @Post()
  send(@CurrentUser() user: ChatUser, @Body() dto: SendMessageDto) {
    return this.messages.send(user.id, dto);
  }

  @Patch(':id')
  edit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ChatUser,
    @Body() dto: EditMessageDto,
  ) {
    return this.messages.edit(id, user.id, dto);
  }
}
