-- Create message_feedback table
CREATE TABLE IF NOT EXISTS message_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES chat_sessions(id),
  agent_id UUID REFERENCES agents(id),
  
  -- Feedback geral
  feedback_type VARCHAR(10) NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
  
  -- Bloco específico (se resposta dividida)
  block_index INTEGER,
  block_content TEXT,
  
  -- Detalhes do problema
  issue_category VARCHAR(30) CHECK (issue_category IN ('incorrect', 'incomplete', 'tone', 'formatting', 'other')),
  
  -- Sugestão de melhoria
  improvement_suggestion TEXT,
  
  -- Metadata
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create response_improvements table
CREATE TABLE IF NOT EXISTS response_improvements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id),
  original_response TEXT NOT NULL,
  improved_response TEXT NOT NULL,
  
  -- Tracking de origem
  based_on_feedback_count INTEGER DEFAULT 1,
  improvement_sources UUID[] DEFAULT '{}',
  
  -- A/B Testing
  status VARCHAR(20) DEFAULT 'testing' CHECK (status IN ('testing', 'approved', 'rejected')),
  test_group VARCHAR(10) DEFAULT 'B' CHECK (test_group IN ('A', 'B')),
  
  -- Métricas de A/B test
  impressions_a INTEGER DEFAULT 0,
  impressions_b INTEGER DEFAULT 0,
  positive_feedback_a INTEGER DEFAULT 0,
  positive_feedback_b INTEGER DEFAULT 0,
  negative_feedback_a INTEGER DEFAULT 0,
  negative_feedback_b INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Create response_blocks table
CREATE TABLE IF NOT EXISTS response_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  block_index INTEGER NOT NULL,
  block_content TEXT NOT NULL,
  word_count INTEGER,
  
  -- Feedback agregado
  positive_count INTEGER DEFAULT 0,
  negative_count INTEGER DEFAULT 0,
  improvement_suggestions JSONB DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, block_index)
);

-- Enable RLS
ALTER TABLE message_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_improvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_feedback
CREATE POLICY "Users can view feedback of their agents"
  ON message_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = message_feedback.agent_id
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

CREATE POLICY "Anyone can insert feedback"
  ON message_feedback FOR INSERT
  WITH CHECK (true);

-- RLS Policies for response_improvements
CREATE POLICY "Users can view improvements of their agents"
  ON response_improvements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = response_improvements.agent_id
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

CREATE POLICY "Users can manage improvements of their agents"
  ON response_improvements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = response_improvements.agent_id
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

-- RLS Policies for response_blocks
CREATE POLICY "Anyone can view response blocks"
  ON response_blocks FOR SELECT
  USING (true);

CREATE POLICY "System can manage response blocks"
  ON response_blocks FOR ALL
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_message_feedback_message ON message_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_agent ON message_feedback(agent_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_type ON message_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_response_improvements_agent ON response_improvements(agent_id);
CREATE INDEX IF NOT EXISTS idx_response_improvements_status ON response_improvements(status);
CREATE INDEX IF NOT EXISTS idx_response_blocks_message ON response_blocks(message_id);

-- Function to increment block feedback
CREATE OR REPLACE FUNCTION increment_block_feedback(
  p_message_id UUID,
  p_block_index INTEGER,
  p_feedback_type VARCHAR(10)
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_feedback_type = 'positive' THEN
    UPDATE response_blocks
    SET positive_count = positive_count + 1
    WHERE message_id = p_message_id AND block_index = p_block_index;
  ELSE
    UPDATE response_blocks
    SET negative_count = negative_count + 1
    WHERE message_id = p_message_id AND block_index = p_block_index;
  END IF;
END;
$$;

-- Function to get agent quality metrics
CREATE OR REPLACE FUNCTION get_agent_quality_metrics(p_agent_id UUID)
RETURNS TABLE (
  total_responses BIGINT,
  total_feedback BIGINT,
  positive_rate FLOAT,
  negative_rate FLOAT,
  top_issues JSONB,
  improvement_suggestions_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_feedback BIGINT;
  v_positive_count BIGINT;
  v_negative_count BIGINT;
BEGIN
  -- Get total messages
  SELECT COUNT(DISTINCT cm.id) INTO total_responses
  FROM chat_messages cm
  JOIN chat_sessions cs ON cs.id = cm.session_id
  WHERE cs.agent_id = p_agent_id AND cm.role = 'assistant';
  
  -- Get feedback counts
  SELECT COUNT(*) INTO v_total_feedback
  FROM message_feedback
  WHERE agent_id = p_agent_id;
  
  SELECT COUNT(*) INTO v_positive_count
  FROM message_feedback
  WHERE agent_id = p_agent_id AND feedback_type = 'positive';
  
  SELECT COUNT(*) INTO v_negative_count
  FROM message_feedback
  WHERE agent_id = p_agent_id AND feedback_type = 'negative';
  
  -- Calculate rates
  total_feedback := v_total_feedback;
  positive_rate := CASE 
    WHEN v_total_feedback > 0 THEN v_positive_count::FLOAT / v_total_feedback 
    ELSE 0 
  END;
  negative_rate := CASE 
    WHEN v_total_feedback > 0 THEN v_negative_count::FLOAT / v_total_feedback 
    ELSE 0 
  END;
  
  -- Get top issues
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'category', issue_category,
        'count', issue_count
      )
      ORDER BY issue_count DESC
    ),
    '[]'::jsonb
  ) INTO top_issues
  FROM (
    SELECT issue_category, COUNT(*) as issue_count
    FROM message_feedback
    WHERE agent_id = p_agent_id AND issue_category IS NOT NULL
    GROUP BY issue_category
    LIMIT 5
  ) issues;
  
  -- Get improvement suggestions count
  SELECT COUNT(*) INTO improvement_suggestions_count
  FROM message_feedback
  WHERE agent_id = p_agent_id AND improvement_suggestion IS NOT NULL;
  
  RETURN QUERY SELECT 
    total_responses,
    total_feedback,
    positive_rate,
    negative_rate,
    top_issues,
    improvement_suggestions_count;
END;
$$;

COMMENT ON TABLE message_feedback IS 'Stores user feedback on chat messages';
COMMENT ON TABLE response_improvements IS 'Stores improved responses for A/B testing';
COMMENT ON TABLE response_blocks IS 'Stores message blocks with aggregated feedback';

