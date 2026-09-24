import { Module } from '@nestjs/common';
import { RedisService } from '@/redis/redis.service.js';
import { RedisController } from '@/redis/redis.controller.js';

@Module({ controllers: [RedisController], providers: [RedisService], exports: [RedisService] })
export class RedisModule {}
