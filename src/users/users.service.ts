import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ForeignKeyConstraintError, Op } from 'sequelize';
import { ChatUser } from '@/users/models/chat-user.model.js';
import type { SearchUserDto } from '@/users/dto/search-user.dto.js';
import type { UpdateUserDto } from '@/users/dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(@InjectModel(ChatUser) private readonly users: typeof ChatUser) {}

  search(dto: SearchUserDto) {
    return this.users.findAll({
      where: dto.query ? { displayName: { [Op.iLike]: `%${dto.query}%` } } : {},
      attributes: ['id', 'displayName', 'avatarUrl'],
      limit: dto.limit,
      order: [['displayName', 'ASC']],
    });
  }

  async findById(id: string) {
    const user = await this.users.findByPk(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getProfile(id: string) {
    const user = await this.findById(id);
    return { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl };
  }

  async update(id: string, actorId: string, dto: UpdateUserDto) {
    this.assertOwner(id, actorId);
    const user = await this.findById(id);
    return user.update({
      ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
      ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
    });
  }

  async remove(id: string, actorId: string) {
    this.assertOwner(id, actorId);
    const user = await this.findById(id);
    try {
      await user.destroy();
    } catch (error) {
      if (error instanceof ForeignKeyConstraintError)
        throw new ConflictException('This profile is still referenced by chat history');
      throw error;
    }
  }

  private assertOwner(id: string, actorId: string) {
    if (id.toLowerCase() !== actorId.toLowerCase())
      throw new ForbiddenException('You can only modify your own profile');
  }

  async findOrCreateFromIdentity(keycloakUserId: string, displayName: string) {
    const [user] = await this.users.findOrCreate({
      where: { keycloakUserId },
      defaults: { keycloakUserId, displayName },
    });
    return user;
  }
}
