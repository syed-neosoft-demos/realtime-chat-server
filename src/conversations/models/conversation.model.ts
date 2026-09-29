import {
  AllowNull,
  BelongsTo,
  BelongsToMany,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from 'sequelize-typescript';
import { literal, type NonAttribute } from 'sequelize';
import { ChatUser } from '@/users/models/chat-user.model.js';
import { Message } from '@/messages/models/message.model.js';
import { ConversationParticipant } from '@/conversations/models/conversation-participant.model.js';

export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group',
}

@Table({
  tableName: 'conversations',
  underscored: true,
  timestamps: true,
  indexes: [{ fields: ['last_message_at'] }],
})
export class Conversation extends Model<Conversation, Partial<Conversation>> {
  @PrimaryKey
  @AllowNull(false)
  @Default(literal('gen_random_uuid()'))
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.STRING(20))
  declare type: ConversationType;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  declare name: string | null;

  @AllowNull(true)
  @Column(DataType.STRING(500))
  declare avatarUrl: string | null;

  @Unique
  @AllowNull(true)
  @Column(DataType.STRING(128))
  declare directKey: string | null;

  @ForeignKey(() => ChatUser)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare createdBy: string;

  @BelongsTo(() => ChatUser, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
  declare creator: NonAttribute<ChatUser>;

  @ForeignKey(() => Message)
  @AllowNull(true)
  @Column(DataType.UUID)
  declare lastMessageId: string | null;

  @BelongsTo(() => Message, { foreignKey: 'lastMessageId', onDelete: 'SET NULL' })
  declare lastMessage: NonAttribute<Message | null>;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare lastMessageAt: Date | null;

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

  @HasMany(() => ConversationParticipant, 'conversationId')
  declare participants: NonAttribute<ConversationParticipant[]>;

  @BelongsToMany(() => ChatUser, {
    through: () => ConversationParticipant,
    foreignKey: 'conversationId',
    otherKey: 'userId',
  })
  declare members: NonAttribute<ChatUser[]>;

  @HasMany(() => Message, 'conversationId')
  declare messages: NonAttribute<Message[]>;
}
