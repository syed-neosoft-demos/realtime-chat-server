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
import type { NonAttribute } from 'sequelize';
import { ChatUser } from '@/users/models/chat-user.model.js';
import { Message } from '@/messages/models/message.model.js';
import { ConversationParticipant } from '@/conversations/models/conversation-participant.model.js';

export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group',
}

@Table({ tableName: 'conversations', underscored: true, timestamps: true })
export class Conversation extends Model<Conversation, Partial<Conversation>> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.ENUM(...Object.values(ConversationType)))
  declare type: ConversationType;

  @Column(DataType.STRING(255))
  declare name: string | null;

  @Column(DataType.TEXT)
  declare avatarUrl: string | null;

  @Unique
  @Column(DataType.STRING(250))
  declare directKey: string | null;

  @ForeignKey(() => ChatUser)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare createdBy: string;

  @BelongsTo(() => ChatUser, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
  declare creator: NonAttribute<ChatUser>;

  @Column(DataType.UUID)
  declare lastMessageId: string | null;

  // Avoid a circular dependency when Sequelize creates conversations and messages.
  @BelongsTo(() => Message, { foreignKey: 'lastMessageId', constraints: false })
  declare lastMessage: NonAttribute<Message | null>;

  @Column(DataType.DATE)
  declare lastMessageAt: Date | null;

  @CreatedAt
  @Column(DataType.DATE)
  declare createdAt: Date;

  @UpdatedAt
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
