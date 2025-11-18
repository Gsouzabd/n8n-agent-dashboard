-- Improve agent_improvements to include full context: message, issue_category, and improvement_suggestion
-- This gives the RAG more context to find relevant improvements

-- Drop and recreate the trigger function to include message content
CREATE OR REPLACE FUNCTION public.trg_capture_feedback_improvement()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_message_content TEXT;
  v_content TEXT;
BEGIN
  -- Only process if there's an improvement suggestion
  IF NEW.improvement_suggestion IS NOT NULL AND TRIM(NEW.improvement_suggestion) != '' THEN
    
    -- Get the original message content from chat_messages
    IF NEW.message_id IS NOT NULL THEN
      SELECT content INTO v_message_content
      FROM chat_messages
      WHERE id = NEW.message_id AND role = 'assistant'
      LIMIT 1;
    END IF;
    
    -- Build comprehensive content with all context
    -- Format: [Message] | [Issue Category] | [Improvement Suggestion]
    v_content := '';
    
    -- Add message content if available
    IF v_message_content IS NOT NULL AND TRIM(v_message_content) != '' THEN
      v_content := 'Mensagem original: ' || LEFT(TRIM(v_message_content), 2000) || E'\n\n';
    END IF;
    
    -- Add issue category if available
    IF NEW.issue_category IS NOT NULL THEN
      v_content := v_content || 'Categoria do problema: ' || NEW.issue_category || E'\n\n';
    END IF;
    
    -- Add improvement suggestion
    v_content := v_content || 'Sugestão de melhoria: ' || LEFT(TRIM(NEW.improvement_suggestion), 2000);
    
    -- Trim final content and limit to reasonable size (max 5000 chars)
    v_content := LEFT(TRIM(v_content), 5000);
    
    -- Insert into agent_improvements with full context
    INSERT INTO agent_improvements (agent_id, content, metadata)
    VALUES (
      NEW.agent_id,
      v_content,
      jsonb_build_object(
        'issue_category', NEW.issue_category,
        'source_feedback_id', NEW.id::text,
        'message_id', COALESCE(NEW.message_id::text, NULL),
        'message_content_preview', CASE 
          WHEN v_message_content IS NOT NULL THEN LEFT(v_message_content, 200)
          ELSE NULL
        END
      )
    ) ON CONFLICT (agent_id, content) DO UPDATE
    SET 
      metadata = EXCLUDED.metadata,
      updated_at = NOW();
      
  END IF;
  
  RETURN NEW;
END $function$;

COMMENT ON FUNCTION trg_capture_feedback_improvement() IS 
'Captures feedback improvements with full context: original message, issue category, and improvement suggestion for better RAG search';

