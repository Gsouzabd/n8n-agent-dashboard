import { create } from 'zustand'
import { Agent, ChatMessage } from '@/types'
import { chatService } from '@/services/chatService'
import { useAuthStore } from './authStore'

interface ChatStore {
  // State
  isDrawerOpen: boolean
  currentAgent: Agent | null
  currentSessionId: string | null
  externalSessionId: string | null
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null

  // Actions
  openChat: (agent: Agent, sessionId?: string) => Promise<void>
  closeChat: () => void
  sendMessage: (content: string) => Promise<void>
  sendAudioMessage: (audioBlob: Blob) => Promise<void>
  loadSession: (sessionId: string) => Promise<void>
  clearMessages: () => Promise<void>
  clearError: () => void
  setExternalSessionId: (sessionId: string | null) => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  isDrawerOpen: false,
  currentAgent: null,
  currentSessionId: null,
  externalSessionId: null,
  messages: [],
  isLoading: false,
  error: null,

  // Open chat drawer
  openChat: async (agent: Agent, sessionId?: string) => {
    set({ 
      isDrawerOpen: true, 
      currentAgent: agent, 
      isLoading: true,
      error: null 
    })

    try {
      // If sessionId provided (external session), use it without requiring auth
      let sid = sessionId || null
      if (!sid) {
        const user = useAuthStore.getState().user
        if (!user) {
          // For widget embed without auth, create anonymous session
          // Generate a unique session ID for this anonymous user
          const anonymousSessionId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substring(7)
          sid = await chatService.getOrCreateSessionByExternal(agent.id, anonymousSessionId)
        } else {
          // Get or create session for authenticated user
          sid = await chatService.getOrCreateSession(agent.id, user.id)
        }
      }
      
      // Load messages
      const messages = await chatService.getMessages(sid)
      
      set({
        currentSessionId: sid,
        messages,
        isLoading: false,
      })
    } catch (error) {
      console.error('Error opening chat:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to open chat',
        isLoading: false 
      })
    }
  },

  // Close chat drawer
  closeChat: () => {
    set({
      isDrawerOpen: false,
      currentAgent: null,
      currentSessionId: null,
      messages: [],
      error: null,
    })
  },

  // Send message
  sendMessage: async (content: string) => {
    const { currentAgent, currentSessionId, messages } = get()

    if (!currentAgent || !currentSessionId) {
      set({ error: 'No active chat session' })
      return
    }

    if (!content.trim()) {
      return
    }

    set({ isLoading: true, error: null })

    try {
      // Save user message
      const userMessage = await chatService.saveMessage(
        currentSessionId,
        'user',
        content
      )

      // Update UI with user message
      set({ messages: [...messages, userMessage] })

      // Send to n8n and get response
      const responseText = await chatService.sendMessageToN8n(
        currentAgent,
        currentSessionId,
        content,
        messages
      )

      // Save assistant response
      const assistantMessage = await chatService.saveMessage(
        currentSessionId,
        'assistant',
        responseText
      )

      // Update UI with assistant response
      const updatedMessages = [...get().messages, assistantMessage]
      set({ messages: updatedMessages, isLoading: false })
    } catch (error) {
      console.error('Error sending message:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to send message',
        isLoading: false 
      })
    }
  },

  // Send audio message
  sendAudioMessage: async (audioBlob: Blob) => {
    const { currentAgent, currentSessionId, messages } = get()

    if (!currentAgent || !currentSessionId) {
      set({ error: 'No active chat session' })
      return
    }

    set({ isLoading: true, error: null })

    try {
      // Upload audio to storage
      const audioUrl = await chatService.uploadAudioToStorage(audioBlob, currentSessionId)

      // Save user message with audio URL
      const userMessage = await chatService.saveMessage(
        currentSessionId,
        'user',
        audioUrl
      )

      // Update UI with user message
      set({ messages: [...messages, userMessage] })

      // Send to n8n and get response (pass audio URL as message)
      const responseText = await chatService.sendMessageToN8n(
        currentAgent,
        currentSessionId,
        audioUrl,
        messages
      )

      // Save assistant response
      const assistantMessage = await chatService.saveMessage(
        currentSessionId,
        'assistant',
        responseText
      )

      // Update UI with assistant response
      const updatedMessages = [...get().messages, assistantMessage]
      set({ messages: updatedMessages, isLoading: false })
    } catch (error) {
      console.error('Error sending audio message:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to send audio message',
        isLoading: false 
      })
    }
  },

  // Load existing session
  loadSession: async (sessionId: string) => {
    set({ isLoading: true, error: null })

    try {
      const messages = await chatService.getMessages(sessionId)
      set({
        currentSessionId: sessionId,
        messages,
        isLoading: false,
      })
    } catch (error) {
      console.error('Error loading session:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load session',
        isLoading: false 
      })
    }
  },

  // Clear messages and create new session
  clearMessages: async () => {
    const { currentSessionId, currentAgent } = get()
    const user = useAuthStore.getState().user

    if (!currentSessionId || !currentAgent || !user) {
      set({ error: 'No active session or user' })
      return
    }

    try {
      // Delete messages from old session
      await chatService.clearSessionMessages(currentSessionId)
      
      // Create a NEW session (always fresh, never reuses old one)
      const newSessionId = await chatService.createNewSession(currentAgent.id, user.id)
      
      // Update state with new session and empty messages
      set({ 
        currentSessionId: newSessionId,
        messages: [] 
      })

      console.log('🗑️ Chat limpo e nova sessão criada:', newSessionId)
    } catch (error) {
      console.error('❌ Erro ao limpar chat:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to clear messages'
      })
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null })
  },

  setExternalSessionId: (sessionId: string | null) => {
    set({ externalSessionId: sessionId })
  },
}))

