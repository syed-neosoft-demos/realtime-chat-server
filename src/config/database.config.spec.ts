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
    ]);
  });
  it('uses a nullable updated_at edit timestamp and soft deletion', () => {
    expect(Message.getAttributes()).not.toHaveProperty('editedAt');
    expect(Message.getAttributes().updatedAt).toMatchObject({
      field: 'updated_at',
      allowNull: true,
    });
    expect(Message.options.updatedAt).toBe(false);
    expect(Message.build({ content: 'New message' }).updatedAt).toBeUndefined();
    expect(Message.options.paranoid).toBe(true);
  });
  it('enforces unique Keycloak identities and direct-conversation pairs', () => {
    expect(ChatUser.getAttributes().keycloakUserId.unique).toBe(true);
    expect(Conversation.getAttributes().directKey.unique).toBe(true);
  });
  it('enforces all seven foreign keys, including the circular last-message reference', () => {
    // Sequelize creates cyclic tables in two passes, adding foreign keys afterward.
    expect(connection.modelManager.getModelsTopoSortedByForeignKey()).toBeNull();
    for (const [model, attribute, table] of [
      [Conversation, 'createdBy', 'chat_users'],
      [Conversation, 'lastMessageId', 'messages'],
      [Message, 'conversationId', 'conversations'],
      [Message, 'senderId', 'chat_users'],
      [ConversationParticipant, 'conversationId', 'conversations'],
      [ConversationParticipant, 'userId', 'chat_users'],
      [ConversationParticipant, 'lastReadMessageId', 'messages'],
    ] as const) {
      expect(model.getAttributes()[attribute].references).toMatchObject({
        model: table,
        key: 'id',
      });
    }
    expect(Message.associations.sender.target).toBe(ChatUser);
    expect(Message.associations.conversation.target).toBe(Conversation);
    expect(ConversationParticipant.associations.lastReadMessage.target).toBe(Message);
  });

  it('matches column types, nullability, and exact column sets from the diagram', () => {
    const schemas = [
      [
        ChatUser,
        {
          id: ['UUID', false],
          keycloak_user_id: ['UUID', false],
          display_name: ['VARCHAR(255)', false],
          avatar_url: ['VARCHAR(500)', true],
          created_at: ['TIMESTAMP WITH TIME ZONE', false],
          updated_at: ['TIMESTAMP WITH TIME ZONE', false],
        },
      ],
      [
        Conversation,
        {
          id: ['UUID', false],
          type: ['VARCHAR(20)', false],
          name: ['VARCHAR(255)', true],
          avatar_url: ['VARCHAR(500)', true],
          direct_key: ['VARCHAR(128)', true],
          created_by: ['UUID', false],
          last_message_id: ['UUID', true],
          last_message_at: ['TIMESTAMP WITH TIME ZONE', true],
          created_at: ['TIMESTAMP WITH TIME ZONE', false],
          updated_at: ['TIMESTAMP WITH TIME ZONE', false],
        },
      ],
      [
        Message,
        {
          id: ['UUID', false],
          conversation_id: ['UUID', false],
          sender_id: ['UUID', false],
          message_type: ['VARCHAR(20)', false],
          content: ['TEXT', false],
          created_at: ['TIMESTAMP WITH TIME ZONE', false],
          updated_at: ['TIMESTAMP WITH TIME ZONE', true],
          deleted_at: ['TIMESTAMP WITH TIME ZONE', true],
        },
      ],
      [
        ConversationParticipant,
        {
          conversation_id: ['UUID', false],
          user_id: ['UUID', false],
          role: ['VARCHAR(20)', false],
          joined_at: ['TIMESTAMP WITH TIME ZONE', false],
          left_at: ['TIMESTAMP WITH TIME ZONE', true],
          last_read_message_id: ['UUID', true],
        },
      ],
    ] as const;
    for (const [model, expected] of schemas) {
      const actual = Object.fromEntries(
        Object.values(model.getAttributes()).map((attribute) => [
          attribute.field,
          [attribute.type.toString(), attribute.allowNull],
        ]),
      );
      expect(actual).toEqual(expected);
    }
  });

  it('declares database defaults and the requested indexes', () => {
    for (const model of [ChatUser, Conversation, Message]) {
      expect(model.getAttributes().id.defaultValue).toMatchObject({ val: 'gen_random_uuid()' });
      expect(model.getAttributes().createdAt.defaultValue).toMatchObject({
        val: 'CURRENT_TIMESTAMP',
      });
    }
    for (const model of [ChatUser, Conversation]) {
      expect(model.getAttributes().updatedAt.defaultValue).toMatchObject({
        val: 'CURRENT_TIMESTAMP',
      });
    }
    expect(ConversationParticipant.getAttributes().joinedAt.defaultValue).toMatchObject({
      val: 'CURRENT_TIMESTAMP',
    });
    expect(ConversationParticipant.getAttributes().role.defaultValue).toBe('member');
    expect(Message.getAttributes().messageType.defaultValue).toBe('text');
    expect(Message.getAttributes().updatedAt.defaultValue).toBeUndefined();
    expect(Message.options.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'idx_messages_conversation_created',
          fields: ['conversation_id', 'created_at'],
        }),
      ]),
    );
    expect(Conversation.options.indexes).toEqual(
      expect.arrayContaining([expect.objectContaining({ fields: ['last_message_at'] })]),
    );
    expect(ConversationParticipant.options.indexes).toEqual(
      expect.arrayContaining([expect.objectContaining({ fields: ['user_id'] })]),
    );
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
