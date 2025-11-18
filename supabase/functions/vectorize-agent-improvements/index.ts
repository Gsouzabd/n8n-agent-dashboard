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
    const { improvementId, agentId } = await req.json()

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get OpenAI API key from environment
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Build query to get improvements without embeddings
    let query = supabase
      .from('agent_improvements')
      .select('id, content, agent_id, metadata')
      .is('embedding', null)

    // Filter by improvementId if provided
    if (improvementId) {
      query = query.eq('id', improvementId)
    }

    // Filter by agentId if provided
    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    const { data: improvements, error: fetchError } = await query

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch improvements', details: fetchError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!improvements || improvements.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No improvements found without embeddings',
          processed: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Process each improvement
    const results = []
    // Using text-embedding-ada-002 for 1536 dimensions (matches vector(1536) column)
    // Note: text-embedding-3-small has 512 dims, text-embedding-3-large has 3072 dims
    const embeddingModel = 'text-embedding-ada-002' // 1536 dimensions

    for (const improvement of improvements) {
      try {
        // Generate embedding using OpenAI
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: embeddingModel,
            input: improvement.content.substring(0, 8000), // Limite de tokens
            encoding_format: 'float',
          }),
        })

        if (!embeddingResponse.ok) {
          const error = await embeddingResponse.text()
          console.error(`OpenAI API error for ${improvement.id}:`, error)
          results.push({
            id: improvement.id,
            status: 'error',
            error: 'Failed to generate embedding'
          })
          continue
        }

        const embeddingData = await embeddingResponse.json()
        const embedding = embeddingData.data[0].embedding

        // Ensure metadata has agent_id
        let metadata = improvement.metadata || {}
        if (!metadata.agent_id && improvement.agent_id) {
          metadata = { ...metadata, agent_id: improvement.agent_id }
        }

        // Update improvement with embedding
        const { error: updateError } = await supabase
          .from('agent_improvements')
          .update({ 
            embedding: JSON.stringify(embedding),
            metadata: metadata
          })
          .eq('id', improvement.id)

        if (updateError) {
          console.error(`Update error for ${improvement.id}:`, updateError)
          results.push({
            id: improvement.id,
            status: 'error',
            error: updateError.message
          })
        } else {
          results.push({
            id: improvement.id,
            status: 'success',
            tokens: embeddingData.usage?.total_tokens || 0
          })
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`Error processing ${improvement.id}:`, error)
        results.push({
          id: improvement.id,
          status: 'error',
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${successCount} improvements successfully, ${errorCount} errors`,
        total: improvements.length,
        processed: successCount,
        errors: errorCount,
        results: results
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

