-- Create agent_handoff_config table
CREATE TABLE IF NOT EXISTS agent_handoff_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agent_handoff_triggers table
CREATE TABLE IF NOT EXISTS agent_handoff_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  trigger_type VARCHAR(20) NOT NULL CHECK (trigger_type IN ('keyword', 'attempts', 'sentiment')),
  value TEXT NOT NULL,
  matching_type VARCHAR(20) CHECK (
    matching_type IS NULL OR 
    (trigger_type = 'keyword' AND matching_type IN ('exact', 'partial', 'case_insensitive'))
  ),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE agent_handoff_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_handoff_triggers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_handoff_config
CREATE POLICY "Users can view handoff config of their agents"
  ON agent_handoff_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_handoff_config.agent_id
        AND (
          a.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = a.organization_id
              AND om.user_id = auth.uid()
              AND om.status = 'active'
          )
        )
    )
  );

CREATE POLICY "Users can create handoff config for their agents"
  ON agent_handoff_config FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_handoff_config.agent_id
        AND (
          a.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = a.organization_id
              AND om.user_id = auth.uid()
              AND om.role IN ('owner', 'admin', 'member')
              AND om.status = 'active'
          )
        )
    )
  );

CREATE POLICY "Users can update handoff config of their agents"
  ON agent_handoff_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_handoff_config.agent_id
        AND (
          a.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = a.organization_id
              AND om.user_id = auth.uid()
              AND om.role IN ('owner', 'admin', 'member')
              AND om.status = 'active'
          )
        )
    )
  );

CREATE POLICY "Users can delete handoff config of their agents"
  ON agent_handoff_config FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_handoff_config.agent_id
        AND (
          a.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = a.organization_id
              AND om.user_id = auth.uid()
              AND om.role IN ('owner', 'admin')
              AND om.status = 'active'
          )
        )
    )
  );

-- RLS Policies for agent_handoff_triggers
CREATE POLICY "Users can view triggers of their agents"
  ON agent_handoff_triggers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_handoff_triggers.agent_id
        AND (
          a.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = a.organization_id
              AND om.user_id = auth.uid()
              AND om.status = 'active'
          )
        )
    )
  );

CREATE POLICY "Users can create triggers for their agents"
  ON agent_handoff_triggers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_handoff_triggers.agent_id
        AND (
          a.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = a.organization_id
              AND om.user_id = auth.uid()
              AND om.role IN ('owner', 'admin', 'member')
              AND om.status = 'active'
          )
        )
    )
  );

CREATE POLICY "Users can update triggers of their agents"
  ON agent_handoff_triggers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_handoff_triggers.agent_id
        AND (
          a.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = a.organization_id
              AND om.user_id = auth.uid()
              AND om.role IN ('owner', 'admin', 'member')
              AND om.status = 'active'
          )
        )
    )
  );

CREATE POLICY "Users can delete triggers of their agents"
  ON agent_handoff_triggers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_handoff_triggers.agent_id
        AND (
          a.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = a.organization_id
              AND om.user_id = auth.uid()
              AND om.role IN ('owner', 'admin')
              AND om.status = 'active'
          )
        )
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_handoff_config_agent ON agent_handoff_config(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_handoff_triggers_agent ON agent_handoff_triggers(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_handoff_triggers_active ON agent_handoff_triggers(agent_id, is_active) WHERE is_active = true;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_agent_handoff_config_updated_at ON agent_handoff_config;
CREATE TRIGGER update_agent_handoff_config_updated_at 
  BEFORE UPDATE ON agent_handoff_config
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_handoff_triggers_updated_at ON agent_handoff_triggers;
CREATE TRIGGER update_agent_handoff_triggers_updated_at 
  BEFORE UPDATE ON agent_handoff_triggers
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE agent_handoff_config IS 'Configuration for handoff (transfer to human) per agent';
COMMENT ON TABLE agent_handoff_triggers IS 'Triggers that activate handoff for an agent';


