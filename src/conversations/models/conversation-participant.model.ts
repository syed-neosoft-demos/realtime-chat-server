import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { literal, type NonAttribute } from 'sequelize';
import { ChatUser } from '@/users/models/chat-user.model.js';
import { Message } from '@/messages/models/message.model.js';
import { Conversation } from '@/conversations/models/conversation.model.js';

export enum ParticipantRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Table({
  tableName: 'conversation_participants',
  underscored: true,
  timestamps: false,
  indexes: [{ fields: ['user_id'] }],
})
export class ConversationParticipant extends Model<
  ConversationParticipant,
  Partial<ConversationParticipant>
> {
  @ForeignKey(() => Conversation)
  @PrimaryKey
  @AllowNull(false)
  @Column(DataType.UUID)
  declare conversationId: string;

  @ForeignKey(() => ChatUser)
  @PrimaryKey
  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: ParticipantRole.MEMBER,
  })
  declare role: ParticipantRole;

  @AllowNull(false)
  @Default(literal('CURRENT_TIMESTAMP'))
  @Column(DataType.DATE)
  declare joinedAt: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare leftAt: Date | null;

  @ForeignKey(() => Message)
  @AllowNull(true)
  @Column(DataType.UUID)
  declare lastReadMessageId: string | null;

  @BelongsTo(() => Conversation, { foreignKey: 'conversationId', onDelete: 'CASCADE' })
  declare conversation: NonAttribute<Conversation>;

  @BelongsTo(() => ChatUser, { foreignKey: 'userId', onDelete: 'RESTRICT' })
  declare user: NonAttribute<ChatUser>;

  @BelongsTo(() => Message, { foreignKey: 'lastReadMessageId', onDelete: 'SET NULL' })
  declare lastReadMessage: NonAttribute<Message | null>;
}
