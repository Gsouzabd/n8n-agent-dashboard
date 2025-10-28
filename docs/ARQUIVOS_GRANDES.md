# 📦 Como Vetorizar Arquivos Grandes (50+ MB)

## 🎯 Cenário

Você tem um PDF de **56,3 MB** e precisa vetorizá-lo para usar com seu agente de IA.

---

## 🔧 Solução 1: Aumentar o Limite (Recomendado)

### Passo 1: Aumentar Limite do Storage

Execute no **SQL Editor do Supabase**:

```sql
-- Aumentar para 100MB
UPDATE storage.buckets
SET file_size_limit = 104857600
WHERE id = 'knowledge-documents';
```

📁 Ou use o arquivo: `supabase/migrations/20250127000000_increase_file_limit.sql`

### Passo 2: Atualizar a Interface

O componente `FileUpload` já mostra o erro se exceder o limite. Após aumentar no banco, ele aceitará automaticamente.

### Passo 3: Fazer Upload

1. Acesse a **Base de Conhecimento** do agente
2. Faça upload do PDF de 56 MB
3. Aguarde o processamento (pode levar alguns minutos)

### ⚠️ Considerações

- **Tempo de processamento:** ~5-15 minutos para 56 MB
- **Chunks gerados:** ~200-500 chunks (depende do conteúdo)
- **Memória:** O processamento usa mais RAM
- **Custo:** Mais tokens de embedding na OpenAI/Cohere

---

## 🔧 Solução 2: Dividir o PDF (Mais Eficiente)

Se o PDF tem **capítulos ou seções distintas**, dividi-lo pode ser melhor:

### Ferramentas para Dividir PDF:

#### Online (Grátis):
- **ILovePDF:** https://www.ilovepdf.com/pt/dividir_pdf
- **Smallpdf:** https://smallpdf.com/pt/dividir-pdf
- **PDF24:** https://tools.pdf24.org/pt/dividir-pdf

#### Desktop:
- **Adobe Acrobat**
- **PDFtk Free** (Windows/Mac/Linux)

### Estratégia:

1. Dividir o PDF em partes lógicas:
   - Capítulo 1: páginas 1-50 (5 MB)
   - Capítulo 2: páginas 51-100 (6 MB)
   - etc.

2. Fazer upload de cada parte separadamente

3. Benefícios:
   - ✅ Upload mais rápido
   - ✅ Processamento paralelo
   - ✅ Melhor organização
   - ✅ Mais fácil de atualizar partes específicas

---

## 🔧 Solução 3: Comprimir o PDF

Muitas vezes PDFs grandes têm **imagens não otimizadas**.

### Ferramentas de Compressão:

#### Online:
- **ILovePDF Comprimir:** https://www.ilovepdf.com/pt/comprimir_pdf
- **Smallpdf Comprimir:** https://smallpdf.com/pt/comprimir-pdf

#### Desktop:
- **Adobe Acrobat** (Salvar como > Arquivo otimizado)
- **Ghostscript** (linha de comando)

### Comando Ghostscript (Avançado):

```bash
# Comprimir para "screen" (72dpi - menor tamanho)
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 \
   -dPDFSETTINGS=/screen -dNOPAUSE -dQUIET \
   -dBATCH -sOutputFile=output.pdf input.pdf

# Comprimir para "ebook" (150dpi - qualidade média)
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 \
   -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET \
   -dBATCH -sOutputFile=output.pdf input.pdf
```

### Resultado Esperado:
- PDF de 56 MB pode reduzir para **10-20 MB**
- Mantém legibilidade do texto
- Remove metadados desnecessários

---

## 📊 Comparação das Soluções

| Solução | Facilidade | Velocidade | Organização | Custo |
|---------|-----------|------------|-------------|-------|
| **1. Aumentar Limite** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | 💰💰💰 |
| **2. Dividir PDF** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 💰💰 |
| **3. Comprimir PDF** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 💰 |

---

## 🎯 Recomendação

### Para seu caso (56 MB):

**Opção A (Rápida):**
1. Comprimir o PDF para ~15-20 MB
2. Fazer upload direto

**Opção B (Ideal):**
1. Aumentar limite para 100 MB
2. Dividir o PDF em 4-6 partes lógicas
3. Fazer upload de cada parte
4. Benefício: chunks bem organizados por seção

**Opção C (Simples):**
1. Apenas aumentar o limite para 100 MB
2. Fazer upload do arquivo completo
3. Aguardar processamento

---

## ⚙️ Configurações Técnicas

### Limites Recomendados por Tipo:

| Tipo de Documento | Limite Recomendado |
|-------------------|-------------------|
| TXT, JSON | 5 MB |
| Excel (XLSX) | 10 MB |
| Word (DOCX) | 20 MB |
| PDF Texto | 50 MB |
| PDF com Imagens | 100 MB |
| PDF Scaneado | 200 MB |

### Ajustar Limite:

```sql
-- 50 MB
UPDATE storage.buckets 
SET file_size_limit = 52428800 
WHERE id = 'knowledge-documents';

-- 100 MB (recomendado)
UPDATE storage.buckets 
SET file_size_limit = 104857600 
WHERE id = 'knowledge-documents';

-- 200 MB (máximo para PDFs escaneados)
UPDATE storage.buckets 
SET file_size_limit = 209715200 
WHERE id = 'knowledge-documents';
```

---

## 🔍 Monitoramento

### Ver tamanho dos arquivos no banco:

```sql
SELECT 
  file_name,
  file_size,
  file_size / 1024 / 1024 as size_mb,
  processing_status,
  chunks_count,
  created_at
FROM knowledge_documents
ORDER BY file_size DESC;
```

### Ver uso total de storage:

```sql
SELECT 
  bucket_id,
  COUNT(*) as total_files,
  SUM(size) as total_bytes,
  SUM(size) / 1024 / 1024 as total_mb
FROM storage.objects
WHERE bucket_id = 'knowledge-documents'
GROUP BY bucket_id;
```

---

## 🆘 Troubleshooting

### Erro: "File too large"
- Execute a migration para aumentar o limite
- Ou comprima/divida o PDF

### Processamento travado
- Arquivos muito grandes podem timeout
- Solução: Dividir em partes menores

### Muitos chunks gerados
- Normal para PDFs grandes
- 56 MB pode gerar 300-500 chunks
- Isso é esperado e funciona bem

### Alto custo de embedding
- Cada página gera ~1-3 chunks
- 56 MB com 200 páginas = ~400-600 chunks
- Custo estimado: $0.50-$2.00 (OpenAI)

---

## 📝 Checklist

- [ ] Decidir qual solução usar (aumentar/dividir/comprimir)
- [ ] Se aumentar limite: executar SQL no Supabase
- [ ] Se dividir: usar ferramenta para dividir PDF
- [ ] Se comprimir: usar ferramenta de compressão
- [ ] Fazer upload do(s) arquivo(s)
- [ ] Aguardar processamento
- [ ] Verificar chunks gerados
- [ ] Testar busca no chat

---

**Qual solução você prefere?** 

Recomendo: **Comprimir para ~15 MB** primeiro, se não funcionar, **aumentar o limite para 100 MB**. 🚀


