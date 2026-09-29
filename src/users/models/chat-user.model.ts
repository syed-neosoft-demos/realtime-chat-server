import {
  AllowNull,
  BelongsToMany,
  Column,
  CreatedAt,
  DataType,
  Default,
  HasMany,
  Model,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from 'sequelize-typescript';
import { literal, type NonAttribute } from 'sequelize';
import { ConversationParticipant } from '@/conversations/models/conversation-participant.model.js';
import { Conversation } from '@/conversations/models/conversation.model.js';
import { Message } from '@/messages/models/message.model.js';

@Table({ tableName: 'chat_users', underscored: true, timestamps: true })
export class ChatUser extends Model<ChatUser, Partial<ChatUser>> {
  @PrimaryKey
  @AllowNull(false)
  @Default(literal('gen_random_uuid()'))
  @Column(DataType.UUID)
  declare id: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.UUID)
  declare keycloakUserId: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare displayName: string;

  @AllowNull(true)
  @Column(DataType.STRING(500))
  declare avatarUrl: string | null;

  @CreatedAt
  @AllowNull(false)
  @Default(literal('CURRENT_TIMESTAMP'))
  @Column(DataType.DATE)
  declare createdAt: Date;

  @UpdatedAt
  @AllowNull(false)
  @Default(literal('CURRENT_TIMESTAMP'))
  @Column(DataType.DATE)
  declare updatedAt: Date;

  @HasMany(() => ConversationParticipant, 'userId')
  declare memberships: NonAttribute<ConversationParticipant[]>;

  @BelongsToMany(() => Conversation, {
    through: () => ConversationParticipant,
    foreignKey: 'userId',
    otherKey: 'conversationId',
  })
  declare conversations: NonAttribute<Conversation[]>;

  @HasMany(() => Message, 'senderId')
  declare messages: NonAttribute<Message[]>;
}
