import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { RedisValueDto } from '@/redis/dto/redis-key.dto.js';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.client = new Redis(config.getOrThrow<string>('redis.url'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    this.client.on('error', (error: Error) => this.logger.error(error.message));
  }

  get(key: string) {
    return this.client.get(key);
  }
  set(key: string, value: string, ttlSeconds: number = 60) {
    return this.client.set(key, value, 'EX', ttlSeconds);
  }
  delete(key: string) {
    return this.client.del(key);
  }

  async health() {
    try {
      return { status: (await this.client.ping()) === 'PONG' ? 'up' : 'down' };
    } catch {
      throw new ServiceUnavailableException('Redis is unavailable');
    }
  }

  private userKey(userId: string, key: string = '') {
    return `api:user:${userId}:${key}`;
  }

  async listUserKeys(userId: string, cursor: string) {
    const prefix = this.userKey(userId);
    const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
    return { cursor: nextCursor, keys: keys.map((key) => key.slice(prefix.length)) };
  }

  async getUserKey(userId: string, key: string) {
    const value = await this.get(this.userKey(userId, key));
    if (value === null) throw new NotFoundException('Key not found');
    return { key, value };
  }

  async createUserKey(userId: string, key: string, dto: RedisValueDto) {
    const result = await this.client.set(
      this.userKey(userId, key),
      dto.value,
      'EX',
      dto.ttlSeconds,
      'NX',
    );
    if (!result) throw new ConflictException('Key already exists');
    return { key, value: dto.value, ttlSeconds: dto.ttlSeconds };
  }

  async updateUserKey(userId: string, key: string, dto: RedisValueDto) {
    const result = await this.client.set(
      this.userKey(userId, key),
      dto.value,
      'EX',
      dto.ttlSeconds,
      'XX',
    );
    if (!result) throw new NotFoundException('Key not found');
    return { key, value: dto.value, ttlSeconds: dto.ttlSeconds };
  }

  async removeUserKey(userId: string, key: string) {
    if (!(await this.delete(this.userKey(userId, key))))
      throw new NotFoundException('Key not found');
  }
  onModuleDestroy() {
    this.client.disconnect();
  }
}
