import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { widgetId, eventType, referrer, referrerDomain, userAgent, conversationId } = await req.json()

    if (!widgetId || !eventType) {
      return new Response(
        JSON.stringify({ error: 'widgetId and eventType are required' }),
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

    // Get widget by widget_id (public ID)
    const { data: widget, error: widgetError } = await supabase
      .from('agent_widgets')
      .select('id')
      .eq('widget_id', widgetId)
      .eq('is_active', true)
      .single()

    if (widgetError || !widget) {
      return new Response(
        JSON.stringify({ error: 'Widget not found or inactive' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Insert analytics event
    const { error: insertError } = await supabase
      .from('widget_analytics')
      .insert({
        widget_id: widget.id,
        event_type: eventType,
        referrer_url: referrer || null,
        referrer_domain: referrerDomain || null,
        user_agent: userAgent || null,
        conversation_id: conversationId || null,
      })

    if (insertError) {
      console.error('Error inserting analytics:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to insert analytics' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Update widget counters using RPC
    if (eventType === 'impression') {
      await supabase.rpc('increment_widget_counter', { 
        widget_uuid: widget.id, 
        counter_type: 'impressions' 
      })
    } else if (eventType === 'open' || eventType === 'message') {
      // Count as conversation if it's the first open or message from this domain
      const { count } = await supabase
        .from('widget_analytics')
        .select('*', { count: 'exact', head: true })
        .eq('widget_id', widget.id)
        .eq('event_type', 'open')
        .eq('referrer_domain', referrerDomain || '')

      if (count === 1) {
        await supabase.rpc('increment_widget_counter', { 
          widget_uuid: widget.id, 
          counter_type: 'conversations' 
        })
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in widget-analytics:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

