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
    // Get agent ID from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const agentId = pathParts[pathParts.length - 1]

    if (!agentId) {
      return new Response(
        JSON.stringify({ error: 'Agent ID is required' }),
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

    // Fetch agent configuration
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Fetch knowledge bases
    const { data: knowledgeBases, error: kbError } = await supabase
      .from('knowledge_bases')
      .select('id, name, description')
      .eq('agent_id', agentId)

    // Fetch handoff configuration
    const { data: handoffConfig } = await supabase
      .from('agent_handoff_config')
      .select('enabled')
      .eq('agent_id', agentId)
      .maybeSingle()

    // Fetch active handoff triggers
    const { data: triggers } = await supabase
      .from('agent_handoff_triggers')
      .select('trigger_type, value, matching_type')
      .eq('agent_id', agentId)
      .eq('is_active', true)

    // Build response
    const config = {
      agentId: agent.id,
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.system_prompt,
      webhook: {
        url: agent.webhook_url,
        method: agent.webhook_method,
        path: agent.webhook_path,
        authentication: {
          type: agent.auth_type,
          username: agent.auth_username,
        },
      },
      knowledgeBase: {
        enabled: knowledgeBases && knowledgeBases.length > 0,
        bases: knowledgeBases || [],
        searchEndpoint: `${supabaseUrl}/functions/v1/agent-query`,
      },
      handoff: {
        enabled: handoffConfig?.enabled || false,
        triggers: (triggers || []).map(t => ({
          type: t.trigger_type,
          value: t.value,
          matchingType: t.matching_type,
        })),
      },
      createdAt: agent.created_at,
      updatedAt: agent.updated_at,
    }

    return new Response(
      JSON.stringify(config),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

