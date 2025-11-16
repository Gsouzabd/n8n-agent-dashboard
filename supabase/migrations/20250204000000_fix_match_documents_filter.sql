-- Fix match_documents function to better handle n8n Vector Store filter format
-- This migration improves the filter parsing and increases the default threshold

-- Drop existing match_documents functions to recreate with better logic
DROP FUNCTION IF EXISTS match_documents(jsonb, integer, vector);
DROP FUNCTION IF EXISTS match_documents(jsonb, integer, text);

-- Create improved match_documents function with vector parameter
CREATE OR REPLACE FUNCTION match_documents(
  filter jsonb,
  match_count integer,
  query_embedding vector
)
RETURNS TABLE(id uuid, content text, metadata jsonb, similarity double precision)
LANGUAGE plpgsql
AS $$
DECLARE
  agent_id_filter UUID;
  match_threshold_val FLOAT := 0.5; -- Increased from 0.2 to 0.5 for better results
BEGIN
  -- Log the incoming filter for debugging
  RAISE NOTICE 'match_documents called with filter: %', filter::TEXT;
  
  -- Try multiple paths to extract agent_id from the filter
  -- Path 1: Direct filter.agent_id
  IF filter ? 'agent_id' THEN
    BEGIN
      agent_id_filter := (filter->>'agent_id')::UUID;
      RAISE NOTICE 'Found agent_id in filter.agent_id: %', agent_id_filter;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to parse agent_id from filter.agent_id: %', filter->>'agent_id';
    END;
  END IF;

  -- Path 2: filter.metadata.agent_id (common n8n format)
  IF agent_id_filter IS NULL AND filter ? 'metadata' THEN
    IF jsonb_typeof(filter->'metadata') = 'object' AND (filter->'metadata') ? 'agent_id' THEN
      BEGIN
        agent_id_filter := (filter->'metadata'->>'agent_id')::UUID;
        RAISE NOTICE 'Found agent_id in filter.metadata.agent_id: %', agent_id_filter;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to parse agent_id from filter.metadata.agent_id';
      END;
    END IF;
  END IF;

  -- Path 3: filter.metadata.metadataValues[] (alternative n8n format)
  IF agent_id_filter IS NULL AND filter ? 'metadata' THEN
    DECLARE
      metadata_values JSONB;
      metadata_item JSONB;
    BEGIN
      metadata_values := filter->'metadata';
      
      -- Check if it has a metadataValues array
      IF jsonb_typeof(metadata_values) = 'object' AND metadata_values ? 'metadataValues' THEN
        metadata_values := metadata_values->'metadataValues';
      END IF;
      
      -- If it's an array, search for agent_id
      IF jsonb_typeof(metadata_values) = 'array' THEN
        FOR metadata_item IN SELECT * FROM jsonb_array_elements(metadata_values)
        LOOP
          IF metadata_item ? 'name' AND (metadata_item->>'name') = 'agent_id' THEN
            BEGIN
              agent_id_filter := (metadata_item->>'value')::UUID;
              RAISE NOTICE 'Found agent_id in filter.metadata.metadataValues[].value: %', agent_id_filter;
              EXIT;
            EXCEPTION WHEN OTHERS THEN
              RAISE WARNING 'Failed to parse agent_id from metadataValues';
            END;
          END IF;
        END LOOP;
      END IF;
    END;
  END IF;

  -- If still no agent_id found, return empty result with warning
  IF agent_id_filter IS NULL THEN
    RAISE WARNING 'No agent_id found in filter. Filter structure: %', filter::TEXT;
    RETURN;
  END IF;

  -- Allow threshold override from filter
  IF filter ? 'match_threshold' THEN
    BEGIN
      match_threshold_val := (filter->>'match_threshold')::FLOAT;
      RAISE NOTICE 'Using custom threshold: %', match_threshold_val;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to parse match_threshold, using default: %', match_threshold_val;
    END;
  END IF;

  RAISE NOTICE 'Executing vector search: agent_id=%, threshold=%, limit=%', 
    agent_id_filter, match_threshold_val, match_count;

  -- Execute the vector similarity search
  RETURN QUERY
  SELECT
    kd.id,
    kd.content,
    kd.metadata,
    1 - (kd.embedding <=> query_embedding) AS similarity
  FROM knowledge_documents kd
  JOIN knowledge_bases kb ON kb.id = kd.knowledge_base_id
  WHERE kd.embedding IS NOT NULL
    AND kb.agent_id = agent_id_filter
    AND 1 - (kd.embedding <=> query_embedding) > match_threshold_val
  ORDER BY kd.embedding <=> query_embedding
  LIMIT match_count;
  
  RAISE NOTICE 'Vector search completed';
END;
$$;

-- Update function comments
COMMENT ON FUNCTION match_documents(jsonb, integer, vector) IS 
  'Performs vector similarity search on knowledge documents using text-embedding-3-large (3072 dimensions).
   Accepts filter with agent_id in multiple formats:
   - filter.agent_id
   - filter.metadata.agent_id
   - filter.metadata.metadataValues[{name: "agent_id", value: "..."}]
   Default similarity threshold: 0.5';

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION match_documents(jsonb, integer, vector) TO authenticated;
GRANT EXECUTE ON FUNCTION match_documents(jsonb, integer, vector) TO service_role;
GRANT EXECUTE ON FUNCTION match_documents(jsonb, integer, vector) TO anon;

