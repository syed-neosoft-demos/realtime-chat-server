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
import { UsersService } from '@/users/users.service.js';
import { SearchUserDto } from '@/users/dto/search-user.dto.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import type { ChatUser } from '@/users/models/chat-user.model.js';
import { CreateUserDto } from '@/users/dto/create-user.dto.js';
import { UpdateUserDto } from '@/users/dto/update-user.dto.js';

@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Get()
  search(@Query() query: SearchUserDto) {
    return this.users.search(query);
  }

  @Get('me')
  me(@CurrentUser() user: ChatUser) {
    console.log('user :>> ', user.id);
    return user;
  }

  // The JWT guard provisions the identity; POST completes that user's profile.
  @Post()
  @HttpCode(200)
  create(@CurrentUser() user: ChatUser, @Body() dto: CreateUserDto) {
    return this.users.update(user.id, user.id, dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.getProfile(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ChatUser,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: ChatUser) {
    return this.users.remove(id, user.id);
  }
}
