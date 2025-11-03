import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Nota: imports npm pesados foram movidos para dentro das funções (imports dinâmicos)

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

// Detecta se é uma lista de produtos (estrutura tabular)
function isProductList(text: string): boolean {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length < 5) return false
  
  // Procura por padrões típicos de listas de produtos
  const headerPatterns = [
    /c[óo]d(igo)?.*item/i,
    /descri[çc][ãa]o/i,
    /linha.*sub.*linha/i,
    /pre[çc]o/i,
  ]
  
  const firstLines = lines.slice(0, 5).join(' ')
  return headerPatterns.some(pattern => pattern.test(firstLines))
}

// Chunking para listas de produtos - divide em grupos menores
function chunkProductList(text: string, fileName: string): ChunkResult[] {
  const chunks: ChunkResult[] = []
  const lines = text.split('\n').filter(line => line.trim())
  
  if (lines.length === 0) return chunks
  
  // Encontra o cabeçalho (primeiras linhas até encontrar dados)
  let headerEndIndex = 0
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (lines[i].includes('---') || /c[óo]d.*item|descri[çc][ãa]o/i.test(lines[i])) {
      headerEndIndex = i + 1
    }
  }
  
  const header = lines.slice(0, headerEndIndex).join('\n')
  const dataLines = lines.slice(headerEndIndex)
  
  // Divide produtos em grupos de 15 itens por chunk
  const PRODUCTS_PER_CHUNK = 15
  let chunkIndex = 0
  
  for (let i = 0; i < dataLines.length; i += PRODUCTS_PER_CHUNK) {
    const productGroup = dataLines.slice(i, i + PRODUCTS_PER_CHUNK)
    
    // Inclui cabeçalho em cada chunk para contexto
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

// Chunking inteligente - divide texto em pedaços de ~500-1000 tokens
function intelligentChunk(text: string, fileName: string): ChunkResult[] {
  // Se for lista de produtos, usa estratégia específica
  if (isProductList(text)) {
    console.log('Detected product list, using specialized chunking')
    return chunkProductList(text, fileName)
  }
  
  const chunks: ChunkResult[] = []
  
  // Remove múltiplos espaços e quebras de linha
  const cleanedText = text.replace(/\s+/g, ' ').trim()
  
  // Divide por parágrafos (dupla quebra de linha)
  const paragraphs = cleanedText.split(/\n\n+/)
  
  let currentChunk = ''
  let chunkIndex = 0
  
  for (const paragraph of paragraphs) {
    const potentialChunk = currentChunk + '\n\n' + paragraph
    
    // ~750 palavras = ~1000 tokens (aproximadamente)
    const wordCount = potentialChunk.split(/\s+/).length
    
    if (wordCount > 750 && currentChunk.length > 0) {
      // Salva chunk atual
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          fileName,
          chunkIndex,
          wordCount: currentChunk.split(/\s+/).length,
          processedAt: new Date().toISOString(),
        }
      })
      
      chunkIndex++
      currentChunk = paragraph
    } else {
      currentChunk = potentialChunk
    }
  }
  
  // Adiciona último chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      metadata: {
        fileName,
        chunkIndex,
        wordCount: currentChunk.split(/\s+/).length,
        processedAt: new Date().toISOString(),
      }
    })
  }
  
  return chunks
}

// Extrai texto de PDF
async function extractTextFromPDF(buffer: ArrayBuffer, ctx?: { supabase?: any, filePath?: string }): Promise<string> {
  try {
    const { default: pdfParse } = await import('npm:pdf-parse@1.1.1')
    // Deno não tem Buffer global - converte ArrayBuffer para Uint8Array
    const uint8Array = new Uint8Array(buffer)
    const data = await pdfParse(uint8Array)
    let text = data.text || ''
    if (text.trim().length === 0) {
      // Fallback: tenta extrair via pdfjs-dist
      try {
        const pdfjsLib = await import('npm:pdfjs-dist@3.11.174/build/pdf.mjs')
        const doc = await (pdfjsLib as any).getDocument({ data: buffer }).promise
        const numPages = doc.numPages
        let out = ''
        for (let i = 1; i <= numPages; i++) {
          const page = await doc.getPage(i)
          const content = await page.getTextContent()
          const strings = content.items.map((item: any) => (item.str || '')).join(' ')
          out += strings + '\n'
        }
        text = out
      } catch (pdfjsErr) {
        console.warn('pdfjs-dist fallback failed:', pdfjsErr)
      }
    }

    // Mistral OCR fallback (preferido quando configurado)
    if (text.trim().length === 0) {
      const mistralKey = Deno.env.get('MISTRAL_API_KEY')
      if (mistralKey && ctx?.supabase && ctx?.filePath) {
        try {
          // Gera URL assinada do arquivo no Storage para o Mistral consumir
          const { data: signed, error: signedErr } = await ctx.supabase
            .storage
            .from('knowledge-documents')
            .createSignedUrl(ctx.filePath, 60 * 60) // 1 hora

          if (!signedErr && signed?.signedUrl) {
            // Verifica se a URL assinada está acessível externamente
            try {
              const head = await fetch(signed.signedUrl, { method: 'HEAD' })
              if (!head.ok) {
                console.warn('Signed URL not accessible (HEAD):', head.status, head.statusText)
              }
            } catch (headErr) {
              console.warn('Signed URL HEAD check failed:', headErr)
            }
            const resp = await fetch('https://api.mistral.ai/v1/ocr', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${mistralKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify({
                model: 'mistral-ocr-latest',
                document: { type: 'document_url', document_url: signed.signedUrl },
                include_image_base64: true,
              }),
            })

            const json = await resp.json()
            if (!resp.ok) {
              console.warn('Mistral OCR error:', json)
            } else {
              // Tenta normalizar campos comuns de OCR: pages[].text ou text
              let ocrText = ''
              if (Array.isArray(json?.pages)) {
                ocrText = json.pages
                  .map((p: any) => {
                    // Coleta textos conhecidos no nível da página
                    const direct = [p?.text, p?.content]
                      .filter((v: any) => typeof v === 'string')
                      .join('\n')
                    // Coleta textos em estruturas aninhadas (blocks, paragraphs, lines)
                    const nestedSources = [p?.blocks, p?.paragraphs, p?.lines, p?.items, p?.content]
                    const nested = nestedSources
                      .filter(Boolean)
                      .flat()
                      .map((n: any) => (n?.text || n?.content || ''))
                      .filter((s: any) => typeof s === 'string')
                      .join('\n')
                    return [direct, nested].filter(Boolean).join('\n')
                  })
                  .filter((s: any) => typeof s === 'string')
                  .join('\n')
              }
              if (!ocrText && typeof json?.text === 'string') {
                ocrText = json.text
              }
              if (!ocrText && typeof json?.result === 'string') {
                ocrText = json.result
              }
              if (!ocrText && json) {
                // Coletor genérico: varre o objeto e junta todos os campos 'text'/'content' string
                const collect = (obj: any): string[] => {
                  const acc: string[] = []
                  if (obj && typeof obj === 'object') {
                    if (Array.isArray(obj)) {
                      for (const item of obj) acc.push(...collect(item))
                    } else {
                      for (const [k, v] of Object.entries(obj)) {
                        if ((k.includes('text') || k.includes('content')) && typeof v === 'string') {
                          acc.push(v)
                        } else if (v && typeof v === 'object') {
                          acc.push(...collect(v))
                        }
                      }
                    }
                  }
                  return acc
                }
                const found = collect(json)
                if (found.length > 0) {
                  ocrText = found.join('\n')
                }
              }
              if (ocrText && ocrText.trim().length > 0) {
                text = ocrText
              }
            }
          }
        } catch (mErr) {
          console.warn('Mistral OCR fallback failed:', mErr)
        }
      }
    }

    // OCR fallback (para PDFs escaneados sem texto) usando OCR.Space
    if (text.trim().length === 0) {
      const ocrKey = Deno.env.get('OCR_SPACE_API_KEY')
      if (ocrKey) {
        try {
          const form = new FormData()
          form.append('language', 'por')
          form.append('isOverlayRequired', 'false')
          form.append('OCREngine', '2')
          form.append('scale', 'true')
          const blob = new Blob([buffer], { type: 'application/pdf' })
          form.append('file', blob, 'document.pdf')

          const resp = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: { 'apikey': ocrKey },
            body: form,
          })

          const json = await resp.json()
          if (!resp.ok || json?.IsErroredOnProcessing) {
            console.warn('OCR.space error:', json?.ErrorMessage || json)
          } else {
            const parsed = (json?.ParsedResults || [])
              .map((r: any) => r?.ParsedText || '')
              .join('\n')
              .trim()
            if (parsed && parsed.length > 0) {
              text = parsed
            }
          }
        } catch (ocrErr) {
          console.warn('OCR.space fallback failed:', ocrErr)
        }
      }
    }
    return text
  } catch (error) {
    console.error('PDF parse error:', error)
    throw new Error('Failed to parse PDF: ' + ((error as Error).message || 'Unknown error'))
  }
}

// Extrai texto de DOCX
async function extractTextFromDOCX(buffer: ArrayBuffer): Promise<string> {
  try {
    const mammoth = await import('npm:mammoth@1.6.0')
    // Deno não tem Buffer global - converte ArrayBuffer para Uint8Array
    const uint8Array = new Uint8Array(buffer)
    const result = await (mammoth as any).extractRawText({ buffer: uint8Array })
    return result.value
  } catch (error) {
    console.error('DOCX parse error:', error)
    throw new Error('Failed to parse DOCX: ' + ((error as Error).message || 'Unknown error'))
  }
}

// Extrai texto de XLSX
async function extractTextFromXLSX(buffer: ArrayBuffer): Promise<string> {
  try {
    const XLSX = await import('npm:xlsx@0.18.5')
    const workbook = (XLSX as any).read(buffer, { type: 'array' })
    let text = ''
    
    workbook.SheetNames.forEach((sheetName: string) => {
      const sheet = workbook.Sheets[sheetName]
      const sheetData = (XLSX as any).utils.sheet_to_json(sheet, { header: 1 })
      
      text += `\n\n--- ${sheetName} ---\n\n`
      
      sheetData.forEach((row: any) => {
        if (Array.isArray(row) && row.length > 0) {
          text += row.filter(cell => cell != null).join(' | ') + '\n'
        }
      })
    })
    
    return text
  } catch (error) {
    console.error('XLSX parse error:', error)
    throw new Error('Failed to parse XLSX: ' + ((error as Error).message || 'Unknown error'))
  }
}

// Gera embedding usando OpenAI e retorna embedding + tokens usados
async function generateEmbedding(text: string, openaiKey: string): Promise<{ embedding: number[], tokens: number }> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small', // 10x mais barato que ada-002!
      input: text.substring(0, 8000), // Limite de tokens
      encoding_format: 'float',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error('OpenAI API error: ' + error)
  }

  const data = await response.json()
  return {
    embedding: data.data[0].embedding,
    tokens: data.usage?.total_tokens || 0,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let documentId: string | undefined
  try {
    const body = await req.json()
    documentId = body.documentId
    const knowledgeBaseId = body.knowledgeBaseId

    if (!documentId || !knowledgeBaseId) {
      return new Response(
        JSON.stringify({ error: 'documentId and knowledgeBaseId are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get document info, agent_id, and organization_id
    const { data: document, error: docError } = await supabase
      .from('knowledge_documents')
      .select(`
        *,
        knowledge_bases!inner(agent_id, organization_id)
      `)
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      throw new Error('Document not found')
    }

    // Extract agent_id and organization_id from knowledge_base
    const agentId = document.knowledge_bases?.agent_id
    const organizationId = document.knowledge_bases?.organization_id
    
    if (!agentId) {
      throw new Error('Agent ID not found for this document')
    }
    
    if (!organizationId) {
      throw new Error('Organization ID not found for this document')
    }

    // Get OpenAI API key from organization
    const { data: orgData } = await supabase
      .from('organizations')
      .select('openai_api_key')
      .eq('id', organizationId)
      .single()
    
    const openaiKey = orgData?.openai_api_key
    
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured for this organization. Please add it in Organization Settings.')
    }

    // Update status to processing
    await supabase
      .from('knowledge_documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId)

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('knowledge-documents')
      .download(document.file_path)

    if (downloadError || !fileData) {
      throw new Error('Failed to download file: ' + downloadError?.message)
    }

    const arrayBuffer = await fileData.arrayBuffer()

    // Extract text based on file type
    let extractedText = ''
    const fileType = document.file_type || ''

    if (fileType.includes('pdf')) {
      extractedText = await extractTextFromPDF(arrayBuffer, { supabase, filePath: document.file_path })
    } else if (fileType.includes('wordprocessingml')) {
      extractedText = await extractTextFromDOCX(arrayBuffer)
    } else if (fileType.includes('spreadsheetml')) {
      extractedText = await extractTextFromXLSX(arrayBuffer)
    } else if (fileType.includes('text/plain')) {
      const decoder = new TextDecoder()
      extractedText = decoder.decode(arrayBuffer)
    } else {
      throw new Error('Unsupported file type: ' + fileType)
    }

    if (!extractedText || extractedText.trim().length === 0) {
      const mistralConfigured = !!Deno.env.get('MISTRAL_API_KEY')
      const ocrSpaceConfigured = !!Deno.env.get('OCR_SPACE_API_KEY')
      const attempts = ['pdf-parse', 'pdfjs']
      if (mistralConfigured) attempts.push('mistral-ocr')
      if (ocrSpaceConfigured) attempts.push('ocr-space')
      throw new Error(`No text extracted from document (attempts: ${attempts.join(', ')})`)
    }

    // Chunk the text
    const chunks = intelligentChunk(extractedText, document.file_name || 'document')

    console.log(`Processing ${chunks.length} chunks from ${document.file_name}`)

    // Process each chunk - generate embedding and save
    const processedChunks = []
    let totalTokens = 0
    const embeddingModel = 'text-embedding-3-small'
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      
      try {
        console.log(`Generating embedding for chunk ${i + 1}/${chunks.length}`)
        const { embedding, tokens } = await generateEmbedding(chunk.content, openaiKey)
        totalTokens += tokens
        
        console.log(`Chunk ${i + 1} embedded successfully (${tokens} tokens)`)
        
        // Create new document for each chunk (except first - update original)
        if (i === 0) {
          // Update original document with first chunk
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
          // Insert new document for additional chunks
          const { error: insertError } = await supabase
            .from('knowledge_documents')
            .insert({
              knowledge_base_id: knowledgeBaseId,
              organization_id: organizationId,
              agent_id: agentId,
              content: chunk.content,
              embedding: JSON.stringify(embedding),
              file_name: document.file_name,
              file_type: document.file_type,
              file_path: document.file_path, // Same file path
              metadata: { 
                ...chunk.metadata, 
                agent_id: agentId,
                organization_id: organizationId,
                knowledge_base_id: knowledgeBaseId,
                parentDocumentId: documentId, 
                chunkOf: document.file_name 
              },
              processing_status: 'completed',
            })

          if (insertError) {
            console.error('Error inserting chunk:', insertError)
            throw insertError
          }
          
          processedChunks.push({ index: i, status: 'inserted', tokens })
        }
      } catch (chunkError) {
        console.error(`Error processing chunk ${i}:`, chunkError)
        processedChunks.push({ index: i, status: 'failed', error: (chunkError as Error).message || 'Unknown error' })
      }
    }

    // Log OpenAI usage if embeddings were generated
    if (totalTokens > 0) {
      console.log(`Logging OpenAI usage: ${totalTokens} tokens`)
      
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
        metadata: {
          file_name: document.file_name,
          file_type: document.file_type,
          document_id: documentId,
        },
      })

      console.log(`✅ Logged OpenAI usage: ${totalTokens} tokens, $${costUsd.data?.toFixed(6) || 0}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        fileName: document.file_name,
        chunksProcessed: processedChunks.filter(c => c.status !== 'failed').length,
        chunksTotal: chunks.length,
        chunks: processedChunks,
        openai_tokens: totalTokens,
        openai_cost_usd: totalTokens > 0 ? (totalTokens / 1000000.0) * 0.02 : 0,
        model_used: embeddingModel,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Processing error:', error)

    // Try to update document status to failed
    if (documentId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)
        
        await supabase
          .from('knowledge_documents')
          .update({
            processing_status: 'failed',
            error_message: (error as Error).message || 'Unknown error',
          })
          .eq('id', documentId)
      } catch (updateError) {
        console.error('Failed to update error status:', updateError)
      }
    }

    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

