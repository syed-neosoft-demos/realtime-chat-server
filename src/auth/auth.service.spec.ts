import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { AuthService } from '@/auth/auth.service.js';
import type { UsersService } from '@/users/users.service.js';

describe('Keycloak access-token verification', () => {
  const issuer = 'http://localhost:8080/realms/realtime-chat-app';
  const users = { findOrCreateFromIdentity: vi.fn() };
  let keys: Awaited<ReturnType<typeof generateKeyPair>>;
  let auth: AuthService;

  beforeAll(async () => {
    keys = await generateKeyPair('RS256');
    const publicKey = {
      ...(await exportJWK(keys.publicKey)),
      kid: 'test-key',
      alg: 'RS256',
      use: 'sig',
    };
    // Stub only JWKS transport; signatures and claims are verified by jose.
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(
          async () => new Response(JSON.stringify({ keys: [publicKey] }), { status: 200 }),
        ),
    );
  });
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(() => {
    users.findOrCreateFromIdentity.mockReset().mockResolvedValue({ id: 'local-user' });
    auth = new AuthService(
      new ConfigService({
        keycloak: {
          issuer,
          audience: 'chat-backend',
          jwksUri: `${issuer}/protocol/openid-connect/certs`,
        },
      }),
      users as unknown as UsersService,
    );
  });

  function token(overrides: Record<string, unknown> = {}, signingKey = keys.privateKey) {
    return new SignJWT({
      sub: 'keycloak-user',
      preferred_username: 'Alice',
      iss: issuer,
      aud: 'chat-backend',
      exp: Math.floor(Date.now() / 1000) + 60,
      ...overrides,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .sign(signingKey);
  }

  it('provisions a local user only after verifying a signed access token', async () => {
    await expect(auth.authenticate(await token())).resolves.toEqual({ id: 'local-user' });
    expect(users.findOrCreateFromIdentity).toHaveBeenCalledWith('keycloak-user', 'Alice');
  });

  it('accepts an audience array containing the API audience with a different authorized party', async () => {
    await expect(
      auth.authenticate(
        await token({ aud: ['chat-backend', 'realm-management', 'account'], azp: 'chat-app' }),
      ),
    ).resolves.toEqual({ id: 'local-user' });
    expect(users.findOrCreateFromIdentity).toHaveBeenCalledWith('keycloak-user', 'Alice');
  });

  it.each([
    { iss: 'https://wrong-issuer.example' },
    { aud: 'another-client' },
    { aud: ['realm-management', 'account'], azp: 'chat-backend' },
    { exp: 1 },
    { exp: undefined },
    { sub: undefined },
  ])('rejects invalid required claims: %j', async (claims) => {
    await expect(auth.authenticate(await token(claims))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(users.findOrCreateFromIdentity).not.toHaveBeenCalled();
  });

  it('rejects tokens signed by an untrusted key', async () => {
    const untrusted = await generateKeyPair('RS256');
    await expect(auth.authenticate(await token({}, untrusted.privateKey))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(users.findOrCreateFromIdentity).not.toHaveBeenCalled();
  });
});
