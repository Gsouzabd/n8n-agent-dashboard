import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, x-supabase-authorization',
  'Access-Control-Max-Age': '86400',
}

interface ChunkResult {
  content: string
  metadata: Record<string, any>
}

function isProductList(text: string): boolean {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length < 5) return false
  const headerPatterns = [
    /c[óo]d(igo)?.*item/i,
    /descri[çc][ãa]o/i,
    /linha.*sub.*linha/i,
    /pre[çc]o/i,
  ]
  const firstLines = lines.slice(0, 5).join(' ')
  return headerPatterns.some(pattern => pattern.test(firstLines))
}

function chunkProductList(text: string, fileName: string): ChunkResult[] {
  const chunks: ChunkResult[] = []
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length === 0) return chunks
  let headerEndIndex = 0
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (lines[i].includes('---') || /c[óo]d.*item|descri[çc][ãa]o/i.test(lines[i])) {
      headerEndIndex = i + 1
    }
  }
  const header = lines.slice(0, headerEndIndex).join('\n')
  const dataLines = lines.slice(headerEndIndex)
  const PRODUCTS_PER_CHUNK = 15
  let chunkIndex = 0
  for (let i = 0; i < dataLines.length; i += PRODUCTS_PER_CHUNK) {
    const productGroup = dataLines.slice(i, i + PRODUCTS_PER_CHUNK)
    const content = header + '\n\n' + productGroup.join('\n')
    chunks.push({
      content: content.trim(),
      metadata: {
        fileName,
        chunkIndex,
        productCount: productGroup.length,
        totalProducts: dataLines.length,
        chunkType: 'product_list',
        processedAt: new Date().toISOString(),
      }
    })
    chunkIndex++
  }
  return chunks
}

function intelligentChunk(text: string, fileName: string): ChunkResult[] {
  if (isProductList(text)) {
    return chunkProductList(text, fileName)
  }

  // Preserve quebras de linha para detectar parágrafos
  const normalized = text.replace(/\r\n|\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  let paragraphs = normalized.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)

  const chunks: ChunkResult[] = []
  let currentChunk = ''
  let chunkIndex = 0

  const flushCurrent = () => {
    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          fileName,
          chunkIndex,
          wordCount: currentChunk.trim().split(/\s+/).length,
          processedAt: new Date().toISOString(),
        }
      })
      chunkIndex++
      currentChunk = ''
    }
  }

  for (const paragraph of paragraphs) {
    const candidate = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph
    const wordCount = candidate.split(/\s+/).length
    if (wordCount > 750 && currentChunk) {
      flushCurrent()
      currentChunk = paragraph
    } else {
      currentChunk = candidate
    }
  }
  flushCurrent()

  // Fallback: se ainda assim gerou 1 chunk muito grande (poucos ou nenhum parágrafo), corta por palavras
  if (chunks.length === 1 && chunks[0].metadata.wordCount > 900) {
    const words = chunks[0].content.split(/\s+/)
    chunks.length = 0
    chunkIndex = 0
    const size = 750
    for (let i = 0; i < words.length; i += size) {
      const slice = words.slice(i, i + size).join(' ')
      if (slice.trim()) {
        chunks.push({
          content: slice.trim(),
          metadata: {
            fileName,
            chunkIndex: chunkIndex++,
            wordCount: slice.trim().split(/\s+/).length,
            processedAt: new Date().toISOString(),
          }
        })
      }
    }
  }

  return chunks
}

async function generateEmbedding(text: string, openaiKey: string): Promise<{ embedding: number[], tokens: number }> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-large',
      input: text.substring(0, 8000),
      encoding_format: 'float',
      dimensions: 3072, // Explicitly request 3072 dimensions
    }),
  })
  if (!response.ok) {
    const error = await response.text()
    throw new Error('OpenAI API error: ' + error)
  }
  const data = await response.json()
  
  if (!data.data || !data.data[0] || !data.data[0].embedding) {
    console.error('Invalid OpenAI response:', JSON.stringify(data, null, 2))
    throw new Error('Invalid response from OpenAI API: missing embedding data')
  }
  
  const embedding = data.data[0].embedding
  
  // Validar que embedding é um array de números com 3072 dimensões
  if (!Array.isArray(embedding)) {
    throw new Error('Embedding is not an array')
  }
  
  if (embedding.length !== 3072) {
    console.error(`Embedding dimension mismatch: expected 3072, got ${embedding.length}`)
    throw new Error(`expected 3072 dimensions, not ${embedding.length}`)
  }
  
  // Validar que todos os elementos são números
  if (!embedding.every((val: any) => typeof val === 'number')) {
    throw new Error('Embedding contains non-numeric values')
  }
  
  return {
    embedding,
    tokens: data.usage?.total_tokens || 0,
  }
}

function markdownToPlainText(markdown: string): string {
  // Remove imagens ![alt](url)
  let text = markdown.replace(/!\[[^\]]*\]\([^\)]+\)/g, ' ')
  // Remove links mantendo o texto [label](url)
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
  // Remove headings #, ## etc
  text = text.replace(/^\s*#{1,6}\s+/gm, '')
  // Normaliza espaços e quebras
  text = text.replace(/\r\n|\r/g, '\n').replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { documentId, knowledgeBaseId, fileName, ocrPages } = await req.json()

    if (!documentId || !knowledgeBaseId || !Array.isArray(ocrPages)) {
      return new Response(
        JSON.stringify({ error: 'documentId, knowledgeBaseId e ocrPages são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Carrega documento + KB
    const { data: document, error: docError } = await supabase
      .from('knowledge_documents')
      .select(`*, knowledge_bases!inner(agent_id, organization_id)`) 
      .eq('id', documentId)
      .single()
    if (docError || !document) throw new Error('Document not found')

    const agentId = document.knowledge_bases?.agent_id
    const organizationId = document.knowledge_bases?.organization_id
    if (!agentId) throw new Error('Agent ID not found for this document')
    if (!organizationId) throw new Error('Organization ID not found for this document')

    // OpenAI key
    const { data: orgData } = await supabase
      .from('organizations')
      .select('openai_api_key')
      .eq('id', organizationId)
      .single()
    const openaiKey = orgData?.openai_api_key
    if (!openaiKey) throw new Error('OpenAI API key not configured for this organization. Please add it in Organization Settings.')

    // Atualiza status
    await supabase.from('knowledge_documents').update({ processing_status: 'processing' }).eq('id', documentId)

    // Concatena/limpa OCR
    const fullText = ocrPages
      .map((p: any) => markdownToPlainText(String(p?.markdown || '')))
      .filter((t: string) => t.length > 0)
      .join('\n\n')
      .trim()

    if (!fullText) {
      throw new Error('OCR returned empty content after normalization')
    }

    // Chunk e embed
    const chunks = intelligentChunk(fullText, fileName || 'document')
    const processedChunks: Array<{ index: number; status: string; tokens: number; error?: string }> = []
    let totalTokens = 0
    const embeddingModel = 'text-embedding-3-large'

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      try {
        const { embedding, tokens } = await generateEmbedding(chunk.content, openaiKey)
        totalTokens += tokens
        if (i === 0) {
          await supabase
            .from('knowledge_documents')
            .update({
              content: chunk.content,
              embedding: JSON.stringify(embedding),
              organization_id: organizationId,
              agent_id: agentId,
              metadata: { 
                ...document.metadata, 
                ...chunk.metadata, 
                agent_id: agentId,
                organization_id: organizationId,
                knowledge_base_id: knowledgeBaseId,
                isFirstChunk: true 
              },
              processing_status: 'completed',
              chunks_count: chunks.length,
            })
            .eq('id', documentId)
          processedChunks.push({ index: i, status: 'updated-original', tokens })
        } else {
          const { error: insertError } = await supabase
            .from('knowledge_documents')
            .insert({
              knowledge_base_id: knowledgeBaseId,
              organization_id: organizationId,
              agent_id: agentId,
              content: chunk.content,
              embedding: JSON.stringify(embedding),
              file_name: fileName,
              file_type: document.file_type,
              file_path: document.file_path,
              metadata: { 
                ...chunk.metadata, 
                agent_id: agentId,
                organization_id: organizationId,
                knowledge_base_id: knowledgeBaseId,
                parentDocumentId: documentId, 
                chunkOf: fileName 
              },
              processing_status: 'completed',
            })
          if (insertError) throw insertError
          processedChunks.push({ index: i, status: 'inserted', tokens })
        }
      } catch (err: any) {
        processedChunks.push({ index: i, status: 'failed', tokens: 0, error: err?.message })
      }
    }

    // Log de uso
    if (totalTokens > 0) {
      const costUsd = await supabase.rpc('calculate_openai_cost', {
        model_name: embeddingModel,
        prompt_tokens: totalTokens,
        completion_tokens: 0,
      })
      await supabase.from('openai_usage_logs').insert({
        organization_id: organizationId,
        agent_id: agentId,
        operation_type: 'embedding',
        model: embeddingModel,
        prompt_tokens: totalTokens,
        completion_tokens: 0,
        total_tokens: totalTokens,
        cost_usd: costUsd.data || 0,
        knowledge_base_id: knowledgeBaseId,
        chunks_processed: chunks.length,
        metadata: { file_name: fileName, file_type: document.file_type, document_id: documentId },
      })
    }

    return new Response(
      JSON.stringify({ success: true, documentId, chunksTotal: chunks.length, processedChunks }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    // Atualiza status de erro
    try {
      const body = await req.json().catch(() => ({}))
      if (body?.documentId) {
        const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
        await supabase
          .from('knowledge_documents')
          .update({ processing_status: 'failed', error_message: String(error?.message || error) })
          .eq('id', body.documentId)
      }
    } catch {}
    return new Response(
      JSON.stringify({ error: String(error?.message || error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})


