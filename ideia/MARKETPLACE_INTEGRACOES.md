# 🔌 Marketplace de Integrações - Guia Completo

**Prioridade**: ⭐⭐⭐ Alta  
**Tempo Estimado**: 3-4 semanas  
**Complexidade**: Alta

---

## 🎯 Objetivo

Criar um marketplace de integrações plug-and-play que permita conectar agentes a diversos canais e serviços sem código.

---

## 📊 Integrações Prioritárias

### Fase 1: Mensageria (Semana 1-2)

#### 1. WhatsApp Business API ⭐⭐⭐⭐⭐

**Por que**: Canal mais usado no Brasil (93% penetração)

**Requisitos:**
- WhatsApp Business API (não oficial)
- Número de telefone verificado
- Meta Business Manager

**Setup:**
```typescript
interface WhatsAppConfig {
  phoneNumberId: string
  accessToken: string
  webhookVerifyToken: string
  businessAccountId: string
}

// Enviar mensagem
async function sendWhatsAppMessage(to: string, message: string) {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      }),
    }
  )
  return response.json()
}

// Receber mensagem (webhook)
Deno.serve(async (req) => {
  const body = await req.json()
  
  if (body.entry?.[0]?.changes?.[0]?.value?.messages) {
    const message = body.entry[0].changes[0].value.messages[0]
    const from = message.from
    const text = message.text.body
    
    // Processar com agente
    const response = await processWithAgent(agentId, text)
    
    // Enviar resposta
    await sendWhatsAppMessage(from, response)
  }
  
  return new Response('OK', { status: 200 })
})
```

**Custo**: 
- Gratuito até 1.000 conversas/mês
- R$ 0,10 - R$ 0,30 por conversa depois

**Checklist:**
- [ ] Obter acesso à API (Meta for Developers)
- [ ] Configurar webhook no Supabase
- [ ] Validar webhook com verify_token
- [ ] Processar mensagens recebidas
- [ ] Enviar respostas
- [ ] Suporte a mídia (imagens, PDFs)
- [ ] Templates de mensagens
- [ ] Status de leitura
- [ ] Typing indicator

---

#### 2. Telegram Bot ⭐⭐⭐⭐

**Por que**: Fácil setup, API gratuita, suporte a bots poderosos

**Setup:**
```typescript
interface TelegramConfig {
  botToken: string
  webhookUrl: string
}

// Criar bot: @BotFather
// Token: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

// Configurar webhook
await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: webhookUrl,
    allowed_updates: ['message', 'callback_query'],
  }),
})

// Receber mensagem
Deno.serve(async (req) => {
  const update = await req.json()
  
  if (update.message) {
    const chatId = update.message.chat.id
    const text = update.message.text
    
    // Processar
    const response = await processWithAgent(agentId, text)
    
    // Enviar resposta
    await sendTelegramMessage(chatId, response)
  }
  
  return new Response('OK')
})

// Enviar mensagem
async function sendTelegramMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  })
}
```

**Features Avançados:**
- Inline keyboards (botões)
- Commands (/start, /help)
- Grupos e canais
- Bot admin

**Custo**: Gratuito

---

#### 3. Discord Bot ⭐⭐⭐

**Por que**: Comunidades tech, gamers, crypto

**Setup:**
```typescript
import { Client, GatewayIntentBits } from 'discord.js'

interface DiscordConfig {
  botToken: string
  guildId: string
  channelId: string
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

client.on('messageCreate', async (message) => {
  // Ignorar mensagens do próprio bot
  if (message.author.bot) return
  
  // Apenas responder em canal específico ou DMs
  if (message.channel.id !== channelId && !message.channel.isDMBased()) return
  
  // Processar com agente
  const response = await processWithAgent(agentId, message.content)
  
  // Enviar resposta
  await message.reply(response)
})

client.login(botToken)
```

**Features:**
- Slash commands (/ask, /help)
- Threads (conversas aninhadas)
- Embeds (mensagens ricas)
- Reactions

---

#### 4. Slack Bot ⭐⭐⭐

**Por que**: Empresas B2B, suporte interno

**Setup via Bolt.js:**
```typescript
import { App } from '@slack/bolt'

interface SlackConfig {
  botToken: string // xoxb-...
  signingSecret: string
  appToken: string // xapp-...
}

const app = new App({
  token: botToken,
  signingSecret,
  socketMode: true,
  appToken,
})

// Responder menções
app.event('app_mention', async ({ event, client }) => {
  const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim()
  
  const response = await processWithAgent(agentId, text)
  
  await client.chat.postMessage({
    channel: event.channel,
    thread_ts: event.ts,
    text: response,
  })
})

// Slash command: /ask <pergunta>
app.command('/ask', async ({ command, ack, respond }) => {
  await ack()
  
  const response = await processWithAgent(agentId, command.text)
  
  await respond({
    text: response,
    response_type: 'in_channel',
  })
})

await app.start()
```

**Features:**
- Home tab (dashboard dentro do Slack)
- Modals (formulários)
- Shortcuts
- Workflows

---

### Fase 2: CRM & Sales (Semana 3)

#### 5. HubSpot ⭐⭐⭐

**Setup:**
```typescript
interface HubSpotConfig {
  apiKey: string
  portalId: string
}

// Criar contato
async function createContact(email: string, firstName: string) {
  const response = await fetch(
    'https://api.hubapi.com/crm/v3/objects/contacts',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          email,
          firstname: firstName,
          lifecyclestage: 'lead',
        },
      }),
    }
  )
  return response.json()
}

// Adicionar nota na timeline
async function addNote(contactId: string, note: string) {
  await fetch('https://api.hubapi.com/crm/v3/objects/notes', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        hs_note_body: note,
      },
      associations: [
        {
          to: { id: contactId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }],
        },
      ],
    }),
  })
}
```

**Use Cases:**
- Qualificação automática de leads
- Log de conversas do chat
- Criar tickets de suporte
- Atualizar deals

---

#### 6. Calendly ⭐⭐

**Agendamento automático:**

```typescript
interface CalendlyConfig {
  apiKey: string
  eventTypeUri: string // https://calendly.com/your-name/30min
}

// Gerar link de agendamento
function generateCalendlyLink(email: string, name: string): string {
  const params = new URLSearchParams({
    email,
    name,
    a1: agentId, // Custom field
  })
  return `${eventTypeUri}?${params}`
}

// No chat do agente:
if (userIntent === 'schedule_meeting') {
  const link = generateCalendlyLink(user.email, user.name)
  return `Clique aqui para agendar: ${link}`
}
```

---

### Fase 3: E-commerce (Semana 4)

#### 7. Shopify ⭐⭐⭐

**Setup:**
```typescript
interface ShopifyConfig {
  shopDomain: string // mystore.myshopify.com
  accessToken: string
  apiVersion: string // 2024-01
}

// Buscar produtos
async function searchProducts(query: string) {
  const response = await fetch(
    `https://${shopDomain}/admin/api/${apiVersion}/products.json?title=${query}`,
    {
      headers: {
        'X-Shopify-Access-Token': accessToken,
      },
    }
  )
  return response.json()
}

// Rastrear pedido
async function trackOrder(orderId: string) {
  const response = await fetch(
    `https://${shopDomain}/admin/api/${apiVersion}/orders/${orderId}.json`,
    {
      headers: {
        'X-Shopify-Access-Token': accessToken,
      },
    }
  )
  return response.json()
}

// No agente:
if (userQuery.includes('rastrear pedido')) {
  const orderId = extractOrderId(userQuery)
  const order = await trackOrder(orderId)
  return `Seu pedido está: ${order.fulfillment_status}. Previsão: ${order.estimated_delivery}`
}
```

---

## 🗄️ Schema de Banco

```sql
-- Tabela de integrações disponíveis (seed data)
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(50) UNIQUE NOT NULL, -- 'whatsapp', 'telegram', etc
  name TEXT NOT NULL, -- 'WhatsApp Business'
  description TEXT,
  icon_url TEXT,
  category VARCHAR(50) NOT NULL, -- 'messaging', 'crm', 'ecommerce', 'support'
  
  -- Configuração
  auth_type VARCHAR(20) NOT NULL, -- 'oauth', 'api_key', 'basic', 'none'
  config_schema JSONB NOT NULL, -- JSON Schema para validação
  setup_url TEXT, -- Link para tutorial
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  is_beta BOOLEAN DEFAULT false,
  is_enterprise_only BOOLEAN DEFAULT false,
  popularity_score INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Integrações ativas por agente
CREATE TABLE agent_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  integration_slug VARCHAR(50) REFERENCES integrations(slug) NOT NULL,
  
  -- Configuração (credenciais, tokens, etc)
  config JSONB DEFAULT '{}',
  
  -- Status
  is_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  
  -- Webhook
  webhook_url TEXT UNIQUE,
  webhook_secret TEXT,
  
  -- Stats
  total_messages_received INTEGER DEFAULT 0,
  total_messages_sent INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_agent_integration UNIQUE(agent_id, integration_slug)
);

-- Logs de integração (debug)
CREATE TABLE integration_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_integration_id UUID REFERENCES agent_integrations(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'message_received', 'message_sent', 'error', 'config_updated'
  payload JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_integration_logs_agent ON integration_logs(agent_integration_id, created_at DESC);

-- Seed: Integrações disponíveis
INSERT INTO integrations (slug, name, description, icon_url, category, auth_type, config_schema) VALUES
('whatsapp', 'WhatsApp Business', 'Atenda clientes via WhatsApp com respostas automáticas', '/icons/whatsapp.svg', 'messaging', 'api_key', '{
  "type": "object",
  "required": ["phoneNumberId", "accessToken"],
  "properties": {
    "phoneNumberId": { "type": "string", "title": "Phone Number ID" },
    "accessToken": { "type": "string", "title": "Access Token" },
    "webhookVerifyToken": { "type": "string", "title": "Webhook Verify Token" }
  }
}'),

('telegram', 'Telegram Bot', 'Crie um bot no Telegram para interagir com usuários', '/icons/telegram.svg', 'messaging', 'api_key', '{
  "type": "object",
  "required": ["botToken"],
  "properties": {
    "botToken": { "type": "string", "title": "Bot Token" }
  }
}'),

('slack', 'Slack Bot', 'Adicione seu agente como bot em workspaces Slack', '/icons/slack.svg', 'messaging', 'oauth', '{
  "type": "object",
  "required": ["botToken", "signingSecret"],
  "properties": {
    "botToken": { "type": "string", "title": "Bot Token" },
    "signingSecret": { "type": "string", "title": "Signing Secret" }
  }
}'),

('hubspot', 'HubSpot CRM', 'Integre com HubSpot para gerenciar leads e tickets', '/icons/hubspot.svg', 'crm', 'oauth', '{
  "type": "object",
  "required": ["apiKey"],
  "properties": {
    "apiKey": { "type": "string", "title": "API Key" },
    "portalId": { "type": "string", "title": "Portal ID" }
  }
}');
```

---

## 🎨 UI do Marketplace

### Página Principal

```typescript
// src/pages/IntegrationMarketplace.tsx
export function IntegrationMarketplace() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadIntegrations()
  }, [])

  const filteredIntegrations = integrations.filter(i => {
    const matchesCategory = filter === 'all' || i.category === filter
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold">Marketplace de Integrações</h1>
          <p className="text-muted-foreground mt-2">
            Conecte seu agente a +50 plataformas sem código
          </p>
        </div>

        {/* Filtros */}
        <div className="flex gap-4">
          <Input
            placeholder="Buscar integrações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="messaging">Mensageria</SelectItem>
              <SelectItem value="crm">CRM & Sales</SelectItem>
              <SelectItem value="ecommerce">E-commerce</SelectItem>
              <SelectItem value="support">Suporte</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid de Integrações */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredIntegrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onInstall={() => installIntegration(integration)}
            />
          ))}
        </div>
      </div>
    </Layout>
  )
}
```

### Card de Integração

```typescript
function IntegrationCard({ integration, onInstall }: Props) {
  const isInstalled = false // Check if already installed

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <img
            src={integration.icon_url}
            alt={integration.name}
            className="w-12 h-12 rounded-lg"
          />
          {integration.is_beta && (
            <Badge variant="secondary">Beta</Badge>
          )}
        </div>
        <CardTitle className="mt-4">{integration.name}</CardTitle>
        <CardDescription>{integration.description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Tag className="w-4 h-4" />
          <span className="capitalize">{integration.category}</span>
        </div>
        
        <Button
          className="w-full"
          onClick={onInstall}
          disabled={isInstalled}
        >
          {isInstalled ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Instalado
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Instalar
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
```

---

## 🔧 Modal de Configuração

```typescript
function IntegrationConfigModal({ integration, agentId, onClose, onSave }: Props) {
  const [config, setConfig] = useState<Record<string, any>>({})
  const [testing, setTesting] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    try {
      const result = await testIntegration(integration.slug, config)
      if (result.success) {
        toast.success('Conexão testada com sucesso!')
      } else {
        toast.error(result.error)
      }
    } finally {
      setTesting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar {integration.name}</DialogTitle>
          <DialogDescription>
            Preencha as credenciais para conectar esta integração
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Gerar campos dinamicamente baseado em config_schema */}
          {Object.entries(integration.config_schema.properties).map(([key, schema]) => (
            <div key={key}>
              <Label>{schema.title}</Label>
              <Input
                type={schema.format === 'password' ? 'password' : 'text'}
                value={config[key] || ''}
                onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                placeholder={schema.description}
              />
            </div>
          ))}

          {/* Link para tutorial */}
          {integration.setup_url && (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                <a
                  href={integration.setup_url}
                  target="_blank"
                  className="text-primary hover:underline"
                >
                  Ver tutorial de configuração →
                </a>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? 'Testando...' : 'Testar Conexão'}
          </Button>
          <Button onClick={() => onSave(config)}>
            Salvar e Ativar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 🧪 Testes

```typescript
// Testar conexão WhatsApp
async function testWhatsAppConnection(config: WhatsAppConfig): Promise<TestResult> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${config.phoneNumberId}`,
      {
        headers: { 'Authorization': `Bearer ${config.accessToken}` },
      }
    )
    
    if (response.ok) {
      return { success: true, message: 'Conexão válida!' }
    } else {
      return { success: false, error: 'Credenciais inválidas' }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

---

## 📊 Métricas

Rastrear no `analytics_events`:

```sql
INSERT INTO analytics_events (agent_id, event_type, metadata) VALUES
($1, 'integration_installed', '{"integration": "whatsapp"}'),
($1, 'integration_message_received', '{"integration": "telegram", "message_id": "123"}'),
($1, 'integration_error', '{"integration": "slack", "error": "auth_failed"}');
```

---

## ✅ Checklist Final

- [ ] Schema de banco criado
- [ ] Seed de 5+ integrações
- [ ] UI do marketplace
- [ ] Modal de configuração dinâmica
- [ ] Teste de conexão
- [ ] WhatsApp funcionando
- [ ] Telegram funcionando
- [ ] Logs de debug
- [ ] Documentação de cada integração
- [ ] Vídeos tutoriais

---

**Status**: 📝 Pronto para implementação  
**Próximo Doc**: `PLANO_MONETIZACAO.md`



