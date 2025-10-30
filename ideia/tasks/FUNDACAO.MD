### 🏗️ Fase 1: Fundação White-Label (4 semanas)

#### 1.1 Sistema de Temas Customizáveis ⭐⭐⭐

**Objetivo**: Permitir customização completa da identidade visual.

**Recursos:**
- ✅ Color picker para 8+ cores (primária, secundária, sucesso, erro, etc)
- ✅ Upload de logo (horizontal, vertical, favicon)
- ✅ Seleção de fontes do Google Fonts
- ✅ Border radius customizável (0-32px)
- ✅ Light/Dark mode toggle
- ✅ Preview em tempo real
- ✅ Export/Import de temas (JSON)
- ✅ Custom CSS para ajustes avançados

**Schema SQL:**
```sql
CREATE TABLE theme_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  organization_id UUID REFERENCES organizations(id),
  
  -- Branding
  brand_name TEXT DEFAULT 'AI Dashboard',
  logo_url TEXT,
  favicon_url TEXT,
  
  -- Colors
  primary_color VARCHAR(7) DEFAULT '#F07D00',
  secondary_color VARCHAR(7) DEFAULT '#000000',
  success_color VARCHAR(7) DEFAULT '#10B981',
  error_color VARCHAR(7) DEFAULT '#EF4444',
  
  -- Typography
  font_family TEXT DEFAULT 'Inter',
  font_size_base INTEGER DEFAULT 16,
  
  -- Layout
  theme_mode VARCHAR(10) DEFAULT 'dark',
  border_radius INTEGER DEFAULT 12,
  custom_css TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Complexidade:** Média | **Tempo:** 1-2 semanas

---

#### 1.2 Multi-Tenancy (Organizações) ⭐⭐⭐

**Objetivo**: Permitir que múltiplos usuários colaborem em organizações.

**Recursos:**
- ✅ Criar/gerenciar organizações
- ✅ Convidar membros via email com token único
- ✅ 4 níveis de permissão: Owner, Admin, Member, Viewer
- ✅ Compartilhar agentes dentro da organização
- ✅ Audit log de todas as ações
- ✅ Billing por organização

**Roles & Permissões:**

| Ação | Owner | Admin | Member | Viewer |
|------|-------|-------|--------|--------|
| Criar agentes | ✅ | ✅ | ✅ | ❌ |
| Editar agentes | ✅ | ✅ | ✅ | ❌ |
| Deletar agentes | ✅ | ✅ | ❌ | ❌ |
| Convidar membros | ✅ | ✅ | ❌ | ❌ |
| Gerenciar billing | ✅ | ❌ | ❌ | ❌ |
| Ver analytics | ✅ | ✅ | ✅ | ✅ |

**Schema SQL:**
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  plan_type VARCHAR(20) DEFAULT 'free',
  max_agents INTEGER DEFAULT 3,
  max_members INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  status VARCHAR(20) DEFAULT 'active',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Complexidade:** Alta | **Tempo:** 2-3 semanas

---


#### 1.4 Base de Conhecimento com Prompt Engineering ⭐⭐⭐

**Objetivo**: Melhorar qualidade das respostas através de metadados contextuais.

**Funcionalidade:**
Ao fazer upload de documentos, exibir dialog solicitando informações para prompt engineering:

**Dialog de Upload:**
```
┌─────────────────────────────────────────────┐
│ 📄 Upload de Documento para Base de        │
│    Conhecimento                             │
├─────────────────────────────────────────────┤
│                                             │
│ Arquivo: contrato-servicos.pdf             │
│                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                             │
│ 🎯 O que há neste documento?               │
│ ┌─────────────────────────────────────┐   │
│ │ Contrato de prestação de serviços   │   │
│ │ com cláusulas de pagamento e SLA    │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ 📋 Quando usar este documento?             │
│ ┌─────────────────────────────────────┐   │
│ │ Quando cliente perguntar sobre      │   │
│ │ valores, prazos, garantias ou SLA   │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ 🔧 Como usar este documento?               │
│ ┌─────────────────────────────────────┐   │
│ │ Extrair informação específica e     │   │
│ │ citar cláusula exata do contrato    │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ 💬 Exemplos de diálogo: (repeater field)                    │
│ ┌─────────────────────────────────────┐   │
│ │ User: "Qual o prazo de entrega?"    │   │
│ │ AI: "Conforme cláusula 3.2..."     │   │
│ │                                     │   │
│ │ User: "Tem garantia?"               │   │
│ │ AI: "Sim, conforme cláusula 5.1..." │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ 🏷️ Tags (separadas por vírgula):          │
│ ┌─────────────────────────────────────┐   │
│ │ contrato, pagamento, SLA, garantia  │   │
│ └─────────────────────────────────────┘   │
│                                             │
│    [Cancelar]  [Processar Documento] ✅   │
└─────────────────────────────────────────────┘
```

**Recursos:**
- ✅ Dialog modal ao upload
- ✅ 5 campos de contexto (o que, quando, como, exemplos, tags)
- ✅ Validação mínima (20 caracteres por campo)
- ✅ Sugestões automáticas via IA (opcional)
- ✅ Preview do document embedding com contexto
- ✅ Edição posterior dos metadados

**Schema SQL:**
```sql
-- Adicionar colunas à tabela knowledge_documents
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS
  document_description TEXT, -- O que há no documento
  usage_context TEXT,         -- Quando usar
  usage_instructions TEXT,    -- Como usar
  dialogue_examples JSONB DEFAULT '[]', -- Array de exemplos
  tags TEXT[] DEFAULT '{}',   -- Array de tags
  prompt_metadata JSONB DEFAULT '{}'; -- Metadados extras

-- Índices para busca
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_metadata ON knowledge_documents USING GIN(prompt_metadata);
```

**Impacto no RAG:**
```typescript
// Ao buscar documentos relevantes, incluir contexto no prompt
const relevantDocs = await searchKnowledge(query);
const contextualPrompt = `
Contexto dos documentos:
${relevantDocs.map(doc => `
- Documento: ${doc.file_name}
- Descrição: ${doc.document_description}
- Quando usar: ${doc.usage_context}
- Como usar: ${doc.usage_instructions}
- Exemplos de diálogo:
${JSON.parse(doc.dialogue_examples).map(ex => `  User: "${ex.user}"\n  AI: "${ex.ai}"`).join('\n')}
`).join('\n')}

Pergunta do usuário: ${query}
`;
```

**Complexidade:** Média | **Tempo:** 1 semana

---

#### 1.5 Base de Conhecimento via URL (Web Scraper) ⭐⭐⭐

**Objetivo**: Processar conteúdo de sites automaticamente para base de conhecimento.

**Funcionalidade:**
- ✅ Input para adicionar URL
- ✅ Microsserviço scraper (Edge Function)
- ✅ Extração inteligente de conteúdo (remove menu, sidebar, footer)
- ✅ Processamento e vetorização automática
- ✅ Loading visual durante processamento
- ✅ Re-crawl automático (atualização periódica)

**UI de Upload por URL:**
```
┌─────────────────────────────────────────────┐
│ 🌐 Adicionar URL à Base de Conhecimento    │
├─────────────────────────────────────────────┤
│                                             │
│ URL do site:                                │
│ ┌─────────────────────────────────────┐   │
│ │ https://docs.example.com/api        │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ ⚙️ Opções:                                 │
│ □ Crawl subpáginas (até 3 níveis)         │
│ □ Atualização automática (semanal)        │
│                                             │
│ 🎯 Contexto (opcional):                    │
│ ┌─────────────────────────────────────┐   │
│ │ Documentação da API REST            │   │
│ └─────────────────────────────────────┘   │
│                                             │
│    [Cancelar]  [Processar URL] 🚀         │
└─────────────────────────────────────────────┘

⏳ Processando URL...
━━━━━━━━━━━━━━━━━━━━━━━ 45%

✓ Página carregada (2.3s)
✓ Conteúdo extraído (1.547 palavras)
⏳ Vetorizando chunks (12/25)
```

**Schema SQL:**
```sql
CREATE TABLE knowledge_urls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  crawl_depth INTEGER DEFAULT 1,
  auto_refresh BOOLEAN DEFAULT false,
  refresh_frequency VARCHAR(20) DEFAULT 'weekly', -- daily, weekly, monthly
  
  -- Status do processamento
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  last_crawled_at TIMESTAMP WITH TIME ZONE,
  next_crawl_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadados extraídos
  page_title TEXT,
  word_count INTEGER,
  chunks_generated INTEGER,
  content_hash VARCHAR(64), -- Para detectar mudanças
  
  -- Contexto
  document_description TEXT,
  tags TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_knowledge_urls_agent ON knowledge_urls(agent_id);
CREATE INDEX idx_knowledge_urls_next_crawl ON knowledge_urls(next_crawl_at) WHERE auto_refresh = true;
```

**Microsserviço Scraper (Edge Function):**
```typescript
// supabase/functions/web-scraper/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12';

serve(async (req) => {
  const { url, agentId } = await req.json();
  
  try {
    // 1. Fetch URL
    const response = await fetch(url);
    const html = await response.text();
    
    // 2. Parse com Cheerio
    const $ = cheerio.load(html);
    
    // 3. Remove elementos indesejados
    $('nav, header, footer, aside, .sidebar, .menu, script, style, iframe').remove();
    
    // 4. Extrai conteúdo principal (heurísticas)
    const mainContent = $('main, article, .content, #content, .post-content').first();
    const text = mainContent.length > 0 
      ? mainContent.text() 
      : $('body').text();
    
    // 5. Limpa texto
    const cleanText = text
      .replace(/\s+/g, ' ')
      .trim();
    
    // 6. Extrai metadados
    const title = $('title').text() || $('h1').first().text();
    const wordCount = cleanText.split(' ').length;
    
    // 7. Chunking (500 palavras por chunk, overlap 50)
    const chunks = chunkText(cleanText, 500, 50);
    
    // 8. Gera embeddings
    const embeddings = await generateEmbeddings(chunks);
    
    // 9. Salva no banco
    for (let i = 0; i < chunks.length; i++) {
      await supabase.from('knowledge_documents').insert({
        agent_id: agentId,
        file_name: `${title} (chunk ${i+1})`,
        content: chunks[i],
        embedding: embeddings[i],
        source_url: url,
        source_type: 'url',
        metadata: {
          title,
          chunk_index: i,
          total_chunks: chunks.length
        }
      });
    }
    
    // 10. Atualiza status
    await supabase.from('knowledge_urls').update({
      status: 'completed',
      last_crawled_at: new Date().toISOString(),
      page_title: title,
      word_count: wordCount,
      chunks_generated: chunks.length,
      content_hash: hashContent(cleanText)
    }).eq('url', url);
    
    return new Response(JSON.stringify({
      success: true,
      chunks: chunks.length,
      wordCount
    }), { headers: { 'Content-Type': 'application/json' } });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { status: 500 });
  }
});
```

**Cron Job para Auto-Refresh:**
```sql
-- Trigger diário para verificar URLs que precisam atualização
SELECT cron.schedule(
  'refresh-knowledge-urls',
  '0 2 * * *', -- 2h da manhã todo dia
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/web-scraper-refresh',
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) FROM knowledge_urls 
  WHERE auto_refresh = true 
    AND next_crawl_at <= NOW();
  $$
);
```

**Complexidade:** Alta | **Tempo:** 2 semanas

---

#### 1.6 Widget/Iframe Incorporável ⭐⭐⭐

**Objetivo**: Permitir incorporar agentes em sites externos via iframe ou snippet JS.

**Funcionalidades:**
- ✅ Gerador de código embed
- ✅ Iframe responsivo
- ✅ Widget customizável (cores, posição, tamanho)
- ✅ Bubble chat (minimizável)
- ✅ Full-page embed
- ✅ CORS configurável
- ✅ Analytics de origem

**UI de Geração de Widget:**
```
┌─────────────────────────────────────────────┐
│ 🔌 Widget / Embed do Agente                 │
├─────────────────────────────────────────────┤
│                                             │
│ Agente: Suporte Técnico v2                 │
│                                             │
│ 🎨 Estilo do Widget:                        │
│ ⦿ Bubble Chat (canto inferior direito)     │
│ ○ Full Chat (largura total)                │
│ ○ Inline (incorporado na página)           │
│                                             │
│ Cor principal: [#FF6B00] 🎨                 │
│ Posição: ▾ Bottom Right                    │
│ Tamanho: ▾ Medium (400x600px)              │
│                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                             │
│ 📋 Código para incorporar:                 │
│                                             │
│ HTML (Iframe):                              │
│ ┌─────────────────────────────────────┐   │
│ │ <iframe                             │   │
│ │   src="https://app.venturize.ai/    │   │
│ │        widget/abc123"               │   │
│ │   width="400" height="600"          │   │
│ │   frameborder="0"                   │   │
│ │   allow="clipboard-write"           │   │
│ │ ></iframe>                          │   │
│ └─────────────────────────────────────┘   │
│                          [Copiar] 📋       │
│                                             │
│ JavaScript (Widget):                        │
│ ┌─────────────────────────────────────┐   │
│ │ <script>                            │   │
│ │ (function(){                        │   │
│ │   var s=document.createElement(     │   │
│ │     'script');                      │   │
│ │   s.src='https://app.venturize.ai/  │   │
│ │          widget.js?id=abc123';      │   │
│ │   document.body.appendChild(s);     │   │
│ │ })();                               │   │
│ │ </script>                           │   │
│ └─────────────────────────────────────┘   │
│                          [Copiar] 📋       │
│                                             │
│ 👁️ Preview:                                │
│ ┌─────────────────────────────────────┐   │
│ │                                     │   │
│ │  [Preview do widget ao vivo aqui]  │   │
│ │                                     │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ ⚙️ Configurações Avançadas:                │
│ ☑️ Permitir iframe em qualquer domínio     │
│ ☑️ Registrar origem das conversas          │
│ □ Modo somente-leitura (demo)             │
│                                             │
│ 🌐 Domínios Autorizados:                   │
│ • example.com                              │
│ • app.example.com                          │
│ + Adicionar domínio                        │
│                                             │
└─────────────────────────────────────────────┘
```

**Schema SQL:**
```sql
CREATE TABLE agent_widgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  widget_id VARCHAR(50) UNIQUE NOT NULL, -- ID público (abc123)
  
  -- Configurações visuais
  widget_type VARCHAR(20) DEFAULT 'bubble', -- bubble, full, inline
  primary_color VARCHAR(7) DEFAULT '#FF6B00',
  position VARCHAR(20) DEFAULT 'bottom-right',
  width INTEGER DEFAULT 400,
  height INTEGER DEFAULT 600,
  
  -- Segurança
  allowed_domains TEXT[] DEFAULT '{}', -- Whitelist de domínios
  allow_all_domains BOOLEAN DEFAULT false,
  require_auth BOOLEAN DEFAULT false,
  
  -- Analytics
  total_impressions INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE widget_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  widget_id UUID REFERENCES agent_widgets(id),
  referrer_url TEXT,
  referrer_domain TEXT,
  user_agent TEXT,
  conversation_id UUID,
  event_type VARCHAR(20), -- impression, open, close, message
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_widget_analytics_widget ON widget_analytics(widget_id);
CREATE INDEX idx_widget_analytics_domain ON widget_analytics(referrer_domain);
```

**Widget JavaScript (Public):**
```javascript
// public/widget.js
(function() {
  const widgetId = new URLSearchParams(window.currentScript.src.split('?')[1]).get('id');
  
  // Criar container do widget
  const container = document.createElement('div');
  container.id = 'venturize-widget';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
  `;
  
  // Criar bubble button
  const bubble = document.createElement('div');
  bubble.style.cssText = `
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #FF6B00, #FF8C00);
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(255, 107, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.3s;
  `;
  bubble.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
    </svg>
  `;
  
  // Criar iframe
  const iframe = document.createElement('iframe');
  iframe.src = `https://app.venturize.ai/widget/${widgetId}`;
  iframe.style.cssText = `
    width: 400px;
    height: 600px;
    border: none;
    border-radius: 16px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.3);
    display: none;
    position: absolute;
    bottom: 80px;
    right: 0;
  `;
  
  // Toggle chat
  let isOpen = false;
  bubble.addEventListener('click', () => {
    isOpen = !isOpen;
    iframe.style.display = isOpen ? 'block' : 'none';
    bubble.style.transform = isOpen ? 'scale(0.9)' : 'scale(1)';
    
    // Analytics
    if (isOpen) {
      fetch(`https://app.venturize.ai/api/widget-analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetId,
          eventType: 'open',
          referrer: window.location.href
        })
      });
    }
  });
  
  container.appendChild(bubble);
  container.appendChild(iframe);
  document.body.appendChild(container);
  
  // Impression tracking
  fetch(`https://app.venturize.ai/api/widget-analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      widgetId,
      eventType: 'impression',
      referrer: window.location.href
    })
  });
})();
```

**Complexidade:** Média | **Tempo:** 1-2 semanas

---

#### 1.7 Sistema de Feedback e Aprendizado Contínuo ⭐⭐⭐

**Objetivo**: Melhorar respostas através de feedback dos usuários e aprendizado supervisionado.

**Funcionalidades:**
- ✅ Feedback positivo/negativo em cada resposta
- ✅ Input de correção/melhoria (30 palavras por bloco)
- ✅ Divisão de respostas em blocos para feedback granular
- ✅ Fine-tuning dataset generation
- ✅ A/B testing de respostas melhoradas
- ✅ Dashboard de qualidade das respostas

**UI no Chat:**
```
┌─────────────────────────────────────────────┐
│ 💬 Chat com Agente de Suporte              │
├─────────────────────────────────────────────┤
│                                             │
│ 👤 User:                                    │
│ Como faço para cancelar minha assinatura?  │
│                                             │
│ 🤖 AI:                                      │
│ ┌─────────────────────────────────────┐   │
│ │ Para cancelar sua assinatura, siga │   │
│ │ estes passos:                       │   │
│ │                                     │   │
│ │ 1. Acesse Configurações > Billing   │   │
│ │ 2. Clique em "Gerenciar Assinatura"│   │
│ │ 3. Selecione "Cancelar"             │   │
│ │                                     │   │
│ │ [Bloco 1/2]                         │   │
│ │ 👍 12  👎 1  ✏️ Melhorar             │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ ┌─────────────────────────────────────┐   │
│ │ Importante: O cancelamento terá    │   │
│ │ efeito no final do período atual.   │   │
│ │ Você continuará tendo acesso até    │   │
│ │ então.                              │   │
│ │                                     │   │
│ │ [Bloco 2/2]                         │   │
│ │ 👍 15  👎 0  ✏️ Melhorar             │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ 📊 Resposta geral: 👍 27  👎 1  (96%)     │
│                                             │
└─────────────────────────────────────────────┘

// Ao clicar em "Melhorar":
┌─────────────────────────────────────────────┐
│ ✏️ Melhorar esta resposta                   │
├─────────────────────────────────────────────┤
│                                             │
│ Bloco original:                             │
│ ┌─────────────────────────────────────┐   │
│ │ Para cancelar sua assinatura, siga │   │
│ │ estes passos:                       │   │
│ │ 1. Acesse Configurações > Billing   │   │
│ │ 2. Clique em "Gerenciar Assinatura"│   │
│ │ 3. Selecione "Cancelar"             │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ ❓ O que está errado ou pode melhorar?     │
│ ○ Informação incorreta                     │
│ ○ Informação incompleta                    │
│ ● Tom inadequado                            │
│ ○ Formatação ruim                          │
│ ○ Outro                                    │
│                                             │
│ 💡 Sugestão de melhoria (máx 30 palavras): │
│ ┌─────────────────────────────────────┐   │
│ │ Adicionar link direto para página   │   │
│ │ de billing e mencionar que não há   │   │
│ │ taxa de cancelamento.                │   │
│ │                                     │   │
│ │ (27/30 palavras)                    │   │
│ └─────────────────────────────────────┘   │
│                                             │
│    [Cancelar]  [Enviar Feedback] ✅        │
└─────────────────────────────────────────────┘
```

**Schema SQL:**
```sql
CREATE TABLE message_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES chat_sessions(id),
  agent_id UUID REFERENCES agents(id),
  
  -- Feedback geral
  feedback_type VARCHAR(10) NOT NULL, -- positive, negative
  
  -- Bloco específico (se resposta dividida)
  block_index INTEGER, -- null = feedback geral
  block_content TEXT,
  
  -- Detalhes do problema
  issue_category VARCHAR(30), -- incorrect, incomplete, tone, formatting, other
  
  -- Sugestão de melhoria
  improvement_suggestion TEXT, -- máx 30 palavras por bloco
  
  -- Metadata
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE response_improvements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id),
  original_response TEXT NOT NULL,
  improved_response TEXT NOT NULL,
  
  -- Tracking de origem
  based_on_feedback_count INTEGER DEFAULT 1,
  improvement_sources UUID[] DEFAULT '{}', -- IDs dos feedbacks que geraram isso
  
  -- A/B Testing
  status VARCHAR(20) DEFAULT 'testing', -- testing, approved, rejected
  test_group VARCHAR(10) DEFAULT 'B', -- A = original, B = improved
  
  -- Métricas de A/B test
  impressions_a INTEGER DEFAULT 0,
  impressions_b INTEGER DEFAULT 0,
  positive_feedback_a INTEGER DEFAULT 0,
  positive_feedback_b INTEGER DEFAULT 0,
  negative_feedback_a INTEGER DEFAULT 0,
  negative_feedback_b INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE response_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  block_index INTEGER NOT NULL,
  block_content TEXT NOT NULL,
  word_count INTEGER,
  
  -- Feedback agregado
  positive_count INTEGER DEFAULT 0,
  negative_count INTEGER DEFAULT 0,
  improvement_suggestions JSONB DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_message_feedback_message ON message_feedback(message_id);
CREATE INDEX idx_message_feedback_agent ON message_feedback(agent_id);
CREATE INDEX idx_response_improvements_agent ON response_improvements(agent_id);
CREATE INDEX idx_response_blocks_message ON response_blocks(message_id);
```

**Componente React de Feedback:**
```typescript
// src/components/MessageFeedback.tsx
interface MessageFeedbackProps {
  messageId: string;
  blocks: Array<{ index: number; content: string }>;
}

export function MessageFeedback({ messageId, blocks }: MessageFeedbackProps) {
  const [blockFeedback, setBlockFeedback] = useState<Record<number, 'positive' | 'negative'>>({});
  const [improvementModal, setImprovementModal] = useState<{
    open: boolean;
    blockIndex: number;
    blockContent: string;
  } | null>(null);
  
  const handleFeedback = async (blockIndex: number, type: 'positive' | 'negative') => {
    setBlockFeedback(prev => ({ ...prev, [blockIndex]: type }));
    
    await supabase.from('message_feedback').insert({
      message_id: messageId,
      block_index: blockIndex,
      block_content: blocks[blockIndex].content,
      feedback_type: type
    });
    
    // Incrementar contador
    await supabase.rpc('increment_block_feedback', {
      p_message_id: messageId,
      p_block_index: blockIndex,
      p_feedback_type: type
    });
  };
  
  const handleImprovement = async (data: {
    blockIndex: number;
    issueCategory: string;
    suggestion: string;
  }) => {
    await supabase.from('message_feedback').insert({
      message_id: messageId,
      block_index: data.blockIndex,
      block_content: blocks[data.blockIndex].content,
      feedback_type: 'negative',
      issue_category: data.issueCategory,
      improvement_suggestion: data.suggestion
    });
    
    setImprovementModal(null);
    toast.success('Obrigado pelo feedback! Usaremos para melhorar.');
  };
  
  return (
    <div className="message-feedback">
      {blocks.map((block, index) => (
        <div key={index} className="response-block">
          <div className="block-content">{block.content}</div>
          
          <div className="block-actions">
            <span className="block-label">Bloco {index + 1}/{blocks.length}</span>
            
            <button
              onClick={() => handleFeedback(index, 'positive')}
              className={blockFeedback[index] === 'positive' ? 'active' : ''}
            >
              👍 {block.positiveCount || 0}
            </button>
            
            <button
              onClick={() => handleFeedback(index, 'negative')}
              className={blockFeedback[index] === 'negative' ? 'active' : ''}
            >
              👎 {block.negativeCount || 0}
            </button>
            
            <button
              onClick={() => setImprovementModal({
                open: true,
                blockIndex: index,
                blockContent: block.content
              })}
            >
              ✏️ Melhorar
            </button>
          </div>
        </div>
      ))}
      
      {improvementModal && (
        <ImprovementModal
          {...improvementModal}
          onClose={() => setImprovementModal(null)}
          onSubmit={handleImprovement}
        />
      )}
    </div>
  );
}
```

**Fine-tuning Dataset Generation:**
```typescript
// Gerar dataset de fine-tuning a partir dos feedbacks
async function generateFineTuningDataset(agentId: string) {
  const feedbacks = await supabase
    .from('message_feedback')
    .select('*')
    .eq('agent_id', agentId)
    .eq('feedback_type', 'negative')
    .not('improvement_suggestion', 'is', null);
  
  const dataset = feedbacks.map(fb => ({
    prompt: `User question: ${fb.original_query}\n\nOriginal response:\n${fb.block_content}\n\nImprovement needed: ${fb.issue_category}\n\nSuggested improvement: ${fb.improvement_suggestion}\n\nProvide improved response:`,
    completion: fb.improvement_suggestion
  }));
  
  // Exportar para JSONL (formato OpenAI)
  const jsonl = dataset.map(d => JSON.stringify(d)).join('\n');
  
  return jsonl;
}
```

**Dashboard de Qualidade:**
```typescript
// Métricas de qualidade por agente
const qualityMetrics = await supabase.rpc('get_agent_quality_metrics', {
  p_agent_id: agentId
});

// Retorna:
// {
//   total_responses: 1247,
//   total_feedback: 823,
//   positive_rate: 0.89,
//   negative_rate: 0.11,
//   top_issues: [
//     { category: 'incomplete', count: 45 },
//     { category: 'tone', count: 32 }
//   ],
//   improvement_suggestions: 91,
//   blocks_with_issues: [
//     { block_content: "...", negative_count: 12 }
//   ]
// }
```

**Complexidade:** Alta | **Tempo:** 2-3 semanas

---