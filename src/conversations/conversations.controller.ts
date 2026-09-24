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
} from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import type { ChatUser } from '@/users/models/chat-user.model.js';
import { ConversationsService } from '@/conversations/conversations.service.js';
import { CreateDirectChatDto } from '@/conversations/dto/create-direct-chat.dto.js';
import { CreateGroupDto } from '@/conversations/dto/create-group.dto.js';
import { AddMemberDto } from '@/conversations/dto/add-member.dto.js';
import { UpdateGroupDto } from '@/conversations/dto/update-group.dto.js';

@Controller('conversations')
export class ConversationsController {
  constructor(@Inject(ConversationsService) private readonly conversations: ConversationsService) {}

  @Get()
  list(@CurrentUser() user: ChatUser) {
    return this.conversations.list(user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: ChatUser) {
    return this.conversations.findOne(id, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: ChatUser) {
    return this.conversations.remove(id, user.id);
  }

  @Post('direct')
  createDirect(@CurrentUser() user: ChatUser, @Body() dto: CreateDirectChatDto) {
    return this.conversations.createDirect(user.id, dto.userId);
  }

  @Post('groups')
  createGroup(@CurrentUser() user: ChatUser, @Body() dto: CreateGroupDto) {
    return this.conversations.createGroup(user.id, dto);
  }

  @Post(':id/members')
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ChatUser,
    @Body() dto: AddMemberDto,
  ) {
    return this.conversations.addMember(id, user.id, dto.userId);
  }

  @Patch(':id')
  updateGroup(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ChatUser,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.conversations.updateGroup(id, user.id, dto);
  }
}
