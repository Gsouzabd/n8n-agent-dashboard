-- Migrate from text-embedding-ada-002 (1536 dimensions) to text-embedding-3-large (3072 dimensions)
-- This migration updates the schema and all functions to support the larger embedding model

-- Step 1: Drop the existing vector index (needed before altering column type)
DROP INDEX IF EXISTS idx_knowledge_documents_embedding;

-- Step 2: Alter the embedding column from vector(1536) to vector(3072)
-- Note: This will make existing embeddings incompatible and they will need to be regenerated
ALTER TABLE knowledge_documents 
  ALTER COLUMN embedding TYPE vector(3072);

-- Step 3: Recreate the vector index with the new dimensions
CREATE INDEX idx_knowledge_documents_embedding 
  ON knowledge_documents 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Step 4: Update search_knowledge_documents function
CREATE OR REPLACE FUNCTION search_knowledge_documents(
  query_embedding vector(3072),
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

-- Step 5: Update search_knowledge_documents_with_context function
CREATE OR REPLACE FUNCTION search_knowledge_documents_with_context(
  query_embedding vector(3072),
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

-- Step 6: Create or replace match_documents function (if it doesn't exist, this creates it)
-- This is a common alias/pattern for vector search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(3072),
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

-- Update comments
COMMENT ON FUNCTION search_knowledge_documents IS 'Performs vector similarity search on knowledge documents using text-embedding-3-large (3072 dimensions)';
COMMENT ON FUNCTION search_knowledge_documents_with_context IS 'Performs vector similarity search with context fields using text-embedding-3-large (3072 dimensions)';
COMMENT ON FUNCTION match_documents IS 'Alias for search_knowledge_documents using text-embedding-3-large (3072 dimensions)';

-- Warning: Existing embeddings in the database will be incompatible and need to be regenerated
-- Documents will need to be reprocessed to generate new embeddings with the text-embedding-3-large model

