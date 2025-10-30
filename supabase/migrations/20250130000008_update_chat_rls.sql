-- RLS adjustments for org visibility and human intervention

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing broad policy if conflicts
DROP POLICY IF EXISTS "Users manage own messages" ON chat_messages;

-- Policy: session owner can manage their own messages
CREATE POLICY "Session owner manages own messages"
  ON chat_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions cs
      WHERE cs.id = chat_messages.session_id
        AND cs.user_id = auth.uid()
    )
  );

-- Policy: org members can read messages for sessions of agents in their org
CREATE POLICY "Org members can view messages"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM chat_sessions cs
      JOIN agents a ON a.id = cs.agent_id
      JOIN organization_members om ON om.organization_id = a.organization_id
      WHERE cs.id = chat_messages.session_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- Policy: org admins can insert human messages
CREATE POLICY "Org admins can insert human"
  ON chat_messages FOR INSERT
  WITH CHECK (
    NEW.role = 'human' AND
    EXISTS (
      SELECT 1
      FROM chat_sessions cs
      JOIN agents a ON a.id = cs.agent_id
      JOIN organization_members om ON om.organization_id = a.organization_id
      WHERE cs.id = NEW.session_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner','admin')
        AND om.status = 'active'
    )
  );


