-- Update message_feedback schema to support user_id or session_id uniqueness and value field

-- Ensure dependent extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add missing columns
ALTER TABLE IF EXISTS message_feedback
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS value SMALLINT CHECK (value IN (-1, 1)),
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Backfill value from feedback_type if present and value is NULL
UPDATE message_feedback
SET value = CASE feedback_type WHEN 'positive' THEN 1 WHEN 'negative' THEN -1 ELSE NULL END
WHERE value IS NULL;

-- Create partial unique indexes to enforce one feedback per actor/message
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'ux_feedback_message_user'
  ) THEN
    CREATE UNIQUE INDEX ux_feedback_message_user
      ON message_feedback (message_id, user_id)
      WHERE user_id IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'ux_feedback_message_session'
  ) THEN
    CREATE UNIQUE INDEX ux_feedback_message_session
      ON message_feedback (message_id, session_id)
      WHERE user_id IS NULL AND session_id IS NOT NULL;
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_message_feedback_msg ON message_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_org ON message_feedback(organization_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_agent ON message_feedback(agent_id);

-- RLS stays enabled from previous migration; tighten policies in a dedicated migration
-- (kept minimal changes here to avoid breaking existing flows)

COMMENT ON COLUMN message_feedback.session_id IS 'Anonymous session identifier when user_id is not available';
COMMENT ON COLUMN message_feedback.value IS 'Normalized feedback: 1 (like), -1 (dislike)';
COMMENT ON COLUMN message_feedback.organization_id IS 'Denormalized org for scoping and filtering';


