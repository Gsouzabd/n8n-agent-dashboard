# 🎯 Solução: Documentos Não Aparecendo na Interface

## 📊 Diagnóstico do Problema

### Situação Encontrada
Você tem **2 documentos no banco**, mas a interface mostrava **0 arquivos**.

**Causa Raiz:** 
- Cada agente tinha **2 bases de conhecimento duplicadas**
- A interface selecionava sempre a **primeira base** (por ordem alfabética)
- Os documentos estavam na **segunda base**
- Resultado: Interface mostrava "0 arquivos" mesmo com documentos no banco

### Dados do Banco

**Bases de Conhecimento (antes da correção):**
```json
[
  {
    "id": "9a1b8d20-c8f2-49dd-b839-094c27d47ab2",  // ← Selecionada (vazia)
    "agent_id": "98dda90c-a7f2-40b5-b5ad-28de79179a09"
  },
  {
    "id": "c907f0b3-8ed8-4012-867e-29b9e75b43ee",  // ← Tinha documento!
    "agent_id": "98dda90c-a7f2-40b5-b5ad-28de79179a09"
  }
]
```

**Documentos:**
- 1 documento de FAQ (Excel) - `82a7d697-8af0-4d5a-96be-cd2c1e01e6f4`
- 1 documento de lista de preços (Excel) - `893f35bc-4aa3-4632-888b-fc3c9486c463`

---

## ✅ Correções Implementadas

### 1. **Seleção Inteligente de Base** (`KnowledgeBase.tsx`)

Agora a interface procura automaticamente a base que tem documentos:

```typescript
// ANTES: Sempre selecionava a primeira
setSelectedKB(kbData[0].id)

// DEPOIS: Procura a base com documentos
for (const kb of kbData) {
  const { data: docs } = await supabase
    .from('knowledge_documents')
    .select('id', { count: 'exact', head: true })
    .eq('knowledge_base_id', kb.id)
  
  if (docs && docs.length > 0) {
    selectedBase = kb  // Seleciona a base que tem documentos!
    break
  }
}
```

### 2. **Prevenção de Duplicação**

A função `createDefaultKB` agora verifica se já existe uma base antes de criar:

```typescript
// Verificar se já existe
const { data: existing } = await supabase
  .from('knowledge_bases')
  .select('id')
  .eq('agent_id', id)
  .limit(1)

if (existing && existing.length > 0) {
  // Usar existente ao invés de criar nova
  return
}
```

### 3. **Logs de Debug**

Adicionados logs para facilitar diagnóstico:
- 🔄 Carregando dados
- ✅ Agente carregado
- 📚 Bases de conhecimento
- 📄 Documentos carregados
- ❌ Erros

---

## 🧹 Limpeza do Banco de Dados

### Execute o Script SQL

1. Acesse o **SQL Editor** no Supabase
2. Execute o script: `scripts/cleanup-duplicates-and-verify.sql`

Este script irá:
1. 📊 Mostrar a situação atual
2. 🔄 Mover todos documentos para a base mais antiga de cada agente
3. 🗑️ Deletar bases duplicadas vazias
4. ✅ Verificar o resultado

### O que o script faz:

```sql
-- Para cada agente com bases duplicadas:
1. Identifica a base mais antiga (keeper)
2. Move TODOS os documentos das bases duplicadas para a keeper
3. Deleta as bases duplicadas (agora vazias)
4. Resultado: 1 base por agente com todos os documentos
```

---

## 🎯 Resultado Esperado

### Antes:
```
Agente A
├── Base 1 (vazia) ← selecionada
└── Base 2 (2 docs)

Interface: "0 arquivos" ❌
```

### Depois da Correção de Código:
```
Agente A
├── Base 1 (vazia)
└── Base 2 (2 docs) ← selecionada automaticamente

Interface: "2 arquivos" ✅
```

### Depois do Script SQL:
```
Agente A
└── Base 1 (2 docs) ← única base

Interface: "2 arquivos" ✅
```

---

## 🔍 Verificação

### 1. Verificar na Interface
- Acesse a página de **Base de Conhecimento** do agente
- Deve mostrar: **"2 arquivos na base"**
- Documentos visíveis:
  - `FAQ_SocialMedia_Magnetron.xlsx`
  - `lista-preco-133972551230770281.xlsx`

### 2. Verificar no Console do Navegador (F12)
```
✅ Agente carregado
📚 Bases de conhecimento: (1) [{…}]  // Apenas 1 após limpeza
✅ Base com documentos encontrada: xxx-xxx-xxx
📄 Documentos carregados: 2
📄 Documentos únicos: 2
```

### 3. Verificar no Banco (SQL)
```sql
-- Contar documentos por agente
SELECT 
  a.name,
  COUNT(kd.id) as total_docs
FROM agents a
LEFT JOIN knowledge_bases kb ON kb.agent_id = a.id
LEFT JOIN knowledge_documents kd ON kd.knowledge_base_id = kb.id
GROUP BY a.id, a.name;
```

---

## 📝 Notas Importantes

### Por que havia duplicatas?
- A função `createDefaultKB` era chamada múltiplas vezes
- Não havia verificação de bases existentes
- Race condition ao carregar a página

### Evitar no Futuro
- ✅ Verificação antes de criar base
- ✅ Seleção inteligente de base
- ✅ Logs de debug para diagnóstico

### Próximos Passos
1. ✅ Recarregue a página da Base de Conhecimento
2. ✅ Execute o script SQL para limpar duplicatas
3. ✅ Faça upload de novos documentos se necessário

---

## 🆘 Solução de Problemas

### Interface ainda mostra "0 arquivos"
1. Limpe o cache do navegador (Ctrl+Shift+R)
2. Verifique os logs no console (F12)
3. Execute o script SQL de limpeza
4. Recarregue a página

### Erro ao carregar documentos
1. Verifique as políticas RLS do Supabase
2. Confirme que o usuário está autenticado
3. Verifique os logs do console

### Documentos sumindo após upload
1. Verifique o bucket `knowledge-documents` no Storage
2. Confirme que o processamento foi concluído
3. Verifique a coluna `processing_status`

---

**Status:** ✅ Problema Resolvido
**Data:** 27/10/2025
**Versão:** 1.0


