import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/contexts/OrganizationContext'
// Select nativo utilizado no lugar de um componente customizado
import { Button } from '@/components/ui/Button'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/badge'
import { chatService } from '@/services/chatService'

type SessionRow = {
  id: string
  agent_id: string
  user_id: string
  updated_at: string
  external_session_id?: string | null
}

type MessageRow = {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'human'
  content: string
  created_at: string
}

export function AgentMonitor() {
  const { currentOrganization } = useOrganization()
  const [agents, setAgents] = useState<any[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [humanInput, setHumanInput] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'alpha'>('recent')
  const [lastMessageBySession, setLastMessageBySession] = useState<Record<string, { role: MessageRow['role']; content: string; created_at: string }>>({})
  const [channelFilter, setChannelFilter] = useState<'all' | 'iframe' | 'whatsapp' | 'instagram'>('all')

  useEffect(() => {
    const loadAgents = async () => {
      if (!currentOrganization) return
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setAgents(data)
        if (data.length > 0 && !selectedAgentId) {
          setSelectedAgentId(data[0].id)
        }
      }
    }
    loadAgents()
  }, [currentOrganization])

  useEffect(() => {
    const loadSessions = async () => {
      if (!selectedAgentId) return
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id, agent_id, user_id, updated_at, external_session_id')
        .eq('agent_id', selectedAgentId)
        .order('updated_at', { ascending: false })
        .limit(100)

      if (!error && data) {
        setSessions(data as SessionRow[])
        // Buscar última mensagem de cada sessão
        const sessionIds = (data as SessionRow[]).map(s => s.id)
        if (sessionIds.length > 0) {
          const { data: msgs } = await supabase
            .from('chat_messages')
            .select('session_id, role, content, created_at')
            .in('session_id', sessionIds)
            .order('created_at', { ascending: false })

          const map: Record<string, { role: MessageRow['role']; content: string; created_at: string }> = {}
          if (msgs) {
            for (const m of msgs as any[]) {
              if (!map[m.session_id]) {
                map[m.session_id] = { role: m.role, content: m.content, created_at: m.created_at }
              }
            }
          }
          setLastMessageBySession(map)
        } else {
          setLastMessageBySession({})
        }
        if (data.length > 0) {
          setSelectedSessionId((prev) => prev || data[0].id)
        } else {
          setSelectedSessionId('')
          setMessages([])
        }
      }
    }
    loadSessions()

    const channel = selectedAgentId
      ? supabase.channel(`agent-sessions-${selectedAgentId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'chat_sessions', filter: `agent_id=eq.${selectedAgentId}` },
            async (payload) => {
              if (payload.eventType === 'INSERT') {
                setSessions((prev) => [payload.new as SessionRow, ...prev])
              } else if (payload.eventType === 'UPDATE') {
                const updated = payload.new as SessionRow
                setSessions((prev) => {
                  const next = prev.map((s) => (s.id === updated.id ? updated : s))
                  return next.sort((a, b) => (new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()))
                })
                // Buscar última mensagem da sessão atualizada e atualizar a prévia
                const { data: lm } = await supabase
                  .from('chat_messages')
                  .select('role, content, created_at')
                  .eq('session_id', updated.id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                if (lm && lm.length > 0) {
                  setLastMessageBySession((prev) => ({
                    ...prev,
                    [updated.id]: {
                      role: lm[0].role as MessageRow['role'],
                      content: lm[0].content as string,
                      created_at: lm[0].created_at as string,
                    },
                  }))
                }
              }
            }
          )
          .subscribe()
      : null

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [selectedAgentId])

  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedSessionId) return
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', selectedSessionId)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setMessages(data as MessageRow[])
      } else {
        setMessages([])
      }
    }
    loadMessages()

    const channel = selectedSessionId
      ? supabase.channel(`session-messages-${selectedSessionId}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${selectedSessionId}` },
            (payload) => {
              setMessages((prev) => [...prev, payload.new as MessageRow])
            }
          )
          .subscribe()
      : null

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [selectedSessionId])

  const selectedAgent = useMemo(() => agents.find((a) => a.id === selectedAgentId), [agents, selectedAgentId])
  const filteredSessions = useMemo(() => {
    const term = search.trim().toLowerCase()
    let list = sessions
    if (channelFilter === 'iframe') {
      list = list.filter((s) => (s as any).external_session_id)
    } else if (channelFilter === 'whatsapp') {
      list = []
    } else if (channelFilter === 'instagram') {
      list = []
    }
    if (term) {
      list = list.filter((s) => {
        const shortId = s.id.slice(0, 8)
        const lm = lastMessageBySession[s.id]
        const content = lm?.content?.toLowerCase() || ''
        return shortId.includes(term) || content.includes(term)
      })
    }
    if (sortBy === 'alpha') {
      return [...list].sort((a, b) => a.id.localeCompare(b.id))
    }
    return [...list].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }, [sessions, search, sortBy, lastMessageBySession, channelFilter])

  function isActive(updatedAt: string): boolean {
    const diffMs = Date.now() - new Date(updatedAt).getTime()
    return diffMs < 2 * 60 * 1000
  }

  function lastRoleBadge(role?: MessageRow['role']) {
    if (!role) return null
    const cls =
      role === 'user' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
      role === 'human' ? 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100' :
      'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    const label = role === 'user' ? 'user' : role === 'human' ? 'human' : 'ai'
    return <span className={`text-[10px] px-1.5 py-0.5 rounded ${cls}`}>{label}</span>
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="min-w-[280px]">
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="" disabled>Selecione um agente</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card className="border border-orange-500/20 shadow-2xl shadow-orange-500/10">
              <CardHeader className="py-3 space-y-3 border-b border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-transparent">
                <CardTitle className="text-base">Conversas</CardTitle>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    className={`px-2 py-1 rounded border ${channelFilter === 'all' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setChannelFilter('all')}
                  >
                    Todos
                  </button>
                  <button
                    className={`px-2 py-1 rounded border ${channelFilter === 'iframe' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setChannelFilter('iframe')}
                  >
                    Iframe
                  </button>
                  <button
                    className={`px-2 py-1 rounded border border-dashed text-gray-400 cursor-not-allowed`}
                    title="Em breve"
                    disabled
                  >
                    WhatsApp (em breve)
                  </button>
                  <button
                    className={`px-2 py-1 rounded border border-dashed text-gray-400 cursor-not-allowed`}
                    title="Em breve"
                    disabled
                  >
                    Instagram (em breve)
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por ID ou conteúdo…"
                    className="focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded px-2 py-2 text-xs focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="recent">Recentes</option>
                    <option value="alpha">A–Z</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[70vh] overflow-y-auto divide-y">
                  {filteredSessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSessionId(s.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all ${
                        selectedSessionId === s.id ? 'bg-gray-50 dark:bg-gray-900 ring-1 ring-orange-500/30' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium flex items-center gap-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" style={{ opacity: isActive(s.updated_at) ? 1 : 0.2 }} />
                          {s.id.slice(0, 8)}…
                          <Badge variant="outline" className={`${lastMessageBySession[s.id]?.role === 'user' ? 'border-blue-400 text-blue-600 dark:text-blue-300' : lastMessageBySession[s.id]?.role === 'human' ? 'border-amber-500 text-amber-700 dark:text-amber-200' : 'border-gray-400 text-gray-600 dark:text-gray-300' }`}> 
                            {lastMessageBySession[s.id]?.role === 'user' ? 'user' : lastMessageBySession[s.id]?.role === 'human' ? 'human' : 'ai'}
                          </Badge>
                        </div>
                        <div className="text-[10px] text-gray-500">{new Date(s.updated_at).toLocaleTimeString('pt-BR')}</div>
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                        {lastMessageBySession[s.id]?.content || '—'}
                      </div>
                    </button>
                  ))}
                  {filteredSessions.length === 0 && (
                    <div className="p-4 text-sm text-gray-500">Nenhuma conversa para este agente.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card className="overflow-hidden border border-orange-500/30 shadow-2xl shadow-orange-500/20">
              <CardHeader className="py-3">
                <div>
                  {selectedAgent ? (
                    <div className="text-sm text-gray-600 dark:text-gray-300">Agente: {selectedAgent.name}</div>
                  ) : (
                    <div className="text-sm text-gray-500">Selecione um agente</div>
                  )}
                  {selectedSessionId && (
                    <div className="text-xs text-gray-500">Sessão {selectedSessionId.slice(0, 8)}…</div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[62vh] md:h-[66vh] overflow-y-auto p-4 space-y-3">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                        m.role === 'user'
                          ? 'bg-orange-600 text-white'
                          : m.role === 'human'
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100'
                            : 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800'
                      }`}>
                        <div className="whitespace-pre-wrap break-words">{m.content}</div>
                        <div className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleTimeString('pt-BR')}</div>
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && selectedSessionId && (
                    <div className="text-sm text-gray-500">Sem mensagens nesta sessão.</div>
                  )}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-800 p-3 flex items-center gap-2 bg-white dark:bg-gray-950">
                  <input
                    value={humanInput}
                    onChange={(e) => setHumanInput(e.target.value)}
                    placeholder="Enviar intervenção humana..."
                    className="flex-1 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm"
                  />
                  <Button
                    onClick={async () => {
                      if (!humanInput.trim() || !selectedSessionId) return
                      const content = humanInput.trim()
                      setHumanInput('')
                      try {
                        const saved = await chatService.saveMessage(selectedSessionId, 'human', content)
                        setMessages((prev) => [...prev, saved as unknown as MessageRow])
                      } catch (e) {
                        // ignore; RLS pode bloquear até ajustarmos políticas
                      }
                    }}
                    disabled={!humanInput.trim() || !selectedSessionId}
                  >
                    Enviar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default AgentMonitor


