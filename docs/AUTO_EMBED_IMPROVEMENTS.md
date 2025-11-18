# Geração Automática de Embeddings para Melhorias

## Problema

Quando uma melhoria (`agent_improvements`) é criada através do trigger `trg_capture_feedback_improvement`, ela é salva sem embedding. Isso impede que o RAG funcione corretamente, pois a função `match_agent_improvements` filtra apenas registros com `embedding IS NOT NULL`.

## Solução Implementada

### 1. Tabela de Fila (`embedding_queue`)

Uma tabela de fila foi criada para rastrear melhorias que precisam de embeddings:

```sql
CREATE TABLE embedding_queue (
  id UUID PRIMARY KEY,
  improvement_id UUID REFERENCES agent_improvements(id),
  agent_id UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);
```

### 2. Trigger Automático

O trigger `queue_improvement_embedding_trigger` adiciona automaticamente melhorias recém-criadas à fila:

```sql
CREATE TRIGGER queue_improvement_embedding_trigger
  AFTER INSERT ON agent_improvements
  FOR EACH ROW
  WHEN (NEW.embedding IS NULL)
  EXECUTE FUNCTION queue_improvement_for_embedding();
```

### 3. Edge Function `auto-embed-improvement`

Uma nova edge function foi criada para processar melhorias individualmente:

- **Endpoint**: `/functions/v1/auto-embed-improvement`
- **Método**: POST
- **Body**: `{ "improvementId": "uuid" }`
- **Função**: Gera embedding usando `text-embedding-ada-002` (1536 dimensões)

### 4. Edge Function `vectorize-agent-improvements` (Existente)

A edge function existente pode processar múltiplas melhorias:

- **Endpoint**: `/functions/v1/vectorize-agent-improvements`
- **Método**: POST
- **Body**: `{ "improvementId": "uuid", "agentId": "uuid" }` (opcional)
- **Função**: Processa todas as melhorias sem embedding do agente especificado

## Configuração Automática (Recomendado)

Para gerar embeddings automaticamente quando uma melhoria é criada, configure um **Database Webhook** no Supabase Dashboard:

### Opção 1: Webhook na Tabela `embedding_queue` (Recomendado)

Quando uma melhoria é criada, ela é automaticamente adicionada à fila `embedding_queue`. Configure um webhook para processar a fila:

1. Acesse o Supabase Dashboard → Database → Webhooks
2. Crie um novo webhook:
   - **Nome**: `process-embedding-queue`
   - **Tabela**: `embedding_queue`
   - **Eventos**: INSERT
   - **Tipo**: HTTP Request
   - **URL**: `https://[PROJECT_REF].supabase.co/functions/v1/process-embedding-queue`
   - **Método**: POST
   - **Headers**: 
     ```json
     {
       "Content-Type": "application/json",
       "Authorization": "Bearer [SERVICE_ROLE_KEY]"
     }
     ```
   - **Body**: `{}` (vazio - a função processa todos os itens pendentes)

### Opção 2: Webhook na Tabela `agent_improvements`

Alternativamente, configure um webhook diretamente na tabela `agent_improvements`:

1. Acesse o Supabase Dashboard → Database → Webhooks
2. Crie um novo webhook:
   - **Nome**: `auto-embed-improvement`
   - **Tabela**: `agent_improvements`
   - **Eventos**: INSERT
   - **Tipo**: HTTP Request
   - **URL**: `https://[PROJECT_REF].supabase.co/functions/v1/vectorize-agent-improvements`
   - **Método**: POST
   - **Headers**: 
     ```json
     {
       "Content-Type": "application/json",
       "Authorization": "Bearer [SERVICE_ROLE_KEY]"
     }
     ```
   - **Body**: 
     ```json
     {
       "improvementId": "{{ $1.id }}"
     }
     ```

### Opção 3: Cron Job (Processamento Periódico)

Configure um cron job para processar a fila periodicamente (ex: a cada 5 minutos):

1. Acesse o Supabase Dashboard → Database → Cron Jobs
2. Crie um novo cron job:
   - **Nome**: `process-embedding-queue`
   - **Schedule**: `*/5 * * * *` (a cada 5 minutos)
   - **Command**: 
     ```sql
     SELECT net.http_post(
       url := '[SUPABASE_URL]/functions/v1/process-embedding-queue',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer [SERVICE_ROLE_KEY]'
       ),
       body := '{}'::jsonb
     );
     ```

### Alternativa: Usar pg_net (Se Disponível)

Se a extensão `pg_net` estiver disponível no seu projeto, o trigger tentará chamar a edge function automaticamente via HTTP. Caso contrário, as melhorias serão adicionadas à fila para processamento posterior.

## Processamento Manual

Para processar melhorias pendentes manualmente:

### PowerShell:
```powershell
$headers = @{
  "Content-Type" = "application/json"
  "Authorization" = "Bearer [SERVICE_ROLE_KEY]"
}

# Processar uma melhoria específica
$body = @{
  improvementId = "uuid-da-melhoria"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://[PROJECT_REF].supabase.co/functions/v1/auto-embed-improvement" `
  -Method POST -Headers $headers -Body $body

# Ou processar todas as melhorias de um agente
$body = @{
  agentId = "uuid-do-agente"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://[PROJECT_REF].supabase.co/functions/v1/vectorize-agent-improvements" `
  -Method POST -Headers $headers -Body $body
```

### cURL:
```bash
# Processar uma melhoria específica
curl -X POST "https://[PROJECT_REF].supabase.co/functions/v1/auto-embed-improvement" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -d '{"improvementId": "uuid-da-melhoria"}'

# Processar todas as melhorias de um agente
curl -X POST "https://[PROJECT_REF].supabase.co/functions/v1/vectorize-agent-improvements" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -d '{"agentId": "uuid-do-agente"}'
```

## Verificação

Para verificar melhorias sem embedding:

```sql
SELECT 
  COUNT(*) as total_sem_embedding,
  COUNT(DISTINCT agent_id) as agentes_afetados
FROM agent_improvements
WHERE embedding IS NULL;
```

Para verificar itens na fila:

```sql
SELECT 
  status,
  COUNT(*) as quantidade
FROM embedding_queue
GROUP BY status;
```

## Notas Importantes

1. **Modelo de Embedding**: Usa `text-embedding-ada-002` (1536 dimensões) para corresponder ao tipo `vector(1536)` na tabela.

2. **Limite de Tokens**: O conteúdo é limitado a 8000 caracteres antes de gerar o embedding.

3. **Rate Limiting**: A edge function inclui um delay de 100ms entre processamentos para evitar rate limiting da API da OpenAI.

4. **Idempotência**: Processar a mesma melhoria múltiplas vezes é seguro - a edge function verifica se já existe embedding antes de processar.

