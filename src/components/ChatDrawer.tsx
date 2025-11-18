import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Bot, User, Loader2, AlertCircle, Trash2, Mic, Square } from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'
import { Button } from './ui/Button'
import { MessageFeedback } from './MessageFeedback'
import { Badge } from './ui/badge'
import { chatService } from '@/services/chatService'
import { useChatStore as useChatStoreHook } from '@/stores/chatStore'
import { AudioPlayer } from './AudioPlayer'
import { linkifyText } from '@/lib/utils'

export function ChatDrawer() {
  const {
    isDrawerOpen,
    currentAgent,
    messages,
    isLoading,
    error,
    closeChat,
    sendMessage,
    sendAudioMessage,
    clearMessages,
    clearError,
  } = useChatStore()
  const { currentSessionId } = useChatStoreHook.getState()

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [feedbackStatus, setFeedbackStatus] = useState<'positive' | 'negative' | null>(null)
  const [iconError, setIconError] = useState(false)
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioUrlRefs = useRef<Map<string, string>>(new Map())

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Focus input when drawer opens
  useEffect(() => {
    if (isDrawerOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isDrawerOpen])

  // Reset icon error when agent changes
  useEffect(() => {
    setIconError(false)
  }, [currentAgent?.id])

  // Load feedback badge when session changes
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

  // Cleanup audio URLs on unmount
  useEffect(() => {
    return () => {
      audioUrlRefs.current.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
      audioUrlRefs.current.clear()
    }
  }, [])

  // Stop recording when drawer closes
  useEffect(() => {
    if (!isDrawerOpen && isRecording) {
      stopRecording()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawerOpen])

  // Start recording audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }

        // Send audio message
        if (audioBlob.size > 0) {
          await sendAudioMessage(audioBlob)
        }

        setIsRecording(false)
        setRecordingTime(0)
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current)
          recordingTimerRef.current = null
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error starting recording:', error)
      useChatStore.setState({ error: 'Erro ao acessar o microfone. Verifique as permissões.' })
      setIsRecording(false)
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
  }

  // Format recording time
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Check if message content is an audio URL
  const isAudioUrl = (content: string): boolean => {
    return content.startsWith('http') && (
      content.includes('voice-messages') ||
      !!content.match(/\.(webm|mp3|wav|ogg|m4a)(\?|$)/i)
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const message = input.trim()
    setInput('')
    await sendMessage(message)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeChat}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-14 h-[95vh] w-full sm:w-[500px] bg-black/95 backdrop-blur-2xl border-l border-orange-500/40 shadow-2xl shadow-orange-500/20 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 py-3 border-b border-orange-500/40 bg-gradient-to-r from-orange-500/10 to-transparent shadow-md shadow-orange-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center border border-orange-500/30 overflow-hidden">
                  {currentAgent?.icon_url && !iconError ? (
                    <img 
                      src={currentAgent.icon_url} 
                      alt={currentAgent.name || 'Agente'} 
                      className="w-full h-full object-cover"
                      onError={() => setIconError(true)}
                    />
                  ) : (
                    <Bot className="w-5 h-5 text-orange-500" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {currentAgent?.name || 'Chat'}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {isLoading ? 'Pensando...' : 'Online'}
                  </p>
                </div>
                {feedbackStatus && (
                  <Badge variant="outline" className={`${feedbackStatus === 'positive' ? 'border-green-400 text-green-400' : 'border-red-400 text-red-400'}`}>
                    {feedbackStatus === 'positive' ? '👍' : '👎'}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearMessages}
                  disabled={messages.length === 0}
                  className="text-gray-400 hover:text-orange-500 hover:bg-orange-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Limpar conversa"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeChat}
                  className="text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
                <button
                  onClick={clearError}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && !isLoading && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Bot className="w-16 h-16 text-orange-500/30 mx-auto mb-4" />
                    <p className="text-gray-400 text-sm">
                      Inicie uma conversa com {currentAgent?.name}
                    </p>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center border border-orange-500/30 flex-shrink-0 overflow-hidden">
                      {currentAgent?.icon_url && !iconError ? (
                        <img 
                          src={currentAgent.icon_url} 
                          alt={currentAgent.name || 'Agente'} 
                          className="w-full h-full object-cover"
                          onError={() => setIconError(true)}
                        />
                      ) : (
                        <Bot className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[75%] rounded-2xl p-4 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white'
                        : 'bg-gray-900 border border-gray-800 text-gray-100'
                    }`}
                  >
                    {/* Render audio player if content is audio */}
                    {(isAudioUrl(message.content) || message.content.startsWith('__AUDIO_BASE64__:')) ? (
                      <AudioPlayer 
                        messageId={message.id}
                        content={message.content}
                        role={message.role}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {linkifyText(message.content)}
                      </p>
                    )}
                    <p className="text-xs mt-2 opacity-60">
                      {new Date(message.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>

                    {message.role === 'assistant' && currentAgent && currentSessionId && !isAudioUrl(message.content) && !message.content.startsWith('__AUDIO_BASE64__:') && (
                      <div className="mt-3">
                        <MessageFeedback
                          messageId={message.id}
                          agentId={currentAgent.id}
                          conversationId={currentSessionId}
                          blocks={[{ index: 0, content: message.content }]}
                        />
                      </div>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center border border-gray-600 flex-shrink-0">
                      <User className="w-4 h-4 text-gray-300" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Loading indicator */}
              {isLoading && messages.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center border border-orange-500/30">
                    <Bot className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 border-t border-orange-500/30 bg-gradient-to-r from-orange-500/5 to-transparent">
              {/* Recording indicator */}
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm text-red-400 font-medium">
                      Gravando... {formatRecordingTime(recordingTime)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={stopRecording}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Square className="w-4 h-4 mr-1" />
                    Parar
                  </Button>
                </motion.div>
              )}
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isLoading}
                  className={`rounded-xl transition-all ${
                    isRecording
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                      : 'text-gray-400 hover:text-orange-500 hover:bg-orange-500/10'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
                >
                  {isRecording ? (
                    <Square className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </Button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua mensagem..."
                  disabled={isLoading || isRecording}
                  className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || isLoading || isRecording}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white rounded-xl px-6 transition-all shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

