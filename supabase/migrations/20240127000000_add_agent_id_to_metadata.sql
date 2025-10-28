-- Migration: Add agent_id to existing documents metadata
-- This updates all knowledge_documents that don't have agent_id in their metadata

-- Update all existing documents with agent_id from their knowledge_base
UPDATE knowledge_documents kd
SET metadata = jsonb_set(
  COALESCE(kd.metadata, '{}'::jsonb),
  '{agent_id}',
  to_jsonb(kb.agent_id::text),
  true
)
FROM knowledge_bases kb
WHERE kd.knowledge_base_id = kb.id
AND (
  kd.metadata IS NULL 
  OR kd.metadata->>'agent_id' IS NULL
);

-- Verify the update
DO $$
DECLARE
  total_docs INTEGER;
  docs_with_agent_id INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_docs
  FROM knowledge_documents
  WHERE embedding IS NOT NULL;
  
  SELECT COUNT(*) INTO docs_with_agent_id
  FROM knowledge_documents
  WHERE embedding IS NOT NULL
  AND metadata->>'agent_id' IS NOT NULL;
  
  RAISE NOTICE 'Total documents with embeddings: %', total_docs;
  RAISE NOTICE 'Documents with agent_id in metadata: %', docs_with_agent_id;
  
  IF total_docs = docs_with_agent_id THEN
    RAISE NOTICE '✅ All documents have agent_id!';
  ELSE
    RAISE WARNING '⚠️ % documents missing agent_id', (total_docs - docs_with_agent_id);
  END IF;
END $$;

-- Comment
COMMENT ON COLUMN knowledge_documents.metadata IS 'JSONB metadata including agent_id for filtering in vector search';


