-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-documents',
  'knowledge-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for knowledge-documents bucket
CREATE POLICY "Users can upload documents to own agent knowledge bases"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'knowledge-documents' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM knowledge_bases kb
    JOIN agents a ON a.id = kb.agent_id
    WHERE kb.id::text = (storage.foldername(name))[1]
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Users can read own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'knowledge-documents'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM knowledge_bases kb
    JOIN agents a ON a.id = kb.agent_id
    WHERE kb.id::text = (storage.foldername(name))[1]
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'knowledge-documents'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM knowledge_bases kb
    JOIN agents a ON a.id = kb.agent_id
    WHERE kb.id::text = (storage.foldername(name))[1]
    AND a.user_id = auth.uid()
  )
);

-- Add file metadata columns to knowledge_documents
ALTER TABLE knowledge_documents 
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS file_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS file_size INTEGER,
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS chunks_count INTEGER DEFAULT 0;

-- Create index for processing status
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_status ON knowledge_documents(processing_status);

-- Add trigger to update chunks_count
CREATE OR REPLACE FUNCTION update_chunks_count()
RETURNS TRIGGER AS $$
BEGIN
  -- This will be used later when we implement chunking
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON COLUMN knowledge_documents.file_name IS 'Original filename of uploaded document';
COMMENT ON COLUMN knowledge_documents.file_type IS 'MIME type of the document';
COMMENT ON COLUMN knowledge_documents.file_path IS 'Path in Supabase Storage';
COMMENT ON COLUMN knowledge_documents.processing_status IS 'Status of document processing (pending, processing, completed, failed)';

