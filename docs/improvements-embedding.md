# Sistema de Embedding de Melhorias

## Como funciona

Quando um feedback com `improvement_suggestion` é salvo:

1. **Trigger automático** (`trg_capture_feedback_improvement`): Insere o conteúdo em `agent_improvements` (sem embedding ainda)
2. **Frontend** (`AgentQuality.tsx`): Chama automaticamente a edge function `sync-improvement-to-rag` para gerar o embedding
3. **Edge Function** (`sync-improvement-to-rag`): Gera embedding via OpenAI e atualiza o registro

## Processar registros pendentes

### Via Edge Function (recomendado)

```bash
curl -X POST https://bdhhqafyqyamcejkufxf.supabase.co/functions/v1/sync-improvement-to-rag \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "181b4225-a01f-472b-ad5e-56937b026ddf", "count": 50}'
```

### Via n8n (para automação)

Criar um workflow Schedule que roda diariamente:

1. **Schedule Trigger**: Diário às 2h da manhã
2. **HTTP Request**: POST para `sync-improvement-to-rag`
   - Body: `{"count": 100}` (processa até 100 registros sem embedding)

### Via SQL (para processar um registro específico)

```sql
-- Ver registros pendentes
SELECT id, agent_id, LEFT(content, 50) as preview, created_at
FROM agent_improvements 
WHERE embedding IS NULL
ORDER BY created_at ASC
LIMIT 10;

-- Depois chamar a edge function via HTTP (não diretamente via SQL)
```

## Verificar status

```sql
-- Contar pendentes por agente
SELECT agent_id, COUNT(*) as pendentes
FROM agent_improvements
WHERE embedding IS NULL
GROUP BY agent_id;

-- Ver últimos processados
SELECT id, agent_id, LEFT(content, 50) as preview, 
       CASE WHEN embedding IS NULL THEN 'Pendente' ELSE 'Processado' END as status,
       created_at
FROM agent_improvements
ORDER BY created_at DESC
LIMIT 20;
```

## Troubleshooting

### Embedding não está sendo gerado

1. Verificar se `OPENAI_API_KEY` está configurado nas secrets do Supabase
2. Verificar logs da edge function no Supabase Dashboard
3. Verificar se o conteúdo não está vazio ou muito longo (>2000 chars são truncados)

### Processar registro específico agora

Para o registro `ea5d9bc8-96d5-4481-9911-41b4f06163d1`:

```bash
# Via curl
curl -X POST https://bdhhqafyqyamcejkufxf.supabase.co/functions/v1/sync-improvement-to-rag \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "181b4225-a01f-472b-ad5e-56937b026ddf", "count": 1}'
```

A edge function processa os registros mais antigos primeiro, então este será processado.

