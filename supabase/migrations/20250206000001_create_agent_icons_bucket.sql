-- Create storage bucket for agent icons
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agent-icons',
  'agent-icons',
  true,
  5242880, -- 5MB limit for images
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for agent-icons bucket
CREATE POLICY "Users can upload their own agent icons"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'agent-icons' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id::text = (storage.foldername(name))[1]
      AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own agent icons"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'agent-icons' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id::text = (storage.foldername(name))[1]
      AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own agent icons"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'agent-icons' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id::text = (storage.foldername(name))[1]
      AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view all agent icons"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'agent-icons');

COMMENT ON TABLE storage.buckets IS 'Bucket agent-icons created for storing agent icon images';

