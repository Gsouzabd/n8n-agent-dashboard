# Exemplo de Workflow n8n

Este documento mostra como integrar o Dashboard de Agentes IA com o n8n.

## 🎯 Fluxo Básico

```
Webhook Trigger → Buscar Contexto → LLM → Responder
```

## 📋 Configuração Passo a Passo

### 1. Webhook Trigger

Configure o nó **Webhook** como trigger:

**Configurações:**
- **HTTP Method**: POST
- **Path**: `agent-name` (o path definido no seu agente)
- **Authentication**: Basic Auth
  - **Username**: `seu_usuario`
  - **Password**: `sua_senha`
- **Response**: Immediately

**Exemplo de Body esperado:**
```json
{
  "query": "Como faço para resetar minha senha?",
  "userId": "optional-user-id"
}
```

### 2. HTTP Request - Buscar Contexto

Adicione um nó **HTTP Request** para buscar contexto da base de conhecimento:

**Configurações:**
- **Method**: POST
- **URL**: `https://bdhhqafyqyamcejkufxf.supabase.co/functions/v1/agent-query`
- **Authentication**: Header Auth
  - **Name**: `apikey`
  - **Value**: `SUA_SUPABASE_ANON_KEY`
- **Send Headers**: Yes
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer SUA_SUPABASE_ANON_KEY`

**Body (JSON):**
```json
{
  "agentId": "{{$json.agentId}}",
  "query": "{{$json.query}}",
  "topK": 5,
  "threshold": 0.7
}
```

**Expressões úteis:**
- Para pegar o agentId do webhook config: `{{$json.agentId}}`
- Para pegar a query do usuário: `{{$node["Webhook"].json["body"]["query"]}}`

### 3. LLM Node (OpenAI/Anthropic)

Configure o nó de LLM com o contexto recuperado:

**Para OpenAI:**
- **Model**: gpt-4 ou gpt-3.5-turbo
- **Messages**:
  - **System**: 
    ```
    Você é um assistente útil. Use o contexto fornecido para responder às perguntas.
    
    Contexto:
    {{$json.context}}
    ```
  - **User**: `{{$json.query}}`

**Para Anthropic (Claude):**
- **Model**: claude-3-sonnet ou claude-3-opus
- **System Prompt**:
  ```
  Você é um assistente útil. Use o contexto fornecido para responder às perguntas.
  
  Contexto:
  {{$json.context}}
  ```
- **Messages**: `{{$json.query}}`

### 4. Respond to Webhook

Responda ao webhook original:

**Configurações:**
- **Respond**: Using Respond to Webhook node
- **Response Code**: 200
- **Response Body**:
```json
{
  "success": true,
  "answer": "{{$json.choices[0].message.content}}",
  "documentsUsed": {{$node["HTTP Request"].json["count"]}},
  "timestamp": "{{$now}}"
}
```

## 🔄 Workflow Completo (JSON)

```json
{
  "name": "Agent AI Workflow",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "agent-helper",
        "authentication": "basicAuth",
        "options": {}
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "url": "https://bdhhqafyqyamcejkufxf.supabase.co/functions/v1/agent-query",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "agentId",
              "value": "={{$json.agentId}}"
            },
            {
              "name": "query",
              "value": "={{$json.query}}"
            },
            {
              "name": "topK",
              "value": 5
            }
          ]
        },
        "options": {}
      },
      "name": "Get Context",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [440, 300]
    },
    {
      "parameters": {
        "model": "gpt-4",
        "messages": {
          "values": [
            {
              "role": "system",
              "content": "=Você é um assistente útil. Use o contexto:\n\n{{$json.context}}"
            },
            {
              "role": "user",
              "content": "={{$json.query}}"
            }
          ]
        }
      },
      "name": "OpenAI",
      "type": "n8n-nodes-base.openAi",
      "typeVersion": 1,
      "position": [640, 300]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\"answer\": {{$json.choices[0].message.content}}, \"success\": true}",
        "options": {}
      },
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [840, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "Get Context", "type": "main", "index": 0}]]
    },
    "Get Context": {
      "main": [[{"node": "OpenAI", "type": "main", "index": 0}]]
    },
    "OpenAI": {
      "main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]
    }
  }
}
```

## 🧪 Testando o Workflow

### cURL
```bash
curl -X POST https://gsouzabd.app.n8n.cloud/webhook/agent-helper \
  -u "worskpace-agent:password" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Como faço para resetar minha senha?",
    "agentId": "seu-agent-id-aqui"
  }'
```

### JavaScript
```javascript
const response = await fetch('https://gsouzabd.app.n8n.cloud/webhook/agent-helper', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + btoa('worskpace-agent:password')
  },
  body: JSON.stringify({
    query: 'Como faço para resetar minha senha?',
    agentId: 'seu-agent-id-aqui'
  })
});

const data = await response.json();
console.log(data.answer);
```

### Python
```python
import requests
from requests.auth import HTTPBasicAuth

response = requests.post(
    'https://gsouzabd.app.n8n.cloud/webhook/agent-helper',
    auth=HTTPBasicAuth('paprica', 'bdhhqafyqyamcejkufxf'),
    json={
        'query': 'Como faço para resetar minha senha?',
        'agentId': 'seu-agent-id-aqui'
    }
)

print(response.json()['answer'])
```

## 🚀 Recursos Avançados

### 1. Cache de Respostas

Adicione um nó de cache para evitar buscas repetidas:

```javascript
// Function node
const cacheKey = `query_${$json.query.toLowerCase().replace(/\s+/g, '_')}`;
const cached = $input.all().find(i => i.json.cacheKey === cacheKey);

if (cached && cached.json.timestamp > Date.now() - 3600000) {
  return cached.json.result;
}

// Continue with normal flow
return $input.all();
```

### 2. Fallback quando não há contexto

```javascript
// IF node
const hasContext = $json.documents && $json.documents.length > 0;

if (!hasContext) {
  return {
    json: {
      answer: "Desculpe, não encontrei informações sobre isso na base de conhecimento.",
      fallback: true
    }
  };
}
```

### 3. Logging e Analytics

Adicione um nó para salvar logs:

```javascript
// HTTP Request to analytics service
{
  "query": "{{$json.query}}",
  "answer": "{{$json.answer}}",
  "documentsUsed": {{$json.count}},
  "userId": "{{$json.userId}}",
  "timestamp": "{{$now}}",
  "agentId": "{{$json.agentId}}"
}
```

## 📊 Métricas Úteis

- **Tempo de resposta**: Meça o tempo entre webhook e resposta
- **Documentos usados**: Quantos documentos foram recuperados
- **Taxa de sucesso**: Quantas queries tiveram contexto relevante
- **Feedback do usuário**: Colete feedback sobre as respostas

## 🛠️ Troubleshooting

### Erro: "No documents found"
- Verifique se o agentId está correto
- Confirme que há documentos vetorizados na base
- Ajuste o threshold (padrão: 0.7)

### Erro: "Authentication failed"
- Verifique as credenciais do webhook
- Confirme que a apikey do Supabase está correta

### Erro: "OpenAI rate limit"
- Implemente retry logic
- Use cache para respostas frequentes
- Consider usar um modelo mais rápido (gpt-3.5-turbo)

## 💡 Dicas

1. **Use webhooks síncronos** para melhor UX
2. **Implemente timeout** (max 30s para n8n)
3. **Log tudo** para debug e analytics
4. **Use variáveis de ambiente** para secrets
5. **Teste com diferentes queries** antes de produção

