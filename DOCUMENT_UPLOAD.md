# 📄 Sistema de Upload e Vetorização de Documentos

## ✅ Status: Implementado

Sistema completo para upload, processamento e vetorização de documentos (PDF, DOCX, XLSX, TXT).

---

## 🎯 Funcionalidades

### Upload
- ✅ Drag & Drop moderno com animações
- ✅ Multi-upload (vários arquivos de uma vez)
- ✅ Suporte: PDF, DOCX, XLSX, TXT
- ✅ Limite de 10MB por arquivo
- ✅ Preview em tempo real do progresso
- ✅ Validação de tipos de arquivo

### Processamento
- ✅ Extração de texto automática por tipo
- ✅ Chunking inteligente (~500-1000 tokens)
- ✅ Vetorização com OpenAI Embeddings
- ✅ Armazenamento em Supabase pgvector
- ✅ Metadata completa (nome, tipo, tamanho, chunks)
- ✅ Retry automático em caso de falha

### Interface
- ✅ Dashboard de estatísticas (Total, Pendente, Processando, Concluído, Falhas)
- ✅ Lista de documentos com status visual
- ✅ Botão de retry para documentos falhados
- ✅ Exclusão de documentos e chunks
- ✅ Design moderno com Framer Motion

---

## 📦 Arquivos Criados

### Database
```
supabase/migrations/20240126000000_document_files.sql
```
- Storage bucket `knowledge-documents`
- Políticas RLS para upload/read/delete
- Colunas de metadata em `knowledge_documents`
- Índices de performance

### Backend
```
supabase/functions/process-document/index.ts
```
- Extração de texto (PDF, DOCX, XLSX, TXT)
- Chunking inteligente
- Vetorização com OpenAI
- Gerenciamento de erros

### Frontend
```
src/types/index.ts - Types atualizados
src/services/documentService.ts - API client
src/components/FileUpload.tsx - UI de upload
src/pages/KnowledgeBase.tsx - Página completa
```

---

## 🚀 Como Usar

### 1. Deploy da Edge Function

**Via Supabase CLI:**
```bash
cd supabase/functions/process-document
supabase functions deploy process-document
```

**Ou via Dashboard Supabase:**
1. Acesse: https://supabase.com/dashboard/project/bdhhqafyqyamcejkufxf/functions
2. Click "Deploy new function"
3. Nome: `process-document`
4. Cole o código de `supabase/functions/process-document/index.ts`
5. Deploy

### 2. Configurar Variáveis de Ambiente

No Supabase Dashboard → Functions → process-document → Settings:

```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxx
```

> ⚠️ **Importante**: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são injetadas automaticamente.

### 3. Fazer Upload de Documentos

1. Acesse o dashboard
2. Clique em "Base" de qualquer agente
3. Arraste arquivos ou clique para selecionar
4. Aguarde processamento (automático)
5. Documentos aparecem com status "Vetorizado"

---

## 🔄 Fluxo do Sistema

```
User Upload File
    ↓
Frontend: Upload to Storage
    ↓
Frontend: Create document record (status: pending)
    ↓
Frontend: Trigger Edge Function
    ↓
Edge Function: process-document
    ├─ Download file from Storage
    ├─ Extract text (PDF/DOCX/XLSX/TXT)
    ├─ Intelligent chunking (~750 words)
    ├─ For each chunk:
    │   ├─ Generate embedding (OpenAI)
    │   └─ Save to knowledge_documents
    └─ Update status to 'completed'
    ↓
Frontend: Display success
```

---

## 📊 Chunking Strategy

### Configuração Atual
- **Target Size**: 500-1000 tokens (~750 palavras)
- **Method**: Paragraph-based splitting
- **Metadata**: Chunk index, word count, file name

### Exemplo
```
Documento de 3000 palavras
    ↓
Chunk 1: 0-750 palavras (chunkIndex: 0)
Chunk 2: 751-1500 palavras (chunkIndex: 1)
Chunk 3: 1501-2250 palavras (chunkIndex: 2)
Chunk 4: 2251-3000 palavras (chunkIndex: 3)
    ↓
4 documentos em knowledge_documents
Todos com mesmo file_path
```

---

## 🎨 UI Components

### FileUpload Component

**Props:**
```typescript
interface FileUploadProps {
  knowledgeBaseId: string
  onUploadComplete?: () => void
}
```

**Features:**
- Drag & drop zone
- Progress indicators
- Status badges (Uploading, Processing, Completed, Failed)
- Auto-remove on success
- Error display

### KnowledgeBase Page

**Features:**
- Stats cards (Total, Pendente, Processando, Concluído, Falhas)
- File list com status visual
- Retry button para falhas
- Delete com confirmação
- Auto-refresh após uploads

---

## 📋 Schema do Banco

### knowledge_documents (columns adicionadas)

```sql
file_name          VARCHAR(255)    -- Nome original
file_type          VARCHAR(50)     -- MIME type
file_size          INTEGER         -- Tamanho em bytes
file_path          TEXT            -- Path no Storage
processing_status  VARCHAR(20)     -- pending | processing | completed | failed
error_message      TEXT            -- Mensagem de erro
chunks_count       INTEGER         -- Número de chunks gerados
```

### storage.objects (bucket: knowledge-documents)

```
Estrutura de paths:
{knowledge_base_id}/{timestamp}-{random}.{ext}

Exemplo:
abc123-456-def/1706234567890-a1b2c3.pdf
```

---

## 🔧 Processamento de Arquivos

### PDF
```typescript
import pdfParse from 'npm:pdf-parse'

const data = await pdfParse(buffer)
const text = data.text
```

### DOCX
```typescript
import mammoth from 'npm:mammoth'

const result = await mammoth.extractRawText({ buffer })
const text = result.value
```

### XLSX
```typescript
import * as XLSX from 'npm:xlsx'

const workbook = XLSX.read(buffer)
let text = ''
workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName]
  text += XLSX.utils.sheet_to_json(sheet)
})
```

### TXT
```typescript
const decoder = new TextDecoder()
const text = decoder.decode(buffer)
```

---

## 🧪 Testar o Sistema

### 1. Upload Manual

1. Navegue para `/agents/{agent-id}/knowledge`
2. Arraste um PDF de teste
3. Verifique progress bar
4. Aguarde status "Vetorizado"

### 2. Verificar no Banco

```sql
-- Ver documentos
SELECT 
  file_name, 
  processing_status, 
  chunks_count,
  file_size
FROM knowledge_documents
WHERE knowledge_base_id = 'your-kb-id'
ORDER BY created_at DESC;

-- Ver chunks de um arquivo
SELECT 
  id,
  content,
  metadata->>'chunkIndex' as chunk_index
FROM knowledge_documents
WHERE file_path = 'path/to/file.pdf'
ORDER BY (metadata->>'chunkIndex')::int;
```

### 3. Testar Busca Vetorial

Use o Chat do agente:
1. Faça upload de documentos
2. Aguarde vetorização completa
3. Abra o chat do agente
4. Faça perguntas sobre o conteúdo
5. A RAG buscará automaticamente nos documentos

---

## 🐛 Troubleshooting

### Arquivo não processa

**Verificar:**
1. Edge Function está deployed?
2. `OPENAI_API_KEY` está configurada?
3. Ver logs da Edge Function no Dashboard

**Solução:**
- Clique no botão de retry (⟳)
- Verifique logs: `supabase functions logs process-document`

### Upload falha

**Verificar:**
1. Arquivo é menor que 10MB?
2. Tipo de arquivo suportado (PDF, DOCX, XLSX, TXT)?
3. Storage bucket existe?

**Solução:**
- Verifique permissões RLS
- Tente arquivo menor
- Verifique console do browser

### Chunks não aparecem

**Verificar:**
1. Documento tem status "completed"?
2. `chunks_count` > 0?

**Solução:**
```sql
SELECT * FROM knowledge_documents 
WHERE file_path = 'seu/arquivo.pdf';
```

---

## 📈 Performance

### Tempos Estimados

| Arquivo | Tamanho | Tempo Processamento |
|---------|---------|---------------------|
| PDF (10p) | 500 KB | ~5-10s |
| DOCX (20p) | 200 KB | ~3-7s |
| XLSX (100 linhas) | 100 KB | ~2-5s |
| TXT (1000 linhas) | 50 KB | ~2-4s |

> ⚠️ Tempo varia com:
> - Número de chunks gerados
> - Latência OpenAI API
> - Complexidade do documento

### Otimizações

1. **Parallel Processing**: Chunks processados sequencialmente (evita rate limit)
2. **Caching**: Embeddings armazenados permanentemente
3. **Batch Upload**: Múltiplos arquivos processados em paralelo
4. **Auto-retry**: Falhas tentam novamente automaticamente

---

## 🔐 Segurança

### RLS Policies

**Upload**: Usuário só pode fazer upload em knowledge bases de seus agentes
**Read**: Usuário só pode ler documentos de seus agentes
**Delete**: Usuário só pode excluir seus documentos

### Validações

- ✅ Tipo MIME validado
- ✅ Tamanho máximo (10MB)
- ✅ Path sanitizado
- ✅ User authentication required

---

## 🎯 Próximos Passos

### Melhorias Sugeridas

1. **OCR para PDFs escaneados**
   - Usar Tesseract.js ou API externa
   - Extrair texto de imagens

2. **Preview de documentos**
   - Renderizar PDF no browser
   - Highlight de texto extraído

3. **Batch re-vectorization**
   - Reprocessar todos documentos
   - Atualizar embeddings com novo modelo

4. **Compression**
   - Compactar arquivos grandes
   - Reduzir custos de storage

5. **Analytics**
   - Tempo médio de processamento
   - Taxa de sucesso/falha
   - Documentos mais usados

6. **Webhook notifications**
   - Notificar quando processamento completo
   - Email ou push notification

---

## 📚 Referências

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [pdf-parse](https://www.npmjs.com/package/pdf-parse)
- [mammoth](https://www.npmjs.com/package/mammoth)
- [xlsx](https://www.npmjs.com/package/xlsx)
- [pgvector](https://github.com/pgvector/pgvector)

---

## 💡 Exemplos de Uso

### Upload Programático

```typescript
import { documentService } from '@/services/documentService'

// Upload file
const file = new File([blob], 'documento.pdf', { type: 'application/pdf' })
const { documentId } = await documentService.uploadDocument(file, knowledgeBaseId)

// Trigger processing
await documentService.processDocument(documentId, knowledgeBaseId)

// Check status
const docs = await documentService.getDocuments(knowledgeBaseId)
const doc = docs.find(d => d.id === documentId)
console.log(doc.processing_status) // 'completed'
```

### Retry Failed Documents

```typescript
const stats = await documentService.getProcessingStats(knowledgeBaseId)
if (stats.failed > 0) {
  const docs = await documentService.getDocuments(knowledgeBaseId)
  const failedDocs = docs.filter(d => d.processing_status === 'failed')
  
  for (const doc of failedDocs) {
    await documentService.retryProcessing(doc.id, knowledgeBaseId)
  }
}
```

---

**Status**: ✅ Pronto para produção  
**Versão**: 1.0.0  
**Data**: Janeiro 2025

