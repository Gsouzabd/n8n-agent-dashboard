# 🚀 Guia Rápido - Upload de Documentos

## ⚡ Setup em 3 Passos

### 1. Configurar OpenAI API Key

No Supabase Dashboard:
```
https://supabase.com/dashboard/project/bdhhqafyqyamcejkufxf/settings/functions
```

Adicione a variável:
```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxx
```

### 2. Testar Upload

1. Acesse: http://localhost:5173 (ou seu ambiente)
2. Login com `admin@paprica.ag` / `teste@123`
3. Clique em "Base" de qualquer agente
4. Arraste um PDF, DOCX ou XLSX
5. Aguarde o processamento automático

### 3. Verificar Resultados

```sql
-- Ver documentos processados
SELECT 
  file_name,
  processing_status,
  chunks_count,
  created_at
FROM knowledge_documents
ORDER BY created_at DESC
LIMIT 10;
```

---

## ✅ O que foi implementado

### Database
- ✅ Storage bucket `knowledge-documents` criado
- ✅ RLS policies configuradas
- ✅ Metadata columns adicionadas

### Edge Function
- ✅ `process-document` deployed com sucesso
- ✅ Suporte: PDF, DOCX, XLSX, TXT
- ✅ Chunking inteligente (~750 palavras)
- ✅ Vetorização com OpenAI

### Frontend
- ✅ FileUpload component com drag & drop
- ✅ Dashboard de estatísticas
- ✅ Lista de documentos com status
- ✅ Retry automático em falhas

---

## 📂 Arquivos de Teste

Use os arquivos em:
```
C:\Users\Gabriel Souza\Downloads\arquivos para treinamento magnetron (1)\
```

Arraste qualquer arquivo PDF, DOCX ou XLSX na interface!

---

## 🎯 Próximo Passo

**Testar o Chat RAG completo:**

1. Upload alguns documentos
2. Aguarde status "Vetorizado"
3. Abra o Chat do agente
4. Faça perguntas sobre o conteúdo
5. O sistema buscará automaticamente nos documentos!

---

**Status**: ✅ Edge Function deployed  
**Function ID**: `process-document`  
**Version**: 1  
**URL**: `https://bdhhqafyqyamcejkufxf.supabase.co/functions/v1/process-document`

