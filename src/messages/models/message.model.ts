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
import type { NonAttribute } from 'sequelize';
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
  indexes: [{ fields: ['conversation_id', 'created_at'] }],
})
export class Message extends Model<Message, Partial<Message>> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
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
    type: DataType.ENUM(...Object.values(MessageType)),
    allowNull: false,
    defaultValue: MessageType.TEXT,
  })
  declare messageType: MessageType;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare content: string;

  @CreatedAt
  @Column(DataType.DATE)
  declare createdAt: Date;

  @Column(DataType.DATE)
  declare editedAt: Date | null;

  @DeletedAt
  @Column(DataType.DATE)
  declare deletedAt: Date | null;

  @BelongsTo(() => Conversation, { foreignKey: 'conversationId', onDelete: 'CASCADE' })
  declare conversation: NonAttribute<Conversation>;

  @BelongsTo(() => ChatUser, { foreignKey: 'senderId', onDelete: 'RESTRICT' })
  declare sender: NonAttribute<ChatUser>;
}
