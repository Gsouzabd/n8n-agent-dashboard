# Documentação Completa do Widget

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Widget](#arquitetura-do-widget)
3. [Criação e Configuração](#criação-e-configuração)
4. [Acesso Público e Rotas](#acesso-público-e-rotas)
5. [Configuração de CORS](#configuração-de-cors)
6. [Geração e Gerenciamento de Session ID](#geração-e-gerenciamento-de-session-id)
7. [Analytics e Tracking](#analytics-e-tracking)
8. [Implementação no Site Cliente](#implementação-no-site-cliente)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O widget é um componente JavaScript embarcável que permite incorporar um chat de IA em qualquer site externo. Ele funciona como um iframe que carrega uma interface de chat completa, permitindo interação com agentes de IA sem necessidade de autenticação do usuário.

### Características Principais

- ✅ **Acesso Público**: Funciona sem autenticação do usuário
- ✅ **Sessões Anônimas**: Cria e gerencia sessões de chat para visitantes não autenticados
- ✅ **Persistência**: Mantém a sessão entre recarregamentos de página usando localStorage
- ✅ **CORS Configurado**: Permite requisições de qualquer domínio
- ✅ **Analytics Integrado**: Rastreia impressões, aberturas e interações

---

## 🏗️ Arquitetura do Widget

### Componentes Principais

```
┌─────────────────────────────────────────────────────────┐
│  Site Cliente (ex: stract.to)                          │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  widget.js (script embarcado)                   │  │
│  │  - Gera session ID                              │  │
│  │  - Cria bubble button                           │  │
│  │  - Gerencia iframe                              │  │
│  │  - Envia analytics                              │  │
│  └──────────────────────────────────────────────────┘  │
│                          │                              │
│                          ▼                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  iframe: /w/{widgetId}?session_id={id}          │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Servidor (agentsworkspace.papricadevs.com.br)         │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  WidgetEmbed.tsx (React Component)              │  │
│  │  - Carrega agente                                │  │
│  │  - Cria sessão anônima                           │  │
│  │  - Renderiza interface de chat                   │  │
│  └──────────────────────────────────────────────────┘  │
│                          │                              │
│                          ▼                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Edge Function: widget-analytics                │  │
│  │  - Recebe eventos de analytics                  │  │
│  │  - Salva no banco                               │  │
│  │  - Atualiza contadores                          │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

1. **Carregamento do Widget**
   ```
   Site Cliente → widget.js → Gera session ID → Cria iframe
   ```

2. **Abertura do Chat**
   ```
   Usuário clica → iframe carrega → WidgetEmbed cria sessão → Chat disponível
   ```

3. **Envio de Mensagem**
   ```
   Usuário envia → chatStore → chatService → n8n → Resposta → UI
   ```

4. **Analytics**
   ```
   Evento ocorre → widget.js → Edge Function → Banco de dados
   ```

---

## 🔧 Criação e Configuração

### 1. Criar Widget no Dashboard

No painel administrativo, navegue até o agente e crie um widget:

```typescript
// Exemplo de criação via interface
POST /api/agents/{agentId}/widgets
{
  "widget_type": "bubble",
  "primary_color": "#FF6B00",
  "position": "bottom-right",
  "width": 400,
  "height": 600,
  "allow_all_domains": true
}
```

### 2. Estrutura do Banco de Dados

```sql
-- Tabela agent_widgets
CREATE TABLE agent_widgets (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES agents(id),
  widget_id VARCHAR(50) UNIQUE NOT NULL,  -- ID público (ex: 9ml7ws95)
  widget_type VARCHAR(20) DEFAULT 'bubble',
  primary_color VARCHAR(7) DEFAULT '#FF6B00',
  position VARCHAR(20) DEFAULT 'bottom-right',
  width INTEGER DEFAULT 400,
  height INTEGER DEFAULT 600,
  allowed_domains TEXT[] DEFAULT '{}',
  allow_all_domains BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Geração do Widget ID

O `widget_id` é um identificador público único (ex: `9ml7ws95`) gerado automaticamente:

```sql
-- Função para gerar widget_id único
CREATE OR REPLACE FUNCTION generate_widget_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
BEGIN
  LOOP
    new_id := LOWER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM agent_widgets WHERE widget_id = new_id);
  END LOOP;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 🌐 Acesso Público e Rotas

### 1. Rota Pública do Widget

A rota `/w/:widgetId` é pública e não requer autenticação:

```typescript
// src/App.tsx
<Route path="/w/:widgetId" element={<WidgetEmbed />} />
```

### 2. Componente WidgetEmbed

O componente `WidgetEmbed.tsx` é responsável por:

- ✅ Carregar o agente associado ao widget
- ✅ Criar sessões anônimas quando necessário
- ✅ Renderizar a interface de chat
- ✅ Gerenciar mensagens e respostas

```typescript
// src/pages/WidgetEmbed.tsx
export default function WidgetEmbed() {
  const { widgetId } = useParams()
  const [agent, setAgent] = useState<Agent | null>(null)
  
  useEffect(() => {
    // 1. Buscar widget e agente
    const { data: widget } = await supabase
      .from('agent_widgets')
      .select('agent_id')
      .eq('widget_id', widgetId)
      .single()
    
    // 2. Buscar agente
    const { data: agentData } = await supabase
      .from('agents')
      .select('*')
      .eq('id', widget.agent_id)
      .single()
    
    // 3. Obter session_id da URL
    const externalSessionId = new URLSearchParams(window.location.search).get('session_id')
    
    // 4. Criar ou recuperar sessão
    if (externalSessionId) {
      const sid = await chatService.getOrCreateSessionByExternal(agentData.id, externalSessionId)
      await openChat(agentData, sid)
    } else {
      await openChat(agentData) // Cria sessão anônima automaticamente
    }
  }, [widgetId])
  
  // ... renderização do chat
}
```

### 3. Configuração de Headers para Iframe

Para permitir que o widget seja exibido em iframes de outros domínios, é necessário configurar o `.htaccess`:

```apache
# .htaccess
<IfModule mod_headers.c>
  # Remove X-Frame-Options para rotas de widget (/w/*)
  <LocationMatch "^/w/">
    Header unset X-Frame-Options
  </LocationMatch>
  
  # Para outras rotas, manter SAMEORIGIN
  Header always set X-Frame-Options "SAMEORIGIN" "expr=%{REQUEST_URI} !~ m#^/w/#"
</IfModule>
```

**Por que isso é necessário?**

- `X-Frame-Options: SAMEORIGIN` impede que a página seja exibida em iframes de outros domínios
- Para o widget funcionar, precisamos remover essa restrição apenas nas rotas `/w/*`
- Isso permite que sites externos incorporem o widget via iframe

---

## 🔒 Configuração de CORS

### 1. Edge Function para Analytics

A Edge Function `widget-analytics` precisa aceitar requisições de qualquer domínio:

```typescript
// supabase/functions/widget-analytics/index.ts
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  // ... lógica da função
})
```

### 2. Autenticação Pública

Como a Edge Function tem `verify_jwt: true`, precisamos enviar a chave anon do Supabase:

```javascript
// public/widget.js
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

fetch(analyticsUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': supabaseAnonKey,
    'Authorization': 'Bearer ' + supabaseAnonKey,
  },
  body: JSON.stringify({ /* dados */ })
})
```

### 3. Políticas RLS para Sessões Anônimas

O banco de dados precisa permitir criação e leitura de sessões sem `user_id`:

```sql
-- Política para inserção de sessões anônimas
CREATE POLICY "Anon insert external session"
  ON chat_sessions FOR INSERT
  WITH CHECK (external_session_id IS NOT NULL);

-- Política para leitura de sessões anônimas
CREATE POLICY "Anon select external sessions"
  ON chat_sessions FOR SELECT
  USING (external_session_id IS NOT NULL);

-- Política para mensagens de sessões anônimas
CREATE POLICY "Anon insert external messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions cs
      WHERE cs.id = chat_messages.session_id
        AND cs.external_session_id IS NOT NULL
    )
    AND role IN ('user', 'assistant')
  );
```

---

## 🆔 Geração e Gerenciamento de Session ID

### 1. Geração no Widget (Cliente)

O widget.js é responsável por gerar e gerenciar o session ID do visitante:

```javascript
// public/widget.js
function getOrCreateVisitorSessionId() {
  const storageKey = 'venturize_widget_session_' + widgetId;
  let sessionId = sessionIdParam; // Se fornecido via parâmetro
  
  if (!sessionId) {
    // 1. Tentar recuperar do localStorage (persistência)
    try {
      sessionId = localStorage.getItem(storageKey);
    } catch (e) {
      console.warn('localStorage not available');
    }
    
    // 2. Se não existir, gerar novo ID
    if (!sessionId) {
      sessionId = 'widget_' + widgetId + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
      
      // 3. Salvar no localStorage para persistência
      try {
        localStorage.setItem(storageKey, sessionId);
      } catch (e) {
        // Ignorar se localStorage não disponível
      }
    }
  }
  
  return sessionId;
}

const visitorSessionId = getOrCreateVisitorSessionId();
```

### 2. Formato do Session ID

```
widget_{widgetId}_{timestamp}_{random}
```

Exemplo: `widget_9ml7ws95_1704123456789_a3f5k2m`

- **widget_**: Prefixo identificador
- **9ml7ws95**: ID do widget
- **1704123456789**: Timestamp (milissegundos)
- **a3f5k2m**: String aleatória (base36)

### 3. Persistência

O session ID é salvo no `localStorage` com a chave:
```
venturize_widget_session_{widgetId}
```

**Vantagens:**
- ✅ Mantém a mesma sessão entre recarregamentos de página
- ✅ Permite continuidade da conversa
- ✅ Identifica o mesmo visitante em múltiplas visitas

**Fallback:**
- Se `localStorage` não estiver disponível (modo privado, bloqueado), gera um ID temporário
- O ID temporário funciona apenas durante a sessão do navegador

### 4. Uso do Session ID

O session ID é usado em três lugares:

1. **URL do iframe**: Passado como query parameter
   ```javascript
   iframeUrl.searchParams.set('session_id', visitorSessionId);
   ```

2. **Analytics**: Incluído nos eventos de tracking
   ```javascript
   body: JSON.stringify({
     widgetId: widgetId,
     eventType: eventType,
     conversationId: visitorSessionId, // Session ID do visitante
     // ...
   })
   ```

3. **Criação de Sessão no Backend**: Usado para criar/recuperar sessão de chat
   ```typescript
   // src/services/chatService.ts
   async getOrCreateSessionByExternal(agentId: string, externalSessionId: string) {
     // Busca sessão existente ou cria nova
     const { data: existing } = await supabase
       .from('chat_sessions')
       .select('id')
       .eq('agent_id', agentId)
       .eq('external_session_id', externalSessionId)
       .maybeSingle()
     
     if (existing) return existing.id
     
     // Cria nova sessão anônima
     const { data: created } = await supabase
       .from('chat_sessions')
       .insert({
         agent_id: agentId,
         external_session_id: externalSessionId,
         // user_id é NULL para sessões anônimas
       })
       .select('id')
       .single()
     
     return created.id
   }
   ```

### 5. Gerenciamento no ChatStore

O `chatStore` foi modificado para criar sessões anônimas automaticamente:

```typescript
// src/stores/chatStore.ts
openChat: async (agent: Agent, sessionId?: string) => {
  let sid = sessionId || null
  
  if (!sid) {
    const user = useAuthStore.getState().user
    
    if (!user) {
      // Para widget sem autenticação, criar sessão anônima
      const anonymousSessionId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substring(7)
      sid = await chatService.getOrCreateSessionByExternal(agent.id, anonymousSessionId)
    } else {
      // Para usuário autenticado, usar sessão normal
      sid = await chatService.getOrCreateSession(agent.id, user.id)
    }
  }
  
  // Carregar mensagens da sessão
  const messages = await chatService.getMessages(sid)
  // ...
}
```

**Nota**: O `chatStore` ainda gera um ID anônimo como fallback, mas o ideal é que o widget sempre forneça o `session_id` via URL.

---

## 📊 Analytics e Tracking

### 1. Eventos Rastreados

O widget rastreia os seguintes eventos:

- **impression**: Widget carregado na página
- **open**: Usuário abriu o chat
- **close**: Usuário fechou o chat
- **message**: Mensagem enviada (futuro)
- **interaction**: Interação específica (futuro)

### 2. Envio de Analytics

```javascript
// public/widget.js
function trackEvent(eventType) {
  const analyticsUrl = supabaseBaseUrl + '/functions/v1/widget-analytics';
  
  fetch(analyticsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': 'Bearer ' + supabaseAnonKey,
    },
    body: JSON.stringify({
      widgetId: widgetId,
      eventType: eventType,
      referrer: window.location.href,
      referrerDomain: window.location.hostname,
      userAgent: navigator.userAgent,
      conversationId: visitorSessionId, // Session ID do visitante
    }),
  }).catch(err => {
    console.warn('Analytics tracking failed', err);
  });
}
```

### 3. Processamento no Backend

A Edge Function `widget-analytics` processa os eventos:

```typescript
// supabase/functions/widget-analytics/index.ts
serve(async (req) => {
  const { widgetId, eventType, referrer, referrerDomain, userAgent, conversationId } = await req.json()
  
  // 1. Validar widget
  const { data: widget } = await supabase
    .from('agent_widgets')
    .select('id')
    .eq('widget_id', widgetId)
    .eq('is_active', true)
    .single()
  
  // 2. Inserir evento de analytics
  await supabase
    .from('widget_analytics')
    .insert({
      widget_id: widget.id,
      event_type: eventType,
      referrer_url: referrer,
      referrer_domain: referrerDomain,
      user_agent: userAgent,
      conversation_id: conversationId || null,
    })
  
  // 3. Atualizar contadores
  if (eventType === 'impression') {
    await supabase.rpc('increment_widget_counter', {
      widget_uuid: widget.id,
      counter_type: 'impressions'
    })
  }
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
```

---

## 🚀 Implementação no Site Cliente

### 1. Código de Incorporação

```html
<!-- Opção 1: Script direto -->
<script>
(function(){
  var s = document.createElement('script');
  s.src = 'https://agentsworkspace.papricadevs.com.br/widget.js?id=9ml7ws95';
  s.async = true;
  document.body.appendChild(s);
})();
</script>
```

### 2. Com Session ID Externo

Se o site cliente já tem um sistema de sessões, pode passar o session_id:

```html
<script>
(function(){
  var s = document.createElement('script');
  // Passar session_id do sistema do cliente
  s.src = 'https://agentsworkspace.papricadevs.com.br/widget.js?id=9ml7ws95&session_id={{CLIENT_SESSION_ID}}';
  s.async = true;
  document.body.appendChild(s);
})();
</script>
```

### 3. Com URL do Supabase Customizada

```html
<script>
(function(){
  var s = document.createElement('script');
  s.src = 'https://agentsworkspace.papricadevs.com.br/widget.js?id=9ml7ws95&supabase_url=https://seu-projeto.supabase.co';
  s.async = true;
  document.body.appendChild(s);
})();
</script>
```

### 4. Parâmetros Disponíveis

| Parâmetro | Descrição | Obrigatório | Exemplo |
|-----------|-----------|-------------|---------|
| `id` | ID do widget | ✅ Sim | `9ml7ws95` |
| `session_id` | Session ID externo | ❌ Não | `client_session_123` |
| `supabase_url` | URL do Supabase | ❌ Não | `https://xxx.supabase.co` |

---

## 🔍 Troubleshooting

### Problema: Widget não aparece

**Possíveis causas:**
1. Widget inativo (`is_active = false`)
2. Domínio não permitido (se `allow_all_domains = false`)
3. Erro no console do navegador

**Solução:**
```javascript
// Verificar no console
console.log('Widget ID:', widgetId);
console.log('Base URL:', baseUrl);
```

### Problema: Erro de CORS

**Sintoma:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Solução:**
1. Verificar se a Edge Function tem headers CORS corretos
2. Verificar se está enviando `apikey` e `Authorization` headers
3. Verificar se a Edge Function está deployada

### Problema: "User not authenticated"

**Sintoma:**
```
User not authenticated
No active chat session
```

**Solução:**
1. Verificar se o `session_id` está sendo passado na URL do iframe
2. Verificar se as políticas RLS permitem sessões anônimas
3. Verificar se `chatStore.openChat` está criando sessão anônima

### Problema: Session ID não persiste

**Sintoma:**
Nova sessão criada a cada recarregamento

**Solução:**
1. Verificar se `localStorage` está disponível
2. Verificar se o navegador está em modo privado
3. Verificar se há bloqueadores de cookies/storage

### Problema: X-Frame-Options bloqueando

**Sintoma:**
```
Refused to display '...' in a frame because it set 'X-Frame-Options' to 'sameorigin'
```

**Solução:**
1. Verificar configuração do `.htaccess`
2. Verificar se a rota `/w/*` está removendo o header
3. Verificar configuração do servidor web

---

## 📝 Checklist de Implementação

### Backend

- [ ] Tabela `agent_widgets` criada
- [ ] Tabela `widget_analytics` criada
- [ ] Políticas RLS para sessões anônimas configuradas
- [ ] Políticas RLS para mensagens anônimas configuradas
- [ ] Edge Function `widget-analytics` deployada
- [ ] Função `increment_widget_counter` criada
- [ ] `.htaccess` configurado para remover X-Frame-Options em `/w/*`

### Frontend

- [ ] Rota `/w/:widgetId` configurada como pública
- [ ] Componente `WidgetEmbed` implementado
- [ ] `chatStore` modificado para criar sessões anônimas
- [ ] `chatService.getOrCreateSessionByExternal` implementado
- [ ] Widget.js gerencia session ID com localStorage

### Widget

- [ ] `widget.js` gera session ID persistente
- [ ] `widget.js` envia analytics com CORS correto
- [ ] `widget.js` passa session_id para iframe
- [ ] Fallback para quando localStorage não disponível

---

## 🔐 Segurança

### Considerações Importantes

1. **Session ID Público**: O session ID é visível no código JavaScript. Não use para dados sensíveis.

2. **Rate Limiting**: Considere implementar rate limiting na Edge Function de analytics.

3. **Validação de Domínios**: Use `allowed_domains` para restringir onde o widget pode ser usado.

4. **Sanitização**: Sempre sanitize dados de entrada na Edge Function.

5. **HTTPS**: Sempre use HTTPS em produção para proteger dados em trânsito.

---

## 📚 Referências

- [Documentação Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Documentação CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Documentação localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [Documentação X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options)

---

## 🎯 Resumo

O widget funciona através de:

1. **Geração de Session ID**: Widget.js cria e gerencia um ID único por visitante
2. **Persistência**: localStorage mantém o ID entre recarregamentos
3. **Acesso Público**: Rota `/w/:widgetId` não requer autenticação
4. **CORS**: Edge Functions configuradas para aceitar requisições de qualquer domínio
5. **Sessões Anônimas**: Banco de dados permite sessões sem `user_id`
6. **Analytics**: Eventos são rastreados e salvos no banco

Essa arquitetura permite que qualquer site incorpore o widget sem necessidade de autenticação, mantendo rastreabilidade e continuidade das conversas.


