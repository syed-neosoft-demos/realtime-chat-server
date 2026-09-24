import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import type { NonAttribute } from 'sequelize';
import { ChatUser } from '@/users/models/chat-user.model.js';
import { Message } from '@/messages/models/message.model.js';
import { Conversation } from '@/conversations/models/conversation.model.js';

export enum ParticipantRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Table({ tableName: 'conversation_participants', underscored: true, timestamps: true })
export class ConversationParticipant extends Model<
  ConversationParticipant,
  Partial<ConversationParticipant>
> {
  @ForeignKey(() => Conversation)
  @PrimaryKey
  @Column(DataType.UUID)
  declare conversationId: string;

  @ForeignKey(() => ChatUser)
  @PrimaryKey
  @Column(DataType.UUID)
  declare userId: string;

  @Column({
    type: DataType.ENUM(...Object.values(ParticipantRole)),
    allowNull: false,
    defaultValue: ParticipantRole.MEMBER,
  })
  declare role: ParticipantRole;

  @AllowNull(false)
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  declare joinedAt: Date;

  @Column(DataType.DATE)
  declare leftAt: Date | null;

  @ForeignKey(() => Message)
  @Column(DataType.UUID)
  declare lastReadMessageId: string | null;

  @CreatedAt
  @Column(DataType.DATE)
  declare createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  declare updatedAt: Date;

  @BelongsTo(() => Conversation, { foreignKey: 'conversationId', onDelete: 'CASCADE' })
  declare conversation: NonAttribute<Conversation>;

  @BelongsTo(() => ChatUser, { foreignKey: 'userId', onDelete: 'RESTRICT' })
  declare user: NonAttribute<ChatUser>;

  @BelongsTo(() => Message, { foreignKey: 'lastReadMessageId', onDelete: 'SET NULL' })
  declare lastReadMessage: NonAttribute<Message | null>;
}
