-- Create agent_improvements table for storing improvement suggestions with vector embeddings
CREATE TABLE IF NOT EXISTS agent_improvements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_improvements_agent_id ON agent_improvements(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_improvements_created_at ON agent_improvements(created_at DESC);

-- Note: Vector index creation skipped due to Supabase limitations with high-dimensional vectors
-- Vector search will still work without the index, just slower for large datasets

-- Enable Row Level Security
ALTER TABLE agent_improvements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_improvements
CREATE POLICY "Users can view improvements of their agents"
  ON agent_improvements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_improvements.agent_id
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

CREATE POLICY "Users can insert improvements for their agents"
  ON agent_improvements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_improvements.agent_id
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

CREATE POLICY "Users can update improvements of their agents"
  ON agent_improvements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_improvements.agent_id
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

CREATE POLICY "Users can delete improvements of their agents"
  ON agent_improvements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_improvements.agent_id
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

-- Function for similarity search on agent_improvements
-- This function follows the Supabase pattern and is used by n8n's vectorStoreSupabase node
-- The filter should contain agent_id in metadata: {"agent_id": "uuid"}
-- The trigger ensures agent_id is always in metadata
CREATE OR REPLACE FUNCTION match_agent_improvements(
  query_embedding vector(1536),
  match_count int DEFAULT NULL,
  filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id UUID,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    agent_improvements.id,
    agent_improvements.content,
    agent_improvements.metadata,
    1 - (agent_improvements.embedding <=> query_embedding) AS similarity
  FROM agent_improvements
  WHERE agent_improvements.embedding IS NOT NULL
    AND agent_improvements.metadata @> filter
  ORDER BY agent_improvements.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Trigger to ensure metadata always contains agent_id
CREATE OR REPLACE FUNCTION ensure_agent_id_in_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure metadata contains agent_id for filtering
  IF NEW.metadata IS NULL THEN
    NEW.metadata := '{}'::jsonb;
  END IF;
  
  -- Add agent_id to metadata if not present (as UUID string for n8n compatibility)
  IF NOT (NEW.metadata ? 'agent_id') THEN
    NEW.metadata := NEW.metadata || jsonb_build_object('agent_id', NEW.agent_id::text);
  -- Update agent_id in metadata if it changed
  ELSIF (NEW.metadata->>'agent_id')::UUID != NEW.agent_id THEN
    NEW.metadata := NEW.metadata || jsonb_build_object('agent_id', NEW.agent_id::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_agent_id_in_metadata_trigger
  BEFORE INSERT OR UPDATE ON agent_improvements
  FOR EACH ROW
  EXECUTE FUNCTION ensure_agent_id_in_metadata();

-- Comments for documentation
COMMENT ON TABLE agent_improvements IS 'Stores improvement suggestions with vector embeddings for RAG';
COMMENT ON FUNCTION match_agent_improvements IS 'Performs vector similarity search on agent improvements - used by n8n vectorStoreSupabase node';

