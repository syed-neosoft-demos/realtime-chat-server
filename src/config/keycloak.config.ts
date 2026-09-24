import { registerAs } from '@nestjs/config';

export default registerAs('keycloak', () => {
  const baseUrl = (process.env.KEYCLOAK_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  const realm = process.env.KEYCLOAK_REALM ?? 'realtime-chat-app';
  const issuer = `${baseUrl}/realms/${realm}`;
  console.log('url', `${issuer}/protocol/openid-connect/certs`);
  return {
    issuer,
    audience: process.env.KEYCLOAK_AUDIENCE ?? process.env.KEYCLOAK_CLIENT_ID ?? 'chat-app',
    jwksUri: `${issuer}/protocol/openid-connect/certs`,
  };
});
