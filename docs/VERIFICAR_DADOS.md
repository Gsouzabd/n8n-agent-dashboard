# 🔍 Verificar Dados no Banco

## Situação Atual

Você tem:
- ✅ **4 bases de conhecimento** na tabela `knowledge_bases` (2 duplicadas)
- ❌ **0 documentos** na tabela `knowledge_documents`
- ✅ **Interface funcionando corretamente** (mostrando "0 arquivos")

## 📊 Estrutura do Banco de Dados

### Tabela `knowledge_bases`
Contém as "pastas" ou "containers" para organizar documentos de cada agente.

```json
[
  {
    "id": "0194db6c-914f-4197-b615-6b1aa11a2df7",
    "agent_id": "3f5827bf-5de6-4462-8b7d-8c01454f0692",
    "name": "Base Principal"
  },
  {
    "id": "99556026-808e-4894-b3e4-4fe8666ac6db",
    "agent_id": "3f5827bf-5de6-4462-8b7d-8c01454f0692",
    "name": "Base Principal" // ⚠️ DUPLICADO
  }
]
```

### Tabela `knowledge_documents`
Contém os arquivos reais (PDF, DOCX, etc.) que foram feitos upload.

**Status atual:** VAZIA (0 registros)

---

## 🧹 Limpar Bases Duplicadas

### Opção 1: SQL Editor do Supabase

1. Acesse o **SQL Editor** no painel do Supabase
2. Execute o script:

```sql
-- Ver bases duplicadas
SELECT 
  agent_id,
  COUNT(*) as total_bases,
  MIN(created_at) as primeira_criacao,
  MAX(created_at) as ultima_criacao
FROM knowledge_bases
GROUP BY agent_id
HAVING COUNT(*) > 1;

-- Deletar duplicadas (mantém a mais antiga)
DELETE FROM knowledge_bases
WHERE id IN (
  SELECT id 
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY agent_id 
        ORDER BY created_at ASC
      ) as rn
    FROM knowledge_bases
  ) t
  WHERE rn > 1
);

-- Verificar resultado
SELECT agent_id, COUNT(*) as total_bases
FROM knowledge_bases
GROUP BY agent_id;
```

### Opção 2: Via MCP Supabase (se configurado)

Execute as queries SQL diretamente pela ferramenta MCP.

---

## 📁 Verificar Documentos

### Query para ver todos os documentos:

```sql
SELECT 
  kd.id,
  kd.file_name,
  kd.file_type,
  kd.file_size,
  kd.processing_status,
  kd.knowledge_base_id,
  kb.agent_id,
  a.name as agent_name,
  kd.created_at
FROM knowledge_documents kd
JOIN knowledge_bases kb ON kb.id = kd.knowledge_base_id
JOIN agents a ON a.id = kb.agent_id
ORDER BY kd.created_at DESC;
```

Se retornar **0 linhas**, significa que realmente não há documentos ainda.

---

## 🚀 Fazer Upload de Documentos

Para adicionar documentos à base de conhecimento:

1. Acesse a página do agente
2. Clique em **"Base de Conhecimento"**
3. Na seção **"Upload de Documentos"**, arraste arquivos ou clique para selecionar
4. Formatos aceitos:
   - 📄 PDF
   - 📝 DOCX (Word)
   - 📊 XLSX (Excel)
   - 📃 TXT (Texto)
5. Aguarde o processamento e vetorização

---

## 🔧 Correções Implementadas

### 1. Prevenção de Duplicação
A função `createDefaultKB` agora verifica se já existe uma base antes de criar uma nova.

```typescript
// Verificar se já existe alguma base antes de criar
const { data: existing } = await supabase
  .from('knowledge_bases')
  .select('id')
  .eq('agent_id', id)
  .limit(1)

if (existing && existing.length > 0) {
  // Usar existente ao invés de criar
  setSelectedKB(existing[0].id)
  return
}
```

### 2. Remoção de Erros 403 do Spline
Substituído componentes 3D externos por animações CSS puras e leves.

---

## 🔍 Debug: Consultas Úteis

### Ver todas as bases e contar documentos:

```sql
SELECT 
  kb.id as base_id,
  kb.name as base_nome,
  a.name as agente_nome,
  COUNT(kd.id) as total_documentos
FROM knowledge_bases kb
LEFT JOIN knowledge_documents kd ON kd.knowledge_base_id = kb.id
JOIN agents a ON a.id = kb.agent_id
GROUP BY kb.id, kb.name, a.name
ORDER BY a.name;
```

### Ver storage (arquivos físicos):

```sql
SELECT 
  name,
  bucket_id,
  created_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'knowledge-documents'
ORDER BY created_at DESC;
```

---

## ✅ Conclusão

**A interface está funcionando corretamente!** 

- Mostra "0 arquivos" porque realmente não há documentos
- As bases de conhecimento existem (containers vazios)
- Após limpar duplicatas e fazer upload, tudo funcionará perfeitamente

Se precisar de ajuda, verifique os logs do navegador (F12) ou os logs do Supabase.


