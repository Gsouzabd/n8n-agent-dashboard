-- Add user_message column to message_feedback table
-- This stores the last user message (question) before the assistant response
-- to provide full context of the interaction when analyzing feedback

ALTER TABLE message_feedback
  ADD COLUMN IF NOT EXISTS user_message TEXT;

-- Add index for better query performance when filtering by user_message
CREATE INDEX IF NOT EXISTS idx_message_feedback_user_message 
  ON message_feedback(user_message) 
  WHERE user_message IS NOT NULL;

-- Add comment explaining the column purpose
COMMENT ON COLUMN message_feedback.user_message IS 'Stores the last user message (question) that preceded the assistant response being feedbacked. Provides context for understanding the feedback.';

