import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/contexts/OrganizationContext'
// Select nativo utilizado no lugar de um componente customizado
import { Button } from '@/components/ui/Button'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/badge'
import { Instagram, MessageCircle, Trash2 } from 'lucide-react'
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
  author_user_id?: string | null
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
  const [feedbackBySession, setFeedbackBySession] = useState<Record<string, 'positive' | 'negative'>>({})
  const [assistRequests, setAssistRequests] = useState<any[]>([])
  const [selectedAssistId, setSelectedAssistId] = useState<string>('')
  const filteredAssistRequests = useMemo(() => assistRequests.filter((r) => !selectedAgentId || r.agent_id === selectedAgentId), [assistRequests, selectedAgentId])
  const dedupedAssistBySession = useMemo(() => {
    const bySession = new Map<string, any>()
    const rank = (s: any) => (s.status === 'in_progress' ? 2 : s.status === 'pending' ? 1 : 0)
    for (const r of filteredAssistRequests) {
      const ex = bySession.get(r.session_id)
      if (!ex) { bySession.set(r.session_id, r); continue }
      const better = rank(r) > rank(ex) || (rank(r) === rank(ex) && new Date(r.created_at).getTime() > new Date(ex.created_at).getTime())
      if (better) bySession.set(r.session_id, r)
    }
    return Array.from(bySession.values())
  }, [filteredAssistRequests])
  const openAssistByAgent = useMemo(() => dedupedAssistBySession.filter((r: any) => r.status === 'pending' || r.status === 'in_progress'), [dedupedAssistBySession])
  const assistForHeader = useMemo(() => {
    const byId = assistRequests.find((r) => r.id === selectedAssistId && r.session_id === selectedSessionId && r.agent_id === selectedAgentId)
    if (byId) return byId
    const rank = (s: any) => (s.status === 'in_progress' ? 2 : s.status === 'pending' ? 1 : 0)
    const sameSession = assistRequests.filter((r) => r.session_id === selectedSessionId && r.agent_id === selectedAgentId)
    return sameSession.sort((a, b) => rank(b) - rank(a) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  }, [assistRequests, selectedAssistId, selectedSessionId, selectedAgentId])
  const claimedAssistForSelected = assistForHeader && assistForHeader.status === 'in_progress' ? assistForHeader : null
  const pendingAssistForSelected = assistForHeader && assistForHeader.status === 'pending' ? assistForHeader : null

  // Ao trocar de agente, limpar conversa/seleções para não carregar conversa do agente anterior
  useEffect(() => {
    setSelectedSessionId('')
    setMessages([])
    setSessions([])
    setLastMessageBySession({})
    setFeedbackBySession({})
    setHumanInput('')
    setSelectedAssistId('')
  }, [selectedAgentId])


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
      
      // Buscar todas as sessões do agente
      const { data: allSessions, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select('id, agent_id, user_id, updated_at, external_session_id')
        .eq('agent_id', selectedAgentId)
        .order('updated_at', { ascending: false })
        .limit(100)

      if (sessionsError) {
        console.error('Error loading sessions:', sessionsError)
        return
      }

      if (!allSessions || allSessions.length === 0) {
        setSessions([])
        setLastMessageBySession({})
        setFeedbackBySession({})
        setSelectedSessionId('')
        setMessages([])
        return
      }

      // Buscar IDs de sessões que têm mensagens
      const { data: messagesWithSessions } = await supabase
        .from('chat_messages')
        .select('session_id')
        .in('session_id', allSessions.map(s => s.id))

      // Extrair IDs únicos de sessões com mensagens
      const sessionIdsWithMessages = new Set<string>()
      if (messagesWithSessions && messagesWithSessions.length > 0) {
        for (const msg of messagesWithSessions) {
          sessionIdsWithMessages.add(msg.session_id)
        }
      }

      // Filtrar apenas sessões que têm mensagens
      const sessionsArray = allSessions
        .filter(s => sessionIdsWithMessages.has(s.id))
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

      setSessions(sessionsArray as SessionRow[])

      // Buscar última mensagem de cada sessão
      const sessionIds = sessionsArray.map(s => s.id)
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
        
        // Buscar feedback recente por sessão
        const { data: fbs } = await supabase
          .from('message_feedback')
          .select('conversation_id, feedback_type, created_at')
          .in('conversation_id', sessionIds)
          .or('block_index.is.null,block_index.eq.0')
          .order('created_at', { ascending: false })
        const fbMap: Record<string, 'positive' | 'negative'> = {}
        if (fbs) {
          for (const r of fbs as any[]) {
            const cid = r.conversation_id
            if (!(cid in fbMap)) {
              fbMap[cid] = r.feedback_type
            }
          }
        }
        setFeedbackBySession(fbMap)
      } else {
        setLastMessageBySession({})
        setFeedbackBySession({})
      }
      
      if (sessionsArray.length > 0) {
        setSelectedSessionId(sessionsArray[0].id)
      } else {
        setSelectedSessionId('')
        setMessages([])
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
                // Buscar feedback recente desta sessão
                const { data: fbr } = await supabase
                  .from('message_feedback')
                  .select('feedback_type, created_at')
                  .eq('conversation_id', updated.id)
                  .or('block_index.is.null,block_index.eq.0')
                  .order('created_at', { ascending: false })
                  .limit(1)
                if (fbr && fbr.length > 0) {
                  setFeedbackBySession((prev) => ({ ...prev, [updated.id]: fbr[0].feedback_type }))
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

  // Load assist requests (pending/in_progress) for selected agent + realtime
  useEffect(() => {
    const load = async () => {
      if (!selectedAgentId) return
      const { data } = await supabase
        .from('human_assist_requests')
        .select('*')
        .eq('agent_id', selectedAgentId)
        .in('status', ['pending','in_progress'])
        .order('created_at', { ascending: false })
      setAssistRequests(data || [])
    }
    load()

    const ch = selectedAgentId
      ? supabase.channel(`assist-agent-${selectedAgentId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'human_assist_requests', filter: `agent_id=eq.${selectedAgentId}` }, (payload) => {
            if (payload.eventType === 'INSERT') {
              const n = payload.new as any
              if (n.status === 'pending' || n.status === 'in_progress') setAssistRequests((prev) => [payload.new, ...prev])
            } else if (payload.eventType === 'UPDATE') {
              setAssistRequests((prev) => {
                const next = prev.filter((r) => r.id !== (payload.new as any).id)
                const n = payload.new as any
                if (n.status === 'pending' || n.status === 'in_progress') next.unshift(payload.new)
                return next
              })
            } else if (payload.eventType === 'DELETE') {
              setAssistRequests((prev) => prev.filter((r) => r.id !== (payload.old as any).id))
            }
          })
          .subscribe()
      : null

    return () => {
      if (ch) supabase.removeChannel(ch)
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
              setMessages((prev) => {
                const exists = prev.some((m) => m.id === (payload.new as MessageRow).id)
                return exists ? prev : [...prev, payload.new as MessageRow]
              })
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
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-800 rounded">
                  <div className="text-xs font-medium text-amber-800 dark:text-amber-200">Intervenções pendentes: {openAssistByAgent.length}</div>
                  <div className="mt-2 flex flex-col gap-2 max-h-40 overflow-y-auto">
                    {openAssistByAgent.length === 0 ? (
                      <div className="text-xs text-amber-700/80 dark:text-amber-200/70">Nenhuma intervenção para este agente.</div>
                    ) : (
                      openAssistByAgent.map((r) => (
                        <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
                          <div className="truncate">
                            Sessão {String(r.session_id).slice(0, 8)}… — {r.user_message?.slice(0, 60)}
                          </div>
                          <div className="flex items-center gap-1">
                            {r.status === 'pending' && (
                            <button
                              className="px-2 py-0.5 rounded bg-amber-600 text-white hover:bg-amber-500"
                              onClick={async () => {
                                const { data: { user } } = await supabase.auth.getUser()
                                // Atualizar estado local imediatamente (otimistic update)
                                setAssistRequests((prev) => 
                                  prev.map((req) => 
                                    req.id === r.id
                                      ? { ...req, status: 'in_progress', claimed_by: user?.id || null }
                                      : req
                                  )
                                )
                                // Atualizar no banco
                                await supabase
                                  .from('human_assist_requests')
                                  .update({ status: 'in_progress', claimed_by: user?.id || null })
                                  .eq('id', r.id)
                              }}
                            >
                              Atender
                            </button>
                            )}
                            <button
                              className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700"
                              onClick={() => { setSelectedSessionId(r.session_id); setSelectedAssistId(r.id) }}
                            >
                              Abrir
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {/* Todos */}
                  <button
                    className={`px-3 py-1.5 rounded-full shadow transition ${
                      channelFilter === 'all'
                        ? 'bg-gray-800 text-white shadow-gray-800/40 dark:bg-gray-200 dark:text-gray-900'
                        : 'bg-gray-200 text-gray-800 hover:shadow-md dark:bg-gray-800 dark:text-gray-200'
                    }`}
                    onClick={() => setChannelFilter('all')}
                  >
                    Todos
                  </button>
                  {/* Iframe (App) */}
                  <button
                    className={`px-3 py-1.5 rounded-full shadow transition focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${
                      channelFilter === 'iframe'
                        ? 'bg-orange-600 text-white shadow-orange-500/40'
                        : 'bg-orange-100 text-orange-700 hover:shadow-md dark:bg-orange-900/30 dark:text-orange-300'
                    }`}
                    onClick={() => setChannelFilter('iframe')}
                  >
                    Iframe
                  </button>
                  {/* WhatsApp (em breve) */}
                  <button
                    className={`px-3 py-1.5 rounded-full shadow transition cursor-not-allowed opacity-60 bg-[#25D366] text-white shadow-green-500/30 flex items-center gap-1.5`}
                    title="Em breve"
                    disabled
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>(soon)</span>
                  </button>
                  {/* Instagram (em breve) */}
                  <button
                    className={`px-3 py-1.5 rounded-full shadow transition cursor-not-allowed opacity-60 bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#515BD4] text-white shadow-pink-500/30 flex items-center gap-1.5`}
                    title="Em breve"
                    disabled
                  >
                    <Instagram className="w-4 h-4" />
                    <span>(soon)</span>
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
                      onClick={() => { setSelectedSessionId(s.id); setSelectedAssistId('') }}
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
                          {feedbackBySession[s.id] && (
                            <Badge variant="outline" className={`${feedbackBySession[s.id] === 'positive' ? 'border-green-400 text-green-600 dark:text-green-300' : 'border-red-400 text-red-600 dark:text-red-300'}`}>
                              {feedbackBySession[s.id] === 'positive' ? '👍' : '👎'}
                            </Badge>
                          )}
                          { (s as any).external_session_id ? (
                            <Badge variant="outline" className="border-indigo-400 text-indigo-700 dark:text-indigo-300">Iframe</Badge>
                          ) : (
                            <Badge variant="outline" className="border-gray-300 text-gray-600 dark:text-gray-300">App</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                        <div className="text-[10px] text-gray-500">{new Date(s.updated_at).toLocaleTimeString('pt-BR')}</div>
                          <button
                            title="Excluir conversa"
                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 disabled:opacity-50"
                            onClick={async (e) => {
                              e.stopPropagation()
                              const confirmed = window.confirm('Excluir esta conversa? Isso removerá a sessão e as mensagens associadas.')
                              if (!confirmed) return
                              try {
                                await chatService.deleteSession(s.id)
                                setSessions((prev) => prev.filter((it) => it.id !== s.id))
                                setLastMessageBySession((prev) => {
                                  const { [s.id]: _, ...rest } = prev
                                  return rest
                                })
                                setFeedbackBySession((prev) => {
                                  const { [s.id]: _, ...rest } = prev
                                  return rest
                                })
                                if (selectedSessionId === s.id) {
                                  setSelectedSessionId('')
                                  setMessages([])
                                }
                              } catch (err) {
                                console.error('Falha ao excluir sessão', err)
                                alert('Não foi possível excluir a conversa. Verifique permissões/RLS.')
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
              <CardHeader className="flex flex-col space-y-1.5 p-6 py-3 border-b border-orange-500/40 shadow-md shadow-orange-500/20">
                <div className="flex items-center justify-between gap-3">
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
                  <div className="flex items-center gap-2">
                    {selectedSessionId && (
                      <button
                        className="px-3 py-1.5 rounded-md text-sm bg-red-600 text-white hover:bg-red-500 border border-red-400/40 shadow-lg shadow-red-600/20 flex items-center gap-1.5"
                        onClick={async () => {
                          const confirmed = window.confirm('Excluir a conversa selecionada?')
                          if (!confirmed) return
                          try {
                            await chatService.deleteSession(selectedSessionId)
                            setSessions((prev) => prev.filter((it) => it.id !== selectedSessionId))
                            setLastMessageBySession((prev) => {
                              const { [selectedSessionId]: _, ...rest } = prev
                              return rest
                            })
                            setFeedbackBySession((prev) => {
                              const { [selectedSessionId]: _, ...rest } = prev
                              return rest
                            })
                            setSelectedSessionId('')
                            setMessages([])
                          } catch (err) {
                            console.error('Falha ao excluir sessão', err)
                            alert('Não foi possível excluir a conversa. Verifique permissões/RLS.')
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir
                      </button>
                    )}
                  {pendingAssistForSelected && (
                    <button
                      className="px-3 py-1.5 rounded-md text-sm bg-amber-600 text-white hover:bg-amber-500 border border-amber-400/40 shadow-lg shadow-amber-600/20"
                      onClick={async () => {
                        if (!selectedAgentId || !selectedSessionId || !pendingAssistForSelected) return
                        const { data: { user } } = await supabase.auth.getUser()
                        // Atualizar estado local imediatamente (otimistic update)
                        setAssistRequests((prev) => 
                          prev.map((r) => 
                            r.id === pendingAssistForSelected.id
                              ? { ...r, status: 'in_progress', claimed_by: user?.id || null }
                              : r
                          )
                        )
                        // Atualizar no banco
                        await supabase
                          .from('human_assist_requests')
                          .update({ status: 'in_progress', claimed_by: user?.id || null })
                          .eq('id', pendingAssistForSelected.id)
                      }}
                    >
                      Assumir controle
                    </button>
                  )}
                  {claimedAssistForSelected && (
                    <button
                      className="px-3 py-1.5 rounded-md text-sm bg-green-600 text-white hover:bg-green-500 border border-green-400/40 shadow-lg shadow-green-600/20"
                      onClick={async () => {
                        if (!selectedAgentId || !selectedSessionId) return
                        const resolvedAt = new Date().toISOString()
                        // Atualizar estado local imediatamente (otimistic update)
                        setAssistRequests((prev) => 
                          prev.map((r) => 
                            r.agent_id === selectedAgentId && 
                            r.session_id === selectedSessionId && 
                            (r.status === 'pending' || r.status === 'in_progress')
                              ? { ...r, status: 'resolved', resolved_at: resolvedAt }
                              : r
                          )
                        )
                        // Atualizar no banco
                        await supabase
                          .from('human_assist_requests')
                          .update({ status: 'resolved', resolved_at: resolvedAt })
                          .eq('agent_id', selectedAgentId)
                          .eq('session_id', selectedSessionId)
                          .in('status', ['pending','in_progress'])
                      }}
                    >
                      Retornar ao assistente
                    </button>
                  )}
                  </div>
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
                        {m.role === 'human' && (
                          <div className="text-[10px] mb-1 opacity-75">
                            {m.author_user_id ? `Atendente ${String(m.author_user_id).slice(0, 8)}…` : 'Atendente'}
                          </div>
                        )}
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
                        setMessages((prev) => {
                          const exists = prev.some((m) => m.id === (saved as unknown as MessageRow).id)
                          return exists ? prev : [...prev, saved as unknown as MessageRow]
                        })
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


