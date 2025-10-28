-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  webhook_url TEXT,
  webhook_method TEXT DEFAULT 'POST',
  webhook_path TEXT,
  auth_type TEXT DEFAULT 'none',
  auth_username TEXT,
  auth_password TEXT,
  system_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create knowledge_bases table
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create knowledge_documents table
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_agent_id ON knowledge_bases(agent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_kb_id ON knowledge_documents(knowledge_base_id);

-- Create vector index for similarity search
-- Note: This creates an IVFFlat index. For production, you may want to tune the 'lists' parameter
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_embedding 
  ON knowledge_documents 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

-- Enable Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agents table
CREATE POLICY "Users can view their own agents"
  ON agents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agents"
  ON agents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents"
  ON agents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents"
  ON agents FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for knowledge_bases table
CREATE POLICY "Users can view knowledge bases of their agents"
  ON knowledge_bases FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM agents WHERE agents.id = knowledge_bases.agent_id AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert knowledge bases for their agents"
  ON knowledge_bases FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM agents WHERE agents.id = knowledge_bases.agent_id AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Users can update knowledge bases of their agents"
  ON knowledge_bases FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM agents WHERE agents.id = knowledge_bases.agent_id AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete knowledge bases of their agents"
  ON knowledge_bases FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM agents WHERE agents.id = knowledge_bases.agent_id AND agents.user_id = auth.uid()
  ));

-- RLS Policies for knowledge_documents table
CREATE POLICY "Users can view documents of their agents"
  ON knowledge_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM knowledge_bases kb
    JOIN agents a ON a.id = kb.agent_id
    WHERE kb.id = knowledge_documents.knowledge_base_id AND a.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert documents for their agents"
  ON knowledge_documents FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM knowledge_bases kb
    JOIN agents a ON a.id = kb.agent_id
    WHERE kb.id = knowledge_documents.knowledge_base_id AND a.user_id = auth.uid()
  ));

CREATE POLICY "Users can update documents of their agents"
  ON knowledge_documents FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM knowledge_bases kb
    JOIN agents a ON a.id = kb.agent_id
    WHERE kb.id = knowledge_documents.knowledge_base_id AND a.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete documents of their agents"
  ON knowledge_documents FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM knowledge_bases kb
    JOIN agents a ON a.id = kb.agent_id
    WHERE kb.id = knowledge_documents.knowledge_base_id AND a.user_id = auth.uid()
  ));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at 
  BEFORE UPDATE ON agents
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function for similarity search
CREATE OR REPLACE FUNCTION search_knowledge_documents(
  query_embedding vector(1536),
  agent_id_param UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kd.id,
    kd.content,
    kd.metadata,
    1 - (kd.embedding <=> query_embedding) AS similarity
  FROM knowledge_documents kd
  JOIN knowledge_bases kb ON kb.id = kd.knowledge_base_id
  WHERE kb.agent_id = agent_id_param
    AND kd.embedding IS NOT NULL
    AND 1 - (kd.embedding <=> query_embedding) > match_threshold
  ORDER BY kd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Comments for documentation
COMMENT ON TABLE agents IS 'Stores AI agent configurations';
COMMENT ON TABLE knowledge_bases IS 'Stores knowledge base collections for agents';
COMMENT ON TABLE knowledge_documents IS 'Stores vectorized documents for RAG';
COMMENT ON FUNCTION search_knowledge_documents IS 'Performs vector similarity search on knowledge documents';

