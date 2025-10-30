-- Add prompt engineering columns to knowledge_documents
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS document_description TEXT;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS usage_context TEXT;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS usage_instructions TEXT;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS dialogue_examples JSONB DEFAULT '[]';
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS prompt_metadata JSONB DEFAULT '{}';

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_tags ON knowledge_documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_prompt_metadata ON knowledge_documents USING GIN(prompt_metadata);

-- Function to search documents with context
CREATE OR REPLACE FUNCTION search_knowledge_documents_with_context(
  query_embedding vector(1536),
  agent_id_param UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT,
  document_description TEXT,
  usage_context TEXT,
  usage_instructions TEXT,
  dialogue_examples JSONB,
  tags TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kd.id,
    kd.content,
    kd.metadata,
    1 - (kd.embedding <=> query_embedding) AS similarity,
    kd.document_description,
    kd.usage_context,
    kd.usage_instructions,
    kd.dialogue_examples,
    kd.tags
  FROM knowledge_documents kd
  JOIN knowledge_bases kb ON kb.id = kd.knowledge_base_id
  WHERE kb.agent_id = agent_id_param
    AND kd.embedding IS NOT NULL
    AND 1 - (kd.embedding <=> query_embedding) > match_threshold
  ORDER BY kd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON COLUMN knowledge_documents.document_description IS 'Description of what the document contains';
COMMENT ON COLUMN knowledge_documents.usage_context IS 'When to use this document';
COMMENT ON COLUMN knowledge_documents.usage_instructions IS 'How to use information from this document';
COMMENT ON COLUMN knowledge_documents.dialogue_examples IS 'Array of example user/AI dialogues';
COMMENT ON COLUMN knowledge_documents.tags IS 'Tags for document categorization and search';
COMMENT ON COLUMN knowledge_documents.prompt_metadata IS 'Additional metadata for prompt engineering';

