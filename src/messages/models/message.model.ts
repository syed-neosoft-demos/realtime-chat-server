import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { literal, type NonAttribute } from 'sequelize';
import { Conversation } from '@/conversations/models/conversation.model.js';
import { ChatUser } from '@/users/models/chat-user.model.js';

export enum MessageType {
  TEXT = 'text',
}

@Table({
  tableName: 'messages',
  underscored: true,
  timestamps: true,
  updatedAt: false,
  paranoid: true,
  indexes: [
    { name: 'idx_messages_conversation_created', fields: ['conversation_id', 'created_at'] },
  ],
})
export class Message extends Model<Message, Partial<Message>> {
  @PrimaryKey
  @AllowNull(false)
  @Default(literal('gen_random_uuid()'))
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Conversation)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare conversationId: string;

  @ForeignKey(() => ChatUser)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare senderId: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: MessageType.TEXT,
  })
  declare messageType: MessageType;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare content: string;

  @CreatedAt
  @AllowNull(false)
  @Default(literal('CURRENT_TIMESTAMP'))
  @Column(DataType.DATE)
  declare createdAt: Date;

  // Set only when a message is edited; leave new messages with a null updated_at.
  @AllowNull(true)
  @Column(DataType.DATE)
  declare updatedAt: Date | null;

  @DeletedAt
  @AllowNull(true)
  @Column(DataType.DATE)
  declare deletedAt: Date | null;

  @BelongsTo(() => Conversation, { foreignKey: 'conversationId', onDelete: 'CASCADE' })
  declare conversation: NonAttribute<Conversation>;

  @BelongsTo(() => ChatUser, { foreignKey: 'senderId', onDelete: 'RESTRICT' })
  declare sender: NonAttribute<ChatUser>;
}
