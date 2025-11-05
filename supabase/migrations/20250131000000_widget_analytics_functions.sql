-- Functions for widget analytics counters

-- Function to increment widget counters
CREATE OR REPLACE FUNCTION increment_widget_counter(
  widget_uuid UUID,
  counter_type VARCHAR(20)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF counter_type = 'impressions' THEN
    UPDATE agent_widgets
    SET total_impressions = total_impressions + 1
    WHERE id = widget_uuid;
  ELSIF counter_type = 'conversations' THEN
    UPDATE agent_widgets
    SET total_conversations = total_conversations + 1
    WHERE id = widget_uuid;
  END IF;
END;
$$;

COMMENT ON FUNCTION increment_widget_counter IS 'Increments widget counters (impressions or conversations)';

