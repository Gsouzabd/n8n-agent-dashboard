-- Allow 'human' role in chat_messages for operator intervention

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.chat_messages'::regclass
    AND contype = 'c'
    AND conname ILIKE '%role%check%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.chat_messages DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_role_check CHECK (role IN ('user','assistant','human'));

COMMENT ON CONSTRAINT chat_messages_role_check ON public.chat_messages IS 'Permite roles user, assistant e human';


