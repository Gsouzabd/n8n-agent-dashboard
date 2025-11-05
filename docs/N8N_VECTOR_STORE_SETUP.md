# Configuração do n8n Supabase Vector Store

## Problema Resolvido

O erro `PGRST202 Could not find the function public.match_documents` ocorria porque o n8n espera uma função com assinatura específica.

## Função Criada

Criamos a função `match_documents` com a assinatura exata que o n8n espera:

```sql
match_documents(
  filter JSONB,
  match_count INT,
  query_embedding vector(3072)
)
```

## Como Funciona

### 1. Filtro por Agent ID

O n8n pode passar o `agent_id` de três formas diferentes (a função suporta todas):

**Formato 1: Direto no filter**
```json
{
  "agent_id": "uuid-do-agent",
  "match_threshold": 0.7
}
```

**Formato 2: Dentro de metadata**
```json
{
  "metadata": {
    "agent_id": "uuid-do-agent"
  }
}
```

**Formato 3: Array de metadataValues (formato n8n)**
```json
{
  "metadata": [
    {
      "name": "agent_id",
      "value": "uuid-do-agent"
    }
  ]
}
```

### 2. Configuração no n8n

No nó "Supabase Vector Store", configure:

- **Table Name**: `knowledge_documents`
- **Query Name**: `match_documents`
- **Metadata Values**:
  - Name: `agent_id`
  - Value: `={{ $('Extract Data1').item.json.body.agent_id }}`

### 3. Parâmetros Opcionais no Filter

Você pode passar parâmetros adicionais no filter:

```json
{
  "agent_id": "uuid",
  "match_threshold": 0.6,
  "metadata": {
    "fileName": "exemplo.pdf"
  }
}
```

## Vantagens de Usar o n8n Nativo

1. **Simplicidade**: Não precisa criar Edge Function separada
2. **Integração Direta**: Funciona diretamente com o nó de embeddings
3. **Menos Latência**: Chama diretamente o Supabase sem passar por Edge Function
4. **Menos Custo**: Não usa recursos de Edge Functions

## Comparação: n8n Nativo vs Edge Function

### n8n Nativo (Recomendado)
- ✅ Mais simples
- ✅ Menos latência
- ✅ Menos custo
- ❌ Menos controle sobre truncamento
- ❌ Não suporta metadados avançados (tags, usage_context, etc)

### Edge Function (rag-search)
- ✅ Controle total sobre truncamento
- ✅ Suporte a metadados avançados
- ✅ Ranking por relevância
- ✅ Filtros por tags
- ❌ Mais complexo
- ❌ Mais latência
- ❌ Mais custo

## Resolução de Problemas

### Erro: "Could not find the function" (PGRST202)

Este erro significa que o PostgREST não encontrou a função no schema cache. Isso pode acontecer logo após criar a função.

**Solução:**

1. **Verifique se a função existe:**
```sql
SELECT proname, pg_get_function_arguments(oid) 
FROM pg_proc 
WHERE proname = 'match_documents';
```
   - Deve retornar: `filter jsonb, match_count integer, query_embedding vector`

2. **Aguarde o schema cache atualizar (2-5 minutos)**
   - O Supabase atualiza o schema cache automaticamente
   - Após criar a função, aguarde alguns minutos antes de testar

3. **Forçar atualização do schema cache:**
   - No Supabase Dashboard, vá em **Settings > API**
   - Faça uma requisição de teste manual para `/rest/v1/rpc/match_documents`
   - Ou simplesmente aguarde alguns minutos

4. **Verifique se está usando a assinatura correta no n8n:**
   - `filter JSONB`
   - `match_count INT`
   - `query_embedding vector(3072)`

**Nota:** Se o erro persistir após 5 minutos, pode haver um problema com a ordem dos parâmetros ou com o tipo do embedding. Verifique os logs do Supabase para mais detalhes.

### Erro: "Could not choose the best candidate function" (PGRST203)

Este erro ocorre quando existem múltiplas funções `match_documents` com assinaturas diferentes. 

**Solução:**
1. Remova todas as funções duplicadas:
```sql
DROP FUNCTION IF EXISTS match_documents(vector(3072), INT, JSONB);
DROP FUNCTION IF EXISTS match_documents(vector(3072), INT);
DROP FUNCTION IF EXISTS match_documents(vector(3072));
```

2. Mantenha apenas a função compatível com n8n:
```sql
-- Esta função deve existir
SELECT proname, pg_get_function_arguments(oid) 
FROM pg_proc 
WHERE proname = 'match_documents';
-- Deve retornar apenas: filter jsonb, match_count integer, query_embedding vector
```

3. Se o erro persistir após remover duplicatas, o PostgREST pode precisar recarregar o schema:
   - No Supabase Dashboard, vá em Settings > API
   - Tente fazer uma requisição simples para forçar o reload
   - Ou reinicie o projeto Supabase

### Agent ID não está filtrando

Certifique-se de que o `agent_id` está sendo passado corretamente no workflow do n8n. A função procura o `agent_id` em três lugares diferentes, mas verifique se está chegando no formato esperado.

## Próximos Passos

1. Teste o workflow no n8n com a função `match_documents`
2. Se precisar de funcionalidades avançadas (tags, ranking, etc), continue usando a Edge Function `rag-search`
3. Considere usar o n8n nativo para casos simples e a Edge Function para casos complexos

