# Chat backend

NestJS with Sequelize, PostgreSQL, Keycloak JWT authentication, Socket.IO, and Redis.

## Setup

1. Install packages with `npm install`.
2. Copy the values in `.env.example` into your `.env` and configure PostgreSQL, Redis, and Keycloak. Create the PostgreSQL database named by `DB_NAME` first.
3. For a new local development database, set `DB_SYNCHRONIZE=true` to create the tables. Synchronization is disabled in production; initial production schema migrations are not included in this scaffold. If upgrading an existing database, apply `migrations/20260924-participant-timestamps.sql` to add participant timestamps; synchronization does not alter existing tables.
4. Configure your Keycloak realm and an access-token audience mapper for `KEYCLOAK_AUDIENCE` (for example, `chat-api`). This must match an entry in the token's `aud` claim; the requesting client's `azp` claim may differ. If `KEYCLOAK_AUDIENCE` is unset, the backend falls back to `KEYCLOAK_CLIENT_ID`. The backend verifies RS256 signatures using the realm's JWKS endpoint, plus issuer, audience, expiry, and subject. Users are provisioned locally on their first authenticated request.
5. Run `npm run start:dev` (default port: 3000).

Redis connects lazily when used by typing events or Redis routes. NestJS Observe is optional and enabled only when both `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` are configured. Production startup after `npm run build`: `npm run start:prod`.

## Structure

```text
src/
├── main.ts
├── app.module.ts
├── config/          # PostgreSQL, Redis, Keycloak configuration
├── common/          # Decorators, guards, extension folders
├── auth/            # JWT verification and local identity provisioning
├── users/           # User search, models, DTOs
├── conversations/   # Direct/group chats, participants, repositories, DTOs
├── messages/        # Message creation/editing, repository, model, DTOs
├── chat/            # Socket.IO gateway, room joining and typing events
└── redis/           # Redis client and lifecycle management
```

The original root controller/service remain, and `GET /` is public. Empty extension folders are tracked with `.gitkeep` files. JWT verification is implemented directly in `AuthService`; `auth/strategies` is reserved for future strategies.

## Schema

The four Sequelize models map camelCase TypeScript properties to the diagram's snake_case columns:

- `chat_users`: UUID primary key and unique Keycloak identity.
- `conversations`: direct/group type, unique nullable `direct_key`, creator, and last-message metadata.
- `conversation_participants`: composite `(conversation_id, user_id)` primary key, admin/member role, membership timestamps, last-read pointer, and `created_at` / `updated_at` timestamps.
- `messages`: UUID primary key, conversation/sender foreign keys, text content, creation/edit/deletion timestamps; soft deletion is enabled and no `updated_at` column is added.

Direct chat keys sort the two local user UUIDs, preventing duplicate pairs. Conversation creation and initial participants are transactional. Sending a message locks its conversation and updates last-message metadata in the same transaction.

`conversations.last_message_id` has a Sequelize association without a database foreign-key constraint to avoid a circular dependency during development schema synchronization. `last_read_message_id` has a foreign-key constraint. Last-read updates are not implemented. Message deletion is soft and updates the conversation’s last-message pointer transactionally; conversation deletion cascades to its messages and participants. The current message type is `text`; attachments require an extension.

This follows the [NestJS Sequelize integration](https://docs.nestjs.com/data/sequelize) and [Sequelize circular-association guidance](https://sequelize.org/docs/v6/other-topics/constraints-and-circularities/).

## HTTP API

All routes below require `Authorization: Bearer <Keycloak access token>`. JSON uses camelCase properties; IDs are local chat-user UUIDs, not Keycloak subjects.

| Module        | Create                                                | Read                                                   | Update                     | Delete                      |
| ------------- | ----------------------------------------------------- | ------------------------------------------------------ | -------------------------- | --------------------------- |
| Users         | `POST /users`                                         | `GET /users`, `/users/me`, `/users/:id`                | `PATCH /users/:id`         | `DELETE /users/:id`         |
| Auth profile  | `POST /auth/profile`                                  | `GET /auth/profile`                                    | `PATCH /auth/profile`      | `DELETE /auth/profile`      |
| Conversations | `POST /conversations/direct`, `/conversations/groups` | `GET /conversations`, `/conversations/:id`             | `PATCH /conversations/:id` | `DELETE /conversations/:id` |
| Chat          | `POST /chat/direct`, `/chat/groups`                   | `GET /chat`, `/chat/:id`                               | `PATCH /chat/:id`          | `DELETE /chat/:id`          |
| Messages      | `POST /messages`                                      | `GET /messages?conversationId=<uuid>`, `/messages/:id` | `PATCH /messages/:id`      | `DELETE /messages/:id`      |
| Redis keys    | `POST /redis/keys`                                    | `GET /redis/keys?cursor=0`, `/redis/keys/:key`         | `PATCH /redis/keys/:key`   | `DELETE /redis/keys/:key`   |

- User/profile creation completes the identity automatically provisioned from the verified JWT; it returns HTTP 200. Body: `{ "displayName": "Alice", "avatarUrl": "https://..." }` (avatar optional). Updates accept either field; `avatarUrl: null` clears it. Users may only modify their own profiles. Profile deletion returns 409 when chat history references the user. It deletes only the local profile; a later authenticated request provisions it again. Keycloak account management remains in Keycloak.
- User search supports `query` and `limit` (default 20, maximum 100). Lists return public profile fields.
- Direct chat creation takes `{ "userId": "<uuid>" }`. Group creation takes `{ "name": "Team", "memberIds": ["<uuid>"], "avatarUrl": "https://..." }` (avatar optional). Group updates accept `name` and `avatarUrl`. Active membership is required for reads; group updates/deletion require an admin, and direct-chat deletion requires its creator. Conversation lists return up to 100 entries.
- `POST /conversations/:id/members` and `POST /chat/:id/members` add `{ "userId": "<uuid>" }` to a group and require group admin access. Chat HTTP routes reuse the conversation controller's CRUD behavior.
- Message creation takes `{ "conversationId": "<uuid>", "content": "Hello", "messageType": "text" }` (type optional). Updates take `{ "content": "Edited text" }`. Reads require active membership; edits/deletes additionally require the sender. Lists return the latest 50 messages, newest first.
- Redis creation takes `{ "key": "draft", "value": "Hello", "ttlSeconds": 3600 }`; updates take `value` and optional `ttlSeconds`. TTL defaults to one hour and is limited to one day. Keys are scoped to the authenticated user, separate from internal typing keys. Create returns 409 for existing keys; read/update/delete return 404 for missing keys. Listing returns a SCAN cursor; continue until it is `"0"`. `GET /redis/health` checks Redis connectivity.
- Successful deletes return HTTP 204.

## Model style and imports

Models use explicit decorators such as `@PrimaryKey`, `@Default`, `@Column`, and `@ForeignKey`, with `Model<Entity, Partial<Entity>>` for simple creation typing. Nullable database columns retain nullable TypeScript types, and associations retain `NonAttribute` typing to avoid runtime circular metadata references.

All application and test imports use `@/` for the source root (for example, `@/users/users.service.js`). `tsconfig.json` defines the alias; the installed Nest CLI rewrites it to relative ESM paths for build/start/watch. Unit tests resolve to `src`, while HTTP tests resolve the same alias to `dist` to exercise compiled decorator metadata. No custom runtime loader is needed. [TypeScript path aliases alone do not rewrite emitted imports](https://www.typescriptlang.org/tsconfig/paths.html).

## WebSocket API

Connect to the `/chat` namespace with Socket.IO's `auth: { token: '<access token>' }`. Authentication runs on connection and every handled event.

- `join-conversation`: `{ conversationId }`; verifies membership and joins the conversation room.
- `typing`: `{ conversationId, isTyping }`; verifies membership, stores a five-second Redis marker, and broadcasts `{ conversationId, userId, isTyping }` to other clients in the room.

Message creation/editing currently uses HTTP and does not broadcast message events. The gateway uses a single-process room adapter; Redis is used for typing markers, not cross-instance Socket.IO delivery.

## Verification

```bash
npm run build
npm run lint
npm test
npm run test:e2e
```

Unit tests cover model metadata, message authorization, and JWT signatures/claims with a stubbed JWKS transport. HTTP tests use the compiled app to preserve decorator metadata, with database and identity providers replaced; they do not require external services.
# realtime-chat-server
