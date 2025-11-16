-- Fix message_feedback agent_id foreign key to allow cascade delete
-- This allows agents to be deleted even when they have feedback records

-- Drop the existing foreign key constraint
ALTER TABLE message_feedback
  DROP CONSTRAINT IF EXISTS message_feedback_agent_id_fkey;

-- Recreate the foreign key constraint with ON DELETE CASCADE
ALTER TABLE message_feedback
  ADD CONSTRAINT message_feedback_agent_id_fkey
    FOREIGN KEY (agent_id)
    REFERENCES agents(id)
    ON DELETE CASCADE;

-- Also check and fix response_improvements if needed
ALTER TABLE response_improvements
  DROP CONSTRAINT IF EXISTS response_improvements_agent_id_fkey;

ALTER TABLE response_improvements
  ADD CONSTRAINT response_improvements_agent_id_fkey
    FOREIGN KEY (agent_id)
    REFERENCES agents(id)
    ON DELETE CASCADE;

COMMENT ON CONSTRAINT message_feedback_agent_id_fkey ON message_feedback IS 
  'Allows deletion of agents with cascade delete of feedback records';

COMMENT ON CONSTRAINT response_improvements_agent_id_fkey ON response_improvements IS 
  'Allows deletion of agents with cascade delete of improvement records';

