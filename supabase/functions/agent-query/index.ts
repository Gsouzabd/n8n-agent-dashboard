import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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

  try {
    const { agentId, query, topK = 5, threshold = 0.7 } = await req.json()

    if (!agentId || !query) {
      return new Response(
        JSON.stringify({ error: 'agentId and query are required' }),
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

    // Get OpenAI API key from environment
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured',
          documents: [],
          context: ''
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Generate embedding for the query using OpenAI
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: query,
      }),
    })

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.text()
      console.error('OpenAI API error:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate embedding',
          documents: [],
          context: ''
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.data[0].embedding

    // Search for similar documents using the search function
    const { data: results, error: searchError } = await supabase
      .rpc('search_knowledge_documents', {
        query_embedding: queryEmbedding,
        agent_id_param: agentId,
        match_threshold: threshold,
        match_count: topK,
      })

    if (searchError) {
      console.error('Search error:', searchError)
      return new Response(
        JSON.stringify({ 
          error: 'Search failed',
          documents: [],
          context: ''
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Build context from results
    const context = results
      .map((doc: any) => doc.content)
      .join('\n\n---\n\n')

    return new Response(
      JSON.stringify({
        query,
        documents: results,
        context,
        count: results.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

