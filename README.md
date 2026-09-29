# Chat backend

NestJS with Sequelize, PostgreSQL, Keycloak JWT authentication, Socket.IO, and Redis.

## Setup

1. Install packages with `npm install`.
2. Copy the values in `.env.example` into your `.env` and configure PostgreSQL, Redis, and Keycloak. Create the PostgreSQL database named by `DB_NAME` first.
3. For a new local development database, set `DB_SYNCHRONIZE=true` to create the tables. Synchronization is disabled in production; initial production schema migrations are not included in this scaffold. To upgrade the previous application schema, stop the app and run `npm run db:migrate` before restarting (see below). Keep `DB_SYNCHRONIZE=false` for existing databases; cyclic foreign-key synchronization can alter tables.
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

The four Sequelize models match the `chat_db_flow` diagram and map camelCase TypeScript properties to snake_case columns. The diagram name does not change the PostgreSQL namespace; the application continues to use its existing default schema. PostgreSQL 13+ is required for the built-in `gen_random_uuid()` UUID default (the PostgreSQL equivalent of the diagram’s `UUID()`).

- `chat_users`: UUID primary key and unique UUID Keycloak identity; display names are `varchar(255)` and nullable avatar URLs are `varchar(500)`.
- `conversations`: `varchar(20)` type, nullable `varchar(255)` name and `varchar(500)` avatar, unique nullable `varchar(128)` direct key, creator and last-message foreign keys, and indexed nullable `last_message_at`.
- `conversation_participants`: composite `(conversation_id, user_id)` primary key, indexed `user_id`, `varchar(20)` role defaulting to `member`, `joined_at`, nullable `left_at`, and nullable last-read foreign key. No `created_at` or `updated_at` columns.
- `messages`: UUID primary key, conversation/sender foreign keys, `varchar(20)` message type defaulting to `text`, required text content, required `created_at`, and nullable `updated_at` / `deleted_at`. `updatedAt` replaces `editedAt` in API responses and is set only on edits. Soft deletion is enabled. The composite index is named `idx_messages_conversation_created` on `(conversation_id, created_at)`.

Required creation timestamps, user/conversation update timestamps, and participant join timestamps have database-level `CURRENT_TIMESTAMP` defaults.

Direct chat keys sort the two local user UUIDs, preventing duplicate pairs. Conversation creation and initial participants are transactional. Sending a message locks its conversation and updates last-message metadata in the same transaction.

`conversations.last_message_id` and participant `last_read_message_id` both have database foreign-key constraints and are set to null if a referenced message is physically deleted. Sequelize handles the circular conversation/message dependency by creating tables first, then adding constraints. Last-read updates are not implemented. Message deletion is soft and updates the conversation’s last-message pointer transactionally; conversation deletion cascades to its messages and participants. The current message type is `text`; attachments require an extension.

To upgrade an existing database created by the previous models:

1. Stop the application and take a database backup using your PostgreSQL administration tool.
2. Set `DB_SYNCHRONIZE=false` in `.env`. Check that its `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_NAME` point to the database to upgrade.
3. Run the following from the project root:

```bash
npm run db:migrate:status
npm run db:migrate
npm run db:migrate:status
npm run start:dev
```

The [Sequelize CLI](https://sequelize.org/docs/v6/other-topics/migrations/) reads `.sequelizerc.cjs` (CommonJS for compatibility with this ESM project), loads the connection from `config/sequelize.cjs`, and records completed migrations in `SequelizeMeta`. The status changes from `down` to `up`; later migration runs skip completed files. This metadata table is additional to the four application tables. The CLI loads `.env` using Node's built-in `process.loadEnvFile` (Node 20.12+); explicitly exported environment variables take precedence. Production deployments can use `npm run db:migrate -- --env production` with the CLI installed.

`migrations/20260929000000-match-chat-db-flow.cjs` upgrades the previous schema; it does not initialize an empty database. It preserves message edit times by renaming `edited_at` to `updated_at`, converts enum columns to varchar, adds defaults/indexes/the missing foreign key, and removes the two participant timestamps absent from the diagram. PostgreSQL-specific DDL runs inside a Sequelize-managed transaction; invalid UUIDs, oversized values, or orphan last-message references cause the schema changes to roll back. Keep automatic synchronization disabled afterward.

This replaces the manual SQL script. If that script has already been applied, do not run this upgrade again without first reconciling migration history with the actual database schema. This migration deliberately rejects `db:migrate:undo` because the removed participant timestamp values cannot be recovered; reverting requires the pre-migration backup.

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
