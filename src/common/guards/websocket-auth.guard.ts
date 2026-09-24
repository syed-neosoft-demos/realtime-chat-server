import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { decodeJwt } from 'jose';
import { AuthService } from '@/auth/auth.service.js';

@Injectable()
export class WebsocketAuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async authenticate(client: Socket) {
    const supplied: unknown = client.handshake.auth?.token;
    const token =
      typeof supplied === 'string'
        ? supplied
        : /^Bearer\s+(\S+)$/i.exec(client.handshake.headers.authorization ?? '')?.[1];
    if (!token) throw new WsException('An access token is required');
    try {
      client.data.user = await this.auth.authenticate(token);
      // The same token has already passed signature and required-claim verification.
      client.data.tokenExpiresAt = decodeJwt(token).exp! * 1000;
    } catch {
      client.disconnect(true);
      throw new WsException('Authentication failed');
    }
    return true;
  }

  canActivate(context: ExecutionContext) {
    return this.authenticate(context.switchToWs().getClient<Socket>());
  }
}
