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
    const { improvementId } = await req.json()

    if (!improvementId) {
      return new Response(
        JSON.stringify({ error: 'improvementId is required' }),
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
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get the improvement
    const { data: improvement, error: fetchError } = await supabase
      .from('agent_improvements')
      .select('id, content, agent_id, metadata, embedding')
      .eq('id', improvementId)
      .single()

    if (fetchError || !improvement) {
      return new Response(
        JSON.stringify({ error: 'Improvement not found', details: fetchError?.message }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Skip if already has embedding
    if (improvement.embedding) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Improvement already has embedding',
          improvementId: improvement.id
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Generate embedding using OpenAI
    const embeddingModel = 'text-embedding-ada-002' // 1536 dimensions
    
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
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate embedding',
          details: error
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
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
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update improvement',
          details: updateError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Update queue status if exists
    await supabase
      .from('embedding_queue')
      .update({ 
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('improvement_id', improvement.id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Embedding generated successfully',
        improvementId: improvement.id,
        tokens: embeddingData.usage?.total_tokens || 0
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


