import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ForeignKeyConstraintError } from 'sequelize';
import { UsersService } from '@/users/users.service.js';
import type { ChatUser } from '@/users/models/chat-user.model.js';

describe('Profile mutations', () => {
  const model = { findByPk: vi.fn() };
  const users = new UsersService(model as unknown as typeof ChatUser);
  beforeEach(() => vi.resetAllMocks());

  it('rejects updates to other users before querying the database', async () => {
    await expect(
      users.update('another-user', 'actor', { displayName: 'Changed' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(model.findByPk).not.toHaveBeenCalled();
  });

  it('rejects deleting another user', async () => {
    await expect(users.remove('another-user', 'actor')).rejects.toBeInstanceOf(ForbiddenException);
    expect(model.findByPk).not.toHaveBeenCalled();
  });

  it('only updates allowed profile fields', async () => {
    const update = vi.fn();
    model.findByPk.mockResolvedValue({ update });
    await users.update('actor', 'actor', {
      displayName: 'Alice',
      avatarUrl: null,
      keycloakUserId: 'forged',
    } as Parameters<UsersService['update']>[2]);
    expect(update).toHaveBeenCalledWith({ displayName: 'Alice', avatarUrl: null });
  });

  it('reports a conflict when chat history references the profile', async () => {
    model.findByPk.mockResolvedValue({
      destroy: vi.fn().mockRejectedValue(new ForeignKeyConstraintError()),
    });
    await expect(users.remove('actor', 'actor')).rejects.toBeInstanceOf(ConflictException);
  });
});
