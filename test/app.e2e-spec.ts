import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import request from 'supertest';
import type { App } from 'supertest/types';
// Exercise the compiled app, including TypeScript's emitted DTO metadata.
import { AppModule } from '@/app.module.js';
import { AuthService } from '@/auth/auth.service.js';
import { ChatUser } from '@/users/models/chat-user.model.js';
import { Conversation } from '@/conversations/models/conversation.model.js';
import { ConversationParticipant } from '@/conversations/models/conversation-participant.model.js';
import { Message } from '@/messages/models/message.model.js';
import { UsersService } from '@/users/users.service.js';
import { ConversationsService } from '@/conversations/conversations.service.js';
import { MessagesService } from '@/messages/messages.service.js';
import { RedisService } from '@/redis/redis.service.js';

describe('Application HTTP wiring', () => {
  let app: INestApplication<App>;
  const id = 'd6f8744c-f6a9-45f1-8e29-e895c962f555';
  const conversations = {
    list: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue({ id }),
    createGroup: vi.fn().mockResolvedValue({ id }),
    createDirect: vi.fn().mockResolvedValue({ id }),
    updateGroup: vi.fn().mockResolvedValue({ id }),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  const redis = {
    health: vi.fn().mockResolvedValue({ status: 'up' }),
    listUserKeys: vi.fn().mockResolvedValue({ cursor: '0', keys: [] }),
    createUserKey: vi.fn().mockResolvedValue({ key: 'draft', value: 'Hello' }),
    getUserKey: vi.fn().mockResolvedValue({ key: 'draft', value: 'Hello' }),
    updateUserKey: vi.fn().mockResolvedValue({ key: 'draft', value: 'Updated' }),
    removeUserKey: vi.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const connection = new Sequelize({
      dialect: 'postgres',
      logging: false,
      models: [ChatUser, Conversation, ConversationParticipant, Message],
    });
    const fixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(getConnectionToken())
      .useValue(connection)
      .overrideProvider(AuthService)
      .useValue({
        authenticate: vi.fn().mockResolvedValue({ id: 'd6f8744c-f6a9-45f1-8e29-e895c962f555' }),
      })
      .overrideProvider(UsersService)
      .useValue({
        update: vi.fn().mockResolvedValue({ id, displayName: 'Alice' }),
        getProfile: vi.fn().mockResolvedValue({ id, displayName: 'Alice' }),
        remove: vi.fn().mockResolvedValue(undefined),
      })
      .overrideProvider(ConversationsService)
      .useValue(conversations)
      .overrideProvider(MessagesService)
      .useValue({
        findOne: vi.fn().mockResolvedValue({ id, content: 'Hello' }),
        remove: vi.fn().mockResolvedValue(undefined),
      })
      .overrideProvider(RedisService)
      .useValue(redis)
      .compile();
    app = fixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  it('keeps the root route public', () =>
    request(app.getHttpServer()).get('/').expect(200).expect('Hello World!'));
  it('requires authentication on user routes', () =>
    request(app.getHttpServer()).get('/users').expect(401));
  it('provides the current authenticated user', () =>
    request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', 'Bearer test-token')
      .expect(200)
      .expect({ id: 'd6f8744c-f6a9-45f1-8e29-e895c962f555' }));
  it('rejects invalid message payloads before database access', () =>
    request(app.getHttpServer())
      .post('/messages')
      .set('Authorization', 'Bearer test-token')
      .send({ conversationId: 'invalid', content: ' ' })
      .expect(400));
  it('rejects client-supplied sender identities', () =>
    request(app.getHttpServer())
      .post('/messages')
      .set('Authorization', 'Bearer test-token')
      .send({
        conversationId: 'd6f8744c-f6a9-45f1-8e29-e895c962f555',
        content: 'Hello',
        senderId: 'someone-else',
      })
      .expect(400));

  const routes: {
    method: 'get' | 'post' | 'patch' | 'delete';
    path: string;
    body?: object;
    status: number;
  }[] = [
    { method: 'post', path: '/users', body: { displayName: 'Alice' }, status: 200 },
    { method: 'get', path: `/users/${id}`, status: 200 },
    { method: 'patch', path: `/users/${id}`, body: { displayName: 'Alice' }, status: 200 },
    { method: 'delete', path: `/users/${id}`, status: 204 },
    { method: 'post', path: '/auth/profile', body: { displayName: 'Alice' }, status: 200 },
    { method: 'get', path: '/auth/profile', status: 200 },
    { method: 'patch', path: '/auth/profile', body: { displayName: 'Alice' }, status: 200 },
    { method: 'delete', path: '/auth/profile', status: 204 },
    { method: 'get', path: `/conversations/${id}`, status: 200 },
    { method: 'delete', path: `/conversations/${id}`, status: 204 },
    { method: 'post', path: '/chat/groups', body: { name: 'Team', memberIds: [id] }, status: 201 },
    { method: 'get', path: `/chat/${id}`, status: 200 },
    { method: 'patch', path: `/chat/${id}`, body: { name: 'Team' }, status: 200 },
    { method: 'delete', path: `/chat/${id}`, status: 204 },
    { method: 'get', path: `/messages/${id}`, status: 200 },
    { method: 'delete', path: `/messages/${id}`, status: 204 },
    { method: 'post', path: '/redis/keys', body: { key: 'draft', value: 'Hello' }, status: 201 },
    { method: 'get', path: '/redis/keys/draft', status: 200 },
    { method: 'patch', path: '/redis/keys/draft', body: { value: 'Updated' }, status: 200 },
    { method: 'delete', path: '/redis/keys/draft', status: 204 },
  ];

  it.each(routes)('routes $method $path to its module', async ({ method, path, body, status }) => {
    const req = request(app.getHttpServer())
      [method](path)
      .set('Authorization', 'Bearer test-token');
    if (body) req.send(body);
    await req.expect(status);
  });

  it.each(routes)('protects $method $path', async ({ method, path, body }) => {
    const req = request(app.getHttpServer())[method](path);
    if (body) req.send(body);
    await req.expect(401);
  });

  it('passes the authenticated identity to user-scoped Redis mutations', async () => {
    await request(app.getHttpServer())
      .post('/redis/keys')
      .set('Authorization', 'Bearer test-token')
      .send({ key: 'draft', value: 'Hello' })
      .expect(201);
    expect(redis.createUserKey).toHaveBeenLastCalledWith(
      id,
      'draft',
      expect.objectContaining({ value: 'Hello', ttlSeconds: 3600 }),
    );
  });

  it('rejects null Redis TTLs', () =>
    request(app.getHttpServer())
      .post('/redis/keys')
      .set('Authorization', 'Bearer test-token')
      .send({ key: 'draft', value: 'Hello', ttlSeconds: null })
      .expect(400));

  afterAll(async () => {
    await app?.close();
  });
});
