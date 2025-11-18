-- Reprocess existing agent_improvements to include full context
-- This updates old records that only have improvement_suggestion to include message and issue_category

DO $$
DECLARE
  v_feedback_record RECORD;
  v_message_content TEXT;
  v_new_content TEXT;
  v_improvement_id UUID;
BEGIN
  -- Loop through all message_feedback records with improvement_suggestion
  FOR v_feedback_record IN
    SELECT 
      mf.id as feedback_id,
      mf.message_id,
      mf.agent_id,
      mf.issue_category,
      mf.improvement_suggestion,
      ai.id as improvement_id
    FROM message_feedback mf
    LEFT JOIN agent_improvements ai ON ai.metadata->>'source_feedback_id' = mf.id::text
    WHERE mf.improvement_suggestion IS NOT NULL 
      AND TRIM(mf.improvement_suggestion) != ''
      AND ai.id IS NOT NULL
  LOOP
    -- Get the original message content
    v_message_content := NULL;
    IF v_feedback_record.message_id IS NOT NULL THEN
      SELECT content INTO v_message_content
      FROM chat_messages
      WHERE id = v_feedback_record.message_id AND role = 'assistant'
      LIMIT 1;
    END IF;
    
    -- Build comprehensive content with all context
    v_new_content := '';
    
    -- Add message content if available
    IF v_message_content IS NOT NULL AND TRIM(v_message_content) != '' THEN
      v_new_content := 'Mensagem original: ' || LEFT(TRIM(v_message_content), 2000) || E'\n\n';
    END IF;
    
    -- Add issue category if available
    IF v_feedback_record.issue_category IS NOT NULL THEN
      v_new_content := v_new_content || 'Categoria do problema: ' || v_feedback_record.issue_category || E'\n\n';
    END IF;
    
    -- Add improvement suggestion
    v_new_content := v_new_content || 'Sugestão de melhoria: ' || LEFT(TRIM(v_feedback_record.improvement_suggestion), 2000);
    
    -- Trim final content
    v_new_content := LEFT(TRIM(v_new_content), 5000);
    
    -- Update the existing agent_improvement record
    UPDATE agent_improvements
    SET 
      content = v_new_content,
      metadata = jsonb_build_object(
        'issue_category', v_feedback_record.issue_category,
        'source_feedback_id', v_feedback_record.feedback_id::text,
        'message_id', COALESCE(v_feedback_record.message_id::text, NULL),
        'message_content_preview', CASE 
          WHEN v_message_content IS NOT NULL THEN LEFT(v_message_content, 200)
          ELSE NULL
        END
      ),
      updated_at = NOW()
    WHERE id = v_feedback_record.improvement_id;
    
  END LOOP;
  
  RAISE NOTICE 'Reprocessed existing improvements with full context';
END $$;

COMMENT ON FUNCTION trg_capture_feedback_improvement() IS 
'Reprocesses existing agent_improvements to include full context (message, issue_category, improvement_suggestion)';

