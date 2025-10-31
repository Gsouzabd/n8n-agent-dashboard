import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let urlId: string | undefined

  try {
    const body = await req.json()
    urlId = body.urlId
    const forcePrerender = !!body.forcePrerender

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get URL record
    const { data: urlRecord, error: fetchError } = await supabaseClient
      .from('knowledge_urls')
      .select('*')
      .eq('id', urlId)
      .single()

    if (fetchError || !urlRecord) {
      throw new Error('URL record not found')
    }

    // Update status to processing
    await supabaseClient
      .from('knowledge_urls')
      .update({ status: 'processing' })
      .eq('id', urlId)

    console.log(`Processing URL: ${urlRecord.url}`)

    // Fetch URL with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

    let html: string
    try {
      const response = await fetch(urlRecord.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      html = await response.text()
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }

    // Extract content using simple regex (remove scripts, styles, and common elements)
    let cleanHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')

    // Extract text from HTML tags
    const text = cleanHtml
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // Extract title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
    let title = titleMatch ? titleMatch[1].trim() : new URL(urlRecord.url).hostname

    // Initial word count
    let words = text.split(/\s+/)
    let wordCount = words.length

    // If content looks too small OR forcePrerender requested, try prerender fallback (handles SPAs and JS-rendered pages)
    if (forcePrerender || wordCount < 50) {
      try {
        console.log('Low word count detected, trying prerender via r.jina.ai')
        const prerenderResp = await fetch(`https://r.jina.ai/${urlRecord.url}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VenturizeBot/1.0)' },
        })
        if (prerenderResp.ok) {
          const prerenderContent = await prerenderResp.text()
          // Strip common markdown syntax to plain text
          const mdText = prerenderContent
            .replace(/```[\s\S]*?```/g, ' ')
            .replace(/`[^`]*`/g, ' ')
            .replace(/!\[[^\]]*\]\([^\)]*\)/g, ' ') // images
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // links [text](url) -> text
            .replace(/^[#>*\-\s]+/gm, ' ') // leading md chars per line
            .replace(/\s+/g, ' ')
            .trim()

          const mdWords = mdText.split(/\s+/)
          const mdCount = mdWords.length

          if (forcePrerender || mdCount > wordCount) {
            console.log(`Prerender improved word count from ${wordCount} to ${mdCount}`)
            words = mdWords
            wordCount = mdCount

            // Try infer title from first level-1 heading
            const h1Match = prerenderContent.match(/^#\s+(.+)$/m)
            if (h1Match && h1Match[1]) {
              title = h1Match[1].trim()
            }

            // Replace text with mdText for hashing
            cleanHtml = mdText
          }
        } else {
          console.warn('Prerender fetch failed', prerenderResp.status)
        }
      } catch (e) {
        console.warn('Prerender attempt failed', e)
      }
    }

    // If after fallback the content is still too small, mark as failed to avoid misleading "completed"
    if (wordCount < 50) {
      console.warn(`Final word count still too low (${wordCount}). Marking as failed.`)
      await supabaseClient
        .from('knowledge_urls')
        .update({
          status: 'failed',
          error_message: 'Conteúdo insuficiente extraído (possível página dinâmica com bloqueio a scrapers).',
          last_crawled_at: new Date().toISOString(),
        })
        .eq('id', urlId)

      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient content extracted', wordCount }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Chunk text (500 words per chunk, 50 words overlap)
    const chunkSize = 500
    const overlapSize = 50
    const chunks: string[] = []

    for (let i = 0; i < words.length; i += chunkSize - overlapSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ')
      if (chunk.trim().length > 0) {
        chunks.push(chunk)
      }
    }

    console.log(`Extracted ${wordCount} words, creating ${chunks.length} chunks`)

    // Calculate content hash
    const encoder = new TextEncoder()
    const data = encoder.encode(words.join(' '))
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Get organization_id and agent_id from knowledge_base
    const { data: kbData } = await supabaseClient
      .from('knowledge_bases')
      .select('organization_id, agent_id')
      .eq('id', urlRecord.knowledge_base_id)
      .single()

    const organizationId = kbData?.organization_id
    const agentId = kbData?.agent_id

    // Get OpenAI API key from organization
    let openaiKey: string | null = null
    if (organizationId) {
      const { data: orgData } = await supabaseClient
        .from('organizations')
        .select('openai_api_key')
        .eq('id', organizationId)
        .single()
      
      openaiKey = orgData?.openai_api_key || null
    }

    // Generate embeddings and save chunks
    let totalEmbeddingTokens = 0
    const embeddingModel = 'text-embedding-3-small'
    
    for (let i = 0; i < chunks.length; i++) {
      let embedding = null
      
      // Generate embedding if OpenAI key is available
      if (openaiKey) {
        try {
          console.log(`Generating embedding for chunk ${i + 1}/${chunks.length}`)
          const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: embeddingModel,
              input: chunks[i],
              encoding_format: 'float',
            }),
          })
          
          if (!embeddingResponse.ok) {
            const errorData = await embeddingResponse.text()
            console.error('OpenAI API error:', errorData)
          } else {
            const embeddingData = await embeddingResponse.json()
            embedding = embeddingData.data[0].embedding
            
            // Rastrear tokens usados
            const tokensUsed = embeddingData.usage?.total_tokens || 0
            totalEmbeddingTokens += tokensUsed
            
            console.log(`Embedding generated successfully (${embedding.length} dimensions, ${tokensUsed} tokens)`)
          }
        } catch (error) {
          console.error('Failed to generate embedding:', error)
        }
      } else {
        console.log('No OpenAI key configured, skipping embedding generation')
      }

      // Insert document with or without embedding
      const insertResult = await supabaseClient.from('knowledge_documents').insert({
        knowledge_base_id: urlRecord.knowledge_base_id,
        organization_id: organizationId,
        agent_id: agentId,
        content: chunks[i],
        embedding: embedding,
        file_name: `${title} (Chunk ${i + 1}/${chunks.length})`,
        file_type: 'text/html',
        processing_status: 'completed',
        metadata: {
          source_url: urlRecord.url,
          source_type: 'url',
          chunk_index: i,
          total_chunks: chunks.length,
          page_title: title,
          scraped_at: new Date().toISOString(),
          agent_id: agentId,
          organization_id: organizationId,
          knowledge_base_id: urlRecord.knowledge_base_id,
        },
        document_description: urlRecord.document_description,
        tags: urlRecord.tags,
      })
      
      if (insertResult.error) {
        console.error(`Failed to insert chunk ${i}:`, insertResult.error)
      }
    }

    // Log OpenAI usage if embeddings were generated
    if (totalEmbeddingTokens > 0 && organizationId) {
      const costUsd = await supabaseClient.rpc('calculate_openai_cost', {
        model_name: embeddingModel,
        prompt_tokens: totalEmbeddingTokens,
        completion_tokens: 0,
      })

      await supabaseClient.from('openai_usage_logs').insert({
        organization_id: organizationId,
        agent_id: agentId,
        operation_type: 'embedding',
        model: embeddingModel,
        prompt_tokens: totalEmbeddingTokens,
        completion_tokens: 0,
        total_tokens: totalEmbeddingTokens,
        cost_usd: costUsd.data || 0,
        knowledge_base_id: urlRecord.knowledge_base_id,
        url: urlRecord.url,
        chunks_processed: chunks.length,
        metadata: {
          word_count: wordCount,
          page_title: title,
        },
      })

      console.log(`✅ Logged OpenAI usage: ${totalEmbeddingTokens} tokens, $${costUsd.data?.toFixed(6) || 0}`)
    }

    // Update URL record
    await supabaseClient
      .from('knowledge_urls')
      .update({
        status: 'completed',
        last_crawled_at: new Date().toISOString(),
        next_crawl_at: urlRecord.auto_refresh 
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
          : null,
        page_title: title,
        word_count: wordCount,
        chunks_generated: chunks.length,
        content_hash: contentHash,
        error_message: null,
        retry_count: 0,
      })
      .eq('id', urlId)

    return new Response(
      JSON.stringify({
        success: true,
        chunks: chunks.length,
        wordCount,
        title,
        openai_tokens: totalEmbeddingTokens,
        openai_cost_usd: totalEmbeddingTokens > 0 ? (totalEmbeddingTokens / 1000000.0) * 0.02 : 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Web scraper error:', error)

    // Try to update status to failed if we have urlId
    if (urlId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        await supabaseClient
          .from('knowledge_urls')
          .update({
            status: 'failed',
            error_message: error.message || 'Unknown error',
          })
          .eq('id', urlId)
      } catch (updateError) {
        console.error('Failed to update error status:', updateError)
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

