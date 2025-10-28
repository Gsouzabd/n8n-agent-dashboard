-- 🧹 Script de Limpeza e Verificação - Knowledge Base
-- Execute este script no SQL Editor do Supabase

-- ==========================================
-- 1. VER SITUAÇÃO ATUAL
-- ==========================================

-- Ver todas as bases de conhecimento e contar documentos
SELECT 
  kb.id as base_id,
  kb.agent_id,
  kb.name,
  kb.created_at,
  COUNT(kd.id) as total_documentos
FROM knowledge_bases kb
LEFT JOIN knowledge_documents kd ON kd.knowledge_base_id = kb.id
GROUP BY kb.id, kb.agent_id, kb.name, kb.created_at
ORDER BY kb.agent_id, kb.created_at;

-- Ver bases duplicadas (mesma agent_id)
SELECT 
  agent_id,
  COUNT(*) as total_bases
FROM knowledge_bases
GROUP BY agent_id
HAVING COUNT(*) > 1;

-- ==========================================
-- 2. MOVER DOCUMENTOS PARA A BASE MAIS ANTIGA
-- ==========================================

-- Para cada agente, mover todos documentos para a base mais antiga
-- e depois deletar bases vazias duplicadas

DO $$
DECLARE
  agent_record RECORD;
  oldest_kb_id UUID;
  duplicate_kb_id UUID;
BEGIN
  -- Para cada agente que tem bases duplicadas
  FOR agent_record IN (
    SELECT agent_id, COUNT(*) as total
    FROM knowledge_bases
    GROUP BY agent_id
    HAVING COUNT(*) > 1
  ) LOOP
    
    -- Pegar a base mais antiga (keeper)
    SELECT id INTO oldest_kb_id
    FROM knowledge_bases
    WHERE agent_id = agent_record.agent_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    RAISE NOTICE 'Agente %: mantendo base %', agent_record.agent_id, oldest_kb_id;
    
    -- Para cada base duplicada
    FOR duplicate_kb_id IN (
      SELECT id
      FROM knowledge_bases
      WHERE agent_id = agent_record.agent_id
        AND id != oldest_kb_id
    ) LOOP
      
      RAISE NOTICE '  -> Movendo documentos de % para %', duplicate_kb_id, oldest_kb_id;
      
      -- Mover todos os documentos da base duplicada para a base principal
      UPDATE knowledge_documents
      SET knowledge_base_id = oldest_kb_id
      WHERE knowledge_base_id = duplicate_kb_id;
      
      -- Deletar a base duplicada (agora vazia)
      DELETE FROM knowledge_bases
      WHERE id = duplicate_kb_id;
      
      RAISE NOTICE '  -> Base % deletada', duplicate_kb_id;
      
    END LOOP;
    
  END LOOP;
END $$;

-- ==========================================
-- 3. VERIFICAR RESULTADO
-- ==========================================

-- Ver bases de conhecimento após limpeza
SELECT 
  kb.id as base_id,
  kb.agent_id,
  a.name as agent_name,
  kb.name as base_name,
  COUNT(kd.id) as total_documentos,
  kb.created_at
FROM knowledge_bases kb
JOIN agents a ON a.id = kb.agent_id
LEFT JOIN knowledge_documents kd ON kd.knowledge_base_id = kb.id
GROUP BY kb.id, kb.agent_id, a.name, kb.name, kb.created_at
ORDER BY a.name;

-- Ver todos os documentos
SELECT 
  kd.id,
  kd.file_name,
  kd.file_type,
  kd.processing_status,
  kd.knowledge_base_id,
  kb.agent_id,
  a.name as agent_name,
  kd.created_at
FROM knowledge_documents kd
JOIN knowledge_bases kb ON kb.id = kd.knowledge_base_id
JOIN agents a ON a.id = kb.agent_id
ORDER BY a.name, kd.created_at DESC;

-- Ver estatísticas finais
SELECT 
  COUNT(DISTINCT agent_id) as total_agentes,
  COUNT(*) as total_bases
FROM knowledge_bases;

SELECT 
  COUNT(*) as total_documentos,
  COUNT(DISTINCT file_path) as arquivos_unicos
FROM knowledge_documents;


