import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ChatUser } from '@/users/models/chat-user.model.js';
import { UsersController } from '@/users/users.controller.js';
import { UsersService } from '@/users/users.service.js';

@Module({
  imports: [SequelizeModule.forFeature([ChatUser])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
