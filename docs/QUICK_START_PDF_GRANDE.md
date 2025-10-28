# 🚀 Guia Rápido: PDF de 56 MB

## ⚡ Solução Mais Rápida (5 minutos)

### 1️⃣ Aumentar o Limite no Supabase

```sql
-- Cole isso no SQL Editor do Supabase
UPDATE storage.buckets
SET file_size_limit = 104857600  -- 100 MB
WHERE id = 'knowledge-documents';
```

### 2️⃣ Atualizar o Código

Edite: `src/components/FileUpload.tsx` linha 38:

```typescript
// ANTES:
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// DEPOIS:
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
```

### 3️⃣ Fazer Upload

1. Recarregue a página
2. Arraste seu PDF de 56 MB
3. Aguarde 5-10 minutos para processar
4. ✅ Pronto!

---

## 🔥 Solução Alternativa (Sem alterar código)

### Comprimir o PDF

1. Acesse: https://www.ilovepdf.com/pt/comprimir_pdf
2. Faça upload do seu PDF de 56 MB
3. Baixe o PDF comprimido (~10-20 MB)
4. Faça upload no sistema
5. ✅ Pronto!

**Vantagens:**
- Não precisa alterar nada no código
- Upload mais rápido
- Processamento mais rápido
- Menor custo de embedding

---

## 📊 Comparação

| Método | Tempo Setup | Tempo Upload | Custo |
|--------|-------------|--------------|-------|
| **Aumentar Limite** | 2 min | 10-15 min | Alto |
| **Comprimir PDF** | 1 min | 2-3 min | Baixo |

---

## 💡 Minha Recomendação

**Para seu caso (56 MB):**

1. **Teste primeiro:** Comprimir o PDF
   - Rápido e fácil
   - Sem alterar código
   
2. **Se necessário:** Aumentar o limite
   - Para manter qualidade original
   - Para PDFs futuros

---

## 🆘 Problemas?

### "Arquivo muito grande"
- Execute o SQL para aumentar limite
- OU comprima o PDF

### "Timeout no processamento"
- Divida o PDF em 2-3 partes
- Faça upload separado

### "Muitos chunks"
- Normal para PDFs grandes
- 56 MB = ~300-500 chunks
- Funciona perfeitamente!

---

**Precisa de ajuda?** Veja: `docs/ARQUIVOS_GRANDES.md`


