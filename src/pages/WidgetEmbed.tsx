import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useChatStore } from '@/stores/chatStore'
import { Agent, ChatMessage } from '@/types'
import { Bot, User, Send, Loader2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { chatService } from '@/services/chatService'
import { MessageFeedback } from '@/components/MessageFeedback'

export default function WidgetEmbed() {
  const { widgetId } = useParams()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [feedbackStatus, setFeedbackStatus] = useState<'positive' | 'negative' | null>(null)

  const {
    messages,
    isLoading,
    error,
    openChat,
    sendMessage,
    setExternalSessionId,
    currentSessionId,
  } = useChatStore()

  useEffect(() => {
    const init = async () => {
      try {
        if (!widgetId) return
        const search = new URLSearchParams(window.location.search)
        const externalSessionId = search.get('session_id')
        const newSession = search.get('new_session')
        
        // Se new_session está presente, gerar novo session_id único
        let finalSessionId = externalSessionId
        if (newSession) {
          // Gera um novo session_id único baseado em timestamp e random
          finalSessionId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substring(7)
          setExternalSessionId(finalSessionId)
        } else if (externalSessionId) {
          setExternalSessionId(externalSessionId)
        }
        
        // Resolve widget -> agent
        const { data: widget, error: wErr } = await supabase
          .from('agent_widgets')
          .select('agent_id')
          .eq('widget_id', widgetId)
          .single()

        if (wErr || !widget) throw wErr || new Error('Widget não encontrado')

        const { data: agentData, error: aErr } = await supabase
          .from('agents')
          .select('*')
          .eq('id', widget.agent_id)
          .single()

        if (aErr || !agentData) throw aErr || new Error('Agente não encontrado')

        setAgent(agentData as Agent)

        // Open by external session if provided
        if (finalSessionId) {
          // Resolve/create external session and open
          // Import inline to avoid circulars
          const { chatService } = await import('@/services/chatService')
          const sid = await chatService.getOrCreateSessionByExternal(agentData.id, finalSessionId)
          await openChat(agentData as Agent, sid)
        } else {
          await openChat(agentData as Agent)
        }
      } catch (err) {
        console.error('Erro ao carregar widget:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [widgetId, openChat, setExternalSessionId])

  // Load feedback badge
  useEffect(() => {
    let mounted = true
    const refresh = async () => {
      try {
        if (!currentSessionId) return
        const status = await chatService.getActorSessionFeedback(currentSessionId)
        if (mounted) setFeedbackStatus(status)
      } catch {}
    }
    refresh()
    const onUpdated = (e: any) => {
      if (e?.detail?.sessionId === currentSessionId) refresh()
    }
    window.addEventListener('feedback:updated', onUpdated)
    return () => {
      mounted = false
      window.removeEventListener('feedback:updated', onUpdated)
    }
  }, [currentSessionId])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Realtime: refletir intervenções humanas e outras mensagens inseridas externamente
  useEffect(() => {
    if (!currentSessionId) return
    const channel = supabase
      .channel(`widget-session-${currentSessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${currentSessionId}` },
        (payload) => {
          const msg = payload.new as unknown as ChatMessage
          const prev = useChatStore.getState().messages
          // evita duplicar se a mensagem já estiver no estado
          if (!prev.find((m: any) => m.id === (msg as any).id)) {
            useChatStore.setState({ messages: [...prev, msg] })
          }
        }
      )
      .subscribe()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [currentSessionId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const text = input.trim()
    setInput('')
    await sendMessage(text)
  }

  const handleNewSession = () => {
    // Gera um novo session_id único e recarrega a página
    const newSessionId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substring(7)
    const url = new URL(window.location.href)
    url.searchParams.set('new_session', Date.now().toString())
    url.searchParams.set('session_id', newSessionId)
    window.location.href = url.toString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <p className="text-sm text-gray-500">Widget inválido</p>
      </div>
    )
  }

  return (
    <div className="h-screen bg-white dark:bg-black flex flex-col overflow-hidden">
      {/* Header compacto */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/15 to-orange-600/15 flex items-center justify-center border border-orange-500/30">
            <Bot className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{agent.name}</p>
            <p className="text-xs text-gray-500">Chat do agente</p>
          </div>
          {feedbackStatus && (
            <Badge variant="outline" className={`${feedbackStatus === 'positive' ? 'border-green-400 text-green-600 dark:text-green-300' : 'border-red-400 text-red-600 dark:text-red-300'}`}>
              {feedbackStatus === 'positive' ? '👍' : '👎'}
            </Badge>
          )}
        </div>
        <button
          onClick={handleNewSession}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-1.5"
          title="Iniciar nova conversa"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Nova Sessão
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {error && (
          <div className="p-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded">{error}</div>
        )}
        {messages.map((m: ChatMessage) => {
          const isUser = m.role === 'user'
          const isAssistant = m.role === 'assistant'
          const isHuman = m.role === 'human'
          const isAgentLike = isAssistant || isHuman
          const bubbleClass = isUser
            ? 'bg-orange-600 text-white'
            : 'bg-gray-100 dark:bg-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800'

          return (
            <div key={m.id} className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {isAgentLike && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center border border-orange-500/30">
                  <Bot className="w-3.5 h-3.5 text-orange-600" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${bubbleClass}`}>
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                {isAssistant && agent && currentSessionId && (
                  <div className="mt-2">
                    <MessageFeedback
                      messageId={m.id}
                      agentId={agent.id}
                      conversationId={currentSessionId}
                      blocks={[{ index: 0, content: m.content }]}
                    />
                  </div>
                )}
              </div>
              {isUser && (
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center border border-gray-600">
                  <User className="w-3.5 h-3.5 text-gray-300" />
                </div>
              )}
            </div>
          )
        })}
        {isLoading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center border border-orange-500/30">
              <Bot className="w-3.5 h-3.5 text-orange-600" />
            </div>
            <div className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Pensando...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua mensagem..."
            disabled={isLoading}
            className="flex-1 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar
          </button>
        </form>
      </div>
    </div>
  )
}


