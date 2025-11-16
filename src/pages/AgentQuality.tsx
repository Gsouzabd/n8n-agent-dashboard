import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Download, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

interface QualityMetrics {
  total_responses: number
  total_feedback: number
  positive_rate: number
  negative_rate: number
  top_issues: Array<{ category: string; count: number }>
  improvement_suggestions_count: number
  negative_count: number
  negative_suggestions_count: number
}

interface FeedbackItem {
  id: string
  message_id: string
  feedback_type: 'positive' | 'negative'
  issue_category: string | null
  improvement_suggestion: string | null
  block_index: number
  created_at: string
  chat_messages?: { content: string | null } | null
}

export function AgentQuality() {
  const { id } = useParams()
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [recentFeedbacks, setRecentFeedbacks] = useState<FeedbackItem[]>([])
  const [improveOpen, setImproveOpen] = useState(false)
  const [improveTargetId, setImproveTargetId] = useState<string | null>(null)
  const [issueCategory, setIssueCategory] = useState<string>('incorrect')
  const [suggestion, setSuggestion] = useState('')
  const [savingImprove, setSavingImprove] = useState(false)
  const [viewConvoOpen, setViewConvoOpen] = useState(false)
  const [viewConvoMessages, setViewConvoMessages] = useState<any[]>([])

  useEffect(() => {
    loadMetrics()
  }, [id])

  const loadMetrics = async () => {
    try {
      // Buscar todos os feedbacks do agente
      const { data: feedbacks, error } = await supabase
        .from('message_feedback')
        .select('feedback_type, issue_category, improvement_suggestion')
        .eq('agent_id', id)

      if (error) throw error

      const totalFeedback = feedbacks?.length || 0
      const positive = feedbacks?.filter((f: any) => f.feedback_type === 'positive').length || 0
      const negative = feedbacks?.filter((f: any) => f.feedback_type === 'negative').length || 0
      const improvementSuggestionsCount = feedbacks?.filter((f: any) => !!f.improvement_suggestion)?.length || 0
      const negativeSuggestionsCount = feedbacks
        ?.filter((f: any) => f.feedback_type === 'negative' && !!f.improvement_suggestion)?.length || 0

      // Top issues entre feedbacks negativos
      const issueCountMap: Record<string, number> = {}
      feedbacks
        ?.filter((f: any) => f.feedback_type === 'negative')
        .forEach((f: any) => {
          const key = f.issue_category || 'other'
          issueCountMap[key] = (issueCountMap[key] || 0) + 1
        })

      const topIssues = Object.entries(issueCountMap)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)

      const computed: QualityMetrics = {
        total_responses: totalFeedback, // aproximação baseada em feedbacks existentes
        total_feedback: totalFeedback,
        positive_rate: totalFeedback > 0 ? positive / totalFeedback : 0,
        negative_rate: totalFeedback > 0 ? negative / totalFeedback : 0,
        top_issues: topIssues as any,
        improvement_suggestions_count: improvementSuggestionsCount,
        negative_count: negative,
        negative_suggestions_count: negativeSuggestionsCount,
      }

      setMetrics(computed)

      // Buscar feedbacks recentes com conteúdo da mensagem
      const { data: recents, error: recErr } = await supabase
        .from('message_feedback')
        .select('id, message_id, feedback_type, issue_category, improvement_suggestion, block_index, created_at, chat_messages:message_id(content)')
        .eq('agent_id', id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (recErr) throw recErr
      setRecentFeedbacks((recents || []) as unknown as FeedbackItem[])
    } catch (error) {
      console.error('Error loading quality metrics:', error)
      alert('Erro ao carregar métricas')
    } finally {
      setLoading(false)
    }
  }

  const exportFineTuningDataset = async () => {
    setExporting(true)
    try {
      // Fetch all feedback with suggestions
      const { data: feedbacks, error } = await supabase
        .from('message_feedback')
        .select(`
          *,
          chat_messages!message_feedback_message_id_fkey (
            content,
            session_id
          ),
          chat_sessions!message_feedback_conversation_id_fkey (
            id
          )
        `)
        .eq('agent_id', id)
        .eq('feedback_type', 'negative')
        .not('improvement_suggestion', 'is', null)

      if (error) throw error

      if (!feedbacks || feedbacks.length === 0) {
        alert('Nenhum feedback com sugestões para exportar')
        return
      }

      // Format as JSONL for OpenAI fine-tuning
      const jsonl = feedbacks
        .map((fb: any) => {
          const originalMessage = fb.chat_messages?.content || fb.block_content

          return JSON.stringify({
            messages: [
              {
                role: 'system',
                content: 'Você é um assistente útil que fornece respostas de alta qualidade.',
              },
              {
                role: 'user',
                content: `Melhore esta resposta:\n\nResposta original: ${originalMessage}\n\nProblema identificado: ${fb.issue_category}\n\nSugestão: ${fb.improvement_suggestion}`,
              },
              {
                role: 'assistant',
                content: fb.improvement_suggestion,
              },
            ],
          })
        })
        .join('\n')

      // Download file
      const blob = new Blob([jsonl], { type: 'application/jsonl' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `agent-${id}-finetuning-${Date.now()}.jsonl`
      a.click()
      URL.revokeObjectURL(url)

      alert(`✅ Dataset exportado com ${feedbacks.length} exemplos!`)
    } catch (error) {
      console.error('Error exporting dataset:', error)
      alert('❌ Erro ao exportar dataset')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    )
  }

  if (!metrics) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhuma métrica disponível ainda</p>
        </div>
      </Layout>
    )
  }

  const satisfactionRate = metrics.positive_rate * 100

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              to={`/agents/${id}/edit`}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              Qualidade das Respostas
            </h1>
            <p className="text-muted-foreground mt-2">Métricas de feedback e melhoria contínua</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={async () => {
                try {
                  // Tenta chamar via supabase.functions.invoke primeiro
                  const { data, error } = await supabase.functions.invoke('sync-improvement-to-rag', {
                    body: { agent_id: id, count: 10 }
                  })
                  
                  if (error) {
                    // Se falhar, tenta via HTTP direto (fallback)
                    console.warn('Chamada via invoke falhou, tentando HTTP direto:', error)
                    const supabaseUrl = supabase.supabaseUrl
                    const { data: sessionData } = await supabase.auth.getSession()
                    const token = sessionData?.session?.access_token
                    
                    if (!token) {
                      throw new Error('Não autenticado. Por favor, faça login novamente.')
                    }
                    
                    const httpRes = await fetch(`${supabaseUrl}/functions/v1/sync-improvement-to-rag`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                      },
                      body: JSON.stringify({ agent_id: id, count: 10 })
                    })
                    
                    if (!httpRes.ok) {
                      const errorText = await httpRes.text()
                      throw new Error(`HTTP ${httpRes.status}: ${errorText}`)
                    }
                    
                    const httpData = await httpRes.json()
                    alert(`✅ Processados: ${httpData?.processed || 0}, Atualizados: ${httpData?.updated || 0}`)
                    loadMetrics()
                    return
                  }
                  
                  alert(`✅ Processados: ${data?.processed || 0}, Atualizados: ${data?.updated || 0}`)
                  loadMetrics()
                } catch (e: any) {
                  console.error('Erro completo:', e)
                  alert('❌ Erro: ' + (e.message || 'Erro desconhecido') + '\n\nVerifique o console para mais detalhes.')
                }
              }}
            >
              🔄 Processar Embeddings Pendentes
            </Button>
            <Button onClick={exportFineTuningDataset} disabled={exporting}>
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exportando...' : 'Exportar Fine-tuning Dataset'}
            </Button>
          </div>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Respostas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {metrics.total_responses.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Feedbacks Recebidos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {metrics.total_feedback.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Taxa de Satisfação</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {satisfactionRate.toFixed(1)}%
                </p>
                {satisfactionRate >= 80 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sugestões de Melhoria</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {metrics.improvement_suggestions_count}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Satisfaction + Instruction Index (50/50) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Índice de Satisfação</CardTitle>
              <CardDescription>Considera todos os feedbacks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative h-8 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                    style={{
                      width: `${satisfactionRate}%`,
                      background:
                        satisfactionRate >= 80
                          ? 'linear-gradient(90deg, #10B981, #34D399)'
                          : satisfactionRate >= 60
                          ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                          : 'linear-gradient(90deg, #EF4444, #F87171)',
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span
                    className={`flex items-center gap-1 ${
                      metrics.positive_rate > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                    }`}
                  >
                    👍 {(metrics.positive_rate * 100).toFixed(1)}% Positivo
                  </span>
                  <span
                    className={`flex items-center gap-1 ${
                      metrics.negative_rate > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'
                    }`}
                  >
                    👎 {(metrics.negative_rate * 100).toFixed(1)}% Negativo
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Índice de Instruções Dadas</CardTitle>
              <CardDescription>Considera apenas feedbacks negativos</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const total = metrics.negative_count || 0
                const instructed = metrics.negative_suggestions_count || 0
                const rate = total > 0 ? (instructed / total) * 100 : 0
                const bg = rate >= 80
                  ? 'linear-gradient(90deg, #10B981, #34D399)'
                  : rate >= 60
                  ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                  : 'linear-gradient(90deg, #6366F1, #60A5FA)'
                return (
                  <div className="space-y-4">
                    <div className="relative h-8 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                        style={{ width: `${rate}%`, background: bg }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                        🧭 Instruídos
                      </span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {instructed}/{total} ({rate.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Top Issues */}
        {metrics.top_issues && metrics.top_issues.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Principais Problemas Identificados
              </CardTitle>
              <CardDescription>Categorias de feedback negativo mais frequentes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.top_issues.map((issue, index) => {
                  const categoryLabels: Record<string, string> = {
                    incorrect: 'Informação Incorreta',
                    incomplete: 'Informação Incompleta',
                    tone: 'Tom Inadequado',
                    formatting: 'Formatação Ruim',
                    other: 'Outro',
                  }

                  const percentage =
                    metrics.total_feedback > 0 ? (issue.count / metrics.total_feedback) * 100 : 0

                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {categoryLabels[issue.category] || issue.category}
                        </span>
                        <span className="text-gray-500">
                          {issue.count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feedbacks Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Feedbacks Recentes</CardTitle>
            <CardDescription>Últimos 50 feedbacks recebidos</CardDescription>
          </CardHeader>
          <CardContent>
            {recentFeedbacks.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum feedback ainda.</p>
            ) : (
              <div className="space-y-3">
                {recentFeedbacks.map((fb) => {
                  const isPositive = fb.feedback_type === 'positive'
                  const categoryLabels: Record<string, string> = {
                    incorrect: 'Informação Incorreta',
                    incomplete: 'Informação Incompleta',
                    tone: 'Tom Inadequado',
                    formatting: 'Formatação Ruim',
                    other: 'Outro',
                  }
                  const content = fb.chat_messages?.content || ''
                  const instructed = !!fb.improvement_suggestion
                  const needsInstruction = fb.feedback_type === 'negative' && !instructed
                  return (
                    <div key={fb.id} className="p-3 border border-gray-200 dark:border-gray-800 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} font-medium`}>
                            {isPositive ? '👍 Positivo' : '👎 Negativo'}
                          </span>
                          {instructed && (
                            <Badge variant="outline" className="border-green-400 text-green-700 dark:text-green-300">
                              Instruído
                            </Badge>
                          )}
                          {needsInstruction && (
                            <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300">
                              Necessita Instrução
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(fb.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {fb.issue_category && (
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          Categoria: <span className="font-medium">{categoryLabels[fb.issue_category] || fb.issue_category}</span>
                        </div>
                      )}
                      {fb.improvement_suggestion && (
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          Sugestão: <span className="italic">{fb.improvement_suggestion}</span>
                        </div>
                      )}
                      {content && (
                        <div className="mt-2 text-xs text-gray-500 line-clamp-3">
                          Mensagem: {content}
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setImproveTargetId(fb.id)
                            setIssueCategory(fb.issue_category || 'incorrect')
                            setSuggestion(fb.improvement_suggestion || '')
                            setImproveOpen(true)
                          }}
                        >
                          Melhorar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              // descobre a sessão a partir da mensagem
                              if (!fb.message_id) {
                                alert('Mensagem não encontrada para este feedback.')
                                return
                              }
                              const { data: msg } = await supabase
                                .from('chat_messages')
                                .select('session_id')
                                .eq('id', fb.message_id)
                                .maybeSingle()
                              if (!msg?.session_id) return
                              const { data: msgs } = await supabase
                                .from('chat_messages')
                                .select('*')
                                .eq('session_id', msg.session_id)
                                .order('created_at', { ascending: true })
                              setViewConvoMessages(msgs || [])
                              setViewConvoOpen(true)
                            } catch (e) {
                              alert('Erro ao carregar conversa completa')
                            }
                          }}
                        >
                          Visualizar conversa completa
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-300">
              💡 Como usar o dataset de fine-tuning
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 dark:text-blue-400 space-y-2">
            <p>
              1. Exporte o dataset clicando no botão acima (formato JSONL compatível com OpenAI)
            </p>
            <p>
              2. Faça upload do arquivo na plataforma OpenAI (
              <a
                href="https://platform.openai.com/finetune"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                platform.openai.com/finetune
              </a>
              )
            </p>
            <p>3. Inicie um job de fine-tuning usando o GPT-3.5-turbo ou GPT-4</p>
            <p>4. Após o treinamento, use o modelo fine-tuned no seu agente</p>
            <p className="mt-4 font-medium">
              📊 Recomendação: Aguarde pelo menos 50-100 exemplos antes de fazer fine-tuning
            </p>
          </CardContent>
        </Card>
      </div>
      {improveOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold">Instruir melhoria</h3>
              <button className="text-sm text-gray-500" onClick={() => setImproveOpen(false)}>Fechar</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <Label className="text-sm">Categoria</Label>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  {[
                    { value: 'incorrect', label: 'Informação incorreta' },
                    { value: 'incomplete', label: 'Informação incompleta' },
                    { value: 'tone', label: 'Tom inadequado' },
                    { value: 'formatting', label: 'Formatação ruim' },
                    { value: 'other', label: 'Outro' },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="issue-category"
                        value={opt.value}
                        checked={issueCategory === opt.value}
                        onChange={(e) => setIssueCategory(e.target.value)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm">Sugestão de melhoria</Label>
                <Textarea
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  rows={4}
                  placeholder="Descreva como a resposta deve ser ajustada..."
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setImproveOpen(false)}>Cancelar</Button>
              <Button
                disabled={savingImprove || !improveTargetId}
                onClick={async () => {
                  if (!improveTargetId) return
                  setSavingImprove(true)
                  try {
                    // Buscar feedback existente para preservar user_message
                    const { data: existingFeedback } = await supabase
                      .from('message_feedback')
                      .select('user_message')
                      .eq('id', improveTargetId)
                      .single()
                    
                    // Se não tiver user_message, buscar da última mensagem do usuário
                    let userMessage = existingFeedback?.user_message
                    if (!userMessage) {
                      const { data: feedbackWithMessage } = await supabase
                        .from('message_feedback')
                        .select('message_id')
                        .eq('id', improveTargetId)
                        .single()
                      
                      if (feedbackWithMessage?.message_id) {
                        // Buscar a última mensagem do usuário antes da mensagem do assistente
                        const { data: assistantMsg } = await supabase
                          .from('chat_messages')
                          .select('created_at, session_id')
                          .eq('id', feedbackWithMessage.message_id)
                          .single()
                        
                        if (assistantMsg) {
                          const { data: userMsg } = await supabase
                            .from('chat_messages')
                            .select('content')
                            .eq('session_id', assistantMsg.session_id)
                            .eq('role', 'user')
                            .lt('created_at', assistantMsg.created_at)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle()
                          
                          if (userMsg) {
                            userMessage = userMsg.content
                          }
                        }
                      }
                    }
                    
                    // Atualizar preservando user_message
                    const updateData: Record<string, unknown> = { 
                      issue_category: issueCategory, 
                      improvement_suggestion: suggestion.trim() || null 
                    }
                    if (userMessage) {
                      updateData.user_message = userMessage
                    }
                    
                    const { error } = await supabase
                      .from('message_feedback')
                      .update(updateData)
                      .eq('id', improveTargetId)
                    if (error) throw error
                    
                    // Trigger embedding generation for the new improvement
                    // O trigger já inseriu em agent_improvements, agora geramos o embedding
                    if (suggestion.trim()) {
                      const { data: feedback } = await supabase
                        .from('message_feedback')
                        .select('agent_id')
                        .eq('id', improveTargetId)
                        .single()
                      
                      if (feedback?.agent_id) {
                        // Aguarda um pouco para garantir que o trigger processou
                        await new Promise(resolve => setTimeout(resolve, 500))
                        
                        // Chama edge function para gerar embedding (não bloqueia UI)
                        // Usa a mesma lógica do botão de processar pendentes
                        supabase.functions.invoke('sync-improvement-to-rag', {
                          body: { agent_id: feedback.agent_id, count: 1 }
                        })
                        .then((result: any) => {
                          if (result?.error) {
                            console.error('Erro ao gerar embedding:', result.error)
                            // Tenta fallback via HTTP direto
                            return supabase.auth.getSession().then(({ data: sessionData }) => {
                              const token = sessionData?.session?.access_token
                              if (!token) return
                              
                              return fetch(`${supabase.supabaseUrl}/functions/v1/sync-improvement-to-rag`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`,
                                },
                                body: JSON.stringify({ agent_id: feedback.agent_id, count: 1 })
                              }).then(res => res.json())
                            })
                          } else {
                            console.log('✅ Embedding gerado com sucesso:', result?.data)
                            return result?.data
                          }
                        })
                        .then((data: any) => {
                          if (data) {
                            console.log('Embedding processado:', data)
                          }
                        })
                        .catch(err => {
                          console.warn('Embedding será processado em background. Você pode usar o botão "Processar Embeddings Pendentes" depois.', err.message)
                          // Não é crítico, pode ser processado depois
                        })
                      }
                    }
                    
                    setRecentFeedbacks((prev) => prev.map((f) => f.id === improveTargetId ? { ...f, issue_category: issueCategory, improvement_suggestion: suggestion.trim() || null } as any : f))
                    setImproveOpen(false)
                  } catch (e) {
                    alert('Erro ao salvar instrução')
                  } finally {
                    setSavingImprove(false)
                  }
                }}
              >
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
      {viewConvoOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-3xl w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold">Conversa completa</h3>
              <button className="text-sm text-gray-500" onClick={() => setViewConvoOpen(false)}>Fechar</button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3">
              {viewConvoMessages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : m.role === 'human'
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100'
                        : 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800'
                  }`}>
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    <div className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleTimeString('pt-BR')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

