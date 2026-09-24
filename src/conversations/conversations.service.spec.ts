import { ForbiddenException } from '@nestjs/common';
import { ConversationsService } from '@/conversations/conversations.service.js';
import type { ConversationsRepository } from '@/conversations/conversations.repository.js';
import type { UsersService } from '@/users/users.service.js';
import { ConversationType } from '@/conversations/models/conversation.model.js';
import { ParticipantRole } from '@/conversations/models/conversation-participant.model.js';

describe('Conversation deletion', () => {
  const repository = { findById: vi.fn(), findMembership: vi.fn() };
  const service = new ConversationsService(
    repository as unknown as ConversationsRepository,
    {} as UsersService,
  );
  beforeEach(() => vi.resetAllMocks());

  it('rejects nonparticipants', async () => {
    repository.findMembership.mockResolvedValue(null);
    await expect(service.remove('chat', 'outsider')).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('requires group administrator access', async () => {
    const destroy = vi.fn();
    repository.findMembership.mockResolvedValue({ role: ParticipantRole.MEMBER });
    repository.findById.mockResolvedValue({ type: ConversationType.GROUP, destroy });
    await expect(service.remove('chat', 'member')).rejects.toBeInstanceOf(ForbiddenException);
    expect(destroy).not.toHaveBeenCalled();
  });

  it('allows group administrators to delete a group', async () => {
    const destroy = vi.fn();
    repository.findMembership.mockResolvedValue({ role: ParticipantRole.ADMIN });
    repository.findById.mockResolvedValue({ type: ConversationType.GROUP, destroy });
    await service.remove('chat', 'admin');
    expect(destroy).toHaveBeenCalledOnce();
  });

  it('requires the creator to delete a direct chat', async () => {
    const destroy = vi.fn();
    repository.findMembership.mockResolvedValue({ role: ParticipantRole.MEMBER });
    repository.findById.mockResolvedValue({
      type: ConversationType.DIRECT,
      createdBy: 'creator',
      destroy,
    });
    await expect(service.remove('chat', 'member')).rejects.toBeInstanceOf(ForbiddenException);
    expect(destroy).not.toHaveBeenCalled();
  });
});
