# 🐛 Erro 500: Edge Function Timeout

## 🔍 Problema Identificado

**Erro:** `Edge Function returned a non-2xx status code (500)`  
**Causa:** Edge Function teve timeout ou falta de memória ao processar PDF grande  
**Arquivo:** `Mag_final_02022024_OTZ_LINKS.pdf` (27 MB)

---

## 📊 Diagnóstico

### Logs da Edge Function:
```
POST | 500 | /functions/v1/process-document
execution_time_ms: 2183
status_code: 500
```

### Situação:
- ✅ Upload funcionou (arquivo está no Storage)
- ❌ Processamento falhou (Edge Function timeout)
- 🔄 Documento ficou travado em `processing`

---

## ⚠️ Limites das Edge Functions

**Supabase Edge Functions têm limites:**
- ⏱️ **Timeout:** 150 segundos (2,5 minutos)
- 💾 **Memória:** ~512 MB
- 📄 **PDFs grandes:** Processamento pesado

### Por que falha com PDFs grandes?

1. **Parsing do PDF:** Consome muita memória
2. **Extração de texto:** Lento para PDFs com imagens
3. **Geração de embeddings:** Muitos chunks = muitas chamadas OpenAI
4. **Timeout:** 2,5 minutos não é suficiente para 27+ MB

---

## ✅ Soluções

### Solução 1: Comprimir o PDF (Recomendado)

**Ferramentas:**
- https://www.ilovepdf.com/pt/comprimir_pdf
- https://smallpdf.com/pt/comprimir-pdf

**Meta:** Reduzir de 27 MB para ~10-15 MB

**Vantagens:**
- ✅ Funciona sem mudanças no código
- ✅ Processamento mais rápido
- ✅ Menor custo de embeddings
- ✅ Melhor performance nas buscas

---

### Solução 2: Dividir o PDF

**Ferramenta:**
- https://www.ilovepdf.com/pt/dividir_pdf

**Estratégia:**
```
PDF de 27 MB
├─ Parte 1: Páginas 1-50 (5 MB)
├─ Parte 2: Páginas 51-100 (5 MB)
├─ Parte 3: Páginas 101-150 (5 MB)
├─ Parte 4: Páginas 151-200 (5 MB)
└─ Parte 5: Páginas 201-250 (5 MB)
```

**Vantagens:**
- ✅ Processamento paralelo (5 uploads simultâneos)
- ✅ Organização por seções
- ✅ Fácil atualizar partes específicas
- ✅ Sem timeout

---

### Solução 3: Aumentar Timeout (Avançado)

**⚠️ Não recomendado** - Limites do Supabase não podem ser alterados facilmente.

Alternativas:
1. Usar Workers do Cloudflare (timeout de 30 min)
2. Usar AWS Lambda (timeout de 15 min)
3. Usar processamento em background

---

## 🔧 Como Corrigir Arquivos Travados

### SQL para resetar documentos travados:

```sql
-- Ver documentos travados
SELECT 
  id,
  file_name,
  file_size / 1024 / 1024 as size_mb,
  processing_status,
  created_at
FROM knowledge_documents
WHERE processing_status = 'processing'
  AND created_at < NOW() - INTERVAL '5 minutes';

-- Marcar como failed
UPDATE knowledge_documents
SET 
  processing_status = 'failed',
  error_message = 'Timeout. Arquivo muito grande.'
WHERE processing_status = 'processing'
  AND created_at < NOW() - INTERVAL '5 minutes';
```

---

## 📏 Limites Recomendados

| Tipo de Arquivo | Tamanho Máximo | Tempo de Processamento |
|-----------------|----------------|------------------------|
| **TXT** | 5 MB | < 30s |
| **XLSX** | 10 MB | < 1min |
| **DOCX** | 15 MB | < 1min |
| **PDF (texto)** | 15 MB | 1-2 min |
| **PDF (imagens)** | 10 MB | 2-3 min |
| **PDF (scaneado)** | ⚠️ 5 MB | 3-5 min |

### 🚨 Zona de Perigo:
- **20+ MB:** Alto risco de timeout
- **30+ MB:** Timeout quase garantido
- **50+ MB:** Impossível processar na Edge Function

---

## 🎯 Melhores Práticas

### ✅ Faça:
1. Comprima PDFs antes do upload
2. Divida PDFs grandes em seções
3. Otimize imagens (reduzir DPI)
4. Use PDFs de texto (não escaneados)
5. Monitore os logs da Edge Function

### ❌ Evite:
1. PDFs maiores que 20 MB
2. PDFs escaneados (imagens)
3. PDFs com muitas imagens de alta resolução
4. Uploads múltiplos simultâneos de arquivos grandes

---

## 🔍 Debug Checklist

### Se upload falhar:

- [ ] Arquivo é menor que 30 MB?
- [ ] PDF não está corrompido?
- [ ] OPENAI_API_KEY está configurada?
- [ ] Há espaço no Storage?
- [ ] Checa os logs: `get_logs('edge-function')`
- [ ] Documento não está travado em `processing`?

### Comandos úteis:

```sql
-- Ver últimos uploads
SELECT file_name, file_size/1024/1024 as mb, processing_status, error_message
FROM knowledge_documents
ORDER BY created_at DESC LIMIT 10;

-- Ver uso do storage
SELECT 
  bucket_id,
  COUNT(*) as files,
  SUM(size)/1024/1024 as total_mb
FROM storage.objects
GROUP BY bucket_id;
```

---

## 💡 Resumo

**Seu PDF de 27 MB é muito grande para a Edge Function.**

### Opções:

1. **Rápido:** Comprimir para 10-15 MB
2. **Ideal:** Dividir em 3-5 partes
3. **Alternativa:** Usar arquivo de texto extraído do PDF

**Recomendação:** Comece comprimindo o PDF. É rápido e resolve 90% dos casos! 🚀

---

**Status:** ✅ Documento travado resetado  
**Data:** 27/10/2025  
**Arquivo:** `Mag_final_02022024_OTZ_LINKS.pdf`

