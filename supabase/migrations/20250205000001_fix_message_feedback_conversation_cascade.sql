-- Fix message_feedback conversation_id foreign key to allow cascade delete
-- This allows chat_sessions to be deleted even when they have feedback records

-- Drop the existing foreign key constraint
ALTER TABLE message_feedback
  DROP CONSTRAINT IF EXISTS message_feedback_conversation_id_fkey;

-- Recreate the foreign key constraint with ON DELETE CASCADE
ALTER TABLE message_feedback
  ADD CONSTRAINT message_feedback_conversation_id_fkey
    FOREIGN KEY (conversation_id)
    REFERENCES chat_sessions(id)
    ON DELETE CASCADE;

COMMENT ON CONSTRAINT message_feedback_conversation_id_fkey ON message_feedback IS 
  'Allows deletion of chat sessions with cascade delete of feedback records';

