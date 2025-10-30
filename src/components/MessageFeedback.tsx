import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { chatService } from '@/services/chatService'
import { ThumbsUp, ThumbsDown } from 'lucide-react'

interface MessageBlock {
  index: number
  content: string
  positiveCount?: number
  negativeCount?: number
}

interface MessageFeedbackProps {
  messageId: string
  agentId: string
  conversationId: string
  blocks: MessageBlock[]
}

export function MessageFeedback({ messageId, agentId, conversationId, blocks }: MessageFeedbackProps) {
  const [blockFeedback, setBlockFeedback] = useState<Record<number, 'positive' | 'negative'>>({})

  // Carregar feedback existente do ator (user_id preferido; senão session_id), block 0
  useEffect(() => {
    const loadExisting = async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser()
        const userId = userRes?.user?.id ?? null

        let query = supabase
          .from('message_feedback')
          .select('feedback_type')
          .eq('message_id', messageId)
          .or('block_index.is.null,block_index.eq.0')
          .order('created_at', { ascending: false })
          .limit(1)

        if (userId) query = query.eq('user_id', userId)
        else query = query.eq('session_id', conversationId)

        const { data, error } = await query

        if (!error && data && data.length > 0) {
          const fb = data[0].feedback_type as 'positive' | 'negative'
          setBlockFeedback({ 0: fb })
        }
      } catch (_) {
        // ignore
      }
    }
    loadExisting()
  }, [messageId, conversationId])

  const handleFeedback = async (blockIndex: number, type: 'positive' | 'negative') => {
    // Apenas feedback geral na UI do chat; melhorias e granular apenas no painel
    if (blockIndex !== 0) return

    setBlockFeedback((prev) => ({ ...prev, [blockIndex]: type }))

    try {
      await chatService.setMessageFeedback({
        messageId,
        agentId,
        sessionId: conversationId,
        value: type === 'positive' ? 1 : -1,
      })
    } catch (error) {
      console.error('Error submitting feedback:', error)
    }
  }

  const overallBlock = blocks && blocks.length > 0 ? blocks[0] : { index: 0, content: '' }

  return (
    <div className="message-feedback space-y-3 mt-4">
      <div className="response-block p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Resposta geral</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFeedback(0, 'positive')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                blockFeedback[0] === 'positive'
                  ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
              title="Resposta útil"
            >
              <ThumbsUp className="h-3 w-3" />
            </button>

            <button
              onClick={() => handleFeedback(0, 'negative')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                blockFeedback[0] === 'negative'
                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
              title="Resposta não útil"
            >
              <ThumbsDown className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

