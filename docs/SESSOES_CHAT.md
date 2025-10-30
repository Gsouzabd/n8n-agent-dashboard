# 💬 Gerenciamento de Sessões de Chat

## 🎯 Como Funciona

### Sessões de Chat

Cada conversa com um agente tem uma **sessão única** identificada por um `session_id`.

**Propósito das sessões:**
- 📝 Manter histórico de conversas
- 🔄 Permitir contexto entre mensagens
- 📊 Rastrear conversas por usuário/agente
- 🗂️ Organizar conversas separadamente

---

## 🔄 Ciclo de Vida de uma Sessão

### 1. Abrir Chat
```
Usuário clica em "Chat" no card do agente
  ↓
Sistema procura sessão existente
  ↓
Se encontrar: Carrega mensagens antigas
Se não: Cria nova sessão vazia
```

### 2. Durante a Conversa
```
Usuário envia mensagem
  ↓
Salva no banco com session_id
  ↓
Envia para n8n com histórico
  ↓
Salva resposta do agente
```

### 3. Limpar Chat (🗑️)
```
Usuário clica no botão de lixeira
  ↓
Delete todas mensagens da sessão atual
  ↓
Cria NOVA sessão vazia
  ↓
Atualiza session_id no estado
  ↓
Chat fica limpo e pronto para nova conversa
```

---

## 🆕 Comportamento do Botão Limpar

### Antes (❌ Problema):
```typescript
clearMessages: async () => {
  // Deletava mensagens
  await chatService.clearSessionMessages(currentSessionId)
  
  // Mantinha mesma sessão
  set({ messages: [] })
}
```

**Problema:**
- 🔴 Mesma `session_id` com histórico vazio
- 🔴 Confusão para agentes que usam session_id
- 🔴 Sessões órfãs no banco

### Depois (✅ Correto):
```typescript
clearMessages: async () => {
  // Deletava mensagens antigas
  await chatService.clearSessionMessages(currentSessionId)
  
  // Cria NOVA sessão
  const newSessionId = await chatService.createNewSession(agentId, userId)
  
  // Atualiza com nova sessão
  set({ 
    currentSessionId: newSessionId,
    messages: [] 
  })
}
```

**Benefícios:**
- ✅ Nova `session_id` para contexto limpo
- ✅ Histórico antigo preservado no banco
- ✅ Agente recebe contexto correto
- ✅ Melhor organização de conversas

---

## 📊 Estrutura no Banco

### Tabela `chat_sessions`
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Exemplo:**
```json
{
  "id": "abc123...",
  "agent_id": "agent-456",
  "user_id": "user-789",
  "created_at": "2025-10-27 10:00:00",
  "updated_at": "2025-10-27 10:30:00"
}
```

### Tabela `chat_messages`
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL,
  role VARCHAR(20),  -- 'user' ou 'assistant'
  content TEXT,
  created_at TIMESTAMP
);
```

**Exemplo:**
```json
[
  {
    "id": "msg-1",
    "session_id": "abc123...",
    "role": "user",
    "content": "Olá!",
    "created_at": "2025-10-27 10:00:00"
  },
  {
    "id": "msg-2",
    "session_id": "abc123...",
    "role": "assistant",
    "content": "Como posso ajudar?",
    "created_at": "2025-10-27 10:00:05"
  }
]
```

---

## 🔧 Funções do chatService

### `getOrCreateSession(agentId, userId)`
**Uso:** Ao abrir o chat
**Comportamento:**
- Procura sessão mais recente
- Se encontrar, retorna (reutiliza)
- Se não, cria nova

```typescript
// Exemplo de uso
const sessionId = await chatService.getOrCreateSession(
  'agent-123',
  'user-456'
)
```

### `createNewSession(agentId, userId)` 🆕
**Uso:** Ao limpar o chat
**Comportamento:**
- SEMPRE cria nova sessão
- Nunca reutiliza existente

```typescript
// Exemplo de uso
const newSessionId = await chatService.createNewSession(
  'agent-123',
  'user-456'
)
```

### `clearSessionMessages(sessionId)`
**Uso:** Ao limpar o chat
**Comportamento:**
- Deleta TODAS mensagens da sessão
- Mantém a sessão no banco

```typescript
// Exemplo de uso
await chatService.clearSessionMessages('session-789')
```

---

## 🎯 Fluxo Completo: Limpar Chat

### Passo a Passo:

1. **Usuário clica no botão 🗑️**
   ```
   <Trash2 onClick={clearMessages} />
   ```

2. **Store executa clearMessages()**
   ```typescript
   // 1. Pega sessão e agente atuais
   const { currentSessionId, currentAgent } = get()
   
   // 2. Deleta mensagens antigas
   await chatService.clearSessionMessages(currentSessionId)
   
   // 3. Cria nova sessão
   const newSessionId = await chatService.createNewSession(...)
   
   // 4. Atualiza estado
   set({ 
     currentSessionId: newSessionId,
     messages: [] 
   })
   ```

3. **Resultado visual:**
   ```
   Chat fica vazio
   Nova session_id ativa
   Pronto para nova conversa
   ```

---

## 📝 Logs de Debug

Quando limpar o chat, você verá no console:

```
🗑️ Chat limpo e nova sessão criada: abc123-new-session-id
```

Quando houver erro:

```
❌ Erro ao limpar chat: [mensagem de erro]
```

---

## 🔍 Verificar Sessões no Banco

### Ver todas as sessões de um usuário:
```sql
SELECT 
  s.id,
  s.created_at,
  a.name as agent_name,
  COUNT(m.id) as total_messages
FROM chat_sessions s
JOIN agents a ON a.id = s.agent_id
LEFT JOIN chat_messages m ON m.session_id = s.id
WHERE s.user_id = 'user-id-aqui'
GROUP BY s.id, s.created_at, a.name
ORDER BY s.created_at DESC;
```

### Ver sessões órfãs (sem mensagens):
```sql
SELECT 
  s.id,
  s.created_at,
  a.name as agent_name
FROM chat_sessions s
JOIN agents a ON a.id = s.agent_id
LEFT JOIN chat_messages m ON m.session_id = s.id
WHERE m.id IS NULL
  AND s.created_at < NOW() - INTERVAL '1 day';
```

---

## 🧹 Limpeza de Sessões Antigas

### Script para deletar sessões vazias antigas:
```sql
-- Deletar sessões sem mensagens criadas há mais de 7 dias
DELETE FROM chat_sessions
WHERE id IN (
  SELECT s.id
  FROM chat_sessions s
  LEFT JOIN chat_messages m ON m.session_id = s.id
  WHERE m.id IS NULL
    AND s.created_at < NOW() - INTERVAL '7 days'
);
```

---

## 💡 Boas Práticas

### ✅ Faça:
- Use `createNewSession` ao limpar chat
- Mantenha `session_id` no payload para n8n
- Log de sessões para debug
- Limpeza periódica de sessões antigas

### ❌ Evite:
- Deletar sessão ao limpar (apenas mensagens)
- Reutilizar mesma sessão após limpar
- Perder referência do `session_id` atual

---

## 🆘 Troubleshooting

### Chat não limpa
- Verifique se `clearMessages` está sendo chamada
- Veja logs no console (F12)
- Confirme que nova sessão foi criada

### Mensagens voltam após limpar
- Verifique se `newSessionId` foi atualizado no estado
- Confirme que está usando `createNewSession` (não `getOrCreateSession`)

### Múltiplas sessões vazias
- Normal após múltiplas limpezas
- Execute script de limpeza periódica

---

**Status:** ✅ Implementado  
**Data:** 27/10/2025  
**Versão:** 2.0 (com nova sessão ao limpar)







