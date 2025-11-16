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

    // Get pending items from queue (max 10 at a time)
    const { data: queueItems, error: queueError } = await supabase
      .from('embedding_queue')
      .select('id, improvement_id, agent_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (queueError) {
      console.error('Queue fetch error:', queueError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch queue', details: queueError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No pending items in queue',
          processed: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Process each item
    const results = []
    const embeddingModel = 'text-embedding-ada-002' // 1536 dimensions

    for (const queueItem of queueItems) {
      try {
        // Mark as processing
        await supabase
          .from('embedding_queue')
          .update({ status: 'processing' })
          .eq('id', queueItem.id)

        // Get the improvement
        const { data: improvement, error: impError } = await supabase
          .from('agent_improvements')
          .select('id, content, agent_id, metadata, embedding')
          .eq('id', queueItem.improvement_id)
          .single()

        if (impError || !improvement) {
          await supabase
            .from('embedding_queue')
            .update({ 
              status: 'failed',
              error_message: 'Improvement not found',
              processed_at: new Date().toISOString()
            })
            .eq('id', queueItem.id)
          
          results.push({
            queueId: queueItem.id,
            improvementId: queueItem.improvement_id,
            status: 'error',
            error: 'Improvement not found'
          })
          continue
        }

        // Skip if already has embedding
        if (improvement.embedding) {
          await supabase
            .from('embedding_queue')
            .update({ 
              status: 'completed',
              processed_at: new Date().toISOString()
            })
            .eq('id', queueItem.id)
          
          results.push({
            queueId: queueItem.id,
            improvementId: improvement.id,
            status: 'skipped',
            message: 'Already has embedding'
          })
          continue
        }

        // Generate embedding using OpenAI
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: embeddingModel,
            input: improvement.content.substring(0, 8000),
            encoding_format: 'float',
          }),
        })

        if (!embeddingResponse.ok) {
          const error = await embeddingResponse.text()
          console.error(`OpenAI API error for ${improvement.id}:`, error)
          
          await supabase
            .from('embedding_queue')
            .update({ 
              status: 'failed',
              error_message: 'Failed to generate embedding: ' + error.substring(0, 200),
              processed_at: new Date().toISOString()
            })
            .eq('id', queueItem.id)
          
          results.push({
            queueId: queueItem.id,
            improvementId: improvement.id,
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
          
          await supabase
            .from('embedding_queue')
            .update({ 
              status: 'failed',
              error_message: 'Failed to update improvement: ' + updateError.message,
              processed_at: new Date().toISOString()
            })
            .eq('id', queueItem.id)
          
          results.push({
            queueId: queueItem.id,
            improvementId: improvement.id,
            status: 'error',
            error: updateError.message
          })
        } else {
          // Mark queue item as completed
          await supabase
            .from('embedding_queue')
            .update({ 
              status: 'completed',
              processed_at: new Date().toISOString()
            })
            .eq('id', queueItem.id)
          
          results.push({
            queueId: queueItem.id,
            improvementId: improvement.id,
            status: 'success',
            tokens: embeddingData.usage?.total_tokens || 0
          })
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`Error processing queue item ${queueItem.id}:`, error)
        
        await supabase
          .from('embedding_queue')
          .update({ 
            status: 'failed',
            error_message: error.message?.substring(0, 200) || 'Unknown error',
            processed_at: new Date().toISOString()
          })
          .eq('id', queueItem.id)
        
        results.push({
          queueId: queueItem.id,
          improvementId: queueItem.improvement_id,
          status: 'error',
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length
    const skippedCount = results.filter(r => r.status === 'skipped').length

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${successCount} successfully, ${skippedCount} skipped, ${errorCount} errors`,
        total: queueItems.length,
        processed: successCount,
        skipped: skippedCount,
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

