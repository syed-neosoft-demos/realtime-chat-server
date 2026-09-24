import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { UsersService } from '@/users/users.service.js';

@Injectable()
export class AuthService {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  logger = new Logger('authGourd');
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(UsersService) private readonly users: UsersService,
  ) {
    this.jwks = createRemoteJWKSet(new URL(config.getOrThrow<string>('keycloak.jwksUri')));
  }

  async authenticate(token: string) {
    let identity: { sub: string; name: string };
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.config.getOrThrow<string>('keycloak.issuer'),
        audience: this.config.getOrThrow<string>('keycloak.audience'),
        algorithms: ['RS256'],
        requiredClaims: ['sub', 'exp'],
      });
      if (!payload.sub) throw new Error('Missing subject');
      identity = {
        sub: payload.sub,
        name:
          typeof payload.name === 'string'
            ? payload.name
            : typeof payload.preferred_username === 'string'
              ? payload.preferred_username
              : payload.sub,
      };
    } catch (err) {
      this.logger.debug(`JWT verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid or expired access token');
    }
    return this.users.findOrCreateFromIdentity(identity.sub, identity.name);
  }
}
