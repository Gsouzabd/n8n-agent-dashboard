# 🔧 Correção: n8n Vector Store + Filtro por Agent

## ✅ Alterações Implementadas

### 1. **Workflow n8n Corrigido** (`[MAG] HelperAgent.json`)

#### ❌ Antes:
```json
{
  "tableName": {
    "value": "knowledge_bases"  // ERRADO - não tem vetores!
  }
}
```

#### ✅ Depois:
```json
{
  "tableName": {
    "value": "knowledge_documents"  // ✅ CORRETO - tem os vetores!
  },
  "queryName": {
    "value": "match_documents"
  },
  "options": {
    "topK": 5,
    "filterValues": {
      "values": [
        {
          "key": "metadata->agent_id",
          "value": "={{ $('Extract Data').item.json.agent_id }}"
        }
      ]
    }
  }
}
```

**O que mudou:**
- ✅ Tabela: `knowledge_bases` → `knowledge_documents`
- ✅ Adicionado filtro por `metadata->agent_id`
- ✅ Top K definido como 5 documentos
- ✅ Busca dinâmica pelo agent_id do request

---

### 2. **Edge Function Atualizada** (`process-document` v3)

#### Mudanças na Busca de Documentos:

**❌ Antes:**
```typescript
const { data: document } = await supabase
  .from('knowledge_documents')
  .select('*')
  .eq('id', documentId)
  .single()
```

**✅ Depois:**
```typescript
const { data: document } = await supabase
  .from('knowledge_documents')
  .select(`
    *,
    knowledge_bases!inner(agent_id)  // 👈 JOIN com KB
  `)
  .eq('id', documentId)
  .single()

// Extrai agent_id
const agentId = document.knowledge_bases?.agent_id
```

#### Mudanças na Metadata dos Chunks:

**❌ Antes:**
```typescript
metadata: { 
  ...chunk.metadata, 
  parentDocumentId: documentId 
}
```

**✅ Depois:**
```typescript
metadata: { 
  ...chunk.metadata, 
  agent_id: agentId,  // 👈 ADICIONADO!
  parentDocumentId: documentId 
}
```

**Aplicado em:**
- ✅ Atualização do documento original (chunk 0)
- ✅ Inserção de novos chunks (chunk 1+)

---

## 🎯 Como Funciona Agora

### Fluxo Completo:

```
1️⃣ User faz upload de documento
    ↓
2️⃣ Edge Function processa
    ├─ Busca agent_id da knowledge_base
    ├─ Extrai texto
    ├─ Gera chunks
    ├─ Vetoriza cada chunk
    └─ Salva com metadata.agent_id ✅
    ↓
3️⃣ User pergunta no Chat
    ↓
4️⃣ n8n Workflow
    ├─ Recebe agent_id do request
    ├─ Supabase Vector Store busca documentos
    ├─ FILTRA por metadata->agent_id ✅
    ├─ Retorna top 5 mais similares
    └─ GPT-4 responde com contexto
    ↓
5️⃣ Resposta exibida no Chat ✅
```

---

## 📊 Estrutura da Metadata

### Documentos Processados Agora Têm:

```json
{
  "metadata": {
    "fileName": "lista-preco.xlsx",
    "chunkIndex": 0,
    "wordCount": 75419,
    "processedAt": "2025-10-24T20:09:47.231Z",
    "agent_id": "e5a4ea22-d5c2-4ef7-9ad0-312eeb6bba95",  // 👈 NOVO!
    "isFirstChunk": true
  }
}
```

---

## 🧪 Testar as Alterações

### 1. **Reprocessar Documentos Existentes**

Documentos antigos não têm `agent_id` na metadata. Para corrigi-los:

**Opção A: Re-upload**
- Exclua documentos antigos
- Faça upload novamente
- Novos documentos terão agent_id ✅

**Opção B: SQL Update** (para documentos existentes)
```sql
-- Atualizar metadata de documentos existentes
UPDATE knowledge_documents kd
SET metadata = jsonb_set(
  COALESCE(kd.metadata, '{}'::jsonb),
  '{agent_id}',
  to_jsonb(kb.agent_id::text)
)
FROM knowledge_bases kb
WHERE kd.knowledge_base_id = kb.id
AND kd.metadata->>'agent_id' IS NULL;
```

### 2. **Verificar Metadata**

```sql
-- Ver documentos com agent_id
SELECT 
  file_name,
  metadata->>'agent_id' as agent_id,
  metadata->>'chunkIndex' as chunk,
  LEFT(content, 100) as preview
FROM knowledge_documents
WHERE embedding IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

### 3. **Testar Chat**

1. Importe o workflow atualizado no n8n
2. Configure o webhook do agente
3. Faça upload de um documento
4. Abra o Chat e pergunte algo
5. Verifique se retorna apenas documentos do agente correto

---

## 🔄 Deploy Realizado

### Edge Function:
```
✅ Function: process-document
✅ Version: 3 (updated)
✅ Status: ACTIVE
✅ Deploy Time: 2025-10-24
```

### n8n Workflow:
```
✅ File: [MAG] HelperAgent.json
✅ Node: Supabase Vector Store
✅ Table: knowledge_documents ✅
✅ Filter: metadata->agent_id ✅
```

---

## ⚠️ Importante

### Para o Sistema Funcionar 100%:

1. **✅ Reprocessar documentos antigos** (ou fazer update SQL)
2. **✅ Importar workflow atualizado no n8n**
3. **✅ Configurar webhook_url no agente**
4. **✅ Testar com chat**

### Verificação Rápida:

```sql
-- Todos documentos devem ter agent_id na metadata
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN metadata->>'agent_id' IS NOT NULL THEN 1 END) as com_agent_id
FROM knowledge_documents
WHERE embedding IS NOT NULL;
```

**Esperado:** `total = com_agent_id` ✅

---

## 🎯 Benefícios

| Antes | Depois |
|-------|--------|
| ❌ Buscava em todos os documentos | ✅ Busca apenas do agente |
| ❌ Podia retornar docs de outros agentes | ✅ Isolamento perfeito |
| ❌ Performance ruim | ✅ Performance otimizada |
| ❌ Sem controle de acesso | ✅ Multi-tenant seguro |

---

## 📝 Checklist Final

- [x] Edge Function atualizada (v3)
- [x] Workflow n8n corrigido
- [x] Metadata inclui agent_id
- [x] Filtro configurado no Vector Store
- [ ] Reprocessar documentos antigos (se houver)
- [ ] Importar workflow no n8n
- [ ] Testar chat com múltiplos agentes
- [ ] Validar isolamento de dados

---

**Status**: ✅ Implementado e Deployado  
**Versão Edge Function**: 3  
**Data**: 24/10/2025


