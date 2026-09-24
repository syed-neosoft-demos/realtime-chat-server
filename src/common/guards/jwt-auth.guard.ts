import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from '@/auth/auth.service.js';
import type { ChatUser } from '@/users/models/chat-user.model.js';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<Request & { user: ChatUser }>();
    const match = /^Bearer\s+(\S+)$/i.exec(request.headers.authorization ?? '');
    if (!match) throw new UnauthorizedException('A bearer token is required');
    request.user = await this.auth.authenticate(match[1]);
    return true;
  }
}
