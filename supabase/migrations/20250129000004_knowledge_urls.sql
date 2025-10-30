-- Create knowledge_urls table
CREATE TABLE IF NOT EXISTS knowledge_urls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  crawl_depth INTEGER DEFAULT 1,
  auto_refresh BOOLEAN DEFAULT false,
  refresh_frequency VARCHAR(20) DEFAULT 'weekly',
  
  -- Status do processamento
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  last_crawled_at TIMESTAMP WITH TIME ZONE,
  next_crawl_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadados extraídos
  page_title TEXT,
  word_count INTEGER,
  chunks_generated INTEGER,
  content_hash VARCHAR(64),
  
  -- Contexto
  document_description TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE knowledge_urls ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view URLs in their organizations"
  ON knowledge_urls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = knowledge_urls.agent_id
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

CREATE POLICY "Users can create URLs"
  ON knowledge_urls FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = knowledge_urls.agent_id
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

CREATE POLICY "Users can update URLs"
  ON knowledge_urls FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = knowledge_urls.agent_id
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

CREATE POLICY "Users can delete URLs"
  ON knowledge_urls FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = knowledge_urls.agent_id
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
CREATE INDEX IF NOT EXISTS idx_knowledge_urls_agent ON knowledge_urls(agent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_urls_kb ON knowledge_urls(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_urls_status ON knowledge_urls(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_urls_next_crawl ON knowledge_urls(next_crawl_at) WHERE auto_refresh = true;
CREATE INDEX IF NOT EXISTS idx_knowledge_urls_url ON knowledge_urls(url);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_knowledge_urls_updated_at ON knowledge_urls;
CREATE TRIGGER update_knowledge_urls_updated_at 
  BEFORE UPDATE ON knowledge_urls
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE knowledge_urls IS 'Stores URLs to be crawled and processed into knowledge base';
COMMENT ON COLUMN knowledge_urls.content_hash IS 'SHA-256 hash of content to detect changes';

