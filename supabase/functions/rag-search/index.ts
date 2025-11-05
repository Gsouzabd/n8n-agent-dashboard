import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface DocumentResult {
  id: string
  content: string
  metadata: Record<string, any>
  similarity: number
  relevance_score?: number
  document_description?: string
  usage_context?: string
  usage_instructions?: string
  dialogue_examples?: any[]
  tags?: string[]
}

interface RAGSearchResponse {
  context: string
  documents: DocumentResult[]
  relevance_score: number
  suggestions: string[]
  query: string
  count: number
}

// Score baseado em múltiplos fatores
function calculateRelevanceScore(
  doc: DocumentResult,
  query: string,
  queryLower: string
): number {
  let score = doc.similarity // Base score from vector similarity

  // Boost por document_description match
  if (doc.document_description) {
    const descLower = doc.document_description.toLowerCase()
    const descWords = descLower.split(/\s+/)
    const queryWords = queryLower.split(/\s+/)
    const matchingWords = queryWords.filter(word => 
      word.length > 3 && descWords.some(descWord => descWord.includes(word))
    )
    score += (matchingWords.length / queryWords.length) * 0.1
  }

  // Boost por tags match
  if (doc.tags && doc.tags.length > 0) {
    const tagsLower = doc.tags.map(t => t.toLowerCase())
    const queryWords = queryLower.split(/\s+/)
    const matchingTags = queryWords.filter(word => 
      word.length > 3 && tagsLower.some(tag => tag.includes(word) || word.includes(tag))
    )
    score += (matchingTags.length / Math.max(queryWords.length, 1)) * 0.15
  }

  // Boost por usage_context relevante
  if (doc.usage_context) {
    const contextLower = doc.usage_context.toLowerCase()
    const queryWords = queryLower.split(/\s+/)
    const matchingWords = queryWords.filter(word => 
      word.length > 3 && contextLower.includes(word)
    )
    score += (matchingWords.length / Math.max(queryWords.length, 1)) * 0.1
  }

  // Boost por dialogue_examples (indica exemplo prático)
  if (doc.dialogue_examples && doc.dialogue_examples.length > 0) {
    score += 0.05
  }

  return Math.min(score, 1.0) // Cap at 1.0
}

// Extrai sugestões de usage_instructions
function extractSuggestions(documents: DocumentResult[]): string[] {
  const suggestions: string[] = []
  const seen = new Set<string>()

  for (const doc of documents) {
    if (doc.usage_instructions && !seen.has(doc.usage_instructions)) {
      // Extrair pontos principais das instruções
      const lines = doc.usage_instructions.split('\n').filter(l => l.trim())
      lines.forEach(line => {
        const trimmed = line.trim()
        if (trimmed.length > 20 && trimmed.length < 200 && !seen.has(trimmed)) {
          suggestions.push(trimmed)
          seen.add(trimmed)
        }
      })
    }
  }

  return suggestions.slice(0, 3) // Máximo 3 sugestões
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Reject GET requests
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ 
        error: 'Method not allowed. Use POST with JSON body containing: { agentId, query, topK?, threshold?, tags?, useMetadata? }',
        context: '',
        documents: [],
        relevance_score: 0,
        suggestions: []
      }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    // Verificar autenticação de forma flexível (aceita Bearer ou token direto)
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
    const apiKey = req.headers.get('apikey') || req.headers.get('x-api-key')
    
    // Se não tiver autenticação, ainda permite (para uso interno)
    // Mas loga para debug
    if (!authHeader && !apiKey) {
      console.log('Request without authentication header')
    }

    // Tentar ler o body JSON
    let body: any = {}
    try {
      const bodyText = await req.text()
      if (bodyText) {
        body = JSON.parse(bodyText)
      }
    } catch (parseError) {
      console.error('Error parsing request body:', parseError)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          context: '',
          documents: [],
          relevance_score: 0,
          suggestions: []
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Extrair parâmetros de forma flexível
    const agentId = body.agentId || body.agent_id
    
    // Se query for um objeto, tentar extrair o texto e outros parâmetros
    let query = body.query
    let thresholdParam = body.threshold
    let tagsParam = body.tags
    
    if (typeof query === 'object' && query !== null) {
      // Se query for objeto com propriedades, tentar extrair texto
      // Pode ter query, threshold, tags dentro do objeto query
      const queryObj = query as any
      
      // Extrair query text
      query = queryObj.query || queryObj.text || queryObj.message || queryObj.input || queryObj.prompt
      
      // Se ainda não encontrou, tentar extrair o primeiro valor string não-numérico
      if (!query || typeof query !== 'string') {
        const values = Object.values(queryObj)
        for (const val of values) {
          if (typeof val === 'string' && val.length > 10 && !val.match(/^[0-9.]+$/)) {
            query = val
            break
          }
        }
      }
      
      // Extrair threshold do objeto query se não foi passado no body
      if (!thresholdParam && (queryObj.threshold !== undefined)) {
        thresholdParam = queryObj.threshold
      }
      
      // Extrair tags do objeto query se não foi passado no body
      if (!tagsParam && (queryObj.tags !== undefined)) {
        tagsParam = queryObj.tags
      }
      
      // Último recurso: usar JSON stringify
      if (!query || typeof query !== 'string') {
        query = JSON.stringify(queryObj)
      }
    }
    
    // Garantir que query é string
    if (typeof query !== 'string') {
      query = String(query || '')
    }
    
    // Limitar topK padrão para evitar contexto muito grande
    const topK = Math.min(body.topK || body.top_k || 5, 10) // Default 5, máximo 10
    
    // Converter threshold - pode ser número, string numérica, ou string descritiva
    // Default mais baixo para garantir resultados mesmo com poucos documentos
    let threshold = 0.4 // default (reduzido de 0.6 para melhorar recall)
    if (thresholdParam !== undefined && thresholdParam !== null) {
      if (typeof thresholdParam === 'number') {
        threshold = thresholdParam
      } else if (typeof thresholdParam === 'string') {
        const lower = thresholdParam.toLowerCase().trim()
        // Converter strings descritivas para valores numéricos
        if (lower === 'high' || lower === 'alta' || lower === 'alto') {
          threshold = 0.8
        } else if (lower === 'medium' || lower === 'media' || lower === 'medio') {
          threshold = 0.6
        } else if (lower === 'low' || lower === 'baixa' || lower === 'baixo') {
          threshold = 0.4
        } else {
          // Tentar parsear como número
          const parsed = parseFloat(thresholdParam)
          if (!isNaN(parsed)) {
            threshold = parsed
          }
        }
      }
    }
    
    // Processar tags - pode ser string, array ou objeto
    let tags: string[] = []
    if (tagsParam) {
      if (typeof tagsParam === 'string') {
        // Se for string, dividir por vírgula
        tags = tagsParam.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)
      } else if (Array.isArray(tagsParam)) {
        tags = tagsParam.map((t: string) => String(t).trim()).filter((t: string) => t.length > 0)
      }
    }
    
    const useMetadata = body.useMetadata !== false // default true

    if (!agentId) {
      return new Response(
        JSON.stringify({ 
          error: 'agentId (or agent_id) is required in request body',
          context: '',
          documents: [],
          relevance_score: 0,
          suggestions: []
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!query || (typeof query === 'string' && query.trim().length === 0)) {
      return new Response(
        JSON.stringify({ 
          error: 'query is required and must be a non-empty string',
          context: '',
          documents: [],
          relevance_score: 0,
          suggestions: []
        }),
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

    // Get OpenAI API key from environment or organization
    let openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    // Se não tiver na env, buscar da organização
    if (!openaiKey) {
      const { data: agentData } = await supabase
        .from('agents')
        .select('organization_id, organizations!inner(openai_api_key)')
        .eq('id', agentId)
        .single()

      if (agentData?.organizations?.openai_api_key) {
        openaiKey = agentData.organizations.openai_api_key
      }
    }
    
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured',
          context: '',
          documents: [],
          relevance_score: 0,
          suggestions: []
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Generate embedding for the query using text-embedding-3-large
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-large',
        input: query,
        encoding_format: 'float',
        dimensions: 3072, // Explicitly request 3072 dimensions
      }),
    })

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.text()
      console.error('OpenAI API error:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate embedding',
          context: '',
          documents: [],
          relevance_score: 0,
          suggestions: []
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.data[0].embedding

    // Search for similar documents using the function with context (includes metadata)
    console.log(`Searching with threshold: ${threshold}, topK: ${topK}, agentId: ${agentId}`)
    console.log(`Query: "${query}"`)
    
    const { data: results, error: searchError } = await supabase
      .rpc('search_knowledge_documents_with_context', {
        query_embedding: queryEmbedding,
        agent_id_param: agentId,
        match_threshold: threshold,
        match_count: topK * 2, // Buscar mais para filtrar depois
      })
    
    console.log(`Search returned ${results?.length || 0} results`)

    if (searchError) {
      console.error('Search error:', searchError)
      return new Response(
        JSON.stringify({ 
          error: 'Search failed',
          context: '',
          documents: [],
          relevance_score: 0,
          suggestions: []
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!results || results.length === 0) {
      console.log(`No results found with threshold ${threshold}. Trying with lower threshold...`)
      
      // Se não encontrou resultados, tentar com threshold mais baixo
      if (threshold > 0.2) {
        const lowerThreshold = 0.2
        const { data: lowerResults, error: lowerError } = await supabase
          .rpc('search_knowledge_documents_with_context', {
            query_embedding: queryEmbedding,
            agent_id_param: agentId,
            match_threshold: lowerThreshold,
            match_count: topK * 2,
          })
        
        if (!lowerError && lowerResults && lowerResults.length > 0) {
          console.log(`Found ${lowerResults.length} results with lower threshold ${lowerThreshold}`)
          // Continuar com os resultados encontrados
          const processedDocs: DocumentResult[] = lowerResults.map((doc: any) => ({
            id: doc.id,
            content: doc.content,
            metadata: doc.metadata || {},
            similarity: doc.similarity,
            document_description: doc.document_description,
            usage_context: doc.usage_context,
            usage_instructions: doc.usage_instructions,
            dialogue_examples: doc.dialogue_examples,
            tags: doc.tags || [],
          }))
          
          const topDocs = processedDocs.slice(0, topK)
          
          // Aplicar truncamento também no fallback (com limites extremamente restritivos)
          const MAX_DOCS_FOR_CONTEXT = 1
          const MAX_CHARS_PER_DOC = 500
          const MAX_CHARS_TOTAL = 3000
          const contextParts: string[] = []
          let totalChars = 0
          let docsAdded = 0
          
          // Limitar também o número de documentos no fallback
          const docsToProcess = topDocs.slice(0, MAX_DOCS_FOR_CONTEXT)
          
          for (const doc of docsToProcess) {
            if (totalChars >= MAX_CHARS_TOTAL || docsAdded >= MAX_DOCS_FOR_CONTEXT) break
            
            let docContent = doc.content
            if (docContent.length > MAX_CHARS_PER_DOC) {
              docContent = docContent.substring(0, MAX_CHARS_PER_DOC) + '... [texto truncado]'
            }
            
            const separator = contextParts.length > 0 ? '\n\n---\n\n' : ''
            const potentialContext = contextParts.length > 0 
              ? contextParts.join('\n\n---\n\n') + separator + docContent
              : docContent
            
            if (potentialContext.length <= MAX_CHARS_TOTAL && docsAdded < MAX_DOCS_FOR_CONTEXT) {
              contextParts.push(docContent)
              totalChars = potentialContext.length
              docsAdded++
            } else {
              break
            }
          }
          
          let context = contextParts.join('\n\n---\n\n')
          if (context.length > MAX_CHARS_TOTAL) {
            context = context.substring(0, MAX_CHARS_TOTAL) + '... [contexto truncado]'
          }
          
          const avgRelevance = topDocs.length > 0
            ? topDocs.reduce((sum, doc) => sum + doc.similarity, 0) / topDocs.length
            : 0
          
          // Truncar documentos antes de retornar
          const truncatedDocs = topDocs.map(doc => ({
            ...doc,
            content: doc.content.length > MAX_CHARS_PER_DOC 
              ? doc.content.substring(0, MAX_CHARS_PER_DOC) + '... [texto truncado]'
              : doc.content
          }))
          
          return new Response(
            JSON.stringify({
              query,
              context,
              documents: truncatedDocs,
              relevance_score: avgRelevance,
              suggestions: [],
              count: truncatedDocs.length,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }
      }
      
      return new Response(
        JSON.stringify({
          query,
          context: '',
          documents: [],
          relevance_score: 0,
          suggestions: [],
          count: 0,
          debug: {
            threshold_used: threshold,
            agent_id: agentId,
            query_length: query.length,
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Processar e rankear documentos
    const queryLower = query.toLowerCase()
    const processedDocs: DocumentResult[] = results.map((doc: any) => ({
      id: doc.id,
      content: doc.content,
      metadata: doc.metadata || {},
      similarity: doc.similarity,
      document_description: doc.document_description,
      usage_context: doc.usage_context,
      usage_instructions: doc.usage_instructions,
      dialogue_examples: doc.dialogue_examples,
      tags: doc.tags || [],
    }))

    // Filtrar por tags se especificado
    // IMPORTANTE: Se um documento não tem tags, não deve ser removido por filtro de tags
    // O filtro de tags deve apenas priorizar documentos que têm as tags buscadas
    let filteredDocs = processedDocs
    if (tags && Array.isArray(tags) && tags.length > 0) {
      const tagsLower = tags.map((t: string) => t.toLowerCase())
      filteredDocs = processedDocs.filter(doc => 
        // Manter documentos sem tags ou com tags que correspondem
        !doc.tags || doc.tags.length === 0 || doc.tags.some((tag: string) => 
          tagsLower.includes(tag.toLowerCase())
        )
      )
      console.log(`Filtered by tags: ${filteredDocs.length} documents after tag filter (${processedDocs.length} before)`)
    }

    // Calcular scores de relevância se useMetadata estiver ativo
    if (useMetadata) {
      filteredDocs = filteredDocs.map(doc => ({
        ...doc,
        relevance_score: calculateRelevanceScore(doc, query, queryLower)
      }))
      
      // Ordenar por relevância
      filteredDocs.sort((a, b) => 
        (b.relevance_score || b.similarity) - (a.relevance_score || a.similarity)
      )
    } else {
      // Se não usar metadata, manter ordenação por similaridade
      filteredDocs = filteredDocs.map(doc => ({
        ...doc,
        relevance_score: doc.similarity
      }))
    }

    // Limitar ao topK (e ainda mais restritivo para contexto)
    const MAX_DOCS_FOR_CONTEXT = 1 // Máximo 1 documento mais relevante no contexto final
    const topDocs = filteredDocs.slice(0, topK)

    // Construir contexto consolidado com truncamento extremamente agressivo
    const MAX_CHARS_PER_DOC = 500 // ~150 tokens por documento (reduzido de 1000)
    const MAX_CHARS_TOTAL = 3000 // ~900 tokens para contexto total (reduzido de 5000)
    
    const contextParts: string[] = []
    let totalChars = 0
    let docsAdded = 0
    
    // Limitar também o número de documentos (máximo 3 mais relevantes)
    const docsToProcess = topDocs.slice(0, MAX_DOCS_FOR_CONTEXT)
    
    for (const doc of docsToProcess) {
      // Se já atingiu o limite de documentos ou caracteres, para
      if (docsAdded >= MAX_DOCS_FOR_CONTEXT || totalChars >= MAX_CHARS_TOTAL) {
        break
      }
      
      // Truncar conteúdo do documento individual de forma mais agressiva
      let docContent = doc.content
      if (docContent.length > MAX_CHARS_PER_DOC) {
        docContent = docContent.substring(0, MAX_CHARS_PER_DOC) + '... [texto truncado]'
      }
      
      let docContext = docContent
      
      // Adicionar document_description se disponível (limitado a 50 chars para economizar espaço)
      if (doc.document_description) {
        const desc = doc.document_description.length > 50 
          ? doc.document_description.substring(0, 50) + '...'
          : doc.document_description
        docContext = `[${desc}]\n${docContext}`
      }
      
      // Adicionar usage_context apenas se muito relevante (limitado a 80 chars)
      if (doc.usage_context && doc.usage_context.toLowerCase().includes(queryLower.split(' ')[0])) {
        const usageContext = doc.usage_context.length > 80 
          ? doc.usage_context.substring(0, 80) + '...'
          : doc.usage_context
        docContext = `${docContext}\n[Contexto: ${usageContext}]`
      }

      // Verificar se adicionar este documento não excederia o limite total
      const separator = contextParts.length > 0 ? '\n\n---\n\n' : ''
      const potentialContext = contextParts.length > 0 
        ? contextParts.join('\n\n---\n\n') + separator + docContext
        : docContext
      
      if (potentialContext.length <= MAX_CHARS_TOTAL && docsAdded < MAX_DOCS_FOR_CONTEXT) {
        contextParts.push(docContext)
        totalChars = potentialContext.length
        docsAdded++
      } else {
        // Se adicionar este documento excederia o limite, para aqui
        break
      }
    }

    let context = contextParts.join('\n\n---\n\n')
    
    // Truncamento final de segurança (caso ainda esteja muito grande)
    if (context.length > MAX_CHARS_TOTAL) {
      context = context.substring(0, MAX_CHARS_TOTAL) + '... [contexto truncado]'
    }

    // Calcular score de relevância geral (média dos top docs)
    const avgRelevance = topDocs.length > 0
      ? topDocs.reduce((sum, doc) => sum + (doc.relevance_score || doc.similarity), 0) / topDocs.length
      : 0

    // Extrair sugestões
    const suggestions = extractSuggestions(topDocs)

    // Truncar também os documentos retornados no array (para evitar payload muito grande)
    const truncatedDocs = topDocs.map(doc => ({
      ...doc,
      content: doc.content.length > MAX_CHARS_PER_DOC 
        ? doc.content.substring(0, MAX_CHARS_PER_DOC) + '... [texto truncado]'
        : doc.content
    }))

    const response: RAGSearchResponse = {
      query,
      context,
      documents: truncatedDocs,
      relevance_score: avgRelevance,
      suggestions,
      count: truncatedDocs.length,
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        context: '',
        documents: [],
        relevance_score: 0,
        suggestions: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

