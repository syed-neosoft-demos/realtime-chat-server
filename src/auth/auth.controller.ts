import { Body, Controller, Delete, Get, HttpCode, Inject, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import type { ChatUser } from '@/users/models/chat-user.model.js';
import { UsersService } from '@/users/users.service.js';
import { CreateUserDto } from '@/users/dto/create-user.dto.js';
import { UpdateUserDto } from '@/users/dto/update-user.dto.js';

@Controller('auth')
export class AuthController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Post('profile')
  @HttpCode(200)
  create(@CurrentUser() user: ChatUser, @Body() dto: CreateUserDto) {
    return this.users.update(user.id, user.id, dto);
  }

  @Get('profile')
  findOne(@CurrentUser() user: ChatUser) {
    return user;
  }

  @Patch('profile')
  update(@CurrentUser() user: ChatUser, @Body() dto: UpdateUserDto) {
    return this.users.update(user.id, user.id, dto);
  }

  @Delete('profile')
  @HttpCode(204)
  remove(@CurrentUser() user: ChatUser) {
    return this.users.remove(user.id, user.id);
  }
}
