# Dashboard de Agentes IA Venturize

Sistema completo para criação e gestão de agentes de IA com base de conhecimento vetorizada.

## 🚀 Características

- **Gestão de Agentes**: Crie e gerencie múltiplos agentes de IA
- **Base de Conhecimento Vetorizada**: Upload e processamento de documentos com pgvector
- **Busca Semântica**: Encontre informações relevantes na base de conhecimento
- **Integração via Webhooks**: Sistema configurável para integração com workflows externos
- **Autenticação Segura**: Sistema de autenticação com Supabase Auth
- **Interface Moderna**: UI construída com React, TailwindCSS e componentes modernos

## 📋 Pré-requisitos

- Node.js 18+ 
- Conta no Supabase
- Chave API da OpenAI (para vetorização)
- Conta no n8n (opcional, para integração)

## 🛠️ Instalação

1. **Clone o repositório**
```bash
git clone <seu-repositorio>
cd n8n-agent-dashboard
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

4. **Configure o banco de dados Supabase**

Execute a migration SQL no seu projeto Supabase (pode ser via Dashboard SQL Editor ou CLI):

```bash
# Se estiver usando Supabase CLI
supabase db push
```

Ou copie o conteúdo do arquivo de migration e execute no SQL Editor do Supabase Dashboard.

5. **Configure as Edge Functions**

Deploy das Edge Functions no Supabase:

```bash
# Agent Config
supabase functions deploy agent-config

# Agent Query
supabase functions deploy agent-query --no-verify-jwt

# Vectorize Document
supabase functions deploy vectorize-document
```

Configure as variáveis de ambiente das Edge Functions:

```bash
supabase secrets set OPENAI_API_KEY=sua_openai_key_aqui
```

6. **Inicie o servidor de desenvolvimento**

```bash
npm run dev
```

Acesse http://localhost:5173

## 📚 Estrutura do Projeto

```
n8n-agent-dashboard/
├── src/
│   ├── components/       # Componentes reutilizáveis
│   │   ├── ui/          # Componentes de UI base
│   │   ├── AuthProvider.tsx
│   │   ├── Layout.tsx
│   │   └── ProtectedRoute.tsx
│   ├── pages/           # Páginas da aplicação
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── AgentList.tsx
│   │   ├── AgentForm.tsx
│   │   └── KnowledgeBase.tsx
│   ├── lib/            # Utilitários
│   │   ├── supabase.ts # Cliente Supabase
│   │   └── utils.ts
│   ├── stores/         # Estado global (Zustand)
│   │   └── authStore.ts
│   └── types/          # TypeScript types
│       └── index.ts
├── supabase/
│   └── functions/      # Edge Functions
│       ├── agent-config/
│       ├── agent-query/
│       └── vectorize-document/
└── public/
```

## 🎯 Uso

### 1. Criar um Agente

1. Faça login no sistema
2. Clique em "Novo Agente"
3. Preencha:
   - Nome e descrição do agente
   - System Prompt (instruções para o agente)
   - Configurações do webhook n8n (URL, método, autenticação)
4. Salve o agente

### 2. Adicionar Base de Conhecimento

1. Acesse o agente criado
2. Clique em "Base"
3. Adicione documentos:
   - Cole texto manualmente
   - Ou faça upload de documentos (futuro)
4. Os documentos serão automaticamente vetorizados

### 3. Integrar com n8n

1. No agente, clique em "Ver JSON"
2. Copie a configuração JSON gerada
3. No n8n, configure:
   - Webhook trigger com as credenciais do agente
   - HTTP Request node para buscar contexto:
     - URL: `${configEndpoint}/agent-query`
     - Método: POST
     - Body: `{ "agentId": "uuid", "query": "{{$json.query}}" }`
   - LLM node (OpenAI, Anthropic, etc) com o contexto

### 4. Testar o Agente

Use a interface de busca semântica para testar se a base de conhecimento está retornando resultados relevantes.

## 🔧 APIs Disponíveis

### Agent Config API
```
GET /functions/v1/agent-config/{agentId}
```
Retorna a configuração completa do agente.

### Agent Query API  
```
POST /functions/v1/agent-query
Body: {
  "agentId": "uuid",
  "query": "sua pergunta",
  "topK": 5,
  "threshold": 0.7
}
```
Retorna documentos relevantes da base de conhecimento.

### Vectorize Document API
```
POST /functions/v1/vectorize-document
Body: {
  "content": "texto do documento",
  "knowledgeBaseId": "uuid"
}
```
Vetoriza e salva um documento na base de conhecimento.

## 🎨 Tecnologias Utilizadas

### Frontend
- **React 18** - Framework UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool
- **TailwindCSS** - Estilização
- **React Router** - Roteamento
- **Zustand** - Gerenciamento de estado
- **React Hook Form** - Formulários
- **Zod** - Validação de schemas
- **Lucide React** - Ícones

### Backend
- **Supabase** - BaaS (Backend as a Service)
  - PostgreSQL com pgvector
  - Authentication
  - Row Level Security
  - Edge Functions (Deno)
- **OpenAI API** - Embeddings (text-embedding-ada-002)

## 🔐 Segurança

- Row Level Security (RLS) ativado em todas as tabelas
- Autenticação via Supabase Auth
- Senhas criptografadas
- API keys armazenadas como secrets no Supabase
- CORS configurado nas Edge Functions

## 📝 Schema do Banco de Dados

### agents
```sql
- id: uuid (PK)
- user_id: uuid (FK -> auth.users)
- name: text
- description: text
- webhook_url: text
- webhook_method: text
- webhook_path: text
- auth_type: text
- auth_username: text
- auth_password: text
- system_prompt: text
- created_at: timestamp
- updated_at: timestamp
```

### knowledge_bases
```sql
- id: uuid (PK)
- agent_id: uuid (FK -> agents)
- name: text
- description: text
- created_at: timestamp
```

### knowledge_documents
```sql
- id: uuid (PK)
- knowledge_base_id: uuid (FK -> knowledge_bases)
- content: text
- embedding: vector(1536)
- metadata: jsonb
- created_at: timestamp
```

## 🚀 Deploy

### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy a pasta dist/
```

### Backend (Supabase)
```bash
# Edge Functions
supabase functions deploy --project-ref ...

# Migrations
supabase db push
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se livre para abrir issues ou pull requests.

## 📄 Licença

MIT

## 👥 Autor

Desenvolvido para integração com n8n e gestão de agentes IA.

## 🔮 Próximas Funcionalidades

- [ ] Upload de arquivos (PDF, DOCX, TXT)
- [ ] Chunking inteligente de documentos grandes
- [ ] Suporte a múltiplos modelos de embedding
- [ ] Analytics e logs de uso
- [ ] Testes A/B de prompts
- [ ] Integração com mais plataformas além do n8n
- [ ] Dark mode
- [ ] Playground interativo para testar agentes
