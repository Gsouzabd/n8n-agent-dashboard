-- Aumentar limite de arquivo para 30MB
-- ✅ EXECUTADO VIA MCP SUPABASE em 27/10/2025

-- Atualizar o limite do bucket de 10MB para 30MB
UPDATE storage.buckets
SET file_size_limit = 31457280  -- 30MB em bytes
WHERE id = 'knowledge-documents';

-- Verificar o resultado
SELECT 
  id,
  name,
  file_size_limit,
  file_size_limit / 1024 / 1024 as limit_mb
FROM storage.buckets
WHERE id = 'knowledge-documents';

-- Comentário sobre limites recomendados:
-- 10 MB  = 10485760    (padrão inicial)
-- 30 MB  = 31457280    (atual - suporta PDFs médios)
-- 50 MB  = 52428800    (opcional - PDFs grandes)
-- 100 MB = 104857600   (opcional - PDFs muito grandes)

-- Para aumentar ainda mais (se necessário):
-- UPDATE storage.buckets SET file_size_limit = 52428800 WHERE id = 'knowledge-documents';  -- 50MB
-- UPDATE storage.buckets SET file_size_limit = 104857600 WHERE id = 'knowledge-documents'; -- 100MB

COMMENT ON TABLE storage.buckets IS 'Limite aumentado para 30MB para suportar PDFs médios';

