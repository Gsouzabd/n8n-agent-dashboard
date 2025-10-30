import { supabase } from '@/lib/supabase'
import { ChatMessage, ChatSession, Agent } from '@/types'

export const chatService = {
  /**
   * Get or create a chat session by external_session_id (anonymous iframe)
   */
  async getOrCreateSessionByExternal(agentId: string, externalSessionId: string): Promise<string> {
    // Try to find existing session for this external id
    const { data: existing, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('agent_id', agentId)
      .eq('external_session_id', externalSessionId)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching external session:', fetchError)
      throw new Error('Failed to fetch chat session')
    }

    if (existing?.id) {
      // bump updated_at
      await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', existing.id)
      return existing.id
    }

    // Resolve organization for agent (optional but helpful for RLS/scoping)
    const { data: agentRow, error: agentErr } = await supabase
      .from('agents')
      .select('organization_id')
      .eq('id', agentId)
      .single()

    if (agentErr) {
      console.warn('Could not fetch agent organization_id; continuing without it:', agentErr)
    }

    const insertPayload: Record<string, unknown> = {
      agent_id: agentId,
      external_session_id: externalSessionId,
    }
    if (agentRow?.organization_id) insertPayload['organization_id'] = agentRow.organization_id

    const { data: created, error: createError } = await supabase
      .from('chat_sessions')
      .insert(insertPayload)
      .select('id')
      .single()

    if (createError || !created) {
      console.error('Error creating external session:', createError)
      throw new Error('Failed to create chat session')
    }

    return created.id
  },
  /**
   * Set like/dislike for a message, preferring user_id; fallback to session_id
   */
  async setMessageFeedback(params: {
    messageId: string
    agentId: string
    sessionId: string
    value: 1 | -1
  }): Promise<{ value: 1 | -1 }>
  {
    const { messageId, agentId, sessionId, value } = params
    const { data: userRes } = await supabase.auth.getUser()
    const userId = userRes?.user?.id ?? null

    const feedback_type = value === 1 ? 'positive' : 'negative'

    const actorFilter = userId
      ? { column: 'user_id', value: userId }
      : { column: 'session_id', value: sessionId }

    // 1) Tenta buscar existente
    const { data: existing, error: fetchError } = await supabase
      .from('message_feedback')
      .select('id')
      .eq('message_id', messageId)
      .eq(actorFilter.column, actorFilter.value)
      .maybeSingle()

    if (fetchError) {
      throw new Error('Falha ao buscar feedback existente')
    }

    // 2) Se existir, atualiza
    if (existing) {
      const { error: updateError } = await supabase
        .from('message_feedback')
        .update({ value, feedback_type, block_index: 0 })
        .eq('id', existing.id)

      if (updateError) throw new Error('Falha ao atualizar feedback')
      return { value }
    }

    // 3) Caso contrário, insere; se houver corrida (23505), faz update
    const insertPayload: Record<string, unknown> = {
      message_id: messageId,
      agent_id: agentId,
      conversation_id: sessionId,
      value,
      feedback_type,
      block_index: 0,
    }
    if (userId) insertPayload['user_id'] = userId
    else insertPayload['session_id'] = sessionId

    const { error: insertError } = await supabase
      .from('message_feedback')
      .insert(insertPayload)

    if (insertError) {
      // @ts-ignore supabase error code
      if (insertError.code === '23505') {
        const { data: again } = await supabase
          .from('message_feedback')
          .select('id')
          .eq('message_id', messageId)
          .eq(actorFilter.column, actorFilter.value)
          .maybeSingle()

        if (again) {
          const { error: updateError } = await supabase
            .from('message_feedback')
            .update({ value, feedback_type, block_index: 0 })
            .eq('id', again.id)

          if (updateError) throw new Error('Falha ao atualizar feedback após conflito')
          return { value }
        }
      }
      throw new Error('Falha ao registrar feedback')
    }

    return { value }
  },
  /**
   * Get or create a chat session for an agent
   */
  async getOrCreateSession(agentId: string, userId: string): Promise<string> {
    // Try to find existing session
    const { data: existingSessions, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('agent_id', agentId)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (fetchError) {
      console.error('Error fetching session:', fetchError)
      throw new Error('Failed to fetch chat session')
    }

    if (existingSessions && existingSessions.length > 0) {
      // Update the session timestamp
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', existingSessions[0].id)

      return existingSessions[0].id
    }

    // Create new session
    const { data: newSession, error: createError } = await supabase
      .from('chat_sessions')
      .insert({
        agent_id: agentId,
        user_id: userId,
      })
      .select('id')
      .single()

    if (createError || !newSession) {
      console.error('Error creating session:', createError)
      throw new Error('Failed to create chat session')
    }

    return newSession.id
  },

  /**
   * Create a new chat session (always creates, never reuses)
   */
  async createNewSession(agentId: string, userId: string): Promise<string> {
    const { data: newSession, error: createError } = await supabase
      .from('chat_sessions')
      .insert({
        agent_id: agentId,
        user_id: userId,
      })
      .select('id')
      .single()

    if (createError || !newSession) {
      console.error('Error creating new session:', createError)
      throw new Error('Failed to create new chat session')
    }

    return newSession.id
  },

  /**
   * Get messages for a session
   */
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      throw new Error('Failed to fetch messages')
    }

    return data || []
  },

  /**
   * Get actor's overall feedback for a session (block_index null/0 across messages)
   */
  async getActorSessionFeedback(sessionId: string): Promise<'positive' | 'negative' | null> {
    const { data: userRes } = await supabase.auth.getUser()
    const userId = userRes?.user?.id ?? null

    let query = supabase
      .from('message_feedback')
      .select('feedback_type, created_at')
      .eq('conversation_id', sessionId)
      .or('block_index.is.null,block_index.eq.0')
      .order('created_at', { ascending: false })
      .limit(1)

    if (userId) query = query.eq('user_id', userId)
    else query = query.eq('session_id', sessionId)

    const { data, error } = await query
    if (error) return null
    if (!data || data.length === 0) return null
    const type = data[0].feedback_type as 'positive' | 'negative'
    return type ?? null
  },

  /**
   * Save a message to the database
   */
  async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'human',
    content: string
  ): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role,
        content,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('Error saving message:', error)
      throw new Error('Failed to save message')
    }

    return data
  },

  /**
   * Send message to n8n webhook and get response
   */
  async sendMessageToN8n(
    agent: Agent,
    sessionId: string,
    message: string,
    history: ChatMessage[]
  ): Promise<string> {
    if (!agent.webhook_url) {
      throw new Error('Agent webhook not configured')
    }

    // Prepare history in simple format
    const formattedHistory = history.map(msg => ({
      role: msg.role,
      content: msg.content,
    }))

    const payload = {
      agent_id: agent.id,
      session_id: sessionId,
      message: message,
      history: formattedHistory,
    }

    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    // Add basic auth if configured
    if (agent.auth_type === 'basic' && agent.auth_username && agent.auth_password) {
      const credentials = btoa(`${agent.auth_username}:${agent.auth_password}`)
      headers['Authorization'] = `Basic ${credentials}`
    }

    try {
      const response = await fetch(agent.webhook_url, {
        method: agent.webhook_method || 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('n8n webhook error:', errorText)
        throw new Error(`Webhook returned ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      // Extract response from n8n
      if (data.response) {
        return data.response
      } else if (typeof data === 'string') {
        return data
      } else {
        console.warn('Unexpected response format:', data)
        return JSON.stringify(data)
      }
    } catch (error) {
      console.error('Error calling webhook:', error)
      throw new Error('Failed to get response from AI agent')
    }
  },

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<ChatSession[]> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching sessions:', error)
      throw new Error('Failed to fetch sessions')
    }

    return data || []
  },

  /**
   * Delete all messages from a session (but keep the session)
   */
  async clearSessionMessages(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('session_id', sessionId)

    if (error) {
      console.error('Error clearing messages:', error)
      throw new Error('Failed to clear messages')
    }
  },

  /**
   * Delete a session and all its messages
   */
  async deleteSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      console.error('Error deleting session:', error)
      throw new Error('Failed to delete session')
    }
  },

  /**
   * Get actor's (user or external session) last feedback value for a session
   */
  async getActorSessionFeedback(sessionId: string): Promise<'positive' | 'negative' | null> {
    const { data: userRes } = await supabase.auth.getUser()
    const userId = userRes?.user?.id ?? null

    let query = supabase
      .from('message_feedback')
      .select('feedback_type, value')
      .eq('conversation_id', sessionId)
      .or('block_index.is.null,block_index.eq.0')
      .order('created_at', { ascending: false })
      .limit(1)

    if (userId) query = query.eq('user_id', userId)
    else query = query.eq('session_id', sessionId)

    const { data, error } = await query
    if (error) return null
    if (!data || data.length === 0) return null

    const row = data[0] as any
    if (row.value === 1 || row.feedback_type === 'positive') return 'positive'
    if (row.value === -1 || row.feedback_type === 'negative') return 'negative'
    return null
  },
}

