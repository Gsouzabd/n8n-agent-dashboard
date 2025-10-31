import { useState, useEffect, useMemo } from 'react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Label } from './ui/Label'
import { Textarea } from './ui/Textarea'
import { supabase } from '@/lib/supabase'
import { Globe, Plus, Loader2, X, RefreshCw } from 'lucide-react'

interface UrlKnowledgeFormProps {
  knowledgeBaseId: string
  agentId: string
  onSuccess?: () => void
}

interface KnowledgeUrl {
  id: string
  url: string
  status: string
  page_title?: string
  word_count?: number
  chunks_generated?: number
  error_message?: string
  document_description?: string
  auto_refresh: boolean
  last_crawled_at?: string
  created_at: string
}

export function UrlKnowledgeForm({ knowledgeBaseId, agentId, onSuccess }: UrlKnowledgeFormProps) {
  const [showForm, setShowForm] = useState(false)
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [urls, setUrls] = useState<KnowledgeUrl[]>([])
  const [loadingUrls, setLoadingUrls] = useState(true)
  const [showAntiScraperHelp, setShowAntiScraperHelp] = useState(false)

  // Load URLs on mount
  useEffect(() => {
    loadUrls()
  }, [knowledgeBaseId])

  const loadUrls = async () => {
    setLoadingUrls(true)
    try {
      const { data, error } = await supabase
        .from('knowledge_urls')
        .select('*')
        .eq('knowledge_base_id', knowledgeBaseId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUrls(data || [])
    } catch (error) {
      console.error('Error loading URLs:', error)
    } finally {
      setLoadingUrls(false)
    }
  }

  const antiScraperFailures = useMemo(() => {
    return urls.filter(u =>
      u.status === 'failed' &&
      (u.error_message?.toLowerCase().includes('bloqueio') ||
       u.error_message?.toLowerCase().includes('insuficiente'))
    )
  }, [urls])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate URL
      const urlObj = new URL(url)
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported')
      }

      // Create URL record
      const { data: urlRecord, error: insertError } = await supabase
        .from('knowledge_urls')
        .insert({
          agent_id: agentId,
          knowledge_base_id: knowledgeBaseId,
          url: url.trim(),
          document_description: description.trim() || null,
          tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          auto_refresh: autoRefresh,
          status: 'pending',
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Trigger web scraper
      const { error: functionError } = await supabase.functions.invoke('web-scraper', {
        body: { urlId: urlRecord.id },
      })

      if (functionError) {
        console.error('Web scraper error:', functionError)
        // Don't throw - let it process in background
      }

      // Reset form
      setUrl('')
      setDescription('')
      setTags('')
      setAutoRefresh(false)
      setShowForm(false)

      // Reload URLs
      loadUrls()

      if (onSuccess) {
        onSuccess()
      }

      alert('✅ URL adicionada e sendo processada!')
    } catch (error: any) {
      console.error('Error adding URL:', error)
      alert('❌ Erro ao adicionar URL: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = async (urlId: string, forcePrerender?: boolean) => {
    try {
      await supabase
        .from('knowledge_urls')
        .update({ status: 'pending', error_message: null })
        .eq('id', urlId)

      const { error } = await supabase.functions.invoke('web-scraper', {
        body: { urlId, forcePrerender: !!forcePrerender },
      })

      if (error) throw error

      loadUrls()
      alert('✅ Reprocessando URL...')
    } catch (error: any) {
      alert('❌ Erro ao reprocessar: ' + error.message)
    }
  }

  const handleDelete = async (urlId: string) => {
    if (!confirm('Remover esta URL da base de conhecimento?')) return

    try {
      // Delete associated documents
      const { data: urlRecord } = await supabase
        .from('knowledge_urls')
        .select('url')
        .eq('id', urlId)
        .single()

      if (urlRecord) {
        await supabase
          .from('knowledge_documents')
          .delete()
          .eq('metadata->>source_url', urlRecord.url)
      }

      // Delete URL record
      const { error } = await supabase.from('knowledge_urls').delete().eq('id', urlId)

      if (error) throw error

      loadUrls()
      if (onSuccess) onSuccess()
    } catch (error: any) {
      alert('❌ Erro ao remover URL: ' + error.message)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      processing: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
      completed: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
    }

    const labels = {
      pending: 'Pendente',
      processing: 'Processando',
      completed: 'Concluído',
      failed: 'Falhou',
    }

    return (
      <span className={`text-xs px-2 py-1 rounded-full ${styles[status as keyof typeof styles] || styles.pending}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Add URL Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">URLs na Base de Conhecimento</h3>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'outline' : 'default'}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? 'Cancelar' : 'Adicionar URL'}
        </Button>
      </div>

      {/* Add URL Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg space-y-4">
          <div>
            <Label htmlFor="url">URL do Site</Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.exemplo.com/api"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Documentação da API REST"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="documentação, api, rest"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="auto-refresh" className="cursor-pointer">
              Atualização automática semanal
            </Label>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
            {loading ? 'Processando...' : 'Processar URL'}
          </Button>
        </form>
      )}

      {/* Anti-scraper notice */}
      {antiScraperFailures.length > 0 && (
        <div className="p-3 border rounded-md bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-100">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm">
              Detectamos {antiScraperFailures.length} URL(s) com possível bloqueio anti‑scraper ou conteúdo insuficiente. Você pode tentar reprocessar (compatibilidade), remover e adicionar novamente, ou enviar o conteúdo como arquivo.
            </div>
            <button
              type="button"
              className="text-xs underline hover:opacity-80"
              onClick={() => setShowAntiScraperHelp(!showAntiScraperHelp)}
            >
              {showAntiScraperHelp ? 'Ocultar dicas' : 'Saiba como contornar'}
            </button>
          </div>
          {showAntiScraperHelp && (
            <ul className="mt-2 text-xs list-disc pl-5 space-y-1">
              <li>Tente Reprocessar (modo compatibilidade); se persistir, Remover e adicionar novamente a URL.</li>
              <li>Se o site bloquear scrapers, faça upload de um arquivo (.pdf/.txt) com o conteúdo.</li>
              <li>Quando disponível, prefira consumir dados via API do site em vez de HTML.</li>
            </ul>
          )}
        </div>
      )}

      {/* URLs List */}
      <div className="space-y-2">
        {loadingUrls ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : urls.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma URL adicionada ainda</p>
          </div>
        ) : (
          urls.map((urlRecord) => (
            <div
              key={urlRecord.id}
              className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {urlRecord.page_title || urlRecord.url}
                    </h4>
                    {getStatusBadge(urlRecord.status)}
                    {urlRecord.status === 'failed' && (urlRecord.error_message?.toLowerCase().includes('insuficiente') || urlRecord.error_message?.toLowerCase().includes('bloqueio')) && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        Possível anti‑scraper
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{urlRecord.url}</p>
                  {urlRecord.document_description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {urlRecord.document_description}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                    {urlRecord.status === 'failed' && (
                      <Button variant="ghost" size="sm" onClick={() => handleRetry(urlRecord.id, true)}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                    {urlRecord.status === 'completed' && (urlRecord.word_count ?? 0) < 50 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRetry(urlRecord.id, true)}
                        title="Reprocessar em modo compatibilidade"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(urlRecord.id)}>
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>

              {urlRecord.status === 'completed' && (
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>{urlRecord.word_count?.toLocaleString()} palavras</span>
                  <span>{urlRecord.chunks_generated} chunks</span>
                  {urlRecord.auto_refresh && <span>🔄 Auto-atualização ativa</span>}
                  {(urlRecord.word_count ?? 0) < 50 && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                      Conteúdo possivelmente bloqueado (use Reprocessar)
                    </span>
                  )}
                </div>
              )}

              {urlRecord.error_message && (
                <p className="text-xs text-red-500">Erro: {urlRecord.error_message}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

