-- Add organization_id to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to knowledge_bases table
ALTER TABLE knowledge_bases ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to chat_sessions table
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agents_organization ON agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_organization ON knowledge_bases(organization_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_organization ON chat_sessions(organization_id);

-- Update RLS policies for agents to consider organizations
DROP POLICY IF EXISTS "Users can view their own agents" ON agents;
DROP POLICY IF EXISTS "Users can insert their own agents" ON agents;
DROP POLICY IF EXISTS "Users can update their own agents" ON agents;
DROP POLICY IF EXISTS "Users can delete their own agents" ON agents;

CREATE POLICY "Users can view agents in their organizations"
  ON agents FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = agents.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.status = 'active'
    )
  );

CREATE POLICY "Users can create agents"
  ON agents FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = agents.organization_id
          AND organization_members.user_id = auth.uid()
          AND organization_members.role IN ('owner', 'admin', 'member')
          AND organization_members.status = 'active'
      )
    )
  );

CREATE POLICY "Users can update their agents or org agents with permission"
  ON agents FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = agents.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin', 'member')
        AND organization_members.status = 'active'
    )
  );

CREATE POLICY "Users can delete their agents or org agents with permission"
  ON agents FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = agents.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
        AND organization_members.status = 'active'
    )
  );

-- Update RLS policies for knowledge_bases
DROP POLICY IF EXISTS "Users can view knowledge bases of their agents" ON knowledge_bases;
DROP POLICY IF EXISTS "Users can insert knowledge bases for their agents" ON knowledge_bases;
DROP POLICY IF EXISTS "Users can update knowledge bases of their agents" ON knowledge_bases;
DROP POLICY IF EXISTS "Users can delete knowledge bases of their agents" ON knowledge_bases;

CREATE POLICY "Users can view knowledge bases in their organizations"
  ON knowledge_bases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = knowledge_bases.agent_id
        AND (
          agents.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = agents.organization_id
              AND organization_members.user_id = auth.uid()
              AND organization_members.status = 'active'
          )
        )
    )
  );

CREATE POLICY "Users can create knowledge bases"
  ON knowledge_bases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = knowledge_bases.agent_id
        AND (
          agents.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = agents.organization_id
              AND organization_members.user_id = auth.uid()
              AND organization_members.role IN ('owner', 'admin', 'member')
              AND organization_members.status = 'active'
          )
        )
    )
  );

CREATE POLICY "Users can update knowledge bases"
  ON knowledge_bases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = knowledge_bases.agent_id
        AND (
          agents.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = agents.organization_id
              AND organization_members.user_id = auth.uid()
              AND organization_members.role IN ('owner', 'admin', 'member')
              AND organization_members.status = 'active'
          )
        )
    )
  );

CREATE POLICY "Users can delete knowledge bases"
  ON knowledge_bases FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = knowledge_bases.agent_id
        AND (
          agents.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = agents.organization_id
              AND organization_members.user_id = auth.uid()
              AND organization_members.role IN ('owner', 'admin')
              AND organization_members.status = 'active'
          )
        )
    )
  );

-- Update RLS policies for chat_sessions
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can insert their own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can delete their own chat sessions" ON chat_sessions;

CREATE POLICY "Users can view chat sessions in their organizations"
  ON chat_sessions FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = chat_sessions.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.status = 'active'
    )
  );

CREATE POLICY "Users can create chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY "Users can update their chat sessions"
  ON chat_sessions FOR UPDATE
  USING (
    auth.uid() = user_id
  );

CREATE POLICY "Users can delete their chat sessions"
  ON chat_sessions FOR DELETE
  USING (
    auth.uid() = user_id
  );

-- Link theme_settings to organizations
UPDATE theme_settings SET organization_id = NULL WHERE organization_id IS NULL;

-- Function to create default personal organization for existing users
CREATE OR REPLACE FUNCTION create_default_organization_for_user(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
  v_user_email TEXT;
  v_slug TEXT;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
  
  -- Generate slug from email
  v_slug := LOWER(REGEXP_REPLACE(SPLIT_PART(v_user_email, '@', 1), '[^a-zA-Z0-9]', '-', 'g')) || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);
  
  -- Create organization
  INSERT INTO organizations (name, slug, owner_id)
  VALUES (SPLIT_PART(v_user_email, '@', 1) || '''s Workspace', v_slug, p_user_id)
  RETURNING id INTO v_org_id;
  
  -- Add user as owner
  INSERT INTO organization_members (organization_id, user_id, role, status)
  VALUES (v_org_id, p_user_id, 'owner', 'active');
  
  -- Update existing agents
  UPDATE agents SET organization_id = v_org_id WHERE user_id = p_user_id AND organization_id IS NULL;
  
  -- Log audit event
  PERFORM log_audit_event(v_org_id, p_user_id, 'organization.created', 'organization', v_org_id, '{"source": "auto_migration"}'::jsonb);
  
  RETURN v_org_id;
END;
$$;

COMMENT ON FUNCTION create_default_organization_for_user IS 'Creates a default personal organization for a user';

