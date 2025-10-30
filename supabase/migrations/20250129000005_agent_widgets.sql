-- Create agent_widgets table
CREATE TABLE IF NOT EXISTS agent_widgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  widget_id VARCHAR(50) UNIQUE NOT NULL,
  
  -- Configurações visuais
  widget_type VARCHAR(20) DEFAULT 'bubble' CHECK (widget_type IN ('bubble', 'full', 'inline')),
  primary_color VARCHAR(7) DEFAULT '#FF6B00',
  position VARCHAR(20) DEFAULT 'bottom-right' CHECK (position IN ('bottom-right', 'bottom-left', 'top-right', 'top-left')),
  width INTEGER DEFAULT 400,
  height INTEGER DEFAULT 600,
  
  -- Segurança
  allowed_domains TEXT[] DEFAULT '{}',
  allow_all_domains BOOLEAN DEFAULT false,
  require_auth BOOLEAN DEFAULT false,
  
  -- Analytics
  total_impressions INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create widget_analytics table
CREATE TABLE IF NOT EXISTS widget_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  widget_id UUID REFERENCES agent_widgets(id) ON DELETE CASCADE,
  referrer_url TEXT,
  referrer_domain TEXT,
  user_agent TEXT,
  conversation_id UUID,
  event_type VARCHAR(20) CHECK (event_type IN ('impression', 'open', 'close', 'message', 'interaction')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE agent_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_widgets
CREATE POLICY "Users can view widgets of their agents"
  ON agent_widgets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_widgets.agent_id
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

CREATE POLICY "Users can create widgets for their agents"
  ON agent_widgets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_widgets.agent_id
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

CREATE POLICY "Users can update their agent widgets"
  ON agent_widgets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_widgets.agent_id
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

CREATE POLICY "Users can delete their agent widgets"
  ON agent_widgets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_widgets.agent_id
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

-- RLS Policies for widget_analytics (public read for widget owners)
CREATE POLICY "Users can view analytics of their widgets"
  ON widget_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_widgets aw
      JOIN agents a ON a.id = aw.agent_id
      WHERE aw.id = widget_analytics.widget_id
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

CREATE POLICY "Anyone can insert widget analytics"
  ON widget_analytics FOR INSERT
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_widgets_agent ON agent_widgets(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_widgets_widget_id ON agent_widgets(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_widget ON widget_analytics(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_domain ON widget_analytics(referrer_domain);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_created ON widget_analytics(created_at DESC);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_agent_widgets_updated_at ON agent_widgets;
CREATE TRIGGER update_agent_widgets_updated_at 
  BEFORE UPDATE ON agent_widgets
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique widget ID
CREATE OR REPLACE FUNCTION generate_widget_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_id TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generate random 8-character alphanumeric ID
    new_id := LOWER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
    
    -- Check if it already exists
    SELECT COUNT(*) INTO exists_check FROM agent_widgets WHERE widget_id = new_id;
    
    -- Exit loop if unique
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN new_id;
END;
$$;

COMMENT ON TABLE agent_widgets IS 'Configuration for embeddable chat widgets';
COMMENT ON TABLE widget_analytics IS 'Analytics tracking for widget usage';

