# 🚀 Guia Rápido de Configuração

Coloque seu dashboard de agentes IA funcionando em 10 minutos!

## ✅ Pré-requisitos

Antes de começar, você precisa:

1. ✅ Conta no [Supabase](https://supabase.com) (gratuita)
2. ✅ Chave API da [OpenAI](https://platform.openai.com) (para vetorização)
3. ✅ Node.js 18+ instalado
4. ✅ (Opcional) Conta no [n8n](https://n8n.io)

## 📥 Passo 1: Clonar e Instalar

```bash
# Clone o repositório
git clone <seu-repositorio>
cd n8n-agent-dashboard

# Instale as dependências
npm install
```

## 🗄️ Passo 2: Configurar Supabase

### 2.1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Anote:
   - **URL do Projeto**: `https://xxxxx.supabase.co`
   - **Anon Key**: Na página de API Settings

### 2.2. Executar Migration

No Supabase Dashboard:

1. Vá em **SQL Editor**
2. Clique em **+ New query**
3. Copie e cole todo o conteúdo do arquivo `supabase/migrations/20240101000000_initial_schema.sql`
4. Clique em **Run** (canto inferior direito)

✅ Você deve ver: "Success. No rows returned"

### 2.3. Habilitar Email Auth (Opcional)

Se quiser testar sem email real:

1. Vá em **Authentication** → **Providers**
2. Em **Email**, desabilite "Confirm email"
3. Salve

## 🔧 Passo 3: Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz:

```env
VITE_SUPABASE_URL=https://bdhhqafyqyamcejkufxf.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

Substitua pelos valores do seu projeto!

## ☁️ Passo 4: Deploy das Edge Functions

### 4.1. Instalar Supabase CLI

```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows
scoop install supabase

# Ou via npm
npm install -g supabase
```

### 4.2. Login

```bash
supabase login
```

### 4.3. Link ao Projeto

```bash
supabase link --project-ref bdhhqafyqyamcejkufxf
```

Substitua `bdhhqafyqyamcejkufxf` pelo ref do seu projeto!

### 4.4. Configurar Secrets

```bash
# Sua OpenAI API key
supabase secrets set OPENAI_API_KEY=sk-...
```

### 4.5. Deploy Functions

```bash
# Deploy todas as functions
supabase functions deploy agent-config
supabase functions deploy agent-query
supabase functions deploy vectorize-document
```

✅ Você deve ver mensagens de sucesso para cada função!

## 🎨 Passo 5: Iniciar o Frontend

```bash
npm run dev
```

Acesse http://localhost:5173

## 🎯 Passo 6: Criar Seu Primeiro Agente

### 6.1. Registrar Conta

1. Clique em "Cadastre-se"
2. Use qualquer email (ex: `teste@teste.com`)
3. Senha mínima: 6 caracteres

### 6.2. Criar Agente

1. Clique em **"Novo Agente"**
2. Preencha:
   - **Nome**: "Assistente de Suporte"
   - **Descrição**: "Ajuda com perguntas frequentes"
   - **System Prompt**: 
     ```
     Você é um assistente de suporte técnico amigável.
     Use a base de conhecimento para responder perguntas.
     Se não souber, seja honesto e sugira contatar o suporte.
     ```
3. Clique em **"Salvar Agente"**

### 6.3. Adicionar Conhecimento

1. Na lista de agentes, clique em **"Base"**
2. Clique em **"Adicionar"**
3. Cole um texto de exemplo:
   ```
   Para resetar sua senha:
   1. Vá em "Esqueci minha senha"
   2. Digite seu email
   3. Clique no link que recebeu
   4. Crie uma nova senha
   
   A senha deve ter no mínimo 8 caracteres.
   ```
4. Clique em **"Salvar Documento"**

⚠️ **Nota**: A vetorização automática será implementada. Por enquanto, você precisa chamar a API manualmente.

### 6.4. Vetorizar Documento (Manual)

```bash
curl -X POST 'https://bdhhqafyqyamcejkufxf.supabase.co/functions/v1/vectorize-document' \
  -H 'apikey: SUA_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "documentId": "DOCUMENT_ID",
    "content": "seu texto aqui",
    "knowledgeBaseId": "KB_ID"
  }'
```

## 🔗 Passo 7: Integrar com n8n

### 7.1. Configurar Webhook no Agente

1. Edite seu agente
2. Preencha:
   - **URL do Webhook**: `https://gsouzabd.app.n8n.cloud/webhook/meu-agente`
   - **Método HTTP**: POST
   - **Path**: `meu-agente`
   - **Tipo de Autenticação**: Basic Auth
   - **Usuário**: `seu_usuario`
   - **Senha**: `sua_senha`
3. Salve

### 7.2. Copiar JSON de Configuração

1. Clique em **"Ver JSON"**
2. Copie o JSON gerado
3. Use no n8n (veja `docs/n8n-workflow-example.md`)

## ✅ Checklist de Sucesso

Você está pronto quando:

- [ ] Frontend roda em localhost:5173
- [ ] Consegue criar conta e fazer login
- [ ] Pode criar um agente
- [ ] Pode adicionar documentos na base
- [ ] Edge Functions estão deployed
- [ ] JSON de configuração é gerado corretamente

## 🐛 Problemas Comuns

### "Failed to fetch" no login

**Solução**: Verifique se o VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão corretos no `.env`

### Edge Functions não funcionam

**Solução**: 
1. Verifique se fez deploy: `supabase functions list`
2. Confira os logs: `supabase functions logs agent-query`
3. Confirme que o OPENAI_API_KEY está setado

### "vector extension not found"

**Solução**: Execute novamente a migration. A extensão `vector` deve ser instalada.

### Documentos não aparecem na busca

**Solução**: Certifique-se de que:
1. O documento foi vetorizado (tem embedding)
2. O threshold não está muito alto (padrão: 0.7)
3. O agentId está correto

## 🎓 Próximos Passos

Agora que está funcionando:

1. 📚 Leia a [documentação completa](../README.md)
2. 🔧 Configure seu [workflow n8n](./n8n-workflow-example.md)
3. 🚀 Deploy em produção (Vercel + Supabase)
4. 📊 Adicione analytics e monitoramento

## 💬 Precisa de Ajuda?

- 📖 Consulte o README.md para documentação completa
- 🐛 Abra uma issue no GitHub
- 💬 Entre em contato com o suporte

---

**Dica Pro**: Use o Supabase Studio (Database → Tables) para visualizar os dados enquanto testa! 🔍

