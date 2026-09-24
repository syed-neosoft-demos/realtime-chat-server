-- Apply once to an existing database when upgrading to timestamped participants.
BEGIN;
ALTER TABLE conversation_participants
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
COMMIT;
