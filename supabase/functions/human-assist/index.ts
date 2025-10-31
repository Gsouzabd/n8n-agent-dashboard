import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

interface AssistPayload {
  agent_id: string
  session_id: string
  user_message: string
  ai_message?: string
  metadata?: Record<string, unknown>
}


function isUuid(v: string): boolean {
  return /^[0-9a-fA-F-]{36}$/.test(v)
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } })
  }
  // Auth: somente Bearer JWT (verificado pelo Supabase quando verify_jwt=true)

  let body: AssistPayload
  try {
    body = await req.json()
  } catch (_) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const { agent_id, session_id, user_message, ai_message } = body || ({} as AssistPayload)
  if (!agent_id || !session_id || !user_message) {
    return new Response(JSON.stringify({ error: 'Missing fields: agent_id, session_id, user_message' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
  if (!isUuid(agent_id) || !isUuid(session_id)) {
    return new Response(JSON.stringify({ error: 'agent_id/session_id must be UUID' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const supabase = createClient(url, serviceKey)

  // find organization_id for agent
  const { data: agent, error: agentErr } = await supabase
    .from('agents')
    .select('organization_id')
    .eq('id', agent_id)
    .single()

  if (agentErr) {
    return new Response(JSON.stringify({ error: 'Agent not found' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const insertPayload: Record<string, unknown> = {
    organization_id: agent?.organization_id || null,
    agent_id,
    session_id,
    user_message,
    ai_message: ai_message || null,
    status: 'pending',
  }

  const { data: row, error: insErr } = await supabase
    .from('human_assist_requests')
    .insert(insertPayload)
    .select('id')
    .single()

  if (insErr) {
    return new Response(JSON.stringify({ error: 'Failed to create request' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ request_id: row?.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
