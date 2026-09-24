import keycloakConfig from '@/config/keycloak.config.js';

describe('Keycloak audience configuration', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('uses the API audience even when the requesting client differs', () => {
    vi.stubEnv('KEYCLOAK_CLIENT_ID', 'chat-app');
    vi.stubEnv('KEYCLOAK_AUDIENCE', 'chat-api');

    expect(keycloakConfig().audience).toBe('chat-api');
  });

  it('preserves client ID fallback when no explicit audience is configured', () => {
    vi.stubEnv('KEYCLOAK_CLIENT_ID', 'chat-backend');
    vi.stubEnv('KEYCLOAK_AUDIENCE', undefined);

    expect(keycloakConfig().audience).toBe('chat-backend');
  });
});
