# 💬 Integração de Chat com Agentes IA

## ✅ Status: Implementado

Sistema completo de chat interativo com agentes IA usando n8n + RAG (Retrieval Augmented Generation).

---

## 🎯 Funcionalidades

### Frontend
- ✅ Drawer lateral animado com Framer Motion
- ✅ Botão "Chat" em cada card de agente
- ✅ Interface moderna com design preto/laranja (#F07D00)
- ✅ Histórico de conversas persistente
- ✅ Auto-scroll automático
- ✅ Loading states e feedback visual
- ✅ Gerenciamento de sessões por agente

### Backend
- ✅ Tables `chat_sessions` e `chat_messages` no Supabase
- ✅ RLS (Row Level Security) configurado
- ✅ API service para comunicação com n8n
- ✅ Store Zustand para gerenciamento de estado

### n8n Workflow
- ✅ Webhook para receber mensagens
- ✅ Busca vetorial na base de conhecimento
- ✅ Integração com OpenAI GPT-4
- ✅ Suporte a histórico de conversa
- ✅ Resposta em tempo real

---

## 📦 Arquivos Criados

### Database
- `supabase/migrations/20240125000000_chat_sessions.sql` - Schema do banco

### Frontend
- `src/types/index.ts` - Types ChatSession e ChatMessage
- `src/services/chatService.ts` - Lógica de comunicação
- `src/stores/chatStore.ts` - Estado global com Zustand
- `src/components/ChatDrawer.tsx` - UI do chat

### Workflow
- `n8n-workflow-chat-rag.json` - Workflow completo do n8n

---

## 🚀 Como Usar

### 1. Configurar Agente

No dashboard, edite um agente e configure:

```
Webhook URL: https://seu-n8n.app.n8n.cloud/webhook/agent-chat
Webhook Method: POST
Auth Type: basic
Username: seu_usuario
Password: sua_senha
```

### 2. Importar Workflow n8n

1. Abra seu n8n
2. Clique em "Import from File"
3. Selecione `n8n-workflow-chat-rag.json`
4. Configure as credenciais:
   - **Supabase**: Connection string do Postgres
   - **OpenAI**: API Key

### 3. Conversar com o Agente

1. No dashboard, clique no botão **"Chat"** de qualquer agente
2. O drawer abrirá pela direita
3. Digite sua mensagem
4. O sistema:
   - Busca contexto na base de conhecimento
   - Envia para n8n com histórico
   - Exibe resposta do AI

---

## 🔄 Fluxo do Sistema

```
User Input
    ↓
Frontend (ChatDrawer)
    ↓
Save message (Supabase)
    ↓
POST to n8n webhook
    ├─ agent_id
    ├─ session_id
    ├─ message
    └─ history[]
    ↓
n8n Workflow
    ├─ Generate embedding (OpenAI)
    ├─ Search vectors (Supabase)
    ├─ Build context
    └─ Generate response (GPT-4)
    ↓
Response to Frontend
    ↓
Save assistant message
    ↓
Display in Chat
```

---

## 🎨 Design do Chat

### Cores
- Background: Preto (`#000000`)
- Bordas: Laranja (`#F07D00`)
- Mensagens User: Gradiente laranja
- Mensagens Assistant: Fundo cinza escuro

### Animações
- Slide-in da direita (drawer)
- Fade-in das mensagens
- Bounce loading indicator
- Auto-scroll suave

---

## 📊 Schema do Banco

### chat_sessions
```sql
id            UUID PRIMARY KEY
agent_id      UUID REFERENCES agents(id)
user_id       UUID REFERENCES auth.users(id)
created_at    TIMESTAMP
updated_at    TIMESTAMP
```

### chat_messages
```sql
id            UUID PRIMARY KEY
session_id    UUID REFERENCES chat_sessions(id)
role          VARCHAR(20) CHECK (role IN ('user', 'assistant'))
content       TEXT
created_at    TIMESTAMP
```

---

## 🔧 Configuração n8n

### Credenciais Necessárias

#### Supabase (Postgres)
```
Host: db.xxxx.supabase.co
Port: 5432
Database: postgres
User: postgres.xxxx
Password: [seu-password]
SSL: require
```

#### OpenAI
```
API Key: sk-xxxxxxxxx
```

### Webhook Settings

- **Path**: `agent-chat`
- **Method**: POST
- **Authentication**: Basic Auth (configurado por agente)
- **Response Mode**: Response Node

### Nodes do Workflow

1. **Webhook** - Recebe POST do frontend
2. **Extract Data** - Extrai agent_id, message, history
3. **OpenAI Embedding** - Gera embedding da mensagem
4. **Supabase Query** - Busca documentos similares
5. **Merge** - Combina dados
6. **Build Context** - Formata contexto + histórico
7. **OpenAI Chat** - Gera resposta com GPT-4
8. **Format Response** - Formata JSON
9. **Respond to Webhook** - Retorna ao frontend

---

## 🧪 Testar o Sistema

### 1. Verificar Migration
```sql
SELECT * FROM chat_sessions;
SELECT * FROM chat_messages;
```

### 2. Testar Workflow n8n

POST para webhook:
```json
{
  "agent_id": "uuid-do-agente",
  "session_id": "uuid-da-sessao",
  "message": "Olá, como funciona?",
  "history": []
}
```

Resposta esperada:
```json
{
  "response": "Resposta do AI...",
  "session_id": "uuid-da-sessao"
}
```

### 3. Testar Frontend

1. Login no dashboard
2. Abrir chat de um agente
3. Enviar mensagem
4. Verificar resposta

---

## 🐛 Troubleshooting

### Chat não abre
- Verificar se migration foi aplicada
- Verificar console do browser para erros

### Erro ao enviar mensagem
- Verificar webhook_url do agente
- Verificar credenciais basic auth
- Testar webhook diretamente

### n8n não responde
- Verificar se workflow está ativo
- Verificar credenciais Supabase e OpenAI
- Ver logs de execução no n8n

### Busca vetorial não encontra contexto
- Verificar se documentos foram vetorizados
- Ajustar threshold de similaridade (< 0.5)
- Verificar agent_id nas queries

---

## 🎯 Próximos Passos

### Melhorias Sugeridas

1. **Streaming de Respostas**
   - Implementar Server-Sent Events (SSE)
   - Mostrar resposta em tempo real

2. **Histórico de Sessões**
   - Listar sessões antigas
   - Permitir continuar conversas anteriores

3. **Markdown Rendering**
   - Renderizar markdown nas respostas
   - Syntax highlighting para código

4. **Anexos**
   - Upload de arquivos no chat
   - Analisar documentos em tempo real

5. **Feedback**
   - Botões "útil" / "não útil"
   - Melhorar respostas com feedback

6. **Analytics**
   - Dashboard de uso do chat
   - Métricas de satisfação

---

## 📝 Exemplo de Uso

```typescript
// Abrir chat programaticamente
import { useChatStore } from '@/stores/chatStore'

const openChat = useChatStore((state) => state.openChat)

// Em qualquer componente
<button onClick={() => openChat(agent)}>
  Conversar com {agent.name}
</button>
```

---

## 🔐 Segurança

### Implementado
- ✅ RLS no Supabase (user_id check)
- ✅ Basic Auth no webhook n8n
- ✅ Validação de inputs
- ✅ CORS configurado

### Recomendações
- Use HTTPS sempre
- Rotate API keys periodicamente
- Implemente rate limiting
- Monitore uso de tokens OpenAI

---

## 📚 Referências

- [Supabase Docs](https://supabase.com/docs)
- [n8n Docs](https://docs.n8n.io/)
- [OpenAI API](https://platform.openai.com/docs)
- [Framer Motion](https://www.framer.com/motion/)
- [Zustand](https://zustand-demo.pmnd.rs/)

---

**Status**: ✅ Pronto para produção  
**Versão**: 1.0.0  
**Data**: Janeiro 2025

