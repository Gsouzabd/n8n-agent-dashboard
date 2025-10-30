-- Tighten RLS and add trigger to populate organization_id on message_feedback

-- Ensure RLS is enabled
ALTER TABLE message_feedback ENABLE ROW LEVEL SECURITY;

-- Function to set organization_id from agent_id when missing
CREATE OR REPLACE FUNCTION set_message_feedback_org()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.agent_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM agents WHERE id = NEW.agent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_message_feedback_org ON message_feedback;
CREATE TRIGGER trg_set_message_feedback_org
BEFORE INSERT ON message_feedback
FOR EACH ROW
EXECUTE FUNCTION set_message_feedback_org();

-- Drop permissive policy if exists to replace with stricter ones
DROP POLICY IF EXISTS "Anyone can insert feedback" ON message_feedback;
DROP POLICY IF EXISTS "Users can view feedback of their agents" ON message_feedback;

-- Read policy: members of the same organization can view
CREATE POLICY "Org members can view feedback"
  ON message_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN agents a ON a.organization_id = om.organization_id
      WHERE a.id = message_feedback.agent_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- Insert policy: actor must be the same user or anonymous (no auth) with a session_id
CREATE POLICY "Actor can insert feedback"
  ON message_feedback FOR INSERT
  WITH CHECK (
    (
      auth.uid() IS NOT NULL AND user_id IS NOT NULL AND user_id = auth.uid()
    ) OR (
      auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL
    )
  );

-- Optional: allow owners/admins to manage feedback
CREATE POLICY "Org admins can manage feedback"
  ON message_feedback FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN agents a ON a.organization_id = om.organization_id
      WHERE a.id = message_feedback.agent_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner','admin')
        AND om.status = 'active'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN agents a ON a.organization_id = om.organization_id
      WHERE a.id = message_feedback.agent_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner','admin')
        AND om.status = 'active'
    )
  );

COMMENT ON TRIGGER trg_set_message_feedback_org ON message_feedback IS 'Populate organization_id from agent to scope feedback to org';


