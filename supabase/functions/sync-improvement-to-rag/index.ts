import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, x-supabase-authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface RequestBody {
  agent_id?: string
  count?: number
}

async function generateEmbedding(text: string, openaiKey: string): Promise<number[]> {
  // Truncate if too long (max 2000 chars)
  const truncatedText = text.length > 2000 ? text.substring(0, 2000) : text

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-large',
      input: truncatedText,
      encoding_format: 'float',
      dimensions: 3072,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiKey = Deno.env.get('OPENAI_API_KEY')

    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const body: RequestBody = await req.json()
    const agentId = body.agent_id
    const count = body.count || 10

    // Build query to get pending improvements
    let query = supabase
      .from('agent_improvements')
      .select('id, agent_id, content')
      .is('embedding', null)
      .order('created_at', { ascending: true })
      .limit(count)

    // Filter by agent_id if provided
    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    const { data: improvements, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching improvements:', fetchError)
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
        JSON.stringify({ processed: 0, updated: 0, message: 'No pending improvements found' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Processing ${improvements.length} improvements`)

    let processed = 0
    let updated = 0
    const errors: string[] = []

    // Process each improvement
    for (const improvement of improvements) {
      try {
        if (!improvement.content || improvement.content.trim().length === 0) {
          console.warn(`Skipping improvement ${improvement.id}: empty content`)
          continue
        }

        // Generate embedding
        const embedding = await generateEmbedding(improvement.content, openaiKey)
        processed++

        // Update the record with embedding (pass array directly, Supabase handles conversion)
        const { error: updateError } = await supabase
          .from('agent_improvements')
          .update({ embedding })
          .eq('id', improvement.id)

        if (updateError) {
          console.error(`Error updating improvement ${improvement.id}:`, updateError)
          errors.push(`Failed to update ${improvement.id}: ${updateError.message}`)
        } else {
          updated++
          console.log(`✅ Updated improvement ${improvement.id}`)
        }
      } catch (error) {
        console.error(`Error processing improvement ${improvement.id}:`, error)
        errors.push(`Failed to process ${improvement.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return new Response(
      JSON.stringify({
        processed,
        updated,
        total: improvements.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in sync-improvement-to-rag:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

