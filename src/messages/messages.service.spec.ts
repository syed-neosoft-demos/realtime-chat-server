import { ForbiddenException } from '@nestjs/common';
import { MessagesService } from '@/messages/messages.service.js';
import type { MessagesRepository } from '@/messages/messages.repository.js';
import type { ConversationsService } from '@/conversations/conversations.service.js';
import { MessageType } from '@/messages/models/message.model.js';

describe('MessagesService authorization', () => {
  const repository = { create: vi.fn(), list: vi.fn(), findById: vi.fn(), remove: vi.fn() };
  const conversations = { assertMember: vi.fn() };
  const service = new MessagesService(
    repository as unknown as MessagesRepository,
    conversations as unknown as ConversationsService,
  );

  beforeEach(() => vi.resetAllMocks());

  it('blocks deleting another participant’s message', async () => {
    repository.findById.mockResolvedValue({ conversationId: 'chat', senderId: 'sender' });
    await expect(service.remove('message', 'other-user')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('blocks former members from deleting their messages', async () => {
    repository.findById.mockResolvedValue({ conversationId: 'chat', senderId: 'sender' });
    conversations.assertMember.mockRejectedValue(new ForbiddenException());
    await expect(service.remove('message', 'sender')).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('allows a sender with active membership to delete a message', async () => {
    const message = { conversationId: 'chat', senderId: 'sender' };
    repository.findById.mockResolvedValue(message);
    await service.remove('message', 'sender');
    expect(repository.remove).toHaveBeenCalledWith(message);
  });

  it('blocks sends by nonparticipants', async () => {
    conversations.assertMember.mockRejectedValue(new ForbiddenException());
    await expect(
      service.send('outsider', {
        conversationId: 'chat',
        content: 'Hello',
        messageType: MessageType.TEXT,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('blocks reading messages by nonparticipants', async () => {
    conversations.assertMember.mockRejectedValue(new ForbiddenException());
    await expect(service.list('chat', 'outsider')).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.list).not.toHaveBeenCalled();
  });

  it('blocks editing another participant’s message', async () => {
    const update = vi.fn();
    repository.findById.mockResolvedValue({ conversationId: 'chat', senderId: 'sender', update });
    await expect(
      service.edit('message', 'other-user', { content: 'Changed' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });

  it('records an edit timestamp for the sender', async () => {
    const update = vi.fn().mockResolvedValue({ content: 'Changed' });
    repository.findById.mockResolvedValue({ conversationId: 'chat', senderId: 'sender', update });
    await service.edit('message', 'sender', { content: 'Changed' });
    expect(update).toHaveBeenCalledWith({ content: 'Changed', editedAt: expect.any(Date) });
  });
});
