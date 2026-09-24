import { registerAs } from '@nestjs/config';

export default registerAs('keycloak', () => {
  const baseUrl = (process.env.KEYCLOAK_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  const realm = process.env.KEYCLOAK_REALM ?? 'chat';
  const issuer = `${baseUrl}/realms/${realm}`;
  return {
    issuer,
    audience: process.env.KEYCLOAK_CLIENT_ID ?? 'chat-backend',
    jwksUri: `${issuer}/protocol/openid-connect/certs`,
  };
});
