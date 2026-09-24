import 'reflect-metadata';
import { Sequelize } from 'sequelize-typescript';
import { ChatUser } from '@/users/models/chat-user.model.js';
import { Conversation } from '@/conversations/models/conversation.model.js';
import { ConversationParticipant } from '@/conversations/models/conversation-participant.model.js';
import { Message } from '@/messages/models/message.model.js';

describe('Chat schema', () => {
  let connection: Sequelize;
  beforeAll(() => {
    connection = new Sequelize({
      dialect: 'postgres',
      logging: false,
      models: [ChatUser, Conversation, ConversationParticipant, Message],
    });
  });
  afterAll(async () => {
    await connection.close();
  });

  it('uses the diagram’s composite participant primary key', () => {
    expect(ConversationParticipant.primaryKeyAttributes).toEqual(['conversationId', 'userId']);
    expect(
      Object.values(ConversationParticipant.getAttributes()).map((attribute) => attribute.field),
    ).toEqual([
      'conversation_id',
      'user_id',
      'role',
      'joined_at',
      'left_at',
      'last_read_message_id',
      'created_at',
      'updated_at',
    ]);
  });
  it('uses explicit edit timestamps and soft deletion without updated_at', () => {
    expect(Message.getAttributes()).not.toHaveProperty('updatedAt');
    expect(Message.getAttributes().editedAt.field).toBe('edited_at');
    expect(Message.options.paranoid).toBe(true);
  });
  it('enforces unique Keycloak identities and direct-conversation pairs', () => {
    expect(ChatUser.getAttributes().keycloakUserId.unique).toBe(true);
    expect(Conversation.getAttributes().directKey.unique).toBe(true);
  });
  it('registers relationships without a circular table-creation dependency', () => {
    expect(connection.modelManager.getModelsTopoSortedByForeignKey()).not.toBeNull();
    expect(Message.associations.sender.target).toBe(ChatUser);
    expect(Message.associations.conversation.target).toBe(Conversation);
    expect(ConversationParticipant.associations.lastReadMessage.target).toBe(Message);
  });

  it('registers both directions of membership through the participant model', () => {
    expect(Conversation.associations.members).toMatchObject({
      associationType: 'BelongsToMany',
      target: ChatUser,
      foreignKey: 'conversationId',
      otherKey: 'userId',
      through: { model: ConversationParticipant },
    });
    expect(ChatUser.associations.conversations).toMatchObject({
      associationType: 'BelongsToMany',
      target: Conversation,
      foreignKey: 'userId',
      otherKey: 'conversationId',
      through: { model: ConversationParticipant },
    });
    // Membership rows remain available for role, joinedAt, and leftAt queries.
    expect(Conversation.associations.participants.target).toBe(ConversationParticipant);
    expect(ChatUser.associations.memberships.target).toBe(ConversationParticipant);
  });
});
