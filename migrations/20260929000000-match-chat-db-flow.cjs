// Upgrade tables created by the previous Sequelize models.
// All schema changes roll back together if any statement fails.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
-- Reject oversized existing values instead of silently truncating them.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM chat_users WHERE length(avatar_url) > 500)
    OR EXISTS (SELECT 1 FROM conversations WHERE length(avatar_url) > 500
      OR length(direct_key) > 128 OR length(type::text) > 20)
    OR EXISTS (SELECT 1 FROM messages WHERE length(message_type::text) > 20)
    OR EXISTS (SELECT 1 FROM conversation_participants WHERE length(role::text) > 20)
  THEN
    RAISE EXCEPTION 'Existing values exceed the chat_db_flow column limits; correct them before retrying';
  END IF;
END $$;

ALTER TABLE chat_users
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN keycloak_user_id TYPE uuid USING keycloak_user_id::uuid,
  ALTER COLUMN avatar_url TYPE varchar(500),
  ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE conversations
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN type TYPE varchar(20) USING type::text,
  ALTER COLUMN avatar_url TYPE varchar(500),
  ALTER COLUMN direct_key TYPE varchar(128),
  ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE messages RENAME COLUMN edited_at TO updated_at;
ALTER TABLE messages ALTER COLUMN message_type DROP DEFAULT;
ALTER TABLE messages
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN message_type TYPE varchar(20) USING message_type::text,
  ALTER COLUMN message_type SET DEFAULT 'text',
  ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN updated_at DROP NOT NULL,
  ALTER COLUMN updated_at DROP DEFAULT;

ALTER TABLE conversation_participants ALTER COLUMN role DROP DEFAULT;
ALTER TABLE conversation_participants
  ALTER COLUMN role TYPE varchar(20) USING role::text,
  ALTER COLUMN role SET DEFAULT 'member',
  ALTER COLUMN joined_at SET DEFAULT CURRENT_TIMESTAMP,
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS updated_at;

ALTER TABLE conversations
  ADD CONSTRAINT conversations_last_message_id_fkey
  FOREIGN KEY (last_message_id) REFERENCES messages(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS conversations_last_message_at ON conversations (last_message_at);
CREATE INDEX IF NOT EXISTS conversation_participants_user_id ON conversation_participants (user_id);
DROP INDEX IF EXISTS messages_conversation_id_created_at;
CREATE INDEX idx_messages_conversation_created ON messages (conversation_id, created_at);

-- These enum types were created by the previous Sequelize models.
DROP TYPE IF EXISTS enum_conversations_type;
DROP TYPE IF EXISTS enum_messages_message_type;
DROP TYPE IF EXISTS enum_conversation_participants_role;
      `,
        { transaction },
      );
    });
  },

  async down() {
    // The removed participant timestamps cannot be reconstructed accurately.
    throw new Error(
      'This migration removes participant timestamp data and cannot be safely undone. Restore the pre-migration database backup to revert it.',
    );
  },
};
