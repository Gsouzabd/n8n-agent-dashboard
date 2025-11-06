# Troubleshooting: n8n Supabase Vector Store não retorna resultados

## Problema: Função retorna array vazio mesmo com documentos no banco

### Causas Comuns

#### 1. Documentos sem Embedding
**Sintoma**: Nenhum resultado retornado

**Diagnóstico**:
```sql
-- Verificar quantos documentos têm embedding
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as com_embedding,
  COUNT(CASE WHEN embedding IS NULL THEN 1 END) as sem_embedding
FROM knowledge_documents kd
JOIN knowledge_bases kb ON kb.id = kd.knowledge_base_id
WHERE kb.agent_id = 'SEU_AGENT_ID';
```

**Solução**: Gerar embeddings para documentos sem embedding usando a função `process-document` ou `vectorize-document`.

#### 2. Match Threshold Muito Alto
**Sintoma**: Poucos ou nenhum resultado mesmo com embeddings

**Diagnóstico**: A função `match_documents` usa `match_threshold` padrão de **0.4** (reduzido de 0.7).

**Solução**: 
- Reduzir o threshold no filter do n8n:
```json
{
  "agent_id": "uuid",
  "match_threshold": 0.3
}
```

#### 3. Agent ID Não Está Sendo Passado Corretamente
**Sintoma**: Nenhum resultado retornado

**Diagnóstico**: Verificar se o `agent_id` está chegando no filter:
```sql
-- Testar a função diretamente
SELECT * FROM match_documents(
  '{"agent_id": "2d58bfaf-d5a3-48ce-9012-4cc1d5eda5d2", "match_threshold": 0.3}'::jsonb,
  10,
  -- Use um embedding de teste (array de 3072 zeros)
  (SELECT embedding FROM knowledge_documents WHERE embedding IS NOT NULL LIMIT 1)
);
```

**Solução no n8n**:
- Verificar se o nó "Extract Data1" está retornando `body.agent_id`
- Verificar se o campo "Metadata Values" está configurado:
  - Name: `agent_id`
  - Value: `={{ $('Extract Data1').item.json.body.agent_id }}`

#### 4. Embedding de Dimensão Incorreta
**Sintoma**: Erro ao chamar a função

**Diagnóstico**: Embeddings devem ser de 3072 dimensões (text-embedding-3-large)

**Solução**: Verificar se os embeddings foram gerados com o modelo correto:
```sql
SELECT 
  id,
  array_length(embedding::float[], 1) as dimensions
FROM knowledge_documents
WHERE embedding IS NOT NULL
LIMIT 5;
-- Deve retornar 3072 para todos
```

#### 5. Dados Não Estão no Banco Correto
**Sintoma**: Documentos existem mas não são retornados

**Diagnóstico**: Verificar se o `agent_id` está correto:
```sql
-- Verificar agent_id dos documentos
SELECT 
  kd.id,
  kb.agent_id,
  kd.embedding IS NOT NULL as has_embedding
FROM knowledge_documents kd
JOIN knowledge_bases kb ON kb.id = kd.knowledge_base_id
WHERE kd.content ILIKE '%sua busca%'
LIMIT 5;
```

**Solução**: Garantir que o `agent_id` usado no n8n corresponde ao `agent_id` dos documentos.

## Teste Rápido

### 1. Testar a Função Diretamente
```sql
-- Gerar embedding de teste usando OpenAI API ou usar um existente
-- Substitua 'SEU_AGENT_ID' e o embedding array
SELECT * FROM match_documents(
  jsonb_build_object(
    'agent_id', 'SEU_AGENT_ID',
    'match_threshold', 0.3
  ),
  10,
  (SELECT embedding FROM knowledge_documents 
   WHERE embedding IS NOT NULL 
   AND knowledge_base_id IN (
     SELECT id FROM knowledge_bases WHERE agent_id = 'SEU_AGENT_ID'
   )
   LIMIT 1)
);
```

### 2. Verificar Logs do n8n
- Verifique os logs do nó "Supabase Vector Store"
- Veja se há erros de conexão ou autenticação
- Verifique se o `agent_id` está sendo passado corretamente

### 3. Testar com Threshold Muito Baixo
Temporariamente, teste com threshold 0.0 para ver se retorna algum resultado:
```json
{
  "agent_id": "uuid",
  "match_threshold": 0.0
}
```

Se retornar resultados com threshold 0.0, o problema é o threshold. Se não retornar nada, o problema é outro (agent_id, embedding, etc).

## Soluções por Problema

### Problema: Documentos sem Embedding
```bash
# Chamar a função vectorize-document para gerar embeddings
curl -X POST "https://SEU_SUPABASE.supabase.co/functions/v1/vectorize-document" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "uuid-do-documento",
    "agentId": "uuid-do-agent"
  }'
```

### Problema: Threshold Muito Alto
Ajuste no n8n: adicione `match_threshold` no filter:
```javascript
// No código do n8n, antes de chamar o Vector Store
{
  "agent_id": "{{ $('Extract Data1').item.json.body.agent_id }}",
  "match_threshold": 0.3
}
```

### Problema: Agent ID Não Passado
Verifique o workflow do n8n:
1. Nó "Extract Data1" deve extrair `body.agent_id`
2. Nó "Supabase Vector Store" → Options → Metadata → Metadata Values:
   - Name: `agent_id`
   - Value: `={{ $('Extract Data1').item.json.body.agent_id }}`

## Checklist de Diagnóstico

- [ ] Documentos têm embedding? (`SELECT COUNT(*) WHERE embedding IS NOT NULL`)
- [ ] Agent ID está correto? (`SELECT agent_id FROM knowledge_bases`)
- [ ] Threshold não está muito alto? (teste com 0.3 ou 0.0)
- [ ] Embeddings têm 3072 dimensões? (`SELECT array_length(embedding::float[], 1)`)
- [ ] Função match_documents existe? (`SELECT proname FROM pg_proc WHERE proname = 'match_documents'`)
- [ ] n8n está passando agent_id? (verifique logs)
- [ ] PostgREST cache está atualizado? (aguarde 1-2 minutos ou reinicie)

## Próximos Passos

1. Execute o diagnóstico acima
2. Identifique qual problema está ocorrendo
3. Aplique a solução correspondente
4. Teste novamente no n8n

Se nenhum dos problemas acima se aplicar, o problema pode ser específico do seu caso. Compartilhe:
- Os logs do n8n
- O resultado da query de diagnóstico
- A configuração do nó "Supabase Vector Store"



