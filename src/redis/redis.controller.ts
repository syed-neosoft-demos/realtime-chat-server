import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import type { ChatUser } from '@/users/models/chat-user.model.js';
import { RedisService } from '@/redis/redis.service.js';
import {
  CreateRedisKeyDto,
  ListRedisKeysDto,
  RedisKeyDto,
  RedisValueDto,
} from '@/redis/dto/redis-key.dto.js';

@Controller('redis')
export class RedisController {
  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  @Get('health')
  health() {
    return this.redis.health();
  }

  @Get('keys')
  list(@CurrentUser() user: ChatUser, @Query() dto: ListRedisKeysDto) {
    return this.redis.listUserKeys(user.id, dto.cursor);
  }

  @Post('keys')
  create(@CurrentUser() user: ChatUser, @Body() dto: CreateRedisKeyDto) {
    return this.redis.createUserKey(user.id, dto.key, dto);
  }

  @Get('keys/:key')
  findOne(@CurrentUser() user: ChatUser, @Param() dto: RedisKeyDto) {
    return this.redis.getUserKey(user.id, dto.key);
  }

  @Patch('keys/:key')
  update(@CurrentUser() user: ChatUser, @Param() params: RedisKeyDto, @Body() dto: RedisValueDto) {
    return this.redis.updateUserKey(user.id, params.key, dto);
  }

  @Delete('keys/:key')
  @HttpCode(204)
  remove(@CurrentUser() user: ChatUser, @Param() dto: RedisKeyDto) {
    return this.redis.removeUserKey(user.id, dto.key);
  }
}
